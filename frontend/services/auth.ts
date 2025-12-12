/**
 * Auth 服务层
 * 封装 Supabase Auth 相关操作
 */
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

class AuthService {
  private supabase = createClient();

  /**
   * 使用邮箱密码登录
   */
  async signInWithPassword(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Email/password login error:', error);
      throw error;
    }

    return data;
  }

  /**
   * 重置密码（发送重置邮件）
   */
  async resetPasswordForEmail(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await this.supabase.auth.getUser();

    if (!user) return null;

    return this.mapSupabaseUser(user);
  }

  /**
   * 监听认证状态变化
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        callback(this.mapSupabaseUser(session.user));
      } else {
        callback(null);
      }
    });
  }

  /**
   * 将 Supabase User 映射为 AuthUser
   */
  private mapSupabaseUser(user: SupabaseUser): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      // 优先使用 user_metadata 中的 username，否则使用 full_name/name，最后回退到邮箱前缀
      name: user.user_metadata?.username ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            null,
      avatarUrl: user.user_metadata?.avatar_url || null,
    };
  }
}

export const authService = new AuthService();
