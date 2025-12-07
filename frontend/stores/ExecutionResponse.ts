import { observable, action, makeObservable } from 'mobx';
import { AnyEvent } from './events';
import { TreeView } from './views/treeViews';

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
  treeView: TreeView;

  /** 执行是否完成 */
  @observable
  isCompleted: boolean = false;

  constructor() {
    makeObservable(this);
    this.treeView = new TreeView();
  }

  /** 添加或更新事件 */
  @action.bound
  upsertEvent(event: AnyEvent): void {
    // 更新 treeView
    this.treeView.upsertEvent(event);

    // 更新 events 数组
    const index = this.events.findIndex(e => e.id === event.id);
    if (index !== -1) {
      this.events[index] = event;
    } else {
      this.events.push(event);
    }
  }

  /** 标记执行完成 */
  @action.bound
  markCompleted(): void {
    this.isCompleted = true;
  }
}

