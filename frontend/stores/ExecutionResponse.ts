import { observable, action, makeObservable } from 'mobx';
import { AnyEvent } from './events';
import { TreeView } from './views/treeViews';
import {WorkflowViews} from './views/workflowViews';

/**
 * ExecutionResponse 类
 * 表示一次执行（invoke）的响应，包含本次执行的所有事件和 treeView
 */
export class ExecutionResponse {
  /** 本次执行的所有事件 */
  @observable.shallow
  events: AnyEvent[] = [];

  /** 本次执行的 treeView */
  @observable
  treeView: TreeView = new TreeView();

  @observable
  WorkflowView: WorkflowViews = new WorkflowViews();

  /** 执行是否完成 */
  @observable
  isCompleted: boolean = false;

  constructor() {
  }

  /** 添加或更新事件 */
  @action.bound
  upsertEvent(event: AnyEvent): void {
    // 更新 events 数组
    const index = this.events.findIndex(e => e.id === event.id);
    if (index !== -1) {
      const existingEvent = this.events[index];

      // 检查是否需要聚合内容
      if (event.content.aggregateRule === 'concat') {
        // 拼接内容：将新数据拼接到已有数据
        // 假设在concat模式下，data是string类型（不完整的JSON字符串）
        const existingData = existingEvent.content.data;
        const newData = event.content.data;

        if (typeof existingData === 'string' && typeof newData === 'string') {
          // 创建新的event对象，拼接data
          event.content.data = existingData + newData;
        }
      }

      this.events[index] = event;
    } else {
      this.events.push(event);
    }

    // 更新 treeView（使用可能已聚合后的event）
    this.treeView.upsertEvent(event);
    this.WorkflowView.transformEventsToViews([event]);
  }

  /** 标记执行完成 */
  @action.bound
  markCompleted(): void {
    this.isCompleted = true;
  }
}

