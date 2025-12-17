import {makeObservable, observable} from 'mobx';
import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';
import { v5 as uuidv5 } from 'uuid';

export class ClarifyWithUserNode extends BaseNode<ClarifyWithUserNode.IData> {
    static createNew(): ClarifyWithUserNode {
        const node = new ClarifyWithUserNode();
        const id = uuidv5(node.type, BaseNode.NODE_ID_NAMESPACE);
        node.id = id;
        return node;
    }

    @observable
    data: ClarifyWithUserNode.IData = {
        need_clarification: false,
        question: '',
        verification: '',
    };

    @observable
    type: BaseNode.NodeType = 'ClarifyWithUser';

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