'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { User, Bot, Sparkles, Menu, GitBranch, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DeepResearchPageStore, Conversation, ClarifyEvent, BriefEvent, ChatEvent, ToolCallEvent, GroupEvent } from '@/stores';
import { userStore } from '@/stores/User';
import { EventRendererRegistry } from '@/services';
import { ClarifyEventRenderer } from '@/components/eventRenders/ClarifyEventRenderer';
import { BriefEventRenderer } from '@/components/eventRenders/BriefEventRenderer';
import { ChatEventRenderer } from '@/components/eventRenders/ChatEventRenderer';
import { ToolCallEventRenderer } from '@/components/eventRenders/ToolCallEventRenderer';
import { GroupEventRenderer } from '@/components/eventRenders/GroupEventRenderer';
import { TreeViewUI } from '@/components/TreeViewUI';
import { WorkflowViewUi } from '@/components/WorkflowViewUi';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { ConversationComposer } from '@/components/ConversationComposer';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertProvider, useAlert } from '@/components/AlertContext';
import { AlertContainer } from '@/components/AlertContainer';
import { AuthButton } from '@/components/AuthButton';
import { LoginForm } from '@/components/LoginForm';
import { flowResult } from 'mobx';

// 按 subType 注册渲染器
EventRendererRegistry.register<ClarifyEvent.IData>('clarify', ClarifyEventRenderer);
EventRendererRegistry.register<BriefEvent.IData>('brief', BriefEventRenderer);
EventRendererRegistry.register<ChatEvent.IData>('chat', ChatEventRenderer);
EventRendererRegistry.register<ToolCallEvent.IData>('tool_call', ToolCallEventRenderer);
EventRendererRegistry.register<GroupEvent.IData>('group', GroupEventRenderer);

/** 会话加载时的骨架屏 */
const ConversationSkeleton = () => (
  <div className="mx-auto max-w-[800px] space-y-8 pb-24 animate-in fade-in duration-500">
    <div className="flex w-full gap-4 justify-end pl-12">
      <Skeleton className="h-[72px] w-[60%] rounded-2xl rounded-tr-sm bg-muted/40" />
      <Skeleton className="h-8 w-8 rounded-full shrink-0 bg-muted/40" />
    </div>
    <div className="flex w-full gap-4 justify-start pr-12">
      <Skeleton className="h-8 w-8 rounded-full shrink-0 bg-muted/40" />
      <div className="flex-1 space-y-4">
         <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full bg-muted/40" />
            <Skeleton className="h-4 w-[90%] bg-muted/40" />
            <Skeleton className="h-4 w-[95%] bg-muted/40" />
         </div>
      </div>
    </div>
  </div>
);

/** 用户消息元素渲染组件 */
const UserElementRenderer = observer<{ element: Conversation.UserElement }>(({ element }) => (
  <div className="flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 justify-end pl-0 md:pl-12 group">
    <div className="relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed max-w-full overflow-hidden bg-muted/50 text-foreground rounded-tr-sm">
      <div className="whitespace-pre-wrap break-words">{element.content}</div>
    </div>
    <Avatar className="h-8 w-8 shrink-0 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      {userStore.currentUser?.avatarUrl && <AvatarImage src={userStore.currentUser.avatarUrl} />}
      <AvatarFallback className="bg-muted text-muted-foreground">
        <User className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  </div>
));

/** Assistant Message Renderer */
const AssistantElementRenderer = observer<{ element: Conversation.AssistantElement }>(({ element }) => {
  const { executionResponse } = element;
  return (
    <div className="flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 justify-start pr-0 md:pr-12">
      <Avatar className="h-8 w-8 shrink-0 mt-1 gradient-border p-[1px] bg-transparent">
         <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
         </div>
      </Avatar>
      <div className="flex-1 space-y-3 min-w-0">
        {executionResponse.treeView.topLevelEventNodes.length > 0 ? (
          <TreeViewUI treeView={executionResponse.treeView} />
        ) : null}
      </div>
    </div>
  );
});

/** Loading Indicator */
const LoadingIndicator = observer(() => (
  <div className="flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 justify-start pr-12">
     <div className="h-8 w-8 flex items-center justify-center shrink-0">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
     </div>
    <div className="relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed bg-transparent text-foreground">
       <span className="text-muted-foreground italic">思考中...</span>
    </div>
  </div>
));

/** Welcome Screen / Landing */
const LandingEvent = observer<{ store: DeepResearchPageStore; onSuggestion: (p: string) => void }>(({ store, onSuggestion }) => {
  const isAuthenticated = userStore.isAuthenticated;

  // New Gradient Hello
  const helloGradient = "bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] text-transparent bg-clip-text";

  return (
     <div className="flex h-full w-full flex-col items-center justify-center px-4 -mt-20">
         <div className="w-full max-w-3xl space-y-12 text-center">
            <div className="space-y-4">
              <h1 className={cn("text-5xl md:text-6xl font-medium tracking-tight px-4 pb-2", helloGradient)}>
                你好, {isAuthenticated ? (userStore.currentUser?.name?.split(' ')[0] || '的朋友') : '访客'}
              </h1>
              <h2 className="text-3xl md:text-4xl text-muted-foreground font-light px-4">
                今天想研究点什么？
              </h2>
            </div>
            
            {!isAuthenticated ? (
               <div className="max-w-sm mx-auto p-6 rounded-2xl bg-card border border-border/50 shadow-xl">
                 <LoginForm store={store} />
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                 {[
                    { text: '对比特斯拉与比亚迪的供应链差异', icon: '🏭' },
                    { text: '分析英伟达最新财报亮点与风险', icon: '📈' },
                    { text: '具身智能 (Embodied AI) 商业化现状', icon: '🤖' },
                    { text: '2030年量子计算的发展预测', icon: '⚛️' }
                 ].map((item) => (
                    <button
                      key={item.text}
                      onClick={() => onSuggestion(item.text)}
                      className="group flex flex-col items-start p-6 h-32 rounded-2xl bg-white hover:bg-[#eaeaea]/60 transition-all border border-transparent hover:border-border/50 text-left cursor-pointer"
                    >
                       <span className="text-2xl mb-auto">{item.icon}</span>
                       <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                         {item.text}
                       </span>
                    </button>
                 ))}
              </div>
            )}
         </div>
     </div>
  );
});

const DeepResearchPageContent = observer(() => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const store = useMemo(() => new DeepResearchPageStore(), []);
  const { showAlert } = useAlert();

  useEffect(() => {
    const init = async () => {
      try {
        await flowResult(store.initClient());
      } catch (error) {
        showAlert('初始化失败，请刷新页面重试', 'danger');
      }
    };
    init();
    return () => store.dispose();
  }, [store, showAlert]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await flowResult(store.handleSubmit());
    } catch (error: unknown) {
      if (error instanceof Error) {
        showAlert(error.message, 'danger');
      } else {
        showAlert('处理请求时出现错误', 'danger');
      }
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    store.setInputValue(prompt);
    // Use a timeout to ensure state update before focus
    setTimeout(() => {
      composerInputRef.current?.focus();
    }, 50);
  };

  const lastElement = store.elements[store.elements.length - 1];
  const showLoading = store.isLoading && lastElement && Conversation.isUserElement(lastElement);
  const hasConversation = Boolean(store.currentConversation);
  
  return (
    <div 
      className="flex h-screen w-full min-h-0 text-foreground font-sans overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: hasConversation ? '#ffffff' : '#f0f4f8' }}
    >
      <AlertContainer />
      <ConversationSidebar store={store} />

      {/* Main Content Area - Flex Column Layout */}
      <div className="flex flex-1 min-h-0 flex-col">
        
        {/* Header - Static */}
        <header className="h-16 flex-none flex items-center justify-between px-6 z-10">
           <div>
             {!store.isSidebarOpen && (
               <Button variant="ghost" size="icon" onClick={() => store.toggleSidebar()} className="text-muted-foreground hover:text-foreground">
                  <Menu className="h-5 w-5" />
               </Button>
             )}
           </div>
           <div className="flex items-center gap-2">
              {hasConversation && (
                <Button 
                  variant={store.isWorkflowViewOpen ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => store.toggleWorkflowView()} 
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                   <GitBranch className="h-4 w-4" />
                   <span className="hidden sm:inline">展示执行视图</span>
                </Button>
              )}
              <AuthButton store={store} />
           </div>
        </header>

        {/* Content Area - Flex Row for chat + workflow panel */}
        <div className="flex-1 overflow-hidden relative flex flex-row">
          {/* Chat Content */}
          <div className={cn(
            "flex-1 min-w-0 flex flex-col items-center transition-all duration-300",
            store.isWorkflowViewOpen && hasConversation ? "mr-0" : ""
          )}>
            {!hasConversation ? (
               <LandingEvent store={store} onSuggestion={handleSuggestedPrompt} />
            ) : (
              <ScrollArea className="w-full h-full" ref={scrollAreaRef}>
                  <div className="flex flex-col items-center w-full min-h-full py-8">
                      <div className="w-full max-w-[800px] px-4 space-y-10">
                         {store.isHistoryLoading ? (
                            <ConversationSkeleton />
                         ) : (
                           <>
                             {store.elements.map((element) => {
                               if (Conversation.isUserElement(element)) {
                                 return <UserElementRenderer key={element.id} element={element} />;
                               } else if (Conversation.isAssistantElement(element)) {
                                 return <AssistantElementRenderer key={element.id} element={element} />;
                               }
                               return null;
                             })}
                             {showLoading && <LoadingIndicator />}
                             <div ref={messagesEndRef} className="h-4" />
                           </>
                         )}
                      </div>
                  </div>
              </ScrollArea>
            )}
          </div>

          {/* Workflow View Panel */}
          {hasConversation && (
            <div className={cn(
              "h-full border-l border-border/50 bg-muted/20 flex flex-col overflow-hidden transition-all duration-300",
              store.isWorkflowViewOpen ? "w-[450px] opacity-100" : "w-0 opacity-0 border-l-0"
            )}>
              {store.isWorkflowViewOpen && (
                <>
                  {/* Panel Header */}
                  <div className="h-12 flex-none flex items-center justify-between px-4 border-b border-border/50 bg-background/80">
                    <span className="text-sm font-medium text-foreground">执行视图</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => store.toggleWorkflowView()}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* ReactFlow Container */}
                  <div className="flex-1 min-h-0">
                    {store.elements.length > 0 && Conversation.isAssistantElement(store.elements[store.elements.length - 1]) && (
                      <WorkflowViewUi store={(store.elements[store.elements.length - 1] as Conversation.AssistantElement).executionResponse.WorkflowView} />
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Input Area - Static Footer */}
        <div className="flex-none w-full flex justify-center pb-8 px-4 pt-4 bg-transparent">
           <div className="w-full max-w-[800px]">
              <ConversationComposer
                 variant={hasConversation ? "chat" : "landing"}
                 value={store.inputValue}
                 onChange={(value) => store.setInputValue(value)}
                 onSubmit={handleSubmit}
                 isLoading={store.isLoading}
                 canSubmit={store.canSubmit}
                 inputRef={composerInputRef}
                 useTypewriter={!!userStore.currentUser && !hasConversation}
                 placeholder={userStore.currentUser ? '深入研究...' : '请登录后开始研究'}
              />
              <div className="mt-2 text-center text-xs text-muted-foreground/60">
                 DeepResearch的结果未必正确无误。请注意核查。
              </div>
           </div>
        </div>

      </div>
    </div>
  );
});

const DeepResearchPage = () => (
  <AlertProvider>
    <DeepResearchPageContent />
  </AlertProvider>
);

export default DeepResearchPage;
