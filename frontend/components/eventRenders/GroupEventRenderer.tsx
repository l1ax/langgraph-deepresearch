'use client';

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { GroupEvent } from '@/stores';
import { EventRendererProps } from '@/services';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Loader2, Sparkles, UserCog, Users } from 'lucide-react';

/**
 * GroupEventRenderer 渲染器组件
 * 渲染 group 事件的 UI，包括可折叠的 header 和子节点
 */
export const GroupEventRenderer = observer(
  ({ status, roleName, className, children, childCount = 0 }: EventRendererProps<GroupEvent.IData>) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLoading = status === 'running' || status === 'pending';
    const hasChildren = childCount > 0;
    
    // Mapping roles to nice names/icons
    const roleDisplay = {
        supervisor: { label: '研究主管', icon: UserCog },
        researcher: { label: '研究员', icon: Sparkles },
        default: { label: '团队', icon: Users }
    };
    
    const roleInfo = roleDisplay[roleName as keyof typeof roleDisplay] || roleDisplay.default;
    const Icon = roleInfo.icon;

    return (
      <div className={cn("relative overflow-hidden rounded-xl border border-border/40 bg-muted/20", className)}>
        {/* Group Header */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none",
            isExpanded ? "bg-muted/30" : "hover:bg-muted/10"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
           <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
           </div>
           
           <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-medium text-foreground/90">
                 {roleInfo.label}
              </span>
              {hasChildren && (
                  <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded-full border border-border/20">
                      {childCount} 步
                  </span>
              )}
           </div>

           <div className="text-muted-foreground/50">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
           </div>
        </div>

        {/* Children Container */}
        {isExpanded && hasChildren && children && (
          <div className="px-3 pb-3 pt-1 space-y-3">
             <div className="pl-3 border-l border-border/30 space-y-3 mt-1">
                {children}
             </div>
          </div>
        )}
      </div>
    );
  }
);

GroupEventRenderer.displayName = 'GroupEventRenderer';

