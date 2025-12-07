'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { FileText, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BriefEvent } from '@/stores';
import { EventRendererProps } from '@/services';
import { Streamdown } from 'streamdown';

/**
 * BriefEventRenderer 渲染器组件
 * 用于展示研究概要信息
 */
export const BriefEventRenderer = observer(
  ({ data, status, roleName: _roleName, className }: EventRendererProps<BriefEvent.IData>) => {
    const { research_brief } = data;

    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isError = status === 'error';
    const isLoading = isPending || isRunning;

    return (
      <div
        className={cn(
          'rounded-xl border p-5 shadow-sm transition-all duration-300',
          // 根据 status 显示不同的样式
          isError
            ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-100 dark:border-red-900/50 dark:from-red-950/40 dark:to-red-900/40'
            : 'border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 dark:border-sky-900/50 dark:from-sky-950/40 dark:to-indigo-950/40',
          isLoading && 'animate-pulse',
          className
        )}
      >
        {/* 标题栏 */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-sky-200/60 dark:border-sky-800/40">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              isError
                ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                : 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400'
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : isError ? (
              <AlertCircle className="h-4.5 w-4.5" />
            ) : (
              <BookOpen className="h-4.5 w-4.5" />
            )}
          </div>
          <div className="flex-1">
            <h3
              className={cn(
                'text-sm font-semibold',
                isError
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-sky-800 dark:text-sky-200'
              )}
            >
              研究概要
            </h3>
            <p
              className={cn(
                'text-xs',
                isError
                  ? 'text-red-600/80 dark:text-red-400/80'
                  : 'text-sky-600/80 dark:text-sky-400/80'
              )}
            >
              {isLoading
                ? isPending
                  ? '准备中...'
                  : '生成中...'
                : isError
                  ? 'Error'
                  : 'Research Brief'}
            </p>
          </div>
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md',
              isError
                ? 'bg-red-100/60 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-sky-100/60 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400'
            )}
          >
            <FileText className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* 内容区域 */}
        <div
          className={cn(
            'prose prose-sm dark:prose-invert max-w-none prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
            isError
              ? 'prose-headings:text-red-800 dark:prose-headings:text-red-200 prose-p:text-red-700 dark:prose-p:text-red-300'
              : 'prose-headings:text-sky-800 dark:prose-headings:text-sky-200 prose-p:text-sky-700 dark:prose-p:text-sky-300 prose-li:text-sky-700 dark:prose-li:text-sky-300 prose-strong:text-sky-800 dark:prose-strong:text-sky-200'
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <span>{isPending ? '正在准备生成研究概要...' : '正在生成研究概要...'}</span>
            </div>
          ) : isError ? (
            <p className="text-red-600 dark:text-red-400">生成研究概要时发生错误，请重试。</p>
          ) : (
            <Streamdown>
              {research_brief || '研究概要内容为空'}
            </Streamdown>
          )}
        </div>
      </div>
    );
  }
);

BriefEventRenderer.displayName = 'BriefEventRenderer';

export default BriefEventRenderer;

