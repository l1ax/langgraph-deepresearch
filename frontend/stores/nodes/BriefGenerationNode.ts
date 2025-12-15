import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';

export class BriefGenerationNode extends BaseNode<BriefGenerationNode.IData> {
    data: BriefGenerationNode.IData = {
        research_brief: '',
        research_brief_reasoning: '',
    };

    type: BaseNode.NodeType = 'BriefGeneration';

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