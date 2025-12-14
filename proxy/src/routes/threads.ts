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
        const { assistant_id: graphId, input, stream_mode, config, multitask_strategy } = req.body;

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

        console.log(`[Proxy] Starting stream for thread ${threadId}, graph: ${graphId}`);

        // 调用 Agent Server 的 runs.stream
        const stream = client.runs.stream(
            threadId,
            graphId,
            {
                input: input || {},
                streamMode: stream_mode || 'custom',
                streamResumable: true,  // 支持恢复
                config: config,
                multitaskStrategy: multitask_strategy
            }
        );

        let eventCount = 0;

        // 流式处理
        for await (const chunk of stream) {
            eventCount++;

            try {
                if (chunk.event) {
                    res.write(`event: ${chunk.event}\n`);
                }
                res.write(`data: ${JSON.stringify(chunk.data)}\n\n`);
            } catch (writeError) {
                console.log(`[Proxy] Failed to write to client (likely disconnected):`, writeError);
            }

            if (chunk.data?.eventType && chunk.data?.id) {
                eventPersistence.bufferEvent(threadId, {
                    id: chunk.data.id,
                    eventType: chunk.data.eventType,
                    status: chunk.data.status || 'finished',
                    content: chunk.data.content,
                    parentId: chunk.data.parentId
                });
            }
        }

        console.log(`[Proxy] Stream completed for thread ${threadId}, events: ${eventCount}`);

        // 流结束，确保所有事件都已保存
        await eventPersistence.flush();

        res.end();
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

export default router;
