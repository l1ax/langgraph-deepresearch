/**
 * @file agent 执行工作流视图
 * @author l1ax
 */

import { action, makeObservable, observable } from "mobx";
import {AnyEvent} from '../events';
import {Graph} from '../graph';
import {NodeChange, NodeDimensionChange, ReactFlowInstance} from '@xyflow/react';
import {SupervisorNode} from '../nodes';

export class WorkflowViews {
    @observable
    graph: Graph = new Graph();

    @observable
    reactflowInstance: ReactFlowInstance | undefined = undefined;

    constructor() {
        makeObservable(this);
    }

    @action.bound
    onInit(reactflowInstance: ReactFlowInstance) {
        this.reactflowInstance = reactflowInstance;
    }

    @action.bound
    onNodesChange(changes: NodeChange[]) {
        for (const change of changes) {
            if (change.type === 'dimensions') {
                this.handleNodeDimensionsChange(change);
            }
        }
    }

    @action.bound
    handleNodeDimensionsChange(change: NodeDimensionChange) {
        const node = this.graph.allNodes.find(node => node.id === change.id);
        if (!node || node instanceof SupervisorNode) {
            return;
        }

        if (change.dimensions) {
            const { width, height } = change.dimensions;
            // 只有当尺寸真正变化时才更新，避免无限循环
            if (node.width !== width || node.height !== height) {
                node.width = width;
                node.height = height;
            }
        }
    }


    @action.bound
    transformEventsToViews(events: AnyEvent[]): void {
        this.graph.restoreDataFromEvents(events);
    }
}
