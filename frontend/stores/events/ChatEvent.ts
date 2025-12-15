import { BaseEvent } from './BaseEvent';

/**
 * 聊天事件
 */
export class ChatEvent extends BaseEvent<ChatEvent.IContent> {
  content: ChatEvent.IContent;

  constructor(data: BaseEvent.IEventData<ChatEvent.IData>) {
    super(data);
    this.content = data.content;
  }

  /** 消息内容 */
  get message(): string {
    return this.content.data.message;
  }

  /**
   * 创建 ChatEvent（前端本地创建，用于欢迎消息、错误消息等）
   */
  static create(
    id: string,
    message: string,
    roleName: BaseEvent.RoleName = 'ai',
    status: BaseEvent.EventStatus = 'finished'
  ): ChatEvent {
    return new ChatEvent({
      id,
      eventType: BaseEvent.createEventType(roleName, 'chat'),
      status,
      content: {
        contentType: 'text',
        data: { message },
      },
    });
  }
}

export namespace ChatEvent {
  export interface IData {
    message: string;
  }

  export interface IContent extends BaseEvent.IContent {
    data: IData;
  }
}


