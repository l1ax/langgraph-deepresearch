import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';
import {makeObservable} from 'mobx';
import { v5 as uuidv5 } from 'uuid';

export class BriefGenerationNode extends BaseNode<BriefGenerationNode.IData> {
    static createNew(): BriefGenerationNode {
        const node = new BriefGenerationNode();
        const id = uuidv5(node.type, BaseNode.NODE_ID_NAMESPACE);
        node.id = id;
        return node;
    }

    data: BriefGenerationNode.IData = {
        research_brief: '',
        research_brief_reasoning: '',
    };

    type: BaseNode.NodeType = 'BriefGeneration';

    constructor() {
        super();
        makeObservable(this);
    }

    toReactFlowData(): Node {
        return {
            id: this.id,
            position: this.position,
            data: {
                ...this.data,
                type: 'BriefGeneration',
                status: this.status,
            },
            type: this.type,
            parentId: this.parentId,

        }
    }
}

export namespace BriefGenerationNode {
    export interface IData {
        research_brief: string;
        research_brief_reasoning?: string;
    }
}