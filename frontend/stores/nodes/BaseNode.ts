import {computed, makeObservable, observable} from 'mobx';
import {BaseEvent} from '../events';
import {Node} from '@xyflow/react';
import {Graph} from '../graph';
import { v5 as uuidv5 } from 'uuid';

export abstract class BaseNode<T extends unknown = unknown> implements BaseNode.INode<T> {
    static NODE_ID_NAMESPACE = uuidv5.URL;

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

    @observable
    width: number = 0;

    @observable
    height: number = 0;

    @observable.ref
    parentNode: BaseNode<unknown> | undefined = undefined;

    @observable.ref
    associatedGraph: Graph | undefined = undefined;

    abstract data: T;

    abstract type: BaseNode.NodeType;

    constructor() {
        makeObservable(this);
    }
    
    abstract toReactFlowData(): Node;

    @computed
    get isBelongToSubGraph(): boolean {
        return this.associatedGraph !== undefined && this.associatedGraph.isSubGraph;
    }
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
        /** 父节点 */
        parentNode: BaseNode<unknown> | undefined;
        /** 从属的图 */
        associatedGraph: Graph | undefined;
        /** 节点宽度 */
        width: number;
        /** 节点高度 */
        height: number;

        toReactFlowData(): Node;

        /** 是否从属于子图 */
        isBelongToSubGraph: boolean;
    }

    /** 节点类型 */
    export type NodeType = 'ClarifyWithUser' | 'BriefGeneration' | 'Supervisor' | 'Researcher' | 'ToolCall' | 'User' | 'BasicOutput';

    /** 节点运行状态，对齐事件状态 */
    export type NodeStatus = BaseEvent.EventStatus;

    /** 节点图 */
    export interface IGraph {
        nodes: INode<unknown>[];
    }
}