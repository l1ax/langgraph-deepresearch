import { observable, action, computed, makeObservable, flow } from 'mobx';
import { Config, ThreadState } from '@/types/langgraph';
import { AnyEvent, createEventFromData, BaseEvent, isChatEvent, ChatEvent } from './events';
import { ExecutionResponse } from './ExecutionResponse';
import { Executor } from './Executor';
import { apiService, StoredEvent } from '@/services/api';
import {Client, Run, Thread} from '@langchain/langgraph-sdk';
import {userStore} from './User';
import data from './data.json';

const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || 'http://localhost:2024';

/**
 * Conversation 类
 * 以 threadId 为唯一标识，管理一次对话中的所有 elements
 * 维护 client 和 executor 实例
 */
export class Conversation {
  static async createNew(title: string): Promise<Conversation> {
    if (!userStore.currentUser) {
      throw new Error('User not logged in');
    }

    const response: Response = await fetch(`${LANGGRAPH_API_URL}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        metadata: {},
        userId: userStore.currentUser.id,
        title: title
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: ${response.statusText}`);
    }

    const thread: Thread = await response.json();

    return new Conversation(thread.thread_id, title);
  }

  /** 会话唯一标识（对应 LangGraph threadId） */
  readonly threadId: string;

  /** Executor 实例 */
  readonly executor: Executor;

  @observable isLoading: boolean = false;

  /** 会话标题 */
  @observable title: string | null = null;

  /** 会话中的元素列表（用户消息和助手回答） */
  @observable elements: Conversation.Element[] = [];

  @observable
  createdAt: string = new Date().toISOString();

  @observable
  updatedAt: string = new Date().toISOString();

  client: Client = new Client({ apiUrl: LANGGRAPH_API_URL });

  threadState: ThreadState<{events: Array<BaseEvent.IEventData>}> | null = null;

  dispose = action(() => {
    this.executor.dispose();
  });

  getTitle = action(() => {
    if (this.title) {
      const title = this.title.slice(0, 30);
      return title.length < this.title.length ? `${title}...` : title;
    }

    return '新对话';
  });

  constructor(threadId: string, title?: string | null) {
    this.threadId = threadId;
    this.title = title ?? null;
    // 创建 executor 并传入自身引用
    this.executor = new Executor(this, this.client);

    makeObservable(this);
  }

  /** 设置会话标题 */
  @action.bound
  setTitle(title: string | null) {
    this.title = title;
  }

  /** 添加用户消息元素 */
  @action.bound
  addUserMessage(content: string): Conversation.UserElement {
    const element: Conversation.UserElement = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    this.elements.push(element);
    return element;
  }

  /** 添加独立的助手事件元素（用于欢迎消息等不需要用户提问的场景） */
  @action.bound
  addStandaloneAssistantEvent(event: AnyEvent): Conversation.AssistantElement {
    // 创建一个包含单个事件的 ExecutionResponse
    const executionResponse = new ExecutionResponse();
    executionResponse.upsertEvent(event);
    executionResponse.markCompleted();

    return this.addExecutionResponse(executionResponse);
  }

  /** 将 ExecutionResponse 包装成 AssistantElement 并添加到 elements */
  @action.bound
  addExecutionResponse(executionResponse: ExecutionResponse): Conversation.AssistantElement {
    const element: Conversation.AssistantElement = {
      id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      executionResponse,
      timestamp: new Date(),
    };
    this.elements.push(element);
    return element;
  }

  /** 从 events 数组恢复对话历史 */
  @action.bound
  restoreFromEvents(events: BaseEvent.IEventData[]): void {
    this.elements = [];

    // 以 human chat event 为分割点，将两个 human chat event 之间的事件包装成 assistantElement
    let currentExecutionResponse: ExecutionResponse | null = null;

    for (const eventData of events) {
      try {
        const event = createEventFromData(eventData);

        // 如果是 human 的 chat 事件
        if (isChatEvent(event) && event.roleName === 'human') {
          // 如果有待处理的 AI 事件（上一轮对话的 AI 回复），先将它们包装成 assistantElement
          if (currentExecutionResponse && currentExecutionResponse.events.length > 0) {
            this.addExecutionResponse(currentExecutionResponse);
          }

          // 重置 ExecutionResponse
          currentExecutionResponse = null;

          // 添加用户消息
          this.addUserMessage(event.message);
        } else {
          // AI 的事件，累积到当前的 ExecutionResponse 中
          if (!currentExecutionResponse) {
            currentExecutionResponse = new ExecutionResponse();
          }
          currentExecutionResponse.upsertEvent(event);
        }
      } catch (error) {
        console.error('Failed to restore event:', error, eventData);
      }
    }

    // 处理最后一轮对话的 AI 回复（如果有）
    if (currentExecutionResponse && currentExecutionResponse.events.length > 0) {
      currentExecutionResponse.markCompleted();
      this.addExecutionResponse(currentExecutionResponse);
    }
  }

  /** 恢复历史数据 */
  @flow.bound
  *restoreBasicDataByThreadId(threadId: string) {
    try {
      this.isLoading = true;

      // 直接调用 LangGraph backend API 获取线程状态
      const state: ThreadState<{events: Array<BaseEvent.IEventData>}> = yield this.client.threads.getState(threadId);

      this.threadState = state;
    }
    catch (error) {
      console.error('Failed to restore basic data:', error);
      throw error;
    }
    finally {
      this.isLoading = false;
    }
  }

  /** 将数据库存储的事件转换为 BaseEvent.IEventData 格式 */
  private convertStoredEventToEventData(storedEvent: StoredEvent): BaseEvent.IEventData {
    return {
      id: storedEvent.id,
      eventType: storedEvent.eventType as BaseEvent.EventType,
      status: storedEvent.status as BaseEvent.EventStatus,
      content: storedEvent.content as BaseEvent.IContent,
      parentId: storedEvent.parentId,
    };
  }

  @flow.bound
  *restoreChatHistoryByThreadId(threadId: string) {
    // 从数据库获取 events（Proxy 已自动持久化）
    let dbEvents: StoredEvent[] = [];
    try {
      dbEvents = yield apiService.getEventsByThread(threadId);
    } catch (error) {
      console.warn('[Conversation] Failed to fetch events from database:', error);
    }

    // 转换数据库 events 为 IEventData 格式
    const events = dbEvents.map(e => this.convertStoredEventToEventData(e));
    // const events = data.map(e => this.convertStoredEventToEventData(e));

    if (events.length > 0) {
      this.restoreFromEvents(events);
    }

    // 如果有未完成的节点（用户中途退出），检查是否有活跃的 run 需要恢复
    if (this.threadState?.next && this.threadState.next.length > 0) {
      try {
        // 调用 Proxy 的 resume 端点检查是否有活跃的 run
        const runs: Run[] = yield this.client.runs.list(this.threadId);

        // 复用最后一个 assistantElement 的 executionResponse
        // 否则创建新的 executionResponse
        let executionResponse: ExecutionResponse;
        const lastElement = this.elements[this.elements.length - 1];

        if (lastElement && Conversation.isAssistantElement(lastElement)) {
          // 复用未完成的 executionResponse
          executionResponse = lastElement.executionResponse;
        } else {
          executionResponse = new ExecutionResponse();
          this.addExecutionResponse(executionResponse);
        }

        if (runs.length > 0) {
          const run = runs[runs.length - 1];
          this.executor.joinExistingRun(
            run.run_id,
            run.assistant_id,
            executionResponse
          );
        }
      } catch (error) {
        console.error('[Conversation] Failed to resume active run:', error);
      }
    }
  }

  /** 获取所有元素（用于 UI 渲染） */
  @computed
  get allElements(): Conversation.Element[] {
    return this.elements;
  }

  /** 获取元素数量 */
  @computed
  get elementCount(): number {
    return this.elements.length;
  }
}

export namespace Conversation {
  /** 用户元素 */
  export interface UserElement {
    /** 元素唯一标识 */
    id: string;
    /** 角色 */
    role: 'user';
    /** 用户消息内容 */
    content: string;
    /** 时间戳 */
    timestamp: Date;
  }

  /** 助手元素 */
  export interface AssistantElement {
    /** 元素唯一标识 */
    id: string;
    /** 角色 */
    role: 'assistant';
    /** ExecutionResponse（包含本次执行的所有事件和 treeView） */
    executionResponse: ExecutionResponse;
    /** 时间戳 */
    timestamp: Date;
  }

  /** 元素类型（用户消息或助手回答） */
  export type Element = UserElement | AssistantElement;

  /** 类型守卫：判断是否为用户元素 */
  export function isUserElement(element: Element): element is UserElement {
    return element.role === 'user';
  }

  /** 类型守卫：判断是否为助手元素 */
  export function isAssistantElement(element: Element): element is AssistantElement {
    return element.role === 'assistant';
  }

  /** 
   * 事件分组项类型
   * 将连续的 tool_call 事件合并为一组，其他事件单独作为一项
   */
  export type GroupedEventItem = 
    | { type: 'event', event: AnyEvent }
    | { type: 'tool_group', events: AnyEvent[] };

  /**
   * 对助手元素的事件进行分组
   * 连续的 tool_call 事件合并为一组，其他事件单独作为一项
   * @param element 助手元素
   * @returns 分组后的事件项数组
   */
  export function groupEvents(element: AssistantElement): GroupedEventItem[] {
    const groups: GroupedEventItem[] = [];
    let currentToolGroup: AnyEvent[] = [];

    element.executionResponse.events.forEach((event: AnyEvent) => {
      if (event.subType === 'tool_call') {
        currentToolGroup.push(event);
      } else {
        if (currentToolGroup.length > 0) {
          groups.push({ type: 'tool_group', events: [...currentToolGroup] });
          currentToolGroup = [];
        }
        groups.push({ type: 'event', event });
      }
    });

    if (currentToolGroup.length > 0) {
      groups.push({ type: 'tool_group', events: [...currentToolGroup] });
    }

    return groups;
  }

  /**
   * 生成事件的唯一 key（用于 React key prop）
   * 包含 id 和 status，确保状态变化时重新渲染
   */
  export function getEventKey(event: AnyEvent): string {
    return `${event.id}-${event.status}`;
  }

  /**
   * 生成工具组的唯一 key（用于 React key prop）
   * 包含第一个事件的 id 和所有事件的 status，确保状态变化时重新渲染
   */
  export function getToolGroupKey(events: AnyEvent[]): string {
    if (events.length === 0) return 'empty-group';
    const statuses = events.map(e => e.status).join(',');
    return `group-${events[0].id}-${statuses}`;
  }
}
