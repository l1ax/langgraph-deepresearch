import { observable, action, makeObservable } from 'mobx';
import { Config } from '@/types/langgraph';
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

const GRAPH_ID = 'fullResearchAgent';
const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || 'http://localhost:2024';

interface StreamChunk {
  event: string;
  id: string;
  data: unknown;
}

interface IConversation {
  readonly threadId: string;
}

export class Executor {
  private readonly conversation: IConversation;

  @observable isExecuting: boolean = false;
  private currentAbortController: AbortController | null = null;

  constructor(conversation: IConversation) {
    this.conversation = conversation;
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
  private handleChunk(
    chunk: StreamChunk,
    executionResponse: ExecutionResponse
  ): AnyEvent | null {
    if (chunk.event === 'custom' && chunk.data) {
      console.log('chunk.data', chunk.data);
      const data = chunk.data as BaseEvent.IEventData<unknown>;
      if (data.eventType && data.id) {
        data.status = data.status || 'finished';
        return this.upsertEvent(data, executionResponse);
      }
    }
    return null;
  }

  @action.bound
  private setExecuting(value: boolean) {
    this.isExecuting = value;
  }

  @action.bound
  async invoke(
    params: {
      input: Record<string, unknown> | null;
      executionResponse?: ExecutionResponse;
      config?: Config;
    }
  ): Promise<ExecutionResponse | undefined> {
    const { threadId } = this.conversation;
    const { input, executionResponse, config } = params;
    const defaultConfig: Config = {
      recursion_limit: 100,
      configurable: {
        thread_id: threadId
      }
    }

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
      const response = await fetch(`${LANGGRAPH_API_URL}/api/langgraph/run`, {
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
        signal: this.currentAbortController.signal,
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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

  dispose() {}
}

export namespace Executor {
  export type RoleName = BaseEvent.RoleName;
  export type SubType = BaseEvent.SubType;
  export type EventType = BaseEvent.EventType;
  export type EventStatus = BaseEvent.EventStatus;

  export type ClarifyEventData = ClarifyEvent.IData;
  export type BriefEventData = BriefEvent.IData;
  export type ChatEventData = ChatEvent.IData;
  export type ToolCallEventData = ToolCallEvent.IData;

  export const parseEventType = BaseEvent.parseEventType;
  export const createEventType = BaseEvent.createEventType;
}
