import {action, computed, makeObservable, observable} from 'mobx';
import {BaseNode, createNodeFactory, ICreateNodeFactoryParams, ResearcherNode, SupervisorNode} from '../nodes';
import {BaseEdge} from '../edges';
import {AnyEvent, BaseEvent, ChatEvent, ToolCallEvent} from '../events';
import {Edge, Node, ReactFlowInstance} from '@xyflow/react';
import dagre from '@dagrejs/dagre';

export class Graph {
    static eventTypeToNodeType: Partial<Record<BaseEvent.EventType, BaseNode.NodeType>> = {
        '/ai/clarify': 'ClarifyWithUser',
        '/ai/brief': 'BriefGeneration',
        '/human/chat': 'User',
        '/supervisor/group': 'Supervisor',
        '/supervisor/tool_call': 'ToolCall',
        '/researcher/group': 'Researcher',
        '/ai/chat': 'BasicOutput',
        '/ai/report_generation': 'BasicOutput',
    };

    static createNodeByEvent(event: AnyEvent): BaseNode<unknown> {
        const nodeType: BaseNode.NodeType | undefined = Graph.eventTypeToNodeType[event.eventType];

        if (!nodeType) {
            throw new Error(`Unknown event type: ${event.eventType}`);
        }

        const createNodeConfig: ICreateNodeFactoryParams = {
            type: nodeType
        }

        if (event instanceof ToolCallEvent) {
            createNodeConfig.toolCallName = (event as ToolCallEvent).toolName;
        }

        if (event instanceof ChatEvent) {
            createNodeConfig.subType = (event as ChatEvent).subType;
        }

        const node = createNodeFactory(createNodeConfig);
        node.id = event.id;
        node.data = event.content.data;
        node.status = event.status;
        if (event.parentId) {
            node.parentId = event.parentId;
        }

        return node;
    }

    @observable
    id: string = '';

    @observable
    nodes: BaseNode.INode<unknown>[] = [];

    @observable
    edges: BaseEdge.IEdge[] = [];

    @observable
    associatedNode: BaseNode.INode<unknown> | undefined = undefined;

    constructor() {
        makeObservable(this);
    }

    @action.bound
    restoreDataFromEvents(events: AnyEvent[]) {
        for (const event of events) {
            const targetNode: BaseNode.INode<unknown> | undefined = this.allNodes.find(node => node.id === event.id);
            if (targetNode) {
                targetNode.data = event.content.data;
                targetNode.status = event.status;
                if (targetNode.status === 'finished' || targetNode.status === 'error') {
                    this.layout();
                }
                return;
            }


            // TODO: 临时过滤
            if (!['/human/chat', '/ai/chat', '/ai/report_generation', '/ai/brief', '/ai/clarify', '/supervisor/group', '/supervisor/tool_call', '/researcher/group'].includes(event.eventType)) {
                return;
            }

            const newNode = Graph.createNodeByEvent(event);
            this.addNodeToGraph(newNode);
            this.layout();
        }
    }

    /** 处理节点从属的图 */
    @action.bound
    addNodeToGraph(newNode: BaseNode.INode<unknown>) {
        let graph: Graph = this;
        if (!newNode.parentId) {
            this.nodes.push(newNode);
        }
        else {
            const parentNode = this.allNodes.find(n => n.id === newNode.parentId)!;
            if (parentNode instanceof SupervisorNode) {
                graph = parentNode.graph;
                newNode.parentNode = parentNode;
                
                graph.nodes.push(newNode);
            } else {
                // ResearcherNode 和其他节点作为普通节点处理
                this.nodes.push(newNode);
            }
        }

        newNode.associatedGraph = graph;
        this.handleNodePosition(graph, newNode);
        this.addEdge(graph, newNode);
    }

    @action.bound
    addEdge(graph: Graph, targetNode: BaseNode.INode<unknown>) {
        if (graph.nodes.length < 2) {
            return;
        }

        let sourceNode = graph.nodes[graph.nodes.length - 2];

        if (targetNode.parentId && targetNode.parentId === sourceNode.id) {
            return;
        }

        // research node 实际上为并行执行，所以需要特殊处理
        if (targetNode instanceof ResearcherNode && sourceNode instanceof ResearcherNode) {
            for (let i = graph.nodes.length - 2; i >= 0; i--) {
                if (graph.nodes[i] instanceof ResearcherNode) {
                    continue
                }
                
                sourceNode = graph.nodes[i];
                break;
            }
        }
        // 串行执行完ResearcherNode 后，才会到下一个节点
        else if (!(targetNode instanceof ResearcherNode) && sourceNode instanceof ResearcherNode) {
            const idx = graph.nodes.indexOf(sourceNode);
            if (!(idx >= 1 && graph.nodes[idx - 1] instanceof ResearcherNode)) {
                console.error('ResearcherNode is not the last node');
            }
            const anotherSourceNode = graph.nodes[idx - 1];
            const edge = new BaseEdge(anotherSourceNode.id, targetNode.id);
            graph.edges.push(edge);
        }

        const edge = new BaseEdge(sourceNode.id, targetNode.id);
        graph.edges.push(edge);
    }
    
    @action.bound
    handleNodePosition(graph: Graph, newNode: BaseNode.INode<unknown>) {
        // 暂时保留作为简单的默认位置，后续完全由 layout 接管
        if (newNode.isBelongToSubGraph) {
            const parentNode = newNode.parentNode;
            if (!parentNode) {
                console.error('parentNode is undefined');
                return;
            }

            const childrenOfParent = graph.nodes.filter(n => n.parentId === parentNode.id);
            const childIndex = childrenOfParent.length;
            newNode.position = {
                x: 20 + childIndex * 100,
                y: 50
            };

            return;
        }

        newNode.position = {x: 0, y: (graph.nodes.length - 1) * 100};
    }

    @action.bound
    layout() {
        // 1. 递归布局子图
        for (const node of this.nodes) {
            if (node instanceof SupervisorNode) {
                node.graph.layout();
            }
        }

        const g = new dagre.graphlib.Graph();
        g.setGraph({
            rankdir: this.isSubGraph ? 'LR' : 'TB',
            nodesep: 50,
            ranksep: this.isSubGraph ? 10 : 50,
            marginx: this.isSubGraph ? 40 : 20,
            marginy: this.isSubGraph ? 10 : 50
        });
        g.setDefaultEdgeLabel(() => ({}));

        // 2. 添加节点
        for (const node of this.nodes) {
            let width = node.width === 0 ? 220 : node.width;
            let height = node.height === 0 ? 70 : node.height;

            console.log(node.id, width, height);

            g.setNode(node.id, { width, height });
        }

        // 3. 添加边
        for (const edge of this.edges) {
            g.setEdge(edge.sourceNodeId, edge.targetNodeId);
        }

        // 4. 执行布局
        dagre.layout(g);

        // 5. 更新位置 & 计算 bounding box
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const node of this.nodes) {
            const nodeWithPos = g.node(node.id);
            // dagre 返回的是中心点，转换为左上角
            const x = nodeWithPos.x - nodeWithPos.width / 2;
            const y = nodeWithPos.y - nodeWithPos.height / 2;
            
            node.position = { x, y };

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + nodeWithPos.width);
            maxY = Math.max(maxY, y + nodeWithPos.height);
        }

        // 6. 如果是子图，更新关联节点的大小并进行坐标归一化
        if (this.associatedNode && this.associatedNode instanceof SupervisorNode) {
            // 归一化坐标：让子图内容相对于父节点原点有合适的 padding
            const paddingX = 10;  // 水平边距
            const paddingY = 10;  // 垂直边距
            const headerHeight = 45;  // SupervisorNodeUi 头部区域高度

            const offsetX = minX - paddingX;
            const offsetY = minY - paddingY - headerHeight;

            for (const node of this.nodes) {
                node.position.x -= offsetX;
                node.position.y -= offsetY;
            }

            // 更新父节点大小
            const totalWidth = (maxX - minX) + paddingX * 2;
            const totalHeight = (maxY - minY) + paddingY * 2 + headerHeight;

            console.log('totalWidth', totalWidth);
            console.log('totalHeight', totalHeight);
            // 确保有最小尺寸
            this.associatedNode.width = Math.max(totalWidth, 300);
            this.associatedNode.height = Math.max(totalHeight, 200);
        }
    }

    @computed
    get reactFlowNodes(): Node[] {
        const result: Node[] = [];
        for (const node of this.nodes) {
            result.push(node.toReactFlowData());

            if (node instanceof SupervisorNode) {
                result.push(...node.subflowReactFlowNodeData);
            }
        }
        return result;
    }

    @computed
    get reactFlowEdges(): Edge[] {
        return this.allEdges.map(edge => edge.toReactFlowData());
    }

    @computed
    get allNodes(): BaseNode.INode<unknown>[] {
        return this.nodes.flatMap(node => {
            if (node instanceof SupervisorNode) {
                return [node, ...node.graph.allNodes];
            }

            return node;
        });
    }

    @computed
    get allEdges(): BaseEdge[] {
        const result: BaseEdge[] = [];

        result.push(...this.edges);

        for (const node of this.nodes) {
            if (node instanceof SupervisorNode) {
                result.push(...node.graph.allEdges);
            }
        }

        return result;
    }

    @computed
    get isSubGraph(): boolean {
        return this.associatedNode !== undefined;
    }
}

export namespace Graph {

}