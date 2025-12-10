import {BaseEvent} from './BaseEvent';

export class ChatEvent extends BaseEvent<ChatEvent.IContent> {
    content: ChatEvent.IContent = {
        contentType: 'text',
        data: {
            message: '',
        },
    };

    /**
     * @param role 角色名称
     * @param deterministicId 可选的确定性 ID
     */
    constructor(role: BaseEvent.RoleName, deterministicId?: string) {
        super(BaseEvent.createEventType(role, 'chat'), deterministicId);
    }

    /** 设置消息内容 */
    setMessage(message: string): this {
        this.content.data.message = message;
        return this;
    }
}

export namespace ChatEvent {
    export interface IContent extends BaseEvent.IContent {
        contentType: 'text';
        data: {
            /** 消息内容 */
            message: string;
        };
    }
}


