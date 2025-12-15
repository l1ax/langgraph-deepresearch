import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';

export class UserNode extends BaseNode<UserNode.IData> {
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
            type: this.type
        }
    }
}

export namespace UserNode {
    export interface IData {
        message: string;
    }
}