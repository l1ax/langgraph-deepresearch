import { observable } from 'mobx';
import { Edge } from '@xyflow/react';

export class BaseEdge {
    /** 边唯一标识 */
    @observable
    id: string = '';

    /** 源节点唯一标识 */
    @observable
    sourceNodeId: string = '';

    /** 目标节点唯一标识 */
    @observable
    targetNodeId: string = '';

    constructor(sourceNodeId: string, targetNodeId: string) {
        this.id = `${sourceNodeId}-${targetNodeId}`;
        this.sourceNodeId = sourceNodeId;
        this.targetNodeId = targetNodeId;
    }

    toReactFlowData(): Edge {
        return {
            id: this.id,
            source: this.sourceNodeId,
            target: this.targetNodeId,
        };
    }
}

export namespace BaseEdge {
    export interface IEdge {
        id: string;
        sourceNodeId: string;
        targetNodeId: string;
        toReactFlowData(): Edge;
    }
}