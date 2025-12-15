import { observable } from 'mobx';

export class Edge {
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
}

export namespace Edge {
    export interface IEdge {
        id: string;
        sourceNodeId: string;
        targetNodeId: string;
    }
}