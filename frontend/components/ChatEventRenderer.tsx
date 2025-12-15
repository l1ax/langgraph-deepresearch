'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Loader2, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatEvent } from '@/stores';
import { EventRendererProps } from '@/services';
import { Streamdown } from 'streamdown';

/**
 * ChatEventRenderer 渲染器组件
 * 用于渲染聊天消息（包括流式生成的最终报告等）
 */
export const ChatEventRenderer = observer(
  ({ data, status, roleName, className }: EventRendererProps<ChatEvent.IData>) => {
    const { message } = data;

    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isFinished = status === 'finished';
    const isError = status === 'error';
    const isLoading = isPending || isRunning;

    const isFinalReportGeneration = message.length > 0;

    return (
      <div
        className={cn(
          'relative rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm max-w-full overflow-hidden transition-all duration-300',
          isError
            ? 'bg-destructive/5 border border-destructive/20 text-destructive'
            : isFinalReportGeneration
              ? 'bg-card border border-primary/20 ring-1 ring-primary/5 shadow-md'
              : 'bg-card border border-border/50 text-foreground',
          'rounded-tl-sm',
          className
        )}
      >
        {/* 最终报告生成时显示标题栏 */}
        {isFinalReportGeneration && (
          <div className={cn(
            "flex items-center gap-3 mb-4 pb-4 border-b",
            isError ? "border-destructive/10" : "border-border/50"
          )}>
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                isError
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : isError ? (
                <AlertCircle className="h-4.5 w-4.5" />
              ) : isFinished ? (
                <CheckCircle2 className="h-4.5 w-4.5" />
              ) : (
                <MessageSquare className="h-4.5 w-4.5" />
              )}
            </div>
            <div className="flex-1">
              <h3
                className={cn(
                  'text-sm font-semibold',
                  isError ? 'text-destructive' : 'text-foreground'
                )}
              >
                最终研究报告
              </h3>
              <p
                className={cn(
                  'text-xs',
                  isError ? 'text-destructive/80' : 'text-muted-foreground'
                )}
              >
                {isPending
                  ? '准备中...'
                  : isRunning
                    ? '生成中...'
                    : isError
                      ? '错误'
                      ? '错误'
                      : isFinished
                        ? '已完成'
                        : '最终报告'}
                        ? '已完成'
                        : '最终报告'}
              </p>
            </div>
          </div>
        )}

        {/* 内容区域 */}
        <div
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none break-words',
            'prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
            'prose-pre:my-2 prose-pre:bg-muted prose-pre:rounded-lg',
            'prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
            'prose-code:before:content-none prose-code:after:content-none',
            isError ? 'text-destructive/90' : 'text-foreground'
          )}
        >
          {isError ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>生成报告时发生错误，请重试。</span>
            </div>
          ) : message.trim() ? (
            <div className="relative">
              <Streamdown>{message}</Streamdown>
              {isRunning && !message.includes('Generating final report...') && (
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary animate-pulse" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground italic">
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isPending ? '准备生成内容...' : isRunning ? '正在生成内容...' : '内容为空'}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatEventRenderer.displayName = 'ChatEventRenderer';

export default ChatEventRenderer;

