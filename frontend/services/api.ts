/**
 * API 服务层（MobX + flow）
 * 封装对 Thread 和 Event API 的调用，暴露单例 apiService
 */
import { flow, makeObservable } from 'mobx';

// Thread 类型定义
export interface Thread {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

// Event 类型定义（数据库存储格式）
export interface StoredEvent {
  id: string;
  threadId: string;
  eventType: string;
  status: string;
  content: unknown;
  parentId?: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

// Event 输入类型（用于创建/更新）
export interface EventInput {
  id: string;
  eventType: string;
  status: string;
  content: unknown;
  parentId?: string;
  sequence: number;
}

class ApiService {
  constructor() {
    makeObservable(this, {
      getThreadsByUser: flow.bound,
      createThread: flow.bound,
      getThread: flow.bound,
      updateThread: flow.bound,
      deleteThread: flow.bound,
      getEventsByThread: flow.bound,
      upsertEvents: flow.bound,
      deleteEventsByThread: flow.bound,
      syncEventsFromState: flow.bound,
    });
  }

  /**
   * 获取用户的所有 threads
   */
  *getThreadsByUser(userId: string): Generator<Promise<Response>, Thread[], any> {
    const response: Response = yield fetch(`/api/threads?userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch threads');
    }

    return (yield response.json()) as Thread[];
  }

  /**
   * 创建新 thread
   */
  *createThread(userId: string, title?: string, id?: string): Generator<Promise<Response>, Thread, any> {
    const response: Response = yield fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, id }),
    });

    if (!response.ok) {
      throw new Error('Failed to create thread');
    }

    return (yield response.json()) as Thread;
  }

  /**
   * 获取单个 thread
   */
  *getThread(threadId: string): Generator<Promise<Response>, Thread | null, any> {
    const response: Response = yield fetch(`/api/threads/${threadId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch thread');
    }

    return (yield response.json()) as Thread;
  }

  /**
   * 更新 thread（例如更新标题）
   */
  *updateThread(threadId: string, data: { title?: string }): Generator<Promise<Response>, Thread, any> {
    const response: Response = yield fetch(`/api/threads/${threadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update thread');
    }

    return (yield response.json()) as Thread;
  }

  /**
   * 删除 thread
   */
  *deleteThread(threadId: string): Generator<Promise<Response>, void, any> {
    const response: Response = yield fetch(`/api/threads/${threadId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete thread');
    }
  }

  // ============ Events API ============

  /**
   * 获取指定 thread 的所有事件
   */
  *getEventsByThread(threadId: string): Generator<Promise<Response>, StoredEvent[], any> {
    const response: Response = yield fetch(`/api/events?threadId=${threadId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    return (yield response.json()) as StoredEvent[];
  }

  /**
   * 批量创建或更新事件（upsert）
   */
  *upsertEvents(threadId: string, events: EventInput[]): Generator<Promise<Response>, { success: boolean; count: number }, any> {
    const response: Response = yield fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, events }),
    });

    if (!response.ok) {
      throw new Error('Failed to upsert events');
    }

    return (yield response.json()) as { success: boolean; count: number };
  }

  /**
   * 删除指定 thread 的所有事件
   */
  *deleteEventsByThread(threadId: string): Generator<Promise<Response>, void, any> {
    const response: Response = yield fetch(`/api/events?threadId=${threadId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete events');
    }
  }

  /**
   * 智能同步 state events 到数据库
   * 比对相同 event 的 status，保留更"完成"的版本
   */
  *syncEventsFromState(
    threadId: string,
    events: Array<{
      id: string;
      eventType: string;
      status: string;
      content: unknown;
      parentId?: string;
    }>
  ): Generator<Promise<Response>, { success: boolean; created: number; updated: number }, any> {
    const response: Response = yield fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, events }),
    });

    if (!response.ok) {
      throw new Error('Failed to sync events');
    }

    return (yield response.json()) as { success: boolean; created: number; updated: number };
  }
}

export const apiService = new ApiService();
