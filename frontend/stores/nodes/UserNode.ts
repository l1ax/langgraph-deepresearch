import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';
import { v5 as uuidv5 } from 'uuid';

export class UserNode extends BaseNode<UserNode.IData> {
    static createNew(): UserNode {
        const node = new UserNode();
        const id = uuidv5(node.type, BaseNode.NODE_ID_NAMESPACE);
        node.id = id;
        return node;
    }

    data: UserNode.IData = {
        message: '',
    };

    type: BaseNode.NodeType = 'User';

    toReactFlowData(): Node {
        return {
            id: this.id,
            position: this.position,
            data: {
                ...this.data,
                type: 'User',
                status: this.status,
            },
            type: this.type,

        }
    }
}

export namespace UserNode {
    export interface IData {
        message: string;
    }
}