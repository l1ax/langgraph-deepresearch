/**
 * @file agent 执行工作流视图
 * @author l1ax
 */

import { action, computed, observable } from "mobx";
import {AnyEvent, BaseEvent} from '../events';
import { BaseNode, createNodeFactory } from '../nodes';
import {Edge as BaseEdge} from '../edges';
import {Node, Edge} from '@xyflow/react';

export class WorkflowViews {
    static eventTypeToNodeType: Partial<Record<BaseEvent.EventType, BaseNode.NodeType>> = {
        '/ai/clarify': 'ClarifyWithUser',
        '/ai/brief': 'BriefGeneration',
        '/human/chat': 'User'
    };

    static createNodeByEventInDeepResearchAgent(event: AnyEvent): BaseNode<unknown> {
        const nodeType: BaseNode.NodeType | undefined = this.eventTypeToNodeType[event.eventType];

        if (!nodeType) {
            throw new Error(`Unknown event type: ${event.eventType}`);
        }

        const node = createNodeFactory(nodeType);
        node.id = event.id;
        node.data = event.content.data;
        node.status = event.status;

        return node;
    }

    /** 节点列表 */
    @observable
    nodes: BaseNode.INode<unknown>[] = [];
    /** 边列表 */
    @observable
    edges: BaseEdge.IEdge[] = [];

    constructor() {}

    @action.bound
    transformEventsToViews(events: AnyEvent[]): void {
        for (const event of events) {
            const targetNode: BaseNode.INode<unknown> | undefined = this.nodes.find(node => node.id === event.id);
            if (targetNode) {
                // TODO: update node data
                targetNode.data = event.content.data;
                targetNode.status = event.status;
                return;
            }


            // TODO: 临时过滤
            if (!['/human/chat', '/ai/brief', '/ai/clarify'].includes(event.eventType)) {
                return;
            }

            const newNode = WorkflowViews.createNodeByEventInDeepResearchAgent(event);
            newNode.position = {x: 0, y: (this.nodes.length -1) * 100};
            this.nodes.push(newNode);
            this.addEdge(newNode);
        }
    }

    @action.bound
    addEdge(targetNode: BaseNode.INode<unknown>) {
        if (this.nodes.length < 2) {
            return;
        }

        const sourceNode = this.nodes[this.nodes.length - 2];

        if (targetNode.parentId && targetNode.parentId === sourceNode.id) {
            return;
        }

        const edge = new BaseEdge(sourceNode.id, targetNode.id);
        this.edges.push(edge);
    }

    @computed
    get reactFlowNodes(): Node[] {
        return this.nodes.map(node => node.toReactFlowData());
    }

    @computed
    get reactFlowEdges(): Edge[] {
        const edges = this.edges.map(edge => ({
            id: edge.id,
            source: edge.sourceNodeId,
            target: edge.targetNodeId,
        }));

        console.log(edges);

        return edges;
    }
}

export namespace WorkflowViews {
    export interface IEdge {
        id: string;
        source: string;
        target: string;
        style: Record<string, any>;
    }
}