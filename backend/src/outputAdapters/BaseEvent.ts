import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// 用于生成确定性 UUID 的命名空间（固定值）
const EVENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export abstract class BaseEvent<T extends BaseEvent.IContent> implements BaseEvent.IEvent<T> {
    /** 事件唯一标识 */
    id: string;

    /** 事件状态 */
    status: BaseEvent.EventStatus;

    /** 父事件 ID（可选，用于构建事件树） */
    parentId?: string;

    /**
     * @param eventType 事件类型
     * @param deterministicId 可选的确定性 ID（如果不提供则使用随机 UUID）
     */
    constructor(public eventType: BaseEvent.EventType, deterministicId?: string) {
        this.id = deterministicId || uuidv4();
        this.status = 'pending';
    }

    /**
     * 生成确定性事件 ID
     * 使用 UUIDv5 基于输入生成，相同输入总是生成相同 ID
     * 
     * @param threadId 线程 ID
     * @param checkpointId checkpoint ID
     * @param nodeName 节点名称
     * @param eventType 事件类型
     * @param index 事件在节点中的索引（用于同一节点产生多个事件的情况）
     */
    static generateDeterministicId(
        threadId: string,
        checkpointId: string | undefined,
        nodeName: string,
        eventType: string,
        index: number = 0
    ): string {
        const name = `${threadId}:${checkpointId || 'initial'}:${nodeName}:${eventType}:${index}`;
        return uuidv5(name, EVENT_NAMESPACE);
    }

    abstract content: T;

    /**
     * 序列化为JSON对象
     */
    toJSON(): BaseEvent.IJsonData {
        return {
            id: this.id,
            eventType: this.eventType,
            status: this.status,
            // config.writer为异步发送，如果不拷贝的话由于同时对content进行修改会导致event数据重复
            content: JSON.parse(JSON.stringify(this.content)),
            ...(this.parentId && { parentId: this.parentId }),
        };
    }

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
     * - human: 用户
     */
    export type RoleName = 'ai' | 'supervisor' | 'researcher' | 'human';

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

    /**
     * 内容聚合规则
     * - concat: 拼接内容（用于流式传输）
     * - replace: 替换内容（默认行为）
     */
    export type AggregateRule = 'concat' | 'replace';

    /** 事件内容 */
    export interface IContent {
        /** 传输内容的类型 */
        contentType: 'text';
        /** 传输内容 */
        data: unknown;
        /** 内容聚合规则（可选，默认为 replace） */
        aggregateRule?: AggregateRule;
    }

    export interface IJsonData<T = Record<string, unknown>> {
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
}
