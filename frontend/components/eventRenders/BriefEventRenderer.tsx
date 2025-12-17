'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { FileText, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseIncompleteJson } from '@/lib/json-parser';
import { BriefEvent } from '@/stores';
import { EventRendererProps } from '@/services';
import { Streamdown } from 'streamdown';

/**
 * BriefEventRenderer 渲染器组件
 * 用于展示研究概要信息
 */
export const BriefEventRenderer = observer(
  ({ event, className }: EventRendererProps<BriefEvent>) => {
    const status = event.status;
    // 解析可能不完整的JSON字符串
    const parsedData = parseIncompleteJson<BriefEvent.IData>(event.content.data as BriefEvent.IData | string);
    const { research_brief, research_brief_reasoning } = parsedData;

    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isError = status === 'error';
    const isLoading = isPending || isRunning;

    return (
      <div
        className={cn(
          'rounded-2xl border p-6 shadow-sm transition-all duration-300',
          // 根据 status 显示不同的样式
          isError
            ? 'border-destructive/20 bg-destructive/5'
            : 'border-border/50 bg-card',
          isLoading && 'animate-pulse',
          className
        )}
      >
        {/* 标题栏 */}
        <div className={cn(
          "flex items-center gap-3 mb-4 pb-4 border-b",
          isError ? "border-destructive/10" : "border-border/50"
        )}>
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              isError
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isError ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <BookOpen className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1">
            <h3
              className={cn(
                'text-sm font-semibold',
                isError ? 'text-destructive' : 'text-foreground'
              )}
            >
              研究概要
            </h3>
            <p
              className={cn(
                'text-xs',
                isError ? 'text-destructive/80' : 'text-muted-foreground'
              )}
            >
              {isLoading
                ? isPending
                  ? '准备中...'
                  : '生成中...'
                : isError
                  ? '错误'
                  : 'Research Brief'}
            </p>
          </div>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              isError
                ? 'bg-destructive/5 text-destructive/60'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="space-y-4">
          {/* Reasoning - 思考过程，优先显示 */}
          {research_brief_reasoning && !isError && (
            <div className="relative">
              <div className="text-xs text-muted-foreground/70 leading-relaxed prose prose-xs dark:prose-invert max-w-none prose-p:text-muted-foreground/70 prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                <Streamdown>{research_brief_reasoning}</Streamdown>
              </div>
              {/* 分隔线，只在有 research_brief 时显示 */}
              {research_brief && (
                <div className="mt-4 mb-2 border-t border-border/30" />
              )}
            </div>
          )}

          {/* Research Question - 主要内容 */}
          <div
            className={cn(
              'prose prose-sm dark:prose-invert max-w-none prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
              isError
                ? 'prose-headings:text-destructive prose-p:text-destructive/90'
                : 'prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground'
            )}
          >
            {isError ? (
              <p className="text-destructive">生成研究概要时发生错误，请重试。</p>
            ) : research_brief ? (
              <div className="relative">
                <Streamdown>{research_brief}</Streamdown>
                {isRunning && (
                  <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary animate-pulse" />
                )}
              </div>
            ) : (
              <p className="text-muted-foreground italic flex items-center gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline-block" />
                    正在准备生成研究概要...
                  </>
                ) : isRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin inline-block" />
                    正在生成研究概要...
                  </>
                ) : (
                  '研究概要内容为空'
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

BriefEventRenderer.displayName = 'BriefEventRenderer';

export default BriefEventRenderer;

