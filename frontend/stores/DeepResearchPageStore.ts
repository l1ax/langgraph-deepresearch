import { observable, action, flow, computed, makeObservable, flowResult, runInAction } from 'mobx';
import { Thread as LangGraphThread } from '@/types/langgraph';
import { Conversation } from './Conversation';
import { ChatEvent } from './events';
import { ExecutionResponse } from './ExecutionResponse';
import { apiService, type Thread } from '@/services/api';
import { userStore } from './User';

const LANGGRAPH_API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || 'http://localhost:2024';

/**
 * DeepResearchPageStore
 * 页面级 Store，管理 client 和 conversations
 */
export class DeepResearchPageStore {
  /** 输入框当前值 */
  @observable inputValue: string = '';

  /** 会话列表 */
  @observable conversations: Conversation[] = [];

  /** 当前活跃的会话 */
  @observable currentConversation: Conversation | null = null;

  /** 侧边栏是否展开 */
  @observable isSidebarOpen: boolean = true;

  /** 工作流视图是否展开 */
  @observable isWorkflowViewOpen: boolean = false;

  /** 是否正在初始化 */
  @observable isInitializing: boolean = false;

  // ===== UI Loading 状态 =====

  /** 删除会话的 loading 状态，key 是 threadId */
  @observable deletingConversationIds: Set<string> = new Set();

  /** 创建会话的 loading 状态 */
  @observable isCreatingConversation: boolean = false;

  /** 发送消息的 loading 状态 */
  @observable isSendingMessage: boolean = false;

  /** 加载会话列表的 loading 状态 */
  @observable isLoadingConversations: boolean = false;

  /** 加载历史记录的 loading 状态 */
  @observable isHistoryLoading: boolean = false;

  constructor() {
    makeObservable(this);

    // 监听用户状态变化
    userStore.events.on('userChange', this.onUserChange);
  }

  /** 加载用户的会话列表 */
  @flow.bound
  *loadUserConversations(): Generator<Promise<any>, void, any> {
    if (!userStore.currentUser) return;

    try {
      this.isLoadingConversations = true;
      const threads: Thread[] = yield flowResult(apiService.getThreadsByUser(userStore.currentUser.id));

      // 清空现有会话
      this.conversations = [];

      const asyncTasks = threads.map(async (thread) => {
        const conversation = new Conversation(thread.id, thread.title);

        conversation.createdAt = thread.createdAt;
        conversation.updatedAt = thread.updatedAt;

        this.conversations.push(conversation);

        await flowResult(conversation.restoreBasicDataByThreadId(thread.id));
      });

      yield Promise.all(asyncTasks);
    } finally {
      this.isLoadingConversations = false;
    }
  }

  /** 用户状态变化处理 */
  @action.bound
  private onUserChange(user: typeof userStore.currentUser) {
    if (user) {
      // 用户登录，加载会话
      this.loadUserConversations();
    } else {
      // 用户登出，清空会话
      this.conversations = [];
      this.currentConversation = null;
    }
  }

  // ===== Loading 状态检查方法 =====

  /** 检查指定会话是否正在删除 */
  isConversationDeleting(threadId: string): boolean {
    return this.deletingConversationIds.has(threadId);
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

  /** 切换工作流视图展开/收起 */
  @action.bound
  toggleWorkflowView() {
    this.isWorkflowViewOpen = !this.isWorkflowViewOpen;
  }

  /** 切换到指定的会话 */
  @flow.bound
  *switchToConversation(conversation: Conversation): Generator<Promise<any>, void, any> {
    if (conversation === this.currentConversation) {
      return;
    }

    try {
      // 如果当前有正在执行的会话，中止它
      if (this.currentConversation && this.currentConversation !== conversation) {
        this.currentConversation.executor.abort();
      }

      this.isHistoryLoading = true;

      this.currentConversation = conversation;

      yield Promise.all([
        flowResult(conversation.restoreBasicDataByThreadId(conversation.threadId)),
        flowResult(conversation.restoreChatHistoryByThreadId(conversation.threadId))
      ]);
    } catch (error) {
      console.error('Failed to switch conversation:', error);
    } finally {
      this.isHistoryLoading = false;
    }
  }

  /** 创建新对话入口：重置当前会话，回到欢迎页 */
  @action.bound
  createNewConversation() {
    // 如果当前有正在执行的会话，中止它
    if (this.currentConversation) {
      console.log('[DeepResearchPageStore] Aborting current conversation for new conversation');
      this.currentConversation.executor.abort();
    }

    this.currentConversation = null;
    this.clearInput();
  }

  /** 删除指定会话 */
  @flow.bound
  *deleteConversation(threadId: string): Generator<Promise<any>, void, any> {
    // 设置删除中状态
    this.deletingConversationIds.add(threadId);
    
    try {
      // 从数据库删除
      yield flowResult(apiService.deleteThread(threadId));

      // 从本地列表移除
      const index = this.conversations.findIndex(c => c.threadId === threadId);
      if (index !== -1) {
        this.conversations.splice(index, 1);
      }

      // 如果删除的是当前会话，重置当前会话
      if (this.currentConversation?.threadId === threadId) {
        this.currentConversation = null;
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    } finally {
      this.deletingConversationIds.delete(threadId);
    }
  }

  /** 初始化客户端和认证状态 */
  @flow.bound
  *initClient(): Generator<Promise<any>, void, any> {
    if (this.isInitializing) return;

    try {
      this.isInitializing = true;

      // 初始化用户认证状态（会触发 userChange 事件）
      yield flowResult(userStore.initialize());

    } catch (error) {
      console.error('Failed to initialize client:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /** 清理资源 */
  @action.bound
  dispose() {
    this.conversations.forEach(conversation => conversation.dispose());
    userStore.events.off('userChange', this.onUserChange);
  }

  /** 添加错误消息到当前会话 */
  @action.bound
  private addErrorMessage(content: string) {
    if (this.currentConversation) {
      const errorEvent = ChatEvent.create(
        {
          id: `error-${Date.now()}`,
          message: content,
          subType: 'chat',
          roleName: 'ai',
          status: 'error',
        }
      );
      // 创建包含错误事件的 ExecutionResponse
      const executionResponse = new ExecutionResponse();
      executionResponse.upsertEvent(errorEvent);
      executionResponse.markCompleted();
      this.currentConversation.addExecutionResponse(executionResponse);
    }
  }

  @flow.bound
  * initConversationAfterQuery() {
    if (!this.currentConversation) {
      return;
    }

    const userMessageContent = this.inputValue;

    // 添加用户消息到当前会话
    this.currentConversation.addUserMessage(userMessageContent);
    this.clearInput();

    const executionResponse = new ExecutionResponse();

    this.currentConversation.addExecutionResponse(executionResponse);

    try {
      this.isSendingMessage = true;
      
      // 自动收起侧边栏
      if (this.isSidebarOpen) {
        this.toggleSidebar();
      }
      
      yield this.currentConversation.executor.invoke({
        input: { messages: [{ role: 'user', content: userMessageContent }] },
        executionResponse
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // 如果出错，移除刚才添加的 executionResponse，改用错误消息
      const elements = this.currentConversation.elements;
      const lastElement = elements[elements.length - 1];
      if (Conversation.isAssistantElement(lastElement) && lastElement.executionResponse === executionResponse) {
        elements.pop();
      }
      this.addErrorMessage(
        '抱歉，处理您的请求时出现错误。'
      );
      throw error;
    } finally {
      this.isSendingMessage = false;
    }
  }

  /** 提交用户消息并处理流式响应 */
  @flow.bound
  * handleSubmit() {
    if (!this.inputValue.trim()) return;

    // 检查是否已登录
    if (!userStore.currentUser) {
      throw new Error('请先登录后再发送消息');
    }

    let conversation = this.currentConversation;

    if (!conversation) {
      try {
        this.isCreatingConversation = true;

        const title = this.inputValue.slice(0, 100);
        
        conversation = yield Conversation.createNew(title);
        // 创建时间倒序排序
        this.conversations.unshift(conversation!);

        this.currentConversation = conversation;

        this.isCreatingConversation = false;
      } catch (error) {
        console.error('Failed to create conversation thread:', error);

        this.addErrorMessage('无法创建新的对话，请稍后重试或确认服务配置。');

        throw error;
      } finally {
        this.isCreatingConversation = false;
      }
    }

    yield this.initConversationAfterQuery();
  }

  /** 是否正在加载/处理请求 */
  @computed
  get isLoading(): boolean {
    return this.currentConversation?.executor.isExecuting ?? false;
  }

  /** 是否可以提交（非加载中且输入不为空且已登录） */
  @computed
  get canSubmit(): boolean {
    return !this.isLoading && !!this.inputValue.trim() && !!userStore.currentUser;
  }

  /** 获取当前会话的所有元素（用于 UI 渲染） */
  @computed
  get elements(): Conversation.Element[] {
    return this.currentConversation?.allElements ?? [];
  }

  /** 是否有任何会话正在删除 */
  @computed
  get isAnyConversationDeleting(): boolean {
    return this.deletingConversationIds.size > 0;
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
