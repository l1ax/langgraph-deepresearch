'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, LogOut, User, Github, Loader2 } from 'lucide-react';
import { userStore } from '@/stores/User';
import { DeepResearchPageStore } from '@/stores';
import { cn } from '@/lib/utils';
import {flowResult} from 'mobx';

interface AuthButtonProps {
  store: DeepResearchPageStore;
  variant?: 'default' | 'sidebar';
}

export const AuthButton = observer(({ store, variant = 'default' }: AuthButtonProps) => {
  const { currentUser, isAuthLoading } = userStore;

  const handleSignIn = async () => {
    try {
      await flowResult(userStore.signInWithGitHub());
    } catch (error) {
      store.showToast('GitHub 登录失败，请重试', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await userStore.signOut();
      store.showToast('已成功登出', 'success');
    } catch (error) {
      store.showToast('登出失败，请重试', 'error');
    }
  };

  if (isAuthLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="hidden md:inline">加载中...</span>
      </Button>
    );
  }

  if (!currentUser) {
    return (
      <Button
        onClick={handleSignIn}
        variant={variant === 'sidebar' ? 'outline' : 'default'}
        size="sm"
        className={cn(
          'gap-2',
          variant === 'sidebar' && 'w-full justify-start'
        )}
      >
        <Github className="h-4 w-4" />
        <span>使用 GitHub 登录</span>
      </Button>
    );
  }

  // 已登录状态
  if (variant === 'sidebar') {
    return (
      <div className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="h-8 w-8 shrink-0">
            {currentUser.avatarUrl ? (
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name || ''} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {currentUser.name || currentUser.email}
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
    );
  }

  // 默认样式（头部）
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        {currentUser.avatarUrl ? (
          <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name || ''} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden md:inline">登出</span>
      </Button>
    </div>
  );
});

