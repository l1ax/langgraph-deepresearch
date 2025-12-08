import { observable, action, flow, computed, makeObservable } from 'mobx';
import { Client } from '@langchain/langgraph-sdk';
import { Conversation } from './Conversation';
import { ChatEvent } from './events';
import { ExecutionResponse } from './ExecutionResponse';

// Configuration
const API_URL = 'http://localhost:2024';

/**
 * DeepResearchPageStore
 * 页面级 Store，管理 client 和 conversations
 */
export class DeepResearchPageStore {
  /** 输入框当前值 */
  @observable inputValue: string = '';

  /** LangGraph SDK 客户端实例 */
  @observable client: Client | null = null;

  /** 会话列表 */
  @observable conversations: Conversation[] = [];

  /** 当前活跃的会话 */
  @observable currentConversation: Conversation | null = null;

  /** 侧边栏是否展开 */
  @observable isSidebarOpen: boolean = true;

  constructor() {
    makeObservable(this);
  }

  /** 设置输入框的值 */
  @action.bound
  setInputValue(value: string) {
    this.inputValue = value;
  }

  /** 清空输入框 */
  @action.bound
  private clearInput() {
    this.inputValue = '';
  }

  /** 切换侧边栏展开/收起 */
  @action.bound
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  /** 创建新会话 */
  @action.bound
  private createConversation(threadId: string, options?: { autoSelect?: boolean }): Conversation {
    const autoSelect = options?.autoSelect ?? true;
    const conversation = new Conversation(threadId, this.client);
    this.conversations.push(conversation);
    if (autoSelect) {
      this.currentConversation = conversation;
    }
    this.saveConversationThreadIds();
    return conversation;
  }

  /** 切换到指定的会话 */
  @action.bound
  switchToConversation(threadId: string) {
    const conversation = this.conversations.find(c => c.threadId === threadId);
    if (conversation) {
      this.currentConversation = conversation;
    }
  }

  /** 保存所有会话的 threadIds 到 localStorage */
  @action.bound
  private saveConversationThreadIds() {
    const threadIds = this.conversations.map(c => c.threadId);
    localStorage.setItem('conversationThreadIds', JSON.stringify(threadIds));
  }

  /** 从 localStorage 加载所有会话的 threadIds */
  private loadConversationThreadIds(): string[] {
    const saved = localStorage.getItem('conversationThreadIds');
    return saved ? JSON.parse(saved) : [];
  }

  /** 创建新对话入口：重置当前会话，回到欢迎页 */
  @action.bound
  createNewConversation() {
    this.currentConversation = null;
    this.clearInput();
  }

  /** 初始化客户端和会话线程 */
  @flow.bound
  *initClient(): Generator<Promise<any>, void, any> {
    try {
      // 初始化 client
      this.client = new Client({ apiUrl: API_URL });

      // 加载所有保存的会话 threadIds
      const savedThreadIds = this.loadConversationThreadIds();

      if (savedThreadIds.length > 0) {
        // 恢复所有会话
        for (const threadId of savedThreadIds) {
          const conversation = this.createConversation(threadId, { autoSelect: false });
          conversation.restoreDataByThreadId(threadId);
        }
        this.currentConversation = null;
      }

    } catch (error) {
      console.error('Failed to initialize client:', error);
    }
  }

  /** 添加错误消息到当前会话 */
  @action.bound
  private addErrorMessage(content: string) {
    if (this.currentConversation) {
      const errorEvent = ChatEvent.create(
        `error-${Date.now()}`,
        content
      );
      // 创建包含错误事件的 ExecutionResponse
      const executionResponse = new ExecutionResponse();
      executionResponse.upsertEvent(errorEvent);
      executionResponse.markCompleted();
      this.currentConversation.addExecutionResponse(executionResponse);
    }
  }

  /** 提交用户消息并处理流式响应 */
  @flow.bound
  *handleSubmit() {
    if (!this.inputValue.trim() || !this.client) return;

    let conversation = this.currentConversation;

    if (!conversation) {
      try {
        const thread = yield this.client.threads.create();
        const threadId = thread.thread_id;
        conversation = this.createConversation(threadId);
      } catch (error) {
        console.error('Failed to create conversation thread:', error);
        this.addErrorMessage('无法创建新的对话，请稍后重试或确认服务配置。');
        return;
      }
    }

    if (!conversation) return;

    const userMessageContent = this.inputValue;

    // 添加用户消息到当前会话
    conversation.addUserMessage(userMessageContent);
    this.clearInput();

    // 先创建 ExecutionResponse 并添加到 conversation，这样在流式接收过程中 UI 就能实时渲染
    const executionResponse = new ExecutionResponse();
    conversation.addExecutionResponse(executionResponse);

    try {
      // 调用 conversation 的 executor，传入 executionResponse，让它在流式接收过程中更新
      yield conversation.executor.invoke(userMessageContent, executionResponse);
    } catch (error) {
      console.error('Error sending message:', error);
      // 如果出错，移除刚才添加的 executionResponse，改用错误消息
      const elements = conversation.elements;
      const lastElement = elements[elements.length - 1];
      if (Conversation.isAssistantElement(lastElement) && lastElement.executionResponse === executionResponse) {
        elements.pop();
      }
      this.addErrorMessage(
        '抱歉，处理您的请求时出现错误。请确保后端服务已启动 (http://localhost:2024)。'
      );
    }
  }

  /** 是否正在加载/处理请求 */
  @computed
  get isLoading(): boolean {
    return this.currentConversation?.executor.isExecuting ?? false;
  }

  /** 是否可以提交（非加载中且输入不为空） */
  @computed
  get canSubmit(): boolean {
    return !this.isLoading && !!this.inputValue.trim();
  }

  /** 获取当前会话的所有元素（用于 UI 渲染） */
  @computed
  get elements(): Conversation.Element[] {
    return this.currentConversation?.allElements ?? [];
  }
}

export namespace DeepResearchPageStore {
  /** LangChain 消息内容类型（字符串或内容块数组） */
  export type MessageContent = string | Array<{ type: string; text?: string }>;

  /** LangChain 消息类型 */
  export interface LangChainMessage {
    /** 消息类型 */
    type: 'human' | 'ai' | 'system' | 'tool';
    /** 消息内容 */
    content: MessageContent;
    /** 消息 ID */
    id?: string;
    /** 消息名称 */
    name?: string;
  }

  /** Graph 状态类型（匹配后端 StateAnnotation） */
  export interface GraphState {
    /** 消息列表 */
    messages: LangChainMessage[];
    /** 研究摘要 */
    research_brief: string | null;
    /** 监督者消息 */
    supervisor_messages: LangChainMessage[];
    /** 原始笔记 */
    raw_notes: string[];
    /** 处理后的笔记 */
    notes: string[];
    /** 研究迭代次数 */
    research_iterations: number;
    /** 最终报告 */
    final_report: string | null;
    /** 事件列表（用于恢复历史对话） */
    events: Record<string, unknown>[];
  }

  /** 从 LangChain 消息中提取文本内容 */
  export function extractMessageContent(content: MessageContent): string {
    if (typeof content === 'string') {
      return content;
    }
    return content.map((block) => block.text || '').join('');
  }

  /** 类型守卫：检查 chunk 是否为包含 GraphState 的 values 事件 */
  export function isValuesChunk(
    chunk: { event: string; data: unknown }
  ): chunk is { event: 'values'; data: GraphState } {
    return (
      chunk.event === 'values' &&
      chunk.data !== null &&
      typeof chunk.data === 'object' &&
      'messages' in chunk.data &&
      Array.isArray((chunk.data as GraphState).messages)
    );
  }
}
