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
          ? 'flex w-full flex-col gap-6 rounded-[32px] bg-white px-10 py-12 shadow-xl'
          : 'relative flex items-end gap-2 rounded-2xl border border-[#E1E6F0] bg-white p-2 shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-[#4F6EC7]/40 focus-within:ring-offset-2',
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
          className="w-full h-[60px] resize-none border-none bg-transparent text-base leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      ) : (
        <Input
          ref={setInputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={displayPlaceholder}
          disabled={isLoading}
          className="flex-1 border-none bg-transparent px-3 py-3 shadow-none focus-visible:ring-0 h-[60px]"
        />
      )}
      <Button
        type="submit"
        size={isLanding ? undefined : 'icon'}
        disabled={!canSubmit}
        className={cn(
          isLanding
            ? 'self-end h-12 w-12 rounded-2xl bg-[#4F6EC7] text-white shadow-md transition-colors hover:bg-[#3C5AB1]'
            : 'h-10 w-10 rounded-xl bg-[#4F6EC7] text-white transition-all duration-200 mb-0.5 mr-0.5 hover:bg-[#3C5AB1] hover:scale-105',
          !canSubmit && 'opacity-60 hover:scale-100'
        )}
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        <span className="sr-only">发送</span>
      </Button>
    </form>
  );
};
