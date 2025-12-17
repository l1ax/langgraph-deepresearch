/**
 * Researcher 节点
 * 用于研究员角色的 group 事件，作为普通节点展示
 */

import {makeObservable, observable} from 'mobx';
import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';
import { v5 as uuidv5 } from 'uuid';

export class ResearcherNode extends BaseNode<ResearcherNode.IData> {
    static createNew(): ResearcherNode {
        const node = new ResearcherNode();
        const id = uuidv5(node.type, BaseNode.NODE_ID_NAMESPACE);
        node.id = id;
        return node;
    }

    @observable
    data: ResearcherNode.IData = {
        label: '研究员',
    };

    @observable
    type: BaseNode.NodeType = 'Researcher';

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
                type: 'Researcher',
                status: this.status,
            },
            type: this.type,
            parentId: this.parentId || undefined,

        }
    }
}

export namespace ResearcherNode {
    export interface IData {
        label?: string;
    }
}

