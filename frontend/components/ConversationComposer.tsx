'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
// @ts-expect-error
import Typewriter from 'typewriter-effect/dist/core';

const TYPEWRITER_STRINGS = ["正在准备研究：2025年半导体供应链分析...", "正在准备研究：对比Google和OpenAI的大模型发展方向..."];

interface ConversationComposerProps {
  variant?: 'chat' | 'landing';
  value: string;
  placeholder?: string;
  typewriterOptions?: {
    enable: boolean;
    strings?: string[];
    delay?: number;
    loop?: boolean;
    autoStart?: boolean;
  }
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  canSubmit: boolean;
  inputRef?: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  className?: string;
}

export const ConversationComposer: React.FC<ConversationComposerProps> = ({
  variant = 'chat',
  value,
  placeholder = "",
  typewriterOptions = {
    enable: true,
    strings: TYPEWRITER_STRINGS,
    delay: 100,
    loop: true,
    autoStart: true,
  },
  onChange,
  onSubmit,
  isLoading,
  canSubmit,
  inputRef,
  className,
}) => {
  const isLanding = variant === 'landing';
  
  const setTextareaRef = (node: HTMLTextAreaElement | null) => {
    if (inputRef) {
      inputRef.current = node;
    }
  };
  
  const setInputRef = (node: HTMLInputElement | null) => {
    if (inputRef) {
      inputRef.current = node;
    }
  };

  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');

  useEffect(() => {
    if (!typewriterOptions.enable) return;

    const typeWriter = new Typewriter(null, {
      strings: typewriterOptions.strings || TYPEWRITER_STRINGS,
      autoStart: typewriterOptions.autoStart || true,
      loop: typewriterOptions.loop || true,
      delay: typewriterOptions.delay || 100,
      onCreateTextNode: (character: string) => {
        setAnimatedPlaceholder((prev) => prev + character);
        return null;
      },
      onRemoveNode: () => {
        setAnimatedPlaceholder((prev) => prev.slice(0, -1));
      }
    });

    return () => {
      typeWriter.stop();
    };
  }, []);

  const displayPlaceholder = animatedPlaceholder || placeholder;

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        isLanding
          ? 'flex w-full flex-col gap-6 rounded-[32px] bg-card px-10 py-12 shadow-2xl border border-border/50'
          : 'relative flex items-end gap-2 rounded-3xl border border-input bg-card p-2 shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all',
        className
      )}
    >
      {isLanding ? (
        <textarea
          ref={setTextareaRef}
          placeholder={displayPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          className="w-full h-[60px] resize-none border-none bg-transparent text-lg leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      ) : (
        <Input
          ref={setInputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={displayPlaceholder}
          disabled={isLoading}
          className="flex-1 border-none bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 h-[52px] text-base"
        />
      )}
      <Button
        type="submit"
        size={isLanding ? undefined : 'icon'}
        disabled={!canSubmit}
        className={cn(
          isLanding
            ? 'self-end h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:bg-primary/90'
            : 'h-10 w-10 rounded-full bg-primary text-primary-foreground transition-all duration-200 mb-1.5 mr-1.5 hover:bg-primary/90 hover:scale-105 shadow-sm',
          !canSubmit && 'opacity-50 hover:scale-100 hover:shadow-none'
        )}
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        <span className="sr-only">发送</span>
      </Button>
    </form>
  );
};
