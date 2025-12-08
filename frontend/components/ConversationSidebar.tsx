'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { DeepResearchPageStore } from '@/stores/DeepResearchPageStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare, Sparkles } from 'lucide-react';

interface ConversationSidebarProps {
  store: DeepResearchPageStore;
}

export const ConversationSidebar = observer(({ store }: ConversationSidebarProps) => {
  const { conversations, currentConversation, isSidebarOpen } = store;

  /** 获取会话的标题（取第一条用户消息的前30个字符） */
  const getConversationTitle = (conversation: typeof conversations[0]) => {
    const firstUserElement = conversation.elements.find(
      (el) => el.role === 'user'
    );
    if (firstUserElement && 'content' in firstUserElement) {
      const title = firstUserElement.content.slice(0, 30);
      return title.length < firstUserElement.content.length ? `${title}...` : title;
    }
    return '新对话';
  };

  /** 获取会话的时间显示 */
  const getConversationTime = (conversation: typeof conversations[0]) => {
    if (conversation.elements.length > 0) {
      const time = conversation.elements[0].timestamp;
      const now = new Date();
      const diff = now.getTime() - time.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes} 分钟前`;
      if (hours < 24) return `${hours} 小时前`;
      if (days < 7) return `${days} 天前`;
      return time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
    return '';
  };

  if (!isSidebarOpen) return null;

  return (
    <div className="w-64 h-full bg-[#E9EEF6] text-slate-900 flex flex-col border-r border-[#D4DBE8]">
      {/* 顶部：新建对话按钮 */}
      <div className="h-20 p-4 bg-[#E3EAF5]">
        <Button
          onClick={() => store.createNewConversation()}
          className="w-full h-12 rounded-lg bg-[#4F6EC7] hover:bg-[#3C5AB1] text-white font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>新建对话</span>
        </Button>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-2 w-56">
          {conversations.map((conversation) => {
            const isActive = currentConversation?.threadId === conversation.threadId;
            const title = getConversationTitle(conversation);
            const time = getConversationTime(conversation);

            return (
              <div
                key={conversation.threadId}
                className={cn(
                  'w-full rounded-2xl p-[2px] transition-all duration-200',
                )}
              >
                <button
                  onClick={() => store.switchToConversation(conversation.threadId)}
                  className={cn(
                    'w-full text-left px-3 py-3 rounded-[1.35rem] transition-all duration-150 group',
                    isActive ? 'bg-white' : 'bg-transparent hover:bg-white/70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-0.5 p-1.5 rounded-md flex-shrink-0 border border-transparent transition-colors',
                        isActive
                          ? 'bg-[#4F6EC7]/15 border-[#4F6EC7]/30 text-[#3D5AB8]'
                          : 'bg-[#DFE6F3] text-[#7A88AB] group-hover:bg-white group-hover:text-[#4F6EC7]'
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-semibold leading-tight truncate max-w-[180px] block',
                        isActive ? 'text-slate-900' : 'text-slate-700'
                      )}>
                        {title}
                      </p>
                      {time && (
                        <p className="text-xs text-slate-500 mt-1">
                          {time}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* 底部装饰 */}
      <div className="p-4 border-t border-[#D4DBE8] bg-[#E3EAF5]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-[#4F6EC7] to-[#7A8FD6] text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium text-slate-600">DeepResearch AI</span>
        </div>
      </div>
    </div>
  );
});
