import { v4 as uuidv4 } from 'uuid';

export abstract class BaseEvent<T extends BaseEvent.IContent> implements BaseEvent.IEvent<T> {
    /** 事件唯一标识 */
    id: string;

    /** 事件状态 */
    status: BaseEvent.EventStatus;

    constructor(public eventType: BaseEvent.EventType) {
        this.id = uuidv4();
        this.status = 'pending';
    }

    abstract content: T;

    abstract toJSON(): Record<string, unknown>;

    /** 设置事件状态 */
    setStatus(status: BaseEvent.EventStatus): this {
        this.status = status;
        return this;
    }
}

export namespace BaseEvent {
    export interface IEvent<T extends IContent> {
        /** 事件唯一标识 */
        id: string;
        /** 事件类型 */
        eventType: EventType;
        /** 事件状态 */
        status: EventStatus;
        /** 事件内容 */
        content: T;
    }

    /** 事件状态 */
    export type EventStatus = 'pending' | 'running' | 'finished' | 'error';

    /** 事件类型 */
    export type EventType = 'clarify' | 'brief' | 'tool_call' | 'chat';

    /** 事件内容 */
    export interface IContent {
        /** 传输内容的类型 */
        contentType: 'text';
        /** 传输内容 */
        data: unknown;
    }
}
