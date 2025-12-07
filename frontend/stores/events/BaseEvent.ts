/**
 * 事件基类
 * 前端事件实体，用于存储从后端接收的事件数据
 */
export abstract class BaseEvent<T extends BaseEvent.IContent = BaseEvent.IContent> {
  /** 事件唯一标识 */
  id: string;

  /** 事件类型 */
  eventType: BaseEvent.EventType;

  /** 事件状态 */
  status: BaseEvent.EventStatus;

  /** 父事件 ID（可选，用于构建事件树） */
  parentId?: string;

  /** 事件内容 */
  abstract content: T;

  constructor(data: BaseEvent.IEventData) {
    this.id = data.id;
    this.eventType = data.eventType;
    this.status = data.status;
    this.parentId = data.parentId;
  }

  /** 获取解析后的事件类型信息 */
  get parsed(): BaseEvent.ParsedEventType {
    return BaseEvent.parseEventType(this.eventType);
  }

  /** 获取角色名称 */
  get roleName(): BaseEvent.RoleName {
    return this.parsed.roleName;
  }

  /** 获取子类型 */
  get subType(): BaseEvent.SubType {
    return this.parsed.subType;
  }
}

export namespace BaseEvent {
  /** 
   * 角色名称
   * - ai: 最普通的回复角色，用于 clarifyNode 和 briefGenerationNode
   * - supervisor: 研究主管，用于 supervisor 节点
   * - researcher: 研究员角色，用于 researchAgentGraph 中的 llm 节点
   */
  export type RoleName = 'ai' | 'supervisor' | 'researcher';

  /** 基础事件子类型 */
  export type SubType = 'clarify' | 'brief' | 'chat' | 'tool_call' | 'group';

  /** 事件类型，格式为 /{roleName}/{subType} */
  export type EventType = `/${RoleName}/${SubType}`;

  /** 事件状态 */
  export type EventStatus = 'pending' | 'running' | 'finished' | 'error';

  /** 解析后的事件类型信息 */
  export interface ParsedEventType {
    roleName: RoleName;
    subType: SubType;
  }

  /**
   * 解析 eventType 获取 roleName 和 subType
   */
  export function parseEventType(eventType: EventType): ParsedEventType {
    const parts = eventType.split('/').filter(Boolean);
    return {
      roleName: parts[0] as RoleName,
      subType: parts[1] as SubType,
    };
  }

  /**
   * 创建 eventType
   */
  export function createEventType(roleName: RoleName, subType: SubType): EventType {
    return `/${roleName}/${subType}`;
  }

  /** 事件内容基础接口 */
  export interface IContent {
    contentType: 'text';
    data: unknown;
  }

  /** 后端发送的事件数据格式 */
  export interface IEventData<T = unknown> {
    id: string;
    eventType: EventType;
    status: EventStatus;
    content: {
      contentType: 'text';
      data: T;
    };
    /** 父事件 ID（可选，用于构建事件树） */
    parentId?: string;
  }
}

