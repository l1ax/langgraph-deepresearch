import React from 'react';
import { AnyEvent, BaseEvent } from '@/stores';

/** 事件渲染器组件 Props */
export interface EventRendererProps<E extends AnyEvent = AnyEvent> {
  /** 事件对象 */
  event: E;
  /** 自定义类名 */
  className?: string;
  /** 子节点 (用于 GroupEvent) */
  children?: React.ReactNode;
  /** 子节点数量 (用于 GroupEvent) */
  childCount?: number;
}

/** 事件渲染器组件类型 */
export type EventRenderer<E extends AnyEvent = AnyEvent> = React.ComponentType<EventRendererProps<E>>;

/**
 * EventRendererRegistry
 * 管理 subType -> Renderer 的映射
 * 渲染器按 subType 注册，获取时根据 eventType 解析 subType 后查找
 */
class EventRendererRegistryClass {
  private renderers: Map<BaseEvent.SubType, EventRenderer> = new Map();

  /**
   * 注册渲染器
   * @param subType 事件子类型
   * @param renderer 渲染器组件
   */
  register<E extends AnyEvent>(subType: BaseEvent.SubType, renderer: EventRenderer<E>): void {
    this.renderers.set(subType, renderer as EventRenderer);
  }

  /**
   * 根据 subType 获取渲染器
   * @param subType 事件子类型
   * @returns 渲染器组件，如果未注册则返回 undefined
   */
  get(subType: BaseEvent.SubType): EventRenderer | undefined {
    return this.renderers.get(subType);
  }

  /**
   * 检查是否已注册某子类型的渲染器
   * @param subType 事件子类型
   */
  has(subType: BaseEvent.SubType): boolean {
    return this.renderers.has(subType);
  }

  /**
   * 注销渲染器
   * @param subType 事件子类型
   */
  unregister(subType: BaseEvent.SubType): boolean {
    return this.renderers.delete(subType);
  }

  /**
   * 获取所有已注册的事件子类型
   */
  getRegisteredTypes(): BaseEvent.SubType[] {
    return Array.from(this.renderers.keys());
  }
}

/** 全局单例 */
export const EventRendererRegistry = new EventRendererRegistryClass();

/**
 * EventView 组件
 * 根据事件类型自动选择对应的渲染器进行渲染
 */
export const EventView: React.FC<{
  event: AnyEvent;
  className?: string;
}> = ({ event, className }) => {
  const Renderer = EventRendererRegistry.get(event.subType);

  if (!Renderer) {
    return null;
  }

  return <Renderer event={event} className={className} />;
};

