import {observable} from 'mobx';
import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';

export class ClarifyWithUserNode extends BaseNode<ClarifyWithUserNode.IData> {
    @observable
    data: ClarifyWithUserNode.IData = {
        need_clarification: false,
        question: '',
        verification: '',
    };

    @observable
    type: BaseNode.NodeType = 'ClarifyWithUser';

    toReactFlowData(): Node {
        return {
            id: this.id,
            position: this.position,
            data: {
                ...this.data,
                type: 'ClarifyWithUser',
                status: this.status,
            },
            type: this.type,
            parentId: this.parentId,
        }
    }
}

export namespace ClarifyWithUserNode {
    export interface IData {
        need_clarification: boolean;
        question: string;
        verification: string;
    }
}