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
    constructor(params: {
        role: BaseEvent.RoleName;
        deterministicId?: string;
        subType?: 'chat' | 'report_generation';
    }) {
        const { role, deterministicId, subType = 'chat' } = params;
        super(BaseEvent.createEventType(role, subType), deterministicId);
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


