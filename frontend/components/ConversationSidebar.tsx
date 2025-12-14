'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Conversation, DeepResearchPageStore } from '@/stores';
import { userStore } from '@/stores/User';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus, MessageSquare, Sparkles, Trash2, Loader2, LogOut, User, Github } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import dayjs from '@/lib/dayjs';
import {flowResult} from 'mobx';

interface ConversationSidebarProps {
  store: DeepResearchPageStore;
}

import { DeleteConversationDialog } from '@/components/DeleteConversationDialog';
import { useAlert } from '@/components/AlertContext';

export const ConversationSidebar = observer(({ store }: ConversationSidebarProps) => {
  const { conversations, currentConversation, isSidebarOpen, isLoadingConversations } = store;
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [threadToDelete, setThreadToDelete] = React.useState<string | null>(null);
  const { showAlert } = useAlert();

  /** 处理登出 */
  const handleSignOut = async () => {
    try {
      await flowResult(userStore.signOut());
      showAlert('已成功登出', 'success');
    } catch (error) {
      showAlert('登出失败，请重试', 'danger');
    }
  };

  /** 处理删除会话点击 */
  const handleDeleteClick = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (store.isConversationDeleting(threadId)) return;
    
    setThreadToDelete(threadId);
    setDeleteDialogOpen(true);
  };

  /** 确认删除 */
  const handleConfirmDelete = async () => {
    if (threadToDelete) {
      try {
        await flowResult(store.deleteConversation(threadToDelete));
        showAlert('对话已删除', 'success');
        setDeleteDialogOpen(false);
        setThreadToDelete(null);
      } catch (error: unknown) {
        if (error instanceof Error) {
          showAlert(error.message, 'danger');
        } else {
          showAlert('删除对话失败，请重试', 'danger');
        }
      }
    }
  };

  /** 取消删除 */
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setThreadToDelete(null);
  };

  const handleSwitchToConversation = async (conversation: Conversation) => {
    try {
      await flowResult(store.switchToConversation(conversation));
    } catch (error: unknown) {
      if (error instanceof Error) {
        showAlert(error.message, 'danger');
      } else {
        showAlert('切换会话失败，请重试', 'danger');
      }
    }
  };

  if (!isSidebarOpen) return null;

  return (
    <>
      <div className="w-64 h-full bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        {/* 顶部：新建对话按钮 */}
        <div className="h-20 p-4 bg-sidebar">
          <Button
            onClick={() => store.createNewConversation()}
            className="w-full h-12 rounded-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground font-medium shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>新建对话</span>
          </Button>
        </div>

        {/* 会话列表 */}
        <ScrollArea className="flex-1 px-3 py-4">
          {/* 加载状态 */}
          {isLoadingConversations ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span className="text-sm">加载对话列表...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">暂无对话</span>
              <span className="text-xs mt-1">点击上方按钮开始新对话</span>
            </div>
          ) : (
            <div className="space-y-2 w-56">
              {conversations.map((conversation) => {
                const isActive = currentConversation?.threadId === conversation.threadId;
                const isDeleting = store.isConversationDeleting(conversation.threadId);
                const title = conversation.getTitle();

                return (
                  <div
                    key={conversation.threadId}
                    className={cn(
                      'w-full rounded-2xl p-[2px] transition-all duration-200',
                      isDeleting && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <div
                      className={cn(
                        'w-full text-left px-3 py-3 rounded-xl transition-all duration-150 group relative',
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                      )}
                    >
                      <button
                        onClick={() => handleSwitchToConversation(conversation)}
                        className="w-full text-left"
                        disabled={isDeleting}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 p-1.5 rounded-md shrink-0 transition-colors',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-primary'
                            )}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MessageSquare className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <p className={cn(
                              'text-sm font-medium leading-tight truncate max-w-[140px] block',
                              isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                            )}>
                              {title}
                            </p>
                            {conversation.createdAt && (
                              <p className="text-xs text-muted-foreground/60 mt-1">
                                {isDeleting ? '删除中...' : dayjs(conversation.createdAt).fromNow()}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                      {/* 删除按钮 */}
                      <button
                        onClick={(e) => handleDeleteClick(e, conversation.threadId)}
                        disabled={isDeleting}
                        className={cn(
                          'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-150',
                          'opacity-0 group-hover:opacity-100',
                          'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                          isDeleting && 'opacity-100 cursor-not-allowed'
                        )}
                        title="删除对话"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* 底部：用户信息 */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar">
          {userStore.currentUser && (
            <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl hover:bg-sidebar-accent/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="h-8 w-8 shrink-0">
                  {userStore.currentUser.avatarUrl && (
                    <AvatarImage src={userStore.currentUser.avatarUrl} alt={userStore.currentUser.name || ''} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {userStore.currentUser.name || userStore.currentUser.email}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="登出"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <DeleteConversationDialog
        isOpen={deleteDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={threadToDelete ? store.isConversationDeleting(threadToDelete) : false}
      />
    </>
  );
});
