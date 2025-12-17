'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Loader2, MessageSquare, CheckCircle2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatEvent } from '@/stores';
import { EventRendererProps } from '@/services';
import { Streamdown } from 'streamdown';

/**
 * ChatEventRenderer 渲染器组件
 * Used for rendering chat messages and the final research report.
 */
export const ChatEventRenderer = observer(
  ({ event, className }: EventRendererProps<ChatEvent>) => {
    const { message } = event.content.data;
    const status = event.status;
    const subType = event.subType;

    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isFinished = status === 'finished';
    const isError = status === 'error';
    const isLoading = isPending || isRunning;

    const getStatusText = () => {
      if (isPending) return '准备中...';
      if (isRunning) return '正在撰写研究报告...';
      if (isError) return '生成出错';
      if (isFinished) return '研究报告已生成';
      return '最终报告';
    };

    const isReportGeneration = subType === 'report_generation';

    return (
      <div
        className={cn(
          'relative transition-all duration-300',
          isReportGeneration ? 'w-full' : 'max-w-full',
          className
        )}
      >
        {/* Report Generation Special Card */}
        {isReportGeneration ? (
             <div className={cn(
                 "glass-panel rounded-2xl p-0 overflow-hidden group",
                 isError ? "!border-rose-200 dark:!border-rose-900" : ""
             )}>
                 {/* Header Status Bar */}
                 <div className={cn(
                     "px-6 py-4 flex items-center justify-between border-b transition-colors",
                     isFinished ? "bg-slate-50/50 border-slate-100" : "bg-blue-50/30 border-blue-100/50"
                 )}>
                     <div className="flex items-center gap-3">
                         <div className={cn(
                             "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all",
                             isRunning ? "bg-blue-100 text-blue-600 animate-pulse" : 
                             isFinished ? "bg-emerald-100 text-emerald-600" :
                             isError ? "bg-rose-100 text-rose-600" :
                             "bg-slate-100 text-slate-500"
                         )}>
                             {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 
                              isFinished ? <CheckCircle2 className="h-5 w-5" /> :
                              isError ? <AlertCircle className="h-5 w-5" /> :
                              <FileText className="h-5 w-5" />}
                         </div>
                         <div>
                             <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-100">最终研究报告</h3>
                                {isFinished && <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Completed</span>}
                             </div>
                             <p className="text-xs text-slate-500 font-medium">{getStatusText()}</p>
                         </div>
                     </div>
                 </div>

                 {/* Content Body */}
                 <div className={cn(
                     "p-8 min-h-[100px]",
                     isLoading && "flex flex-col items-center justify-center py-12 text-center"
                 )}>
                     {isError ? (
                        <div className="flex flex-col items-center gap-2 text-rose-500">
                          <AlertCircle className="h-8 w-8 opacity-80" />
                          <span>生成报告时发生错误，请重试。</span>
                        </div>
                      ) : message.trim() ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none 
                            prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                            prose-p:leading-relaxed prose-li:marker:text-blue-400
                            prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
                            prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-100 prose-pre:text-slate-700
                        ">
                          <Streamdown>{message}</Streamdown>
                          {isRunning && (
                             <div className="mt-4 flex items-center gap-2 text-blue-500 animate-pulse">
                                 <Sparkles className="h-4 w-4" />
                                 <span className="text-sm font-medium">正在完善内容...</span>
                             </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-400 animate-pulse">
                           <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                           </div>
                           <span className="text-sm font-medium">{isPending ? '准备生成内容...' : '正在构思...'}</span>
                        </div>
                      )}
                 </div>
             </div>
        ) : (
            // Regular Chat Message (Fall back to simpler style if needed, but currently reused)
             <div className="bg-card border border-border/50 text-foreground px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Streamdown>{message}</Streamdown>
                </div>
             </div>
        )}
      </div>
    );
  }
);

ChatEventRenderer.displayName = 'ChatEventRenderer';

export default ChatEventRenderer;

