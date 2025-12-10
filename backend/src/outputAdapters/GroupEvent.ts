/**
 * @file 聚合事件，用于聚合后续的子事件
 */

import {BaseEvent} from './BaseEvent';

export class GroupEvent extends BaseEvent<GroupEvent.IContent> {
    content: GroupEvent.IContent = {
        contentType: 'text',
        data: null,
    };

    /**
     * @param roleName 角色名称
     * @param deterministicId 可选的确定性 ID
     */
    constructor(roleName: BaseEvent.RoleName, deterministicId?: string) {
        super(BaseEvent.createEventType(roleName, 'group'), deterministicId);
    }
}

export namespace GroupEvent {
    export interface IContent extends BaseEvent.IContent {
        contentType: 'text';
        data: null;
    }
}