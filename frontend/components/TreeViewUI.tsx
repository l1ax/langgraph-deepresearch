'use client';

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { TreeView, TreeViewEventNode } from '@/stores/views/treeViews';
import { EventView } from '@/services';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

/**
 * TreeViewUI 组件
 * 遍历 treeView.topLevelEventNodes，以 topLevelEvent 为单位进行区块渲染
 * children 里的 node 可能还会有 children，需要递归处理
 */
export const TreeViewUI = observer<{
  treeView: TreeView;
  className?: string;
}>(({ treeView, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {treeView.topLevelEventNodes.map((node) => (
        <EventNodeRenderer key={node.event.id} node={node} isTopLevel={true} />
      ))}
    </div>
  );
});

/**
 * 事件节点渲染组件（递归）
 * 支持递归渲染 children，children 里的 node 可能还会有 children
 */
const EventNodeRenderer = observer<{ 
  node: TreeViewEventNode; 
  isTopLevel?: boolean;
  depth?: number;
}>(({ node, isTopLevel = false, depth = 0 }) => {
  const { event, children } = node;
  const [isExpanded, setIsExpanded] = useState(true);
  const isGroupEvent = event.subType === 'group';
  const isLoading = event.status === 'running' || event.status === 'pending';
  const hasChildren = children.length > 0;

  // 如果是 group event，显示可折叠的容器
  if (isGroupEvent) {
    return (
      <div className="space-y-2">
        {/* Group Event 标题栏（可点击折叠） */}
        <div
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-lg px-3 py-2 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-muted-foreground">
              {event.roleName === 'supervisor' ? '研究主管' : event.roleName === 'researcher' ? '研究员' : '组'}
            </span>
            {isLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                {children.length} 个事件
              </span>
            )}
          </div>
        </div>

        {/* Group Event 的 children（可折叠，递归渲染） */}
        {isExpanded && hasChildren && (
          <div className="ml-4 space-y-2 border-l-2 border-muted pl-4">
            {children.map((childNode) => (
              <EventNodeRenderer key={childNode.event.id} node={childNode} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 非 group event，正常渲染
  return (
    <div className="space-y-2">
      {/* 渲染事件本身 */}
      <EventView event={event} />

      {/* 递归渲染 children（如果存在） */}
      {hasChildren && (
        <div className="ml-4 space-y-2 border-l-2 border-muted pl-4">
          {children.map((childNode) => (
            <EventNodeRenderer key={childNode.event.id} node={childNode} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

TreeViewUI.displayName = 'TreeViewUI';

