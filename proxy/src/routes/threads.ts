/**
 * Threads 路由
 * 只保留有特殊逻辑的接口，其他的走 fallback 转发
 */

import express, { Router } from 'express';
import { Client } from '@langchain/langgraph-sdk';
import dotenv from 'dotenv';
import prisma from '../db/prisma.js';
import {eventPersistence} from '../services/eventPersistence.js';

dotenv.config();

const router: Router = express.Router();

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://langgraph-api:8000';
const client = new Client({ apiUrl: AGENT_SERVER_URL });

/**
 * POST /threads
 * 创建新 thread
 * 
 * 如果请求 body 中包含 userId，创建 LangGraph thread 后会自动写入数据库
 */
router.post('/', async (req, res) => {
    try {
        const { userId, title, ...langGraphBody } = req.body;
        
        // 创建 LangGraph thread
        const thread = await client.threads.create(langGraphBody);
        const threadId = thread.thread_id;

        // 如果提供了 userId，自动写入数据库
        if (userId) {
            try {
                // 验证用户存在
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                });

                if (!user) {
                    console.warn(`[Proxy] User ${userId} not found, skipping database write`);
                } else {
                    // 检查 thread 是否已存在（避免重复创建）
                    const existingThread = await prisma.thread.findUnique({
                        where: { id: threadId },
                    });

                    if (!existingThread) {
                        // 创建数据库记录
                        await prisma.thread.create({
                            data: {
                                id: threadId,
                                userId,
                                title: title || null,
                            },
                        });
                        console.log(`[Proxy] Created thread ${threadId} in database for user ${userId}`);
                    } else {
                        console.log(`[Proxy] Thread ${threadId} already exists in database`);
                    }
                }
            } catch (dbError) {
                // 数据库写入失败不影响 LangGraph thread 的创建
                console.error('[Proxy] Failed to write thread to database:', dbError);
            }
        }

        res.json(thread);
    } catch (error) {
        console.error('[Proxy] Create thread error:', error);
        res.status(500).json({ error: String(error) });
    }
});

router.post('/:threadId/runs/stream', async (req, res) => {
    try {
      const { threadId } = req.params;
      const {
        assistant_id: graphId,
        input,
        stream_mode,
        config,
        multitask_strategy,
      } = req.body;

      console.log(`[Proxy] ========================================`);
      console.log(`[Proxy] Received stream request:`);
      console.log(`[Proxy]   - Thread ID: ${threadId}`);
      console.log(`[Proxy]   - Graph ID: ${graphId}`);
      console.log(`[Proxy]   - Stream Mode: ${stream_mode || 'custom'}`);
      console.log(`[Proxy] ========================================`);

      if (!threadId) {
        return res.status(400).json({ error: 'Thread ID is required' });
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // 🔑 智能路由：检查 thread 是否正忙
      // 配合 multitaskStrategy: 'reject' 可以防止 SDK 重试时创建重复的 run
      let activeRunId: string | null = null;
      try {
        const thread = await client.threads.get(threadId);

        // 如果 thread 正忙，查询当前正在执行的 run
        if (thread.status === 'busy') {
          // 只查一次，获取最新的未完成 run（running 或 pending）
          const runs = await client.runs.list(threadId, { limit: 1 });
          const activeRun = runs.find(
            (r: any) => r.status === 'running' || r.status === 'pending'
          );

          if (activeRun) {
            activeRunId = activeRun.run_id;
            console.log(`[Proxy] 🔄 Thread busy, joining run: ${activeRunId}`);
          }
        }
      } catch (err) {
        console.log('[Proxy] Could not check thread status:', err);
      }

      let stream;
      let eventCount = 0;

      if (activeRunId) {
        // ✅ 有正在运行的 run，使用 joinStream 而不是创建新 run
        console.log(
          `[Proxy] Joining existing run ${activeRunId} for thread ${threadId}`
        );
        stream = client.runs.joinStream(threadId, activeRunId, {
          streamMode: stream_mode || 'custom',
        });
      } else {
        // 没有正在运行的 run，创建新的
        console.log(
          `[Proxy] Starting new run for thread ${threadId}, graph: ${graphId}`
        );
        stream = client.runs.stream(threadId, graphId, {
          input: input || {},
          streamMode: stream_mode || 'custom',
          streamResumable: true, // 支持恢复
          config: config,
          multitaskStrategy: multitask_strategy || 'reject', // 默认使用 reject 策略作为额外保护
        });
      }

      // 流式处理
      for await (const chunk of stream) {
        eventCount++;

        try {
          if (chunk.event) {
            res.write(`event: ${chunk.event}\n`);
          }
          res.write(`data: ${JSON.stringify(chunk.data)}\n\n`);
          // @ts-ignore
          if (typeof res.flush === 'function') {
            // @ts-ignore
            res.flush();
          }
        } catch (writeError) {
          console.log(
            `[Proxy] Failed to write to client (likely disconnected):`,
            writeError
          );
        }

        if (chunk.data?.eventType && chunk.data?.id) {
          eventPersistence.bufferEvent(threadId, {
            id: chunk.data.id,
            eventType: chunk.data.eventType,
            status: chunk.data.status || 'finished',
            content: chunk.data.content,
            parentId: chunk.data.parentId,
          });
        }
      }

      console.log(
        `[Proxy] Stream completed for thread ${threadId}, events: ${eventCount}`
      );
      res.end();
      // 流结束，确保所有事件都已保存
      await eventPersistence.flush();
    } catch (error) {
        console.error('[Proxy] Stream error:', error);

        if (!res.headersSent) {
            res.status(500).json({ error: String(error) });
        } else {
            const errorChunk = JSON.stringify({
                event: 'error',
                data: { error: String(error) }
            });
            res.write(`data: ${errorChunk}\n\n`);
            res.end();
        }

        // 即使出错也要尝试 flush 已缓冲的事件
        await eventPersistence.flush();
    }
});

/**
 * GET /threads/:threadId/runs/:runId/stream
 * 代理 joinStream API，用于恢复正在运行的流
 * 
 * 在转发流之前，会先发送数据库中已有的事件，确保前端获得完整数据
 */
router.get('/:threadId/runs/:runId/stream', async (req, res) => {
    try {
        const { threadId, runId } = req.params;
        const streamMode = (req.query.stream_mode as string) || 'custom';
        const lastEventId = req.headers['last-event-id'] as string | undefined;

        console.log(`[Proxy] ========================================`);
        console.log(`[Proxy] JoinStream request:`);
        console.log(`[Proxy]   - Thread ID: ${threadId}`);
        console.log(`[Proxy]   - Run ID: ${runId}`);
        console.log(`[Proxy]   - Stream Mode: ${streamMode}`);
        console.log(`[Proxy]   - Last-Event-ID: ${lastEventId || 'none'}`);
        console.log(`[Proxy] ========================================`);

        if (!threadId || !runId) {
            return res.status(400).json({ error: 'Thread ID and Run ID are required' });
        }

        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        let eventCount = 0;

        // 🔑 在 joinStream 之前，先发送数据库中已有的事件，确保前端获得完整数据
        try {
            // 先 flush 缓冲区，确保所有事件都已写入数据库
            await eventPersistence.flush();

            // 从数据库获取该 thread 的所有事件
            const existingEvents = await prisma.event.findMany({
                where: { threadId },
                orderBy: { sequence: 'asc' },
            });

            console.log(`[Proxy] Pre-sending ${existingEvents.length} existing events for thread ${threadId}`);

            // 按 custom 流格式发送每个事件
            for (const event of existingEvents) {
                const eventData = {
                    id: event.id,
                    eventType: event.eventType,
                    status: event.status,
                    content: event.content,
                    parentId: event.parentId,
                };
                res.write(`event: custom\n`);
                res.write(`data: ${JSON.stringify(eventData)}\n\n`);
                eventCount++;
            }
        } catch (prefetchError) {
            console.warn('[Proxy] Failed to pre-fetch events:', prefetchError);
        }

        // 使用 SDK 的 joinStream
        const stream = client.runs.joinStream(threadId, runId, {
            streamMode: streamMode as any,
            lastEventId,
        });

        // 流式处理
        for await (const chunk of stream) {
            eventCount++;

            try {
                if (chunk.event) {
                    res.write(`event: ${chunk.event}\n`);
                }
                res.write(`data: ${JSON.stringify(chunk.data)}\n\n`);
                // @ts-ignore - flush 方法可能由某些环境或中间件提供，或者在该上下文中不存在但需要尝试调用
                if (typeof res.flush === 'function') {
                    // @ts-ignore
                    res.flush();
                }
            } catch (writeError) {
                console.log(
                    `[Proxy] Failed to write to client (likely disconnected):`,
                    writeError
                );
            }

            // 持久化事件
            if (chunk.data?.eventType && chunk.data?.id) {
                eventPersistence.bufferEvent(threadId, {
                    id: chunk.data.id,
                    eventType: chunk.data.eventType,
                    status: chunk.data.status || 'finished',
                    content: chunk.data.content,
                    parentId: chunk.data.parentId,
                });
            }
        }

        console.log(
            `[Proxy] JoinStream completed for thread ${threadId}, events: ${eventCount}`
        );
        res.end();
        await eventPersistence.flush();
    } catch (error) {
        console.error('[Proxy] JoinStream error:', error);

        if (!res.headersSent) {
            res.status(500).json({ error: String(error) });
        } else {
            const errorChunk = JSON.stringify({
                event: 'error',
                data: { error: String(error) }
            });
            res.write(`data: ${errorChunk}\n\n`);
            res.end();
        }

        await eventPersistence.flush();
    }
});

export default router;
