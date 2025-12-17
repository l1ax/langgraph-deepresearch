'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { MessageCircleQuestion, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseIncompleteJson } from '@/lib/json-parser';
import { ClarifyEvent } from '@/stores';
import { EventRendererProps } from '@/services';
import {Streamdown} from 'streamdown';

/**
 * ClarifyEvent 渲染器组件
 * - 如果 status 为 pending/running，显示加载状态
 * - 如果 status 为 error，显示错误状态
 * - 如果 need_clarification 为 true，显示澄清问题
 * - 如果 need_clarification 为 false，显示验证信息提示
 */
export const ClarifyEventRenderer = observer(
  ({ event, className }: EventRendererProps<ClarifyEvent>) => {
    const status = event.status;
    // 解析可能不完整的JSON字符串
    const parsedData = parseIncompleteJson<ClarifyEvent.IData>(event.content.data as ClarifyEvent.IData | string);
    const { need_clarification, question, verification } = parsedData;

    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isError = status === 'error';
    const isLoading = isPending || isRunning;

    // Common container style
    const containerClass = cn(
      "glass-card p-0 flex items-stretch overflow-hidden rounded-2xl border-l-[6px] transition-all",
      className
    );

    // 加载状态
    if (isLoading) {
      return (
        <div className={cn(containerClass, "border-l-primary/50 shadow-md")}>
          <div className="bg-primary/5 p-4 flex items-center justify-center">
             <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <div className="p-4 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {isPending ? 'Initiating Analysis...' : 'Analyzing Request...'}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {verification || question || 'DeepResearch is thinking...'}
            </p>
          </div>
        </div>
      );
    }

    // 错误状态
    if (isError) {
      return (
        <div className={cn(containerClass, "border-l-destructive shadow-md")}>
          <div className="bg-destructive/5 p-4 flex items-center justify-center">
             <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="p-4 flex-1 space-y-1">
            <p className="text-sm font-semibold text-destructive">Analysis Failed</p>
            <p className="text-sm text-muted-foreground">Please try again.</p>
          </div>
        </div>
      );
    }

    if (need_clarification) {
      // 需要澄清：显示问题 ("Action Required" card)
      return (
        <div className={cn(containerClass, "border-l-amber-500 shadow-lg ring-1 ring-amber-500/10")}>
          <div className="bg-amber-50 p-4 flex flex-col items-center justify-start pt-6 gap-2 min-w-[60px] border-r border-amber-100 dark:border-amber-900/20 dark:bg-amber-950/20">
             <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <MessageCircleQuestion className="h-5 w-5" />
             </div>
          </div>
          <div className="p-5 flex-1 space-y-3">
            <div>
               <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Action Required</p>
               <p className="text-base font-medium text-foreground">Clarification Needed</p>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
              <Streamdown>{question}</Streamdown>
            </div>
          </div>
        </div>
      );
    }

    // 不需要澄清：显示验证信息 ("Success" card)
    return (
      <div className={cn(containerClass, "border-l-emerald-500 shadow-md")}>
         <div className="bg-emerald-50 p-4 flex items-center justify-center border-r border-emerald-100 dark:border-emerald-900/20 dark:bg-emerald-950/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
         </div>
         <div className="p-4 flex-1 space-y-1">
           <p className="text-sm font-semibold text-foreground">Request Confirmed</p>
           <p className="text-sm text-muted-foreground/90">
             {verification || 'Starting research...'}
           </p>
         </div>
      </div>
    );
  }
);

ClarifyEventRenderer.displayName = 'ClarifyEventRenderer';

export default ClarifyEventRenderer;
