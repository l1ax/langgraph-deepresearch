import { observable, action, computed, makeObservable, runInAction, flow } from 'mobx';
import mitt from 'mitt';
import { authService, type AuthUser } from '@/services/auth';

/** UserStore 事件类型 */
type UserEvents = {
  userChange: AuthUser | null;
};

/**
 * User Store Singleton
 * 管理用户认证状态和行为
 */
export class UserStore {
  /** 当前用户（来自 Supabase Auth） */
  @observable currentUser: AuthUser | null = null;

  /** 是否正在进行认证操作 */
  @observable isAuthLoading: boolean = false;

  /** 事件发射器 */
  readonly events = mitt<UserEvents>();

  /** Auth 状态监听器的取消函数 */
  private authUnsubscribe: (() => void) | null = null;

  constructor() {
    makeObservable(this);
  }

  // ===== Auth 方法 =====

  /** 使用邮箱密码登录 */
  @flow.bound
  *signInWithPassword(email: string, password: string): Generator<Promise<any>, void, any> {
    try {
      this.isAuthLoading = true;
      yield authService.signInWithPassword(email, password);
    } catch (error) {
      console.error('Email/password login failed:', error);
      throw error;
    } finally {
      this.isAuthLoading = false;
    }
  }

  /** 重置密码 */
  @flow.bound
  *resetPassword(email: string): Generator<Promise<any>, void, any> {
    try {
      this.isAuthLoading = true;
      yield authService.resetPasswordForEmail(email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    } finally {
      this.isAuthLoading = false;
    }
  }

  /** 登出 */
  @flow.bound
  * signOut() {
    try {
      this.isAuthLoading = true;
      yield authService.signOut();

      this.currentUser = null;

      this.emitUserChange(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    } finally {
      this.isAuthLoading = false;
    }
  }

  /** 初始化认证状态 */
  @flow.bound
  * initialize(): Generator<Promise<any>, void, any> {
    if (this.authUnsubscribe) {
      return;
    }

    try {
      this.isAuthLoading = true;

      // 监听认证状态变化（Supabase 会在注册时触发 INITIAL_SESSION）
      const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
        await this.setUser(user);
      });

      this.authUnsubscribe = () => subscription.unsubscribe();

    } catch (error) {
      console.error('Failed to initialize user auth:', error);
      throw error;
    } finally {
      this.isAuthLoading = false;
    }
  }

  /** 设置用户状态 */
  @action.bound
  private async setUser(user: AuthUser | null) {
    if (this.currentUser?.id !== user?.id) {
      this.currentUser = user;
      this.emitUserChange(user);
    }
  }

  /** 发射用户变化事件 */
  private emitUserChange(user: AuthUser | null) {
    this.events.emit('userChange', user);
  }

  // ===== Computed =====

  /** 是否已认证 */
  @computed
  get isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  // ===== 清理资源 =====

  @action.bound
  dispose() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    this.events.all.clear();
  }
}

// 导出单例
export const userStore = new UserStore();
