import {BaseEvent} from './BaseEvent';

export class ChatEvent extends BaseEvent<ChatEvent.IContent> {
    content: ChatEvent.IContent = {
        contentType: 'text',
        data: {
            message: '',
        },
    };

    constructor() {
        super('chat');
    }

    /** 设置消息内容 */
    setMessage(message: string): this {
        this.content.data.message = message;
        return this;
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            eventType: this.eventType,
            status: this.status,
            content: this.content,
        };
    }
}

export namespace ChatEvent {
    export interface IContent {
        contentType: 'text';
        data: {
            /** 消息内容 */
            message: string;
        };
    }
}


