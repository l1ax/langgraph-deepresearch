/**
 * 事件持久化服务
 * 
 * 职责：
 * 1. 调用 langgraph runs api 时，拦截 SSE 流，批量保存到持久化服务类中
 * 2. 每次接收到一个事件，判断：
 *  - 当前缓冲区事件是否超过【设定最大值】，如果超过，立即保存到数据库
 *  - 如果未超过，设定定时器，回调中调用保存方法
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export interface EventData {
    id: string;
    eventType: string;
    status: string;
    content: any;
    parentId?: string;
}

interface BufferedEvent {
    threadId: string;
    eventData: EventData;
}

class EventPersistenceService {
    private eventBuffer: BufferedEvent[] = [];
    private bufferTimer: NodeJS.Timeout | null = null;
    private readonly BATCH_SIZE = 50;
    private readonly BATCH_TIMEOUT = 1000;

    /**
     * 添加事件到缓冲区
     */
    bufferEvent(threadId: string, eventData: EventData) {
        this.eventBuffer.push({ threadId, eventData });

        if (this.eventBuffer.length >= this.BATCH_SIZE) {
            this.flushBuffer();
        } else {
            this.scheduleFlush();
        }
    }

    /**
     * 调度刷新（debounce）
     */
    private scheduleFlush() {
        if (this.bufferTimer) {
            clearTimeout(this.bufferTimer);
        }

        this.bufferTimer = setTimeout(() => {
            this.flushBuffer();
        }, this.BATCH_TIMEOUT);
    }

    /**
     * 刷新缓冲区到数据库
     */
    private async flushBuffer() {
        if (this.eventBuffer.length === 0) return;

        const eventsToSave = [...this.eventBuffer];
        this.eventBuffer = [];

        if (this.bufferTimer) {
            clearTimeout(this.bufferTimer);
            this.bufferTimer = null;
        }

        try {
            await this.saveEvents(eventsToSave);
            console.log(`[EventPersistence] Saved ${eventsToSave.length} events to database`);
        } catch (error) {
            console.error('[EventPersistence] Failed to save events:', error);
            // TODO: 可以实现重试机制或错误队列
        }
    }

    /**
     * 批量保存事件到数据库
     */
    private async saveEvents(events: BufferedEvent[]) {
        if (events.length === 0) return;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const { threadId, eventData } of events) {
              // 先检查事件是否已存在
              const existingEvent = await client.query(
                'SELECT sequence FROM "Event" WHERE id = $1',
                [eventData.id]
              );

              if (existingEvent.rows.length > 0) {
                // 事件已存在，只更新 status 和 content，保留原有 sequence
                await client.query(
                  `UPDATE "Event" 
                         SET status = $1, content = $2, "updatedAt" = NOW()
                         WHERE id = $3`,
                  [
                    eventData.status,
                    JSON.stringify(eventData.content),
                    eventData.id,
                  ]
                );
              } else {
                // 新事件，获取下一个 sequence 并插入
                const maxSeqResult = await client.query(
                  'SELECT COALESCE(MAX(sequence), -1) as max_seq FROM "Event" WHERE "threadId" = $1',
                  [threadId]
                );
                const nextSequence = maxSeqResult.rows[0].max_seq + 1;

                await client.query(
                  `INSERT INTO "Event" (id, "threadId", "eventType", status, content, "parentId", sequence, "createdAt", "updatedAt")
                         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
                  [
                    eventData.id,
                    threadId,
                    eventData.eventType,
                    eventData.status,
                    JSON.stringify(eventData.content),
                    eventData.parentId || null,
                    nextSequence,
                  ]
                );
              }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 立即刷新所有缓冲的事件
     */
    async flush() {
        await this.flushBuffer();
    }
}

export const eventPersistence = new EventPersistenceService();
