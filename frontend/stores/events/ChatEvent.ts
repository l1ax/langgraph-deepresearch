import {observable} from 'mobx';
import { BaseEvent } from './BaseEvent';

/**
 * 简单的输出事件
 */
export class ChatEvent extends BaseEvent<ChatEvent.IContent> {
  static create(params: {
    id: string;
    message: string;
    subType: 'chat' | 'report_generation';
    roleName: BaseEvent.RoleName;
    status: BaseEvent.EventStatus;
  }): ChatEvent {
    const { id, message, subType = 'chat', roleName = 'ai', status = 'finished' } = params;

    return new ChatEvent({
      id,
      eventType: BaseEvent.createEventType(roleName, subType),
      status,
      content: {
        contentType: 'text',
        data: { message },
      },
    });
  }

  content: ChatEvent.IContent;

  constructor(data: BaseEvent.IEventData<ChatEvent.IData>) {
    super(data);
    this.content = data.content;
  }

  /** 消息内容 */
  get message(): string {
    return this.content.data.message;
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


