'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DeepResearchPageStore, Conversation, ClarifyEvent, BriefEvent, ChatEvent, ToolCallEvent, GroupEvent } from '@/stores';
import { EventRendererRegistry } from '@/services';
import { ClarifyEventRenderer } from '@/components/ClarifyEventRenderer';
import { BriefEventRenderer } from '@/components/BriefEventRenderer';
import { ChatEventRenderer } from '@/components/ChatEventRenderer';
import { ToolCallEventRenderer } from '@/components/ToolCallEventRenderer';
import { GroupEventRenderer } from '@/components/GroupEventRenderer';
import { TreeViewUI } from '@/components/TreeViewUI';

// 按 subType 注册渲染器
EventRendererRegistry.register<ClarifyEvent.IData>('clarify', ClarifyEventRenderer);
EventRendererRegistry.register<BriefEvent.IData>('brief', BriefEventRenderer);
EventRendererRegistry.register<ChatEvent.IData>('chat', ChatEventRenderer);
EventRendererRegistry.register<ToolCallEvent.IData>('tool_call', ToolCallEventRenderer);
EventRendererRegistry.register<GroupEvent.IData>('group', GroupEventRenderer);

/** 用户消息元素渲染组件 */
const UserElementRenderer = observer<{ element: Conversation.UserElement }>(({ element }) => (
  <div className="flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 justify-end pl-12">
    <div className="relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm max-w-full overflow-hidden bg-primary text-primary-foreground rounded-tr-sm">
      <div className="whitespace-pre-wrap break-words">{element.content}</div>
    </div>
    <Avatar className="h-8 w-8 border shrink-0">
      <AvatarFallback className="bg-muted">
        <User className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  </div>
));

/** 助手元素渲染组件 - 渲染包含 ExecutionResponse 的 assistant element */
const AssistantElementRenderer = observer<{ element: Conversation.AssistantElement }>(({ element }) => {
  const { executionResponse } = element;
  
  return (
    <div className="flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 justify-start pr-12">
      <Avatar className="h-8 w-8 border bg-background shadow-sm shrink-0">
        <AvatarFallback className="bg-primary/5 text-primary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-3 min-w-0">
        {executionResponse.treeView.topLevelEventNodes.length > 0 ? (
          <TreeViewUI treeView={executionResponse.treeView} />
        ) : null}
      </div>
    </div>
  );
});


/** Loading 指示器组件 */
const LoadingIndicator = observer(() => (
  <div className="flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 justify-start pr-12">
    <Avatar className="h-8 w-8 border bg-background shadow-sm shrink-0">
      <AvatarFallback className="bg-primary/5 text-primary">
        <Bot className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
    <div className="relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm bg-background border text-foreground rounded-tl-sm">
      <div className="flex items-center gap-1 h-5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]"></span>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]"></span>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]"></span>
      </div>
    </div>
  </div>
));

const DeepResearchPage = observer(() => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const store = useMemo(() => new DeepResearchPageStore(), []);

  // Initialize client and thread
  useEffect(() => {
    store.initClient();
  }, [store]);

  // Auto-scroll to bottom when elements change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await store.handleSubmit();
  };

  // 判断是否显示 loading：正在加载且最后一个元素是用户消息
  // 不使用 useMemo，直接计算以确保 mobx 响应式正常工作
  const lastElement = store.elements[store.elements.length - 1];
  const showLoading = store.isLoading && lastElement && Conversation.isUserElement(lastElement);

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">DeepResearch</h1>
        </div>
        <div className="text-xs text-muted-foreground hidden md:block">
          Powered by LangGraph
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative bg-muted/5">
        <ScrollArea className="h-full p-4 md:p-8" ref={scrollAreaRef}>
          <div className="mx-auto max-w-3xl space-y-8 pb-24">
            {/* 按照 elements 的顺序渲染所有元素 */}
            {store.elements.map((element) => {
              if (Conversation.isUserElement(element)) {
                return <UserElementRenderer key={element.id} element={element} />;
              } else if (Conversation.isAssistantElement(element)) {
                return <AssistantElementRenderer key={element.id} element={element} />;
              }
              return null;
            })}

            {/* Loading 指示器 */}
            {showLoading && <LoadingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/80 p-4 backdrop-blur-md md:p-6">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          >
            <Input
              value={store.inputValue}
              onChange={(e) => store.setInputValue(e.target.value)}
              placeholder="输入研究主题，例如：'2024年人工智能发展趋势'..."
              className="flex-1 border-none bg-transparent px-3 py-3 shadow-none focus-visible:ring-0 min-h-[44px] max-h-[200px]"
              disabled={store.isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!store.canSubmit}
              className={cn(
                'h-10 w-10 rounded-xl transition-all duration-200 mb-0.5 mr-0.5',
                !store.canSubmit ? 'opacity-50' : 'hover:scale-105'
              )}
            >
              {store.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span className="sr-only">发送</span>
            </Button>
          </form>
          <div className="mt-3 text-center text-xs text-muted-foreground">
            DeepResearch 可以帮助您进行深度话题研究，可能需要一些时间来生成报告。
          </div>
        </div>
      </div>
    </div>
  );
});

export default DeepResearchPage;
