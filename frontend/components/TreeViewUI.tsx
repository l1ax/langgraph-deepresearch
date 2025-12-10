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
        <div className="space-y-2 relative">
           {/* 左侧连接线 (如果不是顶层) */}
           {!isTopLevel && (
            <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border/50" />
          )}

          {/* Group Event 标题栏（可点击折叠） */}
          <div
            className={cn(
              "flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 transition-colors select-none",
              isExpanded ? "hover:bg-muted/50" : "hover:bg-muted"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {hasChildren ? (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                 {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </div>
            ) : (
              <div className="h-6 w-6" />
            )}
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground/80">
                {event.roleName === 'supervisor' ? '研究主管' : event.roleName === 'researcher' ? '研究员' : '组'}
              </span>
              {isLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
              {hasChildren && (
                <span className="text-xs text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded-full">
                  {children.length}
                </span>
              )}
            </div>
          </div>

          {/* Group Event 的 children（可折叠，递归渲染） */}
          {isExpanded && hasChildren && (
            <div className="ml-[23px] space-y-4 pt-1">
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
      <div className="space-y-2 relative group/event">
        {/* 左侧连接线 (如果不是顶层且有 children) */}
        {!isTopLevel && hasChildren && (
             <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border/50" />
        )}

        {/* 渲染事件本身 */}
        <div className="relative">
           {/* 左侧指示点 (如果不是顶层) - 可选，这里暂时不加，保持简洁 */}
           <EventView event={event} />
        </div>

        {/* 递归渲染 children（如果存在） */}
        {hasChildren && (
          <div className="ml-[23px] space-y-4 pt-2 border-l border-border/50 pl-4">
            {children.map((childNode) => (
              <EventNodeRenderer key={childNode.event.id} node={childNode} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
});

TreeViewUI.displayName = 'TreeViewUI';

