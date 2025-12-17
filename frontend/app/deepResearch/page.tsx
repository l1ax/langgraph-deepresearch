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
EventRendererRegistry.register<ClarifyEvent>('clarify', ClarifyEventRenderer);
EventRendererRegistry.register<BriefEvent>('brief', BriefEventRenderer);
EventRendererRegistry.register<ChatEvent>('chat', ChatEventRenderer);
EventRendererRegistry.register<ChatEvent>('report_generation', ChatEventRenderer);
EventRendererRegistry.register<ToolCallEvent>('tool_call', ToolCallEventRenderer);
EventRendererRegistry.register<GroupEvent>('group', GroupEventRenderer);
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
    <div className="relative rounded-2xl rounded-tr-sm px-6 py-4 text-sm leading-relaxed max-w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 text-foreground shadow-sm border border-primary/10">
      <div className="whitespace-pre-wrap break-words">{element.content}</div>
    </div>
    <Avatar className="h-9 w-9 shrink-0 mt-1 shadow-sm ring-2 ring-white dark:ring-zinc-800">
      {userStore.currentUser?.avatarUrl && <AvatarImage src={userStore.currentUser.avatarUrl} />}
      <AvatarFallback className="bg-primary/10 text-primary">
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
      <Avatar className="h-9 w-9 shrink-0 mt-1 p-[1px] bg-gradient-to-br from-blue-400 to-purple-500 shadow-[0_0_15px_rgba(66,133,244,0.4)]">
         <div className="h-full w-full rounded-full bg-background flex items-center justify-center relative z-10">
            <Sparkles className="h-5 w-5 text-transparent bg-clip-text bg-gradient-to-tr from-blue-500 to-purple-500 fill-current" />
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

  return (
     <div className="flex h-full w-full flex-col items-center justify-center px-4 relative">
         {/* Background Decor */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />

         <div className="w-full max-w-4xl space-y-16 text-center relative z-10">
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 ease-out">
              <h1 className="text-6xl md:text-7xl font-semibold tracking-tighter px-4 pb-2">
                <span className="text-gradient-gemini">
                  Hello, {isAuthenticated ? (userStore.currentUser?.name?.split(' ')[0] || 'Friend') : 'Guest'}
                </span>
              </h1>
              <h2 className="text-2xl md:text-3xl text-muted-foreground font-light px-4 tracking-tight">
                What would you like to research today?
              </h2>
            </div>
            
            {!isAuthenticated ? (
               <div className="max-w-sm mx-auto p-1 glass-panel rounded-3xl">
                 <div className="bg-white/50 dark:bg-black/50 p-6 rounded-[20px]">
                   <LoginForm store={store} />
                 </div>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                 {[
                    { text: '对比特斯拉与比亚迪的供应链差异', icon: '🏭', color: 'bg-blue-500/10 text-blue-600' },
                    { text: '分析英伟达最新财报亮点与风险', icon: '📈', color: 'bg-green-500/10 text-green-600' },
                    { text: '具身智能 (Embodied AI) 商业化现状', icon: '🤖', color: 'bg-purple-500/10 text-purple-600' },
                    { text: '2030年量子计算的发展预测', icon: '⚛️', color: 'bg-indigo-500/10 text-indigo-600' }
                 ].map((item, i) => (
                    <button
                      key={item.text}
                      onClick={() => onSuggestion(item.text)}
                      className={cn(
                        "glass-card group flex items-start gap-4 p-6 h-36 rounded-2xl text-left cursor-pointer hover:-translate-y-1 transition-all duration-300",
                        "animate-in fade-in zoom-in duration-500 fill-mode-both"
                      )}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                       <div className={cn("p-3 rounded-xl shrink-0 transition-colors", item.color)}>
                         <span className="text-2xl">{item.icon}</span>
                       </div>
                       <div className="flex flex-col h-full py-1">
                          <span className="text-lg font-medium text-foreground/90 group-hover:text-primary transition-colors line-clamp-2">
                             {item.text}
                          </span>
                          <span className="mt-auto text-xs text-muted-foreground font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">
                             Start Research <Sparkles className="h-3 w-3" />
                          </span>
                       </div>
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
              "h-full border-l border-border/50 flex flex-col overflow-hidden transition-all duration-300 relative z-20 shadow-[-5px_0_30px_-10px_rgba(0,0,0,0.05)]",
              store.isWorkflowViewOpen ? "w-[650px] opacity-100" : "w-0 opacity-0 border-l-0"
            )}>
              {store.isWorkflowViewOpen && (
                <>
                  {/* Panel Header */}
                  <div className="h-14 flex-none flex items-center justify-between px-5 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-border/40 z-10">
                    <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground tracking-tight">执行视图</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                      onClick={() => store.toggleWorkflowView()}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* ReactFlow Container */}
                  <div className="flex-1 min-h-0 relative">
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
