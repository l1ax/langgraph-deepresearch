'use client';

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { Plus, MessageSquare, Trash2, LogOut, User, X, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DeepResearchPageStore } from '@/stores';
import { userStore } from '@/stores/User';

interface ConversationSidebarProps {
  store: DeepResearchPageStore;
}

// Custom simple Modal to avoid missing dependencies
const SimpleDeleteDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
      <div className="w-[90vw] max-w-[400px] bg-card border border-border rounded-xl shadow-lg p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">确定要删除这个对话吗？</h3>
          <p className="text-sm text-muted-foreground">
            此操作无法撤销。该对话将从您的历史记录中永久删除。
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} size="sm">
            取消
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm} 
            size="sm"
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ConversationSidebar = observer(({ store }: ConversationSidebarProps) => {
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

  const handleSignOut = async () => {
    await flowResult(userStore.signOut());
    store.createNewConversation();
  };

  const handleDeleteConversation = async (threadId: string) => {
    await flowResult(store.deleteConversation(threadId));
    setThreadToDelete(null);
  };

  // Group conversations by date
  const getGroupedConversations = (() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: Record<string, typeof store.conversations> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    store.conversations.forEach((conv) => {
      // 使用 updatedAt（如果存在）分组，回退到 createdAt
      const dateStr = conv.updatedAt || conv.createdAt;
      const date = new Date(dateStr);

      if (date.toDateString() === today.toDateString()) {
        groups.Today.push(conv);
      } else if (date.toDateString() === yesterday.toDateString()) {
        groups.Yesterday.push(conv);
      } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  });
  
  // Translation map for group headers
  const groupHeaderMap: Record<string, string> = {
      'Today': '今天',
      'Yesterday': '昨天',
      'Previous 7 Days': '过去7天',
      'Older': '更早'
  };

  return (
    <>
      <div 
        className={cn(
          "w-[260px] h-full bg-sidebar/50 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out border-r border-sidebar-border z-20 absolute md:static md:translate-x-0",
          !store.isSidebarOpen && "-translate-x-full w-0 opacity-0 md:w-0 md:opacity-0 md:translate-x-0 overflow-hidden"
        )}
      >
        {/* Header / New Chat */}
        <div className="p-4 flex flex-col gap-4">
           <div className="flex items-center gap-2">
             <Button
               onClick={() => store.createNewConversation()}
               className="flex-1 h-10 rounded-full bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 hover:shadow-sm justify-start px-4 gap-3 text-sm font-medium transition-all"
               variant="ghost"
             >
               <Plus className="h-5 w-5 text-sidebar-foreground/70" />
               <span>新对话</span>
             </Button>
             <Button
               variant="ghost" 
               size="icon" 
               onClick={() => store.toggleSidebar()}
               className="h-10 w-10 rounded-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80"
             >
               <PanelLeftClose className="h-5 w-5" />
             </Button>
           </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-6 pb-4">
             {Object.entries(getGroupedConversations()).map(([group, items]) => {
                if (items.length === 0) return null;
                
                return (
                   <div key={group} className="space-y-2 w-[240px]">
                      <h3 className="text-xs font-semibold text-sidebar-foreground/40 px-3 uppercase tracking-wider">
                        {groupHeaderMap[group] || group}
                      </h3>
                      <div className="space-y-1.5">
                         {items.map((conv) => {
                           const isSelected = store.currentConversation?.threadId === conv.threadId;
                           return (
                           <div
                             key={conv.threadId}
                             onClick={() => flowResult(store.switchToConversation(conv))}
                             className={cn(
                               "group flex items-center gap-3.5 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-all duration-200 relative",
                               isSelected
                                 ? "bg-[#0842a0] text-white shadow-md font-medium"
                                 : "text-sidebar-foreground/90 font-medium hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                             )}
                           >
                              <MessageSquare className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                isSelected ? "text-white" : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground"
                              )} />
                              <span className="truncate text-sm flex-1 pr-6">
                                {conv.title || "新对话"}
                              </span>
                              
                              {/* Delete Action - Visible on Hover */}
                              <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setThreadToDelete(conv.threadId);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                           </div>
                           );
                         })}
                      </div>
                   </div>
                );
             })}
          </div>
        </ScrollArea>

        {/* Footer / User Profile */}
        <div className="p-4 mt-auto border-t border-sidebar-border mx-2">
           {userStore.currentUser ? (
             <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer group">
                <Avatar className="h-8 w-8 rounded-full border border-sidebar-border">
                  <AvatarImage src={userStore.currentUser.avatarUrl || undefined} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                   <span className="text-sm font-medium truncate">
                      {userStore.currentUser.name}
                   </span>
                   <span className="text-xs text-muted-foreground truncate">
                      {userStore.currentUser.email}
                   </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleSignOut}>
                   <LogOut className="h-4 w-4 text-sidebar-foreground/70" />
                </Button>
             </div>
           ) : (
             <div className="text-xs text-center text-sidebar-foreground/50">访客模式</div>
           )}
        </div>
      </div>

      <SimpleDeleteDialog 
        isOpen={!!threadToDelete}
        onClose={() => setThreadToDelete(null)}
        onConfirm={() => threadToDelete && handleDeleteConversation(threadToDelete)}
      />
    </>
  );
});
