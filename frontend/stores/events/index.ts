export { BaseEvent } from './BaseEvent';
export { ClarifyEvent } from './ClarifyEvent';
export { BriefEvent } from './BriefEvent';
export { ChatEvent } from './ChatEvent';
export { ToolCallEvent } from './ToolCallEvent';
export { GroupEvent } from './GroupEvent';

import { BaseEvent } from './BaseEvent';
import { ClarifyEvent } from './ClarifyEvent';
import { BriefEvent } from './BriefEvent';
import { ChatEvent } from './ChatEvent';
import { ToolCallEvent } from './ToolCallEvent';
import { GroupEvent } from './GroupEvent';

/** 所有事件类型的联合类型 */
export type AnyEvent = ClarifyEvent | BriefEvent | ChatEvent | ToolCallEvent | GroupEvent;

/**
 * 从后端数据创建事件实例
 * 根据 eventType 的 subType 创建对应的事件类实例
 */
export function createEventFromData(data: BaseEvent.IEventData<unknown>): AnyEvent {
  const { subType } = BaseEvent.parseEventType(data.eventType);

  switch (subType) {
    case 'clarify':
      return new ClarifyEvent(data as BaseEvent.IEventData<ClarifyEvent.IData>);
    case 'brief':
      return new BriefEvent(data as BaseEvent.IEventData<BriefEvent.IData>);
    case 'chat':
      return new ChatEvent(data as BaseEvent.IEventData<ChatEvent.IData>);
    case 'tool_call':
      return new ToolCallEvent(data as BaseEvent.IEventData<ToolCallEvent.IData>);
    case 'group':
      return new GroupEvent(data as BaseEvent.IEventData<GroupEvent.IData>);
    default:
      throw new Error(`Unknown event subType: ${subType}`);
  }
}

/** 类型守卫 */
export function isClarifyEvent(event: AnyEvent): event is ClarifyEvent {
  return event.subType === 'clarify';
}

export function isBriefEvent(event: AnyEvent): event is BriefEvent {
  return event.subType === 'brief';
}

export function isChatEvent(event: AnyEvent): event is ChatEvent {
  return event.subType === 'chat';
}

export function isToolCallEvent(event: AnyEvent): event is ToolCallEvent {
  return event.subType === 'tool_call';
}

export function isGroupEvent(event: AnyEvent): event is GroupEvent {
  return event.subType === 'group';
}

