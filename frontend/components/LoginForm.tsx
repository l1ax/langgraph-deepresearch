'use client';

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { userStore } from '@/stores/User';
import { DeepResearchPageStore } from '@/stores';
import { flowResult } from 'mobx';

interface LoginFormProps {
  store: DeepResearchPageStore;
}

export const LoginForm = observer(({ store }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 客户端验证
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    try {
      await flowResult(userStore.signInWithPassword(email, password));
      store.showToast('登录成功', 'success');
    } catch (err: any) {
      console.error('Login error:', err);
      // 根据 Supabase 错误类型显示友好的错误消息
      if (err?.message?.includes('Invalid login credentials')) {
        setError('邮箱或密码错误，请重试');
      } else if (err?.message?.includes('Email not confirmed')) {
        setError('请先验证您的邮箱');
      } else {
        setError(err?.message || '登录失败，请重试');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">
          邮箱
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={userStore.isAuthLoading}
            className="pl-10"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">
          密码
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={userStore.isAuthLoading}
            className="pl-10"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={userStore.isAuthLoading}
        className="w-full"
        size="lg"
      >
        {userStore.isAuthLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            登录中...
          </>
        ) : (
          '登录'
        )}
      </Button>

      {/* 未来可以添加"忘记密码"链接 */}
      {/* <div className="text-center">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {}}
        >
          忘记密码？
        </button>
      </div> */}
    </form>
  );
});
