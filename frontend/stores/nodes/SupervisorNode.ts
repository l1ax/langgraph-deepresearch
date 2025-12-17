/**
 * Supervisor 节点
 * 用于研究主管角色的 group 事件，作为子流程的容器
 */

import {computed, observable} from 'mobx';
import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';
import { v5 as uuidv5 } from 'uuid';
import {Graph} from '../graph';

export class SupervisorNode extends BaseNode<SupervisorNode.IData> {
    static createNew(): SupervisorNode {
        const node = new SupervisorNode();
        const id = uuidv5(node.type, BaseNode.NODE_ID_NAMESPACE);
        node.id = id;
        return node;
    }

    @observable
    data: SupervisorNode.IData = {
        label: '研究主管',
    };

    @observable
    type: BaseNode.NodeType = 'Supervisor';

    /** supervisor 从属的子图 */
    @observable
    graph: Graph = new Graph();

    constructor() {
        super();
        this.graph.associatedNode = this;
    }

    toReactFlowData(): Node {
        return {
            id: this.id,
            position: this.position,
            data: {
                ...this.data,
                type: 'Supervisor',
                status: this.status,
                childCount: this.childCount,
            },
            type: this.type,
            parentId: this.parentId || undefined,
            width: this.width,
            height: this.height,
        }
    }

    @computed
    get subflowReactFlowNodeData(): Node[] {
        return this.graph.nodes.map(node => (
            {
                extent: 'parent' as const,
                parentId: this.id,
                expandParent: true,
                ...node.toReactFlowData()
            }
        ));
    }

    @computed
    get childCount(): number {
        return this.graph.nodes.length;
    }
}

export namespace SupervisorNode {
    export interface IData {
        label?: string;
    }
}
