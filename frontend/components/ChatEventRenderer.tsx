'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { cn } from '@/lib/utils';
import { ChatEvent } from '@/stores';
import { EventRendererProps } from '@/services';
import { Streamdown } from 'streamdown';

/**
 * ChatEventRenderer 渲染器组件
 * 用于渲染纯文字消息（欢迎消息、错误消息等）
 */
export const ChatEventRenderer = observer(
  ({ data, status: _status, roleName: _roleName, className }: EventRendererProps<ChatEvent.IData>) => {
    const { message } = data;
    // Chat 消息通常都是 finished 状态，status 参数保留供未来扩展

    return (
      <div
        className={cn(
          'relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm max-w-full overflow-hidden',
          'bg-background border text-foreground rounded-tl-sm',
          className
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 prose-pre:bg-muted prose-pre:rounded-lg prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          <Streamdown>{message}</Streamdown>
        </div>
      </div>
    );
  }
);

ChatEventRenderer.displayName = 'ChatEventRenderer';

export default ChatEventRenderer;

