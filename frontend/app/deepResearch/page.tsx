'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DeepResearchPageStore, Executor, Conversation } from '@/stores';
import { EventRendererRegistry, EventView } from '@/services';
import { ClarifyEventRenderer } from '@/components/ClarifyEventRenderer';
import { BriefEventRenderer } from '@/components/BriefEventRenderer';
import { ChatEventRenderer } from '@/components/ChatEventRenderer';
import { ToolCallEventRenderer } from '@/components/ToolCallEventRenderer';

// 注册渲染器
EventRendererRegistry.register<Executor.ClarifyEventData>('clarify', ClarifyEventRenderer);
EventRendererRegistry.register<Executor.BriefEventData>('brief', BriefEventRenderer);
EventRendererRegistry.register<Executor.ChatEventData>('chat', ChatEventRenderer);
EventRendererRegistry.register<Executor.ToolCallEventData>('tool_call', ToolCallEventRenderer);

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

/** 工具调用组渲染组件 */
const ToolCallGroupRenderer = observer<{ events: Executor.OutputEvent[] }>(({ events }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, events[events.length - 1]?.status]);

  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <div 
        ref={scrollRef}
        className="max-h-[240px] overflow-y-auto space-y-1 pr-1 custom-scrollbar scroll-smooth"
      >
        {events.map((event) => (
          <EventView key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
});

/** 助手消息元素渲染组件 */
const AssistantElementRenderer = observer<{ element: Conversation.AssistantElement }>(({ element }) => {
  // 对事件进行分组，连续的 tool_call 事件合并为一组
  const groupedEvents = useMemo(() => {
    const groups: (Executor.OutputEvent | { type: 'tool_group', events: Executor.OutputEvent[] })[] = [];
    let currentToolGroup: Executor.OutputEvent[] = [];

    element.events.forEach((event) => {
      if (event.eventType === 'tool_call') {
        currentToolGroup.push(event);
      } else {
        if (currentToolGroup.length > 0) {
          groups.push({ type: 'tool_group', events: [...currentToolGroup] });
          currentToolGroup = [];
        }
        groups.push(event);
      }
    });

    if (currentToolGroup.length > 0) {
      groups.push({ type: 'tool_group', events: [...currentToolGroup] });
    }

    return groups;
  }, [element.events.length, element.events]);

  return (
    <div className="flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 justify-start pr-12">
      <Avatar className="h-8 w-8 border bg-background shadow-sm shrink-0">
        <AvatarFallback className="bg-primary/5 text-primary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-3 min-w-0">
        {groupedEvents.map((group, index) => {
          if ('type' in group && group.type === 'tool_group') {
            return <ToolCallGroupRenderer key={`group-${group.events[0].id}`} events={group.events} />;
          }
          // 这里 group 就是 OutputEvent
          const event = group as Executor.OutputEvent;
          return <EventView key={event.id} event={event} />;
        })}
      </div>
    </div>
  );
});

/** 元素渲染组件 - 根据类型分发到对应渲染器 */
const ElementRenderer = observer<{ element: Conversation.Element }>(({ element }) => {
  if (Conversation.isUserElement(element)) {
    return <UserElementRenderer element={element} />;
  }
  return <AssistantElementRenderer element={element} />;
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
            {/* 渲染所有元素 */}
            {store.elements.map((element) => (
              <ElementRenderer key={element.id} element={element} />
            ))}

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
