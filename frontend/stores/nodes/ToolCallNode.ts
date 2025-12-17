/**
 * ToolCall 节点
 * 用于工具调用事件
 */

import {BaseNode} from './BaseNode';
import {Node} from '@xyflow/react';
import {makeObservable} from 'mobx';
import { v5 as uuidv5 } from 'uuid';

export class ToolCallNode extends BaseNode<ToolCallNode.IData> {
    static createNew(toolCallName?: string): ToolCallNode {
        const node = new ToolCallNode();
        const id = uuidv5(`${node.type}-${toolCallName}`, BaseNode.NODE_ID_NAMESPACE);
        node.id = id;
        return node;
    }

    data: ToolCallNode.IData = {
        tool_name: '',
        tool_arguments: null,
        tool_call_id: '',
        tool_result: null,
    };

    type: BaseNode.NodeType = 'ToolCall';

    constructor() {
        super();
        makeObservable(this);
    }

    toReactFlowData(): Node {
        const hasParent = !!this.parentId;
        
        return {
            id: this.id,
            position: this.position,
            data: {
                ...this.data,
                type: 'ToolCall',
                status: this.status,
            },
            type: this.type,
            parentId: this.parentId || undefined,
            ...(hasParent ? { extent: 'parent' as const } : {}),
        }
    }
}

export namespace ToolCallNode {
    export interface IData {
        tool_name: string;
        tool_arguments: unknown;
        tool_call_id: string;
        tool_result: unknown;
    }
}
