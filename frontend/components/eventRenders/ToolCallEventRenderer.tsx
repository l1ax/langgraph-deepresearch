'use client';

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Wrench, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCallEvent } from '@/stores';
import { EventRendererProps } from '@/services';

/**
 * JSON 值渲染组件
 * 递归渲染 JSON 值，支持折叠展开
 */
const JsonValue: React.FC<{
  value: unknown;
  depth?: number;
  initialExpanded?: boolean;
}> = ({ value, depth = 0, initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

    // 基础类型渲染
    if (value === null) {
      return <span className="text-orange-500">null</span>;
    }
    if (value === undefined) {
      return <span className="text-muted-foreground">undefined</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-purple-500">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-blue-500">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>;
    }

    // 数组渲染
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>;
      }

      return (
        <div className="inline">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="text-xs">[{value.length}]</span>
          </button>
          {isExpanded && (
            <div className="pl-4 border-l border-border/50 ml-1">
              {value.map((item, index) => (
                <div key={index} className="py-0.5">
                  <span className="text-muted-foreground text-xs mr-2">{index}:</span>
                  <JsonValue value={item} depth={depth + 1} initialExpanded={depth < 1} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 对象渲染
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>;
      }

      return (
        <div className="inline">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span className="text-xs">{'{...}'}</span>
          </button>
          {isExpanded && (
            <div className="pl-4 border-l border-border/50 ml-1">
              {entries.map(([key, val]) => (
                <div key={key} className="py-0.5">
                  <span className="text-rose-500 text-sm">"{key}"</span>
                  <span className="text-muted-foreground">: </span>
                  <JsonValue value={val} depth={depth + 1} initialExpanded={depth < 1} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-muted-foreground">{String(value)}</span>;
  };

/**
 * 工具名称映射
 */
const TOOL_NAME_MAP: Record<string, string> = {
  tavily_search: 'Tavily 搜索',
  think: '思考',
};

/**
 * 获取工具显示名称
 */
function getToolDisplayName(toolName: string): string {
  return TOOL_NAME_MAP[toolName] || toolName;
}

/**
 * ToolCallEventRenderer 渲染器组件
 * 用于展示工具调用信息
 */
export const ToolCallEventRenderer = observer(
  ({ event, className }: EventRendererProps<ToolCallEvent>) => {
    const { tool_name, tool_arguments, tool_result } = event.content.data;
    const status = event.status;
    const [isExpanded, setIsExpanded] = useState(false);

    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isError = status === 'error';
    const isFinished = status === 'finished';
    const isLoading = isPending || isRunning;

    const displayName = getToolDisplayName(tool_name);
    const hasResult = tool_result !== null && tool_result !== undefined;

    // 状态文本
    const statusText = isLoading
      ? `${displayName} 调用中...`
      : isError
        ? `${displayName} 调用失败`
        : `${displayName} 调用完成`;

    return (
      <div
        className={cn(
          'group rounded-lg border border-transparent transition-all duration-200',
          isExpanded ? 'border-border bg-card shadow-sm my-2' : 'hover:bg-muted/50 my-0.5',
          className
        )}
      >
        {/* 标题栏 - 可点击折叠 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center gap-2 p-2 text-left rounded-lg transition-colors"
        >
          {/* 工具图标 */}
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border shadow-sm',
              isError
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : isFinished
                  ? 'bg-muted border-border text-muted-foreground'
                  : 'bg-primary/10 border-primary/20 text-primary animate-pulse'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isError ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : isFinished ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Wrench className="h-3.5 w-3.5" />
            )}
          </div>

          {/* 状态文本 */}
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
             <span
              className={cn(
                'text-xs font-medium truncate',
                isError
                  ? 'text-destructive'
                  : 'text-foreground'
              )}
            >
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {isLoading ? '正在执行...' : isError ? '执行失败' : '执行完成'}
            </span>
          </div>

          {/* 展开/折叠图标 */}
          <div
            className={cn(
              'text-muted-foreground/50 transition-transform duration-200 opacity-0 group-hover:opacity-100',
              isExpanded && 'rotate-180 opacity-100'
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </button>

        {/* 详情 - 可折叠 */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 space-y-3 pl-10">
            {/* 调用参数 */}
            <div>
              <div className="text-xs text-muted-foreground mb-1.5 font-medium">
                调用参数
              </div>
              <div className="font-mono text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto border border-border/50">
                <JsonValue value={tool_arguments} initialExpanded={true} />
              </div>
            </div>

            {/* 调用结果 */}
            {hasResult && (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 font-medium">
                  调用结果
                </div>
                <div className="font-mono text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto border border-border/50 max-h-64 overflow-y-auto">
                  {typeof tool_result === 'string' ? (
                    <pre className="whitespace-pre-wrap break-words text-foreground">
                      {tool_result}
                    </pre>
                  ) : (
                    <JsonValue value={tool_result} initialExpanded={false} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ToolCallEventRenderer.displayName = 'ToolCallEventRenderer';

export default ToolCallEventRenderer;

