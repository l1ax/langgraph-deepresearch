/**
 * @file 基础的输出节点，对应chatEvent
 */

import {BaseNode} from "./BaseNode";
import { v5 as uuidv5 } from 'uuid';
import {Node} from "@xyflow/react";
import {makeObservable, observable} from 'mobx';

export class BasicOutputNode extends BaseNode<BasicOutputNode.IData> {
    static createNew(subType: BasicOutputNode['subType']): BasicOutputNode {
        const node = new BasicOutputNode();
        node.subType = subType;
        const id = uuidv5(node.type, BaseNode.NODE_ID_NAMESPACE);
        node.id = id;
        return node;
    }

    static subTypeToNodeTitle(subType: BasicOutputNode['subType']): string {
        switch (subType) {
            case 'report_generation':
                return '报告生成';
            case 'chat':
                return 'LLM';
            default:
                return '节点';
        }
    }

    @observable
    data: BasicOutputNode.IData = {
        message: '',
    };

    @observable
    type: BaseNode.NodeType = 'BasicOutput';

    /** 细分下的类型，可能是简单输出，也可能是报告生成，对应chatEvent 的 subtype */
    @observable
    subType: string = 'report_generation';

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
                type: 'BasicOutput',
                status: this.status,
                subType: this.subType,
            },
            type: this.type,
            parentId: this.parentId,

        }
    }
}

export namespace BasicOutputNode {
    export interface IData {
        message: string;
    }
}
