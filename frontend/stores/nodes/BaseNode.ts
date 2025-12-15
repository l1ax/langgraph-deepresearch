import {observable} from 'mobx';
import {BaseEvent} from '../events';
import {Node} from '@xyflow/react';

export abstract class BaseNode<T extends unknown = unknown> implements BaseNode.INode<T> {
    @observable
    id: string = '';

    @observable
    position: {
        x: number;
        y: number;
    } = {x: 0, y: 0};

    @observable
    parentId: string = '';

    @observable
    status: BaseNode.NodeStatus = 'pending';

    abstract data: T;

    abstract type: BaseNode.NodeType;
    
    abstract toReactFlowData(): Node;
}

export namespace BaseNode {
    export interface INode<T extends unknown> {
        /** 节点唯一标识 */
        id: string;
        /** 节点类型 */
        type: NodeType;
        /** 节点运行状态 */
        status: BaseNode.NodeStatus;
        /** 节点数据 */
        data: T;
        /** 节点位置 */
        position: {
            x: number;
            y: number;
        };
        /** 父节点唯一标识 */
        parentId: string;

        toReactFlowData(): Node;
    }

    /** 节点类型 */
    export type NodeType = 'ClarifyWithUser' | 'BriefGeneration' | 'Supervisor' | 'Researcher' | 'ToolCall' | 'User';

    /** 节点运行状态，对齐事件状态 */
    export type NodeStatus = BaseEvent.EventStatus;
}