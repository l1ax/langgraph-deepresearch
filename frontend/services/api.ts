/**
 * API 服务层（MobX + flow）
 * 所有数据 API 现在统一通过 Proxy 调用
 *
 * 注意：
 * - Proxy 负责所有数据库操作（Threads, Events）
 * - Proxy 负责事件持久化（SSE 流拦截）
 * - Frontend 只负责 UI 展示
 */
import { flow, makeObservable } from 'mobx';
import dotenv from 'dotenv';
dotenv.config();

const PROXY_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || 'http://localhost:2024';

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

class ApiService {
  constructor() {
    makeObservable(this, {
      getThreadsByUser: flow.bound,
      updateThread: flow.bound,
      deleteThread: flow.bound,
      getEventsByThread: flow.bound,
    });
  }

  // ============ Threads API ============

  /**
   * 获取用户的所有 threads
   */
  *getThreadsByUser(userId: string): Generator<Promise<Response>, Thread[], any> {
    const response: Response = yield fetch(`${PROXY_URL}/api/threads?userId=${userId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch threads');
    }

    return (yield response.json()) as Thread[];
  }

  /**
   * 更新 thread（例如更新标题）
   */
  *updateThread(threadId: string, data: { title?: string }): Generator<Promise<Response>, Thread, any> {
    const response: Response = yield fetch(`${PROXY_URL}/api/threads/${threadId}`, {
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
    const response: Response = yield fetch(`${PROXY_URL}/api/threads/${threadId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete thread');
    }
  }

  // ============ Events API ============

  /**
   * 获取指定 thread 的所有事件（只读）
   */
  *getEventsByThread(threadId: string): Generator<Promise<Response>, StoredEvent[], any> {
    const response: Response = yield fetch(`${PROXY_URL}/api/events?threadId=${threadId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    return (yield response.json()) as StoredEvent[];
  }
}

export const apiService = new ApiService();
