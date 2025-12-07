import { BaseEvent } from './BaseEvent';

/**
 * 聚合事件
 * 用于聚合后续的子事件
 */
export class GroupEvent extends BaseEvent<GroupEvent.IContent> {
  content: GroupEvent.IContent;

  constructor(data: BaseEvent.IEventData<GroupEvent.IData>) {
    super(data);
    this.content = data.content;
  }
}

export namespace GroupEvent {
  export interface IData {
    // GroupEvent 没有额外的数据
  }

  export interface IContent {
    contentType: 'text';
    data: IData | null;
  }
}

