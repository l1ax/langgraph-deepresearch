/**
 * Event Store - 用于在 graph 运行时持久化 events 到数据库
 * 
 * 解决的问题：用户在节点运行完成前退出页面，events 数据丢失
 * 方案：在 backend emit event 时同时保存到数据库
 * 
 * 使用确定性 ID（UUIDv5）确保：
 * - 相同输入生成相同 ID
 * - Rollback 后重新执行，ID 保持一致
 * - 数据库 upsert 自动更新而不是插入新记录
 */

import { Pool } from 'pg';
import { BaseEvent } from '../outputAdapters';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
}

// 创建连接池
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    port: 6543,
});

/**
 * 获取下一个序列号（从数据库实时查询）
 */
async function getNextSequence(threadId: string): Promise<number> {
    try {
        const result = await pool.query(
            'SELECT COALESCE(MAX(sequence), 0) as max_seq FROM "Event" WHERE "threadId" = $1',
            [threadId]
        );
        const maxSeq = result.rows[0]?.max_seq || 0;
        return maxSeq + 1;
    } catch (error) {
        console.error('[EventStore] Failed to get max sequence:', error);
        return Date.now();
    }
}

/**
 * 保存或更新单个 event 到数据库
 * 使用确定性 ID 时，upsert 会自动处理 rollback 场景
 */
export async function upsertEvent(
    threadId: string,
    event: BaseEvent.IJsonData
): Promise<void> {
    try {
        // 先检查是否已存在该 event
        const existing = await pool.query(
            'SELECT sequence FROM "Event" WHERE id = $1',
            [event.id]
        );
        
        let sequence: number;
        if (existing.rows.length > 0) {
            // 已存在，保持原有 sequence
            sequence = existing.rows[0].sequence;
        } else {
            // 新 event，获取下一个 sequence
            sequence = await getNextSequence(threadId);
        }
        
        await pool.query(
            `INSERT INTO "Event" (id, "threadId", "eventType", status, content, "parentId", sequence, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             ON CONFLICT (id) DO UPDATE SET
               "eventType" = EXCLUDED."eventType",
               status = EXCLUDED.status,
               content = EXCLUDED.content,
               "parentId" = EXCLUDED."parentId",
               "updatedAt" = NOW()`,
            [
                event.id,
                threadId,
                event.eventType,
                event.status,
                JSON.stringify(event.content),
                event.parentId || null,
                sequence,
            ]
        );
    } catch (error) {
        console.error('[EventStore] Failed to upsert event:', error);
    }
}

/**
 * 获取指定 thread 的所有 events
 */
export async function getEventsByThread(threadId: string): Promise<BaseEvent.IJsonData[]> {
    try {
        const result = await pool.query(
            `SELECT id, "eventType", status, content, "parentId"
             FROM "Event"
             WHERE "threadId" = $1
             ORDER BY sequence ASC`,
            [threadId]
        );
        
        return result.rows.map(row => ({
            id: row.id,
            eventType: row.eventType,
            status: row.status,
            content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
            ...(row.parentId && { parentId: row.parentId }),
        }));
    } catch (error) {
        console.error('[EventStore] Failed to get events:', error);
        return [];
    }
}

/**
 * 删除指定 thread 的所有 events
 */
export async function deleteEventsByThread(threadId: string): Promise<void> {
    try {
        await pool.query('DELETE FROM "Event" WHERE "threadId" = $1', [threadId]);
    } catch (error) {
        console.error('[EventStore] Failed to delete events:', error);
    }
}

/**
 * 同步 state.events 到数据库
 * 比对数据库中已有的 events 和 state.events，将漏存的 events 补充到数据库
 * 
 * @param threadId 线程 ID
 * @param stateEvents 来自 state.events 的事件数组
 */
export async function syncEventsFromState(
    threadId: string,
    stateEvents: BaseEvent.IJsonData[]
): Promise<void> {
    if (!stateEvents || stateEvents.length === 0) {
        return;
    }

    try {
        // 获取数据库中已有的 event IDs
        const result = await pool.query(
            'SELECT id FROM "Event" WHERE "threadId" = $1',
            [threadId]
        );
        const existingIds = new Set(result.rows.map(row => row.id));

        // 找出数据库中没有的 events
        const missingEvents = stateEvents.filter(event => !existingIds.has(event.id));

        if (missingEvents.length === 0) {
            return;
        }

        console.log(`[EventStore] Syncing ${missingEvents.length} missing events from state to database`);

        // 获取当前最大 sequence
        let nextSequence = await getNextSequence(threadId);

        // 批量插入缺失的 events
        for (const event of missingEvents) {
            await pool.query(
                `INSERT INTO "Event" (id, "threadId", "eventType", status, content, "parentId", sequence, "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                 ON CONFLICT (id) DO NOTHING`,
                [
                    event.id,
                    threadId,
                    event.eventType,
                    event.status,
                    JSON.stringify(event.content),
                    event.parentId || null,
                    nextSequence++,
                ]
            );
        }
    } catch (error) {
        console.error('[EventStore] Failed to sync events from state:', error);
    }
}

/**
 * 关闭连接池
 */
export async function closePool(): Promise<void> {
    await pool.end();
}
