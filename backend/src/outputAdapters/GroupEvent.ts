/**
 * @file 聚合事件，用于聚合后续的子事件
 */

import {BaseEvent} from './BaseEvent';

export class GroupEvent extends BaseEvent<GroupEvent.IContent> {
    content: GroupEvent.IContent = {
        contentType: 'text',
        data: null,
    };

    constructor(roleName: BaseEvent.RoleName) {
        super(BaseEvent.createEventType(roleName, 'group'));
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            eventType: this.eventType,
            status: this.status,
            content: this.content,
            ...(this.parentId && { parentId: this.parentId }),
        };
    }
}

export namespace GroupEvent {
    export interface IContent {
        contentType: 'text';
        data: null;
    }
}