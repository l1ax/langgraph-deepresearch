'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { TreeView, TreeViewEventNode } from '@/stores/views/treeViews';
import { EventView } from '@/services';
import { cn } from '@/lib/utils';
import { GroupEventRenderer } from './eventRenders/GroupEventRenderer';

/**
 * TreeViewUI - Displays the thought process / execution tree
 */
export const TreeViewUI = observer<{
  treeView: TreeView;
  className?: string;
}>(({ treeView, className }) => {
  return (
    <div className={cn('space-y-3', className)}>
      {treeView.topLevelEventNodes.map((node) => (
        <EventNodeRenderer key={node.event.id} node={node} isTopLevel={true} />
      ))}
    </div>
  );
});

const EventNodeRenderer = observer<{ 
  node: TreeViewEventNode; 
  isTopLevel?: boolean;
  depth?: number;
}>(({ node, isTopLevel = false, depth = 0 }) => {
  const { event, children } = node;
  const isGroupEvent = event.subType === 'group';

    if (isGroupEvent) {
      // 渲染子节点
      const renderedChildren = children.map((childNode) => (
        <EventNodeRenderer key={childNode.event.id} node={childNode} depth={depth + 1} />
      ));

      return (
        <GroupEventRenderer
          data={{}}
          status={event.status}
          roleName={event.roleName}
          childCount={children.length}
        >
          {renderedChildren}
        </GroupEventRenderer>
      );
    }

    // Leaf Nodes (Actions/Events)
    return (
      <div className="group relative pl-2">
         <div className="absolute left-0 top-2.5 h-1.5 w-1.5 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
         <div className="pl-4 text-sm text-foreground/80">
             <EventView event={event} />
         </div>
      </div>
    );
});

TreeViewUI.displayName = 'TreeViewUI';

