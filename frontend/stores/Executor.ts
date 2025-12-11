import { observable, action, makeObservable } from 'mobx';
import { Client, Config } from '@langchain/langgraph-sdk';
import {
  BaseEvent,
  AnyEvent,
  createEventFromData,
  ClarifyEvent,
  BriefEvent,
  ChatEvent,
  ToolCallEvent,
} from './events';
import { ExecutionResponse } from './ExecutionResponse';

// Configuration
const GRAPH_ID = 'fullResearchAgent';

/** 流式数据 chunk 结构 */
interface StreamChunk {
  event: string;
  id: string;
  data: unknown;
}

// 前向声明
interface IConversation {
  readonly threadId: string;
  readonly client: Client | null;
}

/**
 * Executor 类
 * 负责与后端通信、存储和处理事件
 * 通过 conversation 引用访问 client 和 threadId
 */
export class Executor {
  /** Conversation 引用 */
  private readonly conversation: IConversation;

  /** 是否正在执行请求 */
  @observable isExecuting: boolean = false;

  constructor(conversation: IConversation) {
    this.conversation = conversation;
    makeObservable(this);
  }

  /** 根据 id 更新已存在的事件，如果不存在则添加 */
  @action.bound
  private upsertEvent(
    data: BaseEvent.IEventData<unknown>,
    executionResponse: ExecutionResponse
  ): AnyEvent {
    const event = createEventFromData(data);

    // 更新 executionResponse
    executionResponse.upsertEvent(event);

    return event;
  }

  /** 处理接收到的 chunk 数据，返回创建或更新的事件（如果有） */
  @action.bound
  private handleChunk(
    chunk: StreamChunk,
    executionResponse: ExecutionResponse
  ): AnyEvent | null {
    if (chunk.event === 'custom' && chunk.data) {
      console.log('chunk.data', chunk.data);
      const data = chunk.data as BaseEvent.IEventData<unknown>;
      if (data.eventType && data.id) {
        // 兼容旧数据，默认 status 为 finished
        data.status = data.status || 'finished';
        
        return this.upsertEvent(data, executionResponse);
      }
    }
    return null;
  }

  /** 设置执行状态 */
  @action.bound
  private setExecuting(value: boolean) {
    this.isExecuting = value;
  }

  /**
   * 执行对话请求
   * 
   * 注意：事件持久化和 rollback 处理都在 backend 完成。
   * Backend 会在每个节点执行前同步数据库 events 与 state.events，
   * 自动删除来自被 rollback 的执行产生的 events。
   */
  @action.bound
  async invoke(
    params: {
      input: Record<string, unknown> | null;
      executionResponse?: ExecutionResponse;
      config?: Config;
    }
  ): Promise<ExecutionResponse | undefined> {
    const { client, threadId } = this.conversation;
    const { input, executionResponse, config } = params;
    const defaultConfig: Config = {
      recursion_limit: 100,
      configurable: {
        thread_id: threadId
      }
    }

    if (!client || !threadId) {
      throw new Error('Conversation client or threadId not initialized');
    }

    this.setExecuting(true);

    const currentExecutionResponse = executionResponse || new ExecutionResponse();

    try {
      // const stream = client.runs.stream(threadId, GRAPH_ID, {
      //   input,
      //   streamMode: 'custom',
      //   multitaskStrategy: 'rollback',
      //   durability: "sync",
      //   config: {
      //     ...defaultConfig,
      //     ...config
      //   }
      // });

      // for await (const chunk of stream) {
      //   this.handleChunk(chunk as StreamChunk, response);
      // }

      const response = await fetch(`${process.env.NEXT_PUBLIC_LANGGRAPH_API_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphId: GRAPH_ID,
          threadId,
          input,
          config: {
            ...defaultConfig,
            ...config
          }
        }),
      });
    
      if (!response.body) return;
    
      // 处理流数据的标准写法
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
    
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
    
        // 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '');
                if (jsonStr) {
                    const data = JSON.parse(jsonStr);
                    console.log("收到流数据:", data); 
                    this.handleChunk(data as StreamChunk, currentExecutionResponse); 
                }
            }
        }
      }

      // 标记执行完成
      currentExecutionResponse.markCompleted();
    } catch (error) {
      console.error('Stream error:', error);
      currentExecutionResponse.markCompleted();
      throw error;
    } finally {
      this.setExecuting(false);
    }

    return currentExecutionResponse;
  }

  /** 清理资源 */
  dispose() {
    // 事件持久化已移至 backend，无需在前端清理
  }
}

export namespace Executor {
  // Re-export types from BaseEvent for convenience
  export type RoleName = BaseEvent.RoleName;
  export type SubType = BaseEvent.SubType;
  export type EventType = BaseEvent.EventType;
  export type EventStatus = BaseEvent.EventStatus;

  // Re-export event data types
  export type ClarifyEventData = ClarifyEvent.IData;
  export type BriefEventData = BriefEvent.IData;
  export type ChatEventData = ChatEvent.IData;
  export type ToolCallEventData = ToolCallEvent.IData;

  // Re-export utility functions
  export const parseEventType = BaseEvent.parseEventType;
  export const createEventType = BaseEvent.createEventType;
}
