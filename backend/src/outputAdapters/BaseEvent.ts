import { v4 as uuidv4 } from 'uuid';

export abstract class BaseEvent<T extends BaseEvent.IContent> implements BaseEvent.IEvent<T> {
    /** 事件唯一标识 */
    id: string;

    /** 事件状态 */
    status: BaseEvent.EventStatus;

    /** 父事件 ID（可选，用于构建事件树） */
    parentId?: string;

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

    /** 设置父事件 ID */
    setParentId(parentId: string): this {
        this.parentId = parentId;
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
        /** 父事件 ID（可选，用于构建事件树） */
        parentId?: string;
    }

    /** 事件状态 */
    export type EventStatus = 'pending' | 'running' | 'finished' | 'error';

    /** 
     * 角色名称
     * - ai: 最普通的回复角色，用于 clarifyNode 和 briefGenerationNode
     * - supervisor: 研究主管，用于 supervisor 节点
     * - researcher: 研究员角色，用于 researchAgentGraph 中的 llm 节点
     */
    export type RoleName = 'ai' | 'supervisor' | 'researcher';

    /** 
     * 基础事件子类型
     */
    export type BaseEventSubType = 'clarify' | 'brief' | 'chat' | 'tool_call' | 'group';

    /** 
     * 事件类型，格式为 /{roleName}/{type}
     * - /ai/clarify: 澄清需求事件
     * - /ai/brief: 研究概要事件
     * - /ai/chat: AI 对话事件
     * - /ai/tool_call: AI 工具调用事件
     * - /supervisor/chat: 研究主管对话事件
     * - /supervisor/tool_call: 研究主管工具调用事件
     * - /researcher/chat: 研究员对话事件
     * - /researcher/tool_call: 研究员工具调用事件
     * - /supervisor/group: 研究主管聚合事件，用于聚合接下来的supervisor events
     * - /researcher/group: 研究员聚合事件，用于聚合接下来的researcher events
     */
    export type EventType = `/${RoleName}/${BaseEventSubType}`;

    /** 
     * 生成事件类型的辅助函数
     */
    export function createEventType(role: RoleName, subType: BaseEventSubType): EventType {
        return `/${role}/${subType}` as EventType;
    }

    /** 事件内容 */
    export interface IContent {
        /** 传输内容的类型 */
        contentType: 'text';
        /** 传输内容 */
        data: unknown;
    }
}
