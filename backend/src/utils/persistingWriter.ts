/**
 * Persisting Writer - 包装 LangGraph 的 writer 函数
 * 
 * 在 emit event 到前端的同时，将 event 保存到数据库
 * 这样即使用户在节点运行中途退出，events 也不会丢失
 * 
 * 使用确定性 ID（UUIDv5）确保 rollback 后重新执行时 ID 保持一致，
 * 数据库的 upsert 会自动更新而不是插入新记录。
 */

import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { BaseEvent } from '../outputAdapters';
import { upsertEvent } from './eventStore';

/**
 * 创建一个包装过的 config，其 writer 会同时保存 events 到数据库
 * 
 * @param config 原始的 LangGraphRunnableConfig
 * @returns 包装后的 config，writer 会同时持久化 events
 */
export function withPersistingWriter(config?: LangGraphRunnableConfig): LangGraphRunnableConfig | undefined {
    if (!config) return config;
    
    const originalWriter = config.writer;
    const threadId = config.configurable?.thread_id as string | undefined;

    if (!originalWriter || !threadId) {
        return config;
    }

    // 创建包装过的 writer
    const persistingWriter = async (data: unknown) => {
        // 先调用原始 writer 发送到前端
        await originalWriter(data);

        // 然后异步保存到数据库（不阻塞主流程）
        try {
            const event = data as BaseEvent.IJsonData;
            if (event && event.id && event.eventType) {
                upsertEvent(threadId, event).catch(err => {
                    console.error('[PersistingWriter] Failed to persist event:', err);
                });
            }
        } catch (error) {
            console.error('[PersistingWriter] Error processing event:', error);
        }
    };

    return {
        ...config,
        writer: persistingWriter,
    };
}

/**
 * 包装节点函数，使其使用 persistingWriter
 * 
 * @param nodeFn 原始的节点函数
 * @returns 包装后的节点函数
 */
export function withEventPersistence<T extends (...args: any[]) => any>(
    nodeFn: T
): T {
    const wrapped = async (state: any, config?: LangGraphRunnableConfig) => {
        const wrappedConfig = withPersistingWriter(config);
        return nodeFn(state, wrappedConfig);
    };
    Object.defineProperty(wrapped, 'name', { value: nodeFn.name });
    return wrapped as T;
}
