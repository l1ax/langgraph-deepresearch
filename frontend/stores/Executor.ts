import { observable, action, makeObservable } from 'mobx';
import { Client } from '@langchain/langgraph-sdk';
import { Config } from '@/types/langgraph';
import {
  BaseEvent,
  AnyEvent,
  createEventFromData,
} from './events';
import { ExecutionResponse } from './ExecutionResponse';

const DEFAULT_GRAPH_ID = 'fullResearchAgent';

const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || 'http://localhost:2024';

interface IConversation {
  readonly threadId: string;
}

export class Executor {
  /** 关联的会话 */
  private readonly conversation: IConversation;

  /** LangGraph SDK client */
  private readonly client: Client;

  /** 是否正在执行 */
  @observable isExecuting: boolean = false;

  /** 当前的 abort controller，用于中断流式数据接收 */
  private currentAbortController: AbortController | null = null;

  constructor(conversation: IConversation, client: Client) {
    this.conversation = conversation;
    this.client = client;
    makeObservable(this);
  }

  @action.bound
  abort() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
      this.setExecuting(false);
    }
  }

  @action.bound
  private upsertEvent(
    data: BaseEvent.IEventData<unknown>,
    executionResponse: ExecutionResponse
  ): AnyEvent {
    const event = createEventFromData(data);
    executionResponse.upsertEvent(event);
    return event;
  }

  @action.bound
  private handleCustomChunk(
    chunk: any,
    executionResponse: ExecutionResponse
  ): AnyEvent | null {
    console.log(chunk);

    const data = chunk.data as BaseEvent.IEventData<unknown>;

    if (data?.eventType && data?.id) {
      data.status = data.status || 'finished';
      return this.upsertEvent(data, executionResponse);
    }

    return null;
  }

  @action.bound
  private setExecuting(value: boolean) {
    this.isExecuting = value;
  }

  @action.bound
  async invoke(params: {
    input: Record<string, unknown> | null;
    executionResponse?: ExecutionResponse;
    config?: Config;
    graphId?: string;
  }): Promise<ExecutionResponse | undefined> {
    const { threadId } = this.conversation;
    const { input, executionResponse, config, graphId = DEFAULT_GRAPH_ID } = params;

    if (!threadId) {
      throw new Error('Conversation threadId not initialized');
    }

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    const defaultConfig: Config = {
      recursion_limit: 100,
      configurable: {
        thread_id: threadId
      }
    }

    this.currentAbortController = new AbortController();
    this.setExecuting(true);

    const currentExecutionResponse = executionResponse || new ExecutionResponse();

    try {
      const streamResponse = this.client.runs.stream(
        threadId,
        graphId,
        {
          input: input || {},
          streamMode: "custom",
          config: { ...defaultConfig, ...config },
          signal: this.currentAbortController.signal,
        }
      );

      // 遍历流式响应
      for await (const chunk of streamResponse) {
        this.handleCustomChunk(chunk, currentExecutionResponse);
      }

      currentExecutionResponse.markCompleted();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        currentExecutionResponse.markCompleted();
        return currentExecutionResponse;
      }

      console.error('Stream error:', error);
      currentExecutionResponse.markCompleted();
      throw error;
    } finally {
      this.setExecuting(false);
      this.currentAbortController = null;
    }

    return currentExecutionResponse;
  }

  /**
   * 恢复未完成的 run
   */
  @action.bound
  async joinExistingRun(
    runId: string,
    graphId: string,
    executionResponse?: ExecutionResponse
  ): Promise<ExecutionResponse | undefined> {
    const { threadId } = this.conversation;

    if (!threadId) {
      throw new Error('Conversation threadId not initialized');
    }

    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    this.currentAbortController = new AbortController();
    this.setExecuting(true);

    const currentExecutionResponse = executionResponse || new ExecutionResponse();

    try {
      console.log(`[Executor] Joining run ${runId} for thread ${threadId}`);

      // 使用 joinStream 恢复
      const streamResponse = this.client.runs.joinStream(threadId, runId, {
        streamMode: "custom",
        signal: this.currentAbortController.signal,
      });

      for await (const chunk of streamResponse) {
        this.handleCustomChunk(chunk, currentExecutionResponse);
      }

      currentExecutionResponse.markCompleted();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        currentExecutionResponse.markCompleted();
        return currentExecutionResponse;
      }

      console.error('Join stream error:', error);
      currentExecutionResponse.markCompleted();
      throw error;
    } finally {
      this.setExecuting(false);
      this.currentAbortController = null;
    }

    return currentExecutionResponse;
  }

  dispose() {
    this.abort();
  }
}

export namespace Executor {
  export type RoleName = BaseEvent.RoleName;
  export type SubType = BaseEvent.SubType;
  export type EventType = BaseEvent.EventType;
  export type EventStatus = BaseEvent.EventStatus;

  export type ClarifyEventData = BaseEvent.IEventData<unknown>;
  export type BriefEventData = BaseEvent.IEventData<unknown>;
  export type ChatEventData = BaseEvent.IEventData<unknown>;
  export type ToolCallEventData = BaseEvent.IEventData<unknown>;

  export const parseEventType = BaseEvent.parseEventType;
  export const createEventType = BaseEvent.createEventType;
}
