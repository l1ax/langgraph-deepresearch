import {computed, observable, action, makeObservable} from 'mobx';
import {AnyEvent} from '../events';

export class TreeView {
    @observable.shallow
    topLevelEventNodes: TreeViewEventNode[] = [];

    /** 事件 ID 到节点的映射，用于快速查找 */
    private eventNodeMap: Map<string, TreeViewEventNode> = new Map();

    constructor() {
        makeObservable(this);
    }

    /**
     * 判断一个事件是否是 topLevelEvent
     * topLevelEvent 包括：
     * 1. roleName='ai' 的事件
     * 2. roleName='supervisor' 且 subType='group' 的事件
     * 
     * 注意：roleName='researcher' 的事件不再是 topLevelEvent
     * researcher group event 需要被聚合到 supervisor group event 里（通过 parentId）
     */
    private isTopLevelEvent(event: AnyEvent): boolean {
        // roleName='ai' 的事件是 topLevelEvent
        if (event.roleName === 'ai') {
            return true;
        }
        // roleName='supervisor' 且 subType='group' 的事件是 topLevelEvent
        if (event.roleName === 'supervisor' && event.subType === 'group') {
            return true;
        }
        // 其他事件（包括 researcher 的所有事件）都不是 topLevelEvent
        return false;
    }

    /**
     * 增量更新：添加或更新事件到树中
     */
    @action.bound
    upsertEvent(event: AnyEvent): void {
        // 如果事件已存在，更新它
        const existingNode = this.eventNodeMap.get(event.id);
        if (existingNode) {
            existingNode.event = event;
            return;
        }

        // 创建新节点
        const newNode = new TreeViewEventNode(event);
        this.eventNodeMap.set(event.id, newNode);

        // 如果是 topLevelEvent，直接添加到 topLevelEventNodes
        if (this.isTopLevelEvent(event)) {
            this.topLevelEventNodes.push(newNode);
            
            // 🔎 检查是否有“流浪”的子节点（orphans）属于这个新来的父节点
            // 这种情况发生在子事件比父事件先到达时
            for (let i = this.topLevelEventNodes.length - 1; i >= 0; i--) {
                const orphanNode = this.topLevelEventNodes[i];
                // 如果 orphanNode 是 newNode 的子节点（且不是 newNode 自己）
                if (orphanNode !== newNode && orphanNode.event.parentId === event.id) {
                    // 从顶层移除，添加到 newNode 的 children
                    this.topLevelEventNodes.splice(i, 1);
                    newNode.addChild(orphanNode);
                }
            }
        } else {
            // 否则，根据 parentId 找到父节点并添加到其 children
            if (event.parentId) {
                const parentNode = this.eventNodeMap.get(event.parentId);
                if (parentNode) {
                    parentNode.addChild(newNode);
                } else {
                    // 如果父节点还不存在，先作为 topLevelEvent 添加（成为孤儿节点）
                    // 等待父节点到达时被“认领”
                    this.topLevelEventNodes.push(newNode);
                }
            } else {
                // 没有 parentId 的事件，作为 topLevelEvent 处理
                this.topLevelEventNodes.push(newNode);
            }
        }
    }

    /**
     * 清空树视图
     */
    @action.bound
    clear(): void {
        this.topLevelEventNodes = [];
        this.eventNodeMap.clear();
    }

    @computed
    get allEvents(): AnyEvent[] {
        return this.topLevelEventNodes.flatMap((node) => node.allEvents);
    }
}

export class TreeViewEventNode {
    @observable.shallow
    children: TreeViewEventNode[] = [];

    parent: TreeViewEventNode | null = null;

    @observable
    event: AnyEvent;

    constructor(event: AnyEvent) {
        this.event = event;
        makeObservable(this);
    }

    @action.bound
    addChild(child: TreeViewEventNode): void {
        // 如果 child 已经有父节点，先从原父节点移除
        if (child.parent) {
            const index = child.parent.children.indexOf(child);
            if (index !== -1) {
                child.parent.children.splice(index, 1);
            }
        }
        child.parent = this;
        this.children.push(child);
    }

    @computed
    get allEvents(): AnyEvent[] {
        return [this.event, ...this.children.flatMap((child) => child.allEvents)];
    }
}