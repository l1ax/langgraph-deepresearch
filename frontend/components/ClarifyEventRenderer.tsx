'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { MessageCircleQuestion, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseIncompleteJson } from '@/lib/json-parser';
import { ClarifyEvent } from '@/stores';
import { EventRendererProps } from '@/services';

/**
 * ClarifyEvent 渲染器组件
 * - 如果 status 为 pending/running，显示加载状态
 * - 如果 status 为 error，显示错误状态
 * - 如果 need_clarification 为 true，显示澄清问题
 * - 如果 need_clarification 为 false，显示验证信息提示
 */
export const ClarifyEventRenderer = observer(
  ({ data, status, roleName: _roleName, className }: EventRendererProps<ClarifyEvent.IData>) => {
    // 解析可能不完整的JSON字符串
    const parsedData = parseIncompleteJson<ClarifyEvent.IData>(data as ClarifyEvent.IData | string);
    const { need_clarification, question, verification } = parsedData;

    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isError = status === 'error';
    const isLoading = isPending || isRunning;

    // 加载状态
    if (isLoading) {
      return (
        <div
          className={cn(
            'flex items-start gap-4 rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all',
            className
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {isPending ? '准备分析...' : '正在分析您的需求...'}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {verification || question || '请稍候，正在理解您的研究意图'}
            </p>
          </div>
        </div>
      );
    }

    // 错误状态
    if (isError) {
      return (
        <div
          className={cn(
            'flex items-start gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-5 shadow-sm',
            className
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium text-destructive">
              分析失败
            </p>
            <p className="text-sm text-destructive/80 leading-relaxed">
              分析您的需求时发生错误，请重试。
            </p>
          </div>
        </div>
      );
    }

    if (need_clarification) {
      // 需要澄清：显示问题
      return (
        <div
          className={cn(
            'flex items-start gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm',
            className
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <MessageCircleQuestion className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              需要更多信息
            </p>
            <p className="text-sm text-amber-600/90 dark:text-amber-400/90 leading-relaxed">
              {question}
            </p>
          </div>
        </div>
      );
    }

    // 不需要澄清：显示验证信息
    return (
      <div
        className={cn(
          'flex items-start gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm',
          className
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            理解确认
          </p>
          <p className="text-sm text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed">
            {verification || '已理解您的研究需求，正在开始研究...'}
          </p>
        </div>
      </div>
    );
  }
);

ClarifyEventRenderer.displayName = 'ClarifyEventRenderer';

export default ClarifyEventRenderer;
