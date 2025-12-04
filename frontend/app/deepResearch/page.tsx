'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Client } from '@langchain/langgraph-sdk';
import { Send, User, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// UI Message type for rendering
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

// LangChain message content can be string or array of content blocks
type MessageContent = string | Array<{ type: string; text?: string }>;

// LangChain message type from graph state
interface LangChainMessage {
  type: 'human' | 'ai' | 'system' | 'tool';
  content: MessageContent;
  id?: string;
  name?: string;
}

// Graph state type matching backend StateAnnotation
interface GraphState {
  messages: LangChainMessage[];
  research_brief: string | null;
  supervisor_messages: LangChainMessage[];
  raw_notes: string[];
  notes: string[];
  research_iterations: number;
  final_report: string | null;
}

// Configuration
const GRAPH_ID = 'scopeAgent';
const API_URL = 'http://localhost:2024';

// Helper to extract text content from LangChain message
function extractMessageContent(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }
  return content.map((block) => block.text || '').join('');
}

// Type guard to check if chunk is a values event with graph state
function isValuesChunk(chunk: { event: string; data: unknown }): chunk is { event: 'values'; data: GraphState } {
  return chunk.event === 'values' && 
    chunk.data !== null && 
    typeof chunk.data === 'object' &&
    'messages' in chunk.data &&
    Array.isArray((chunk.data as GraphState).messages);
}

export default function DeepResearchPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<Client | null>(null);

  // Initialize client and thread
  useEffect(() => {
    const initClient = async () => {
      try {
        clientRef.current = new Client({ apiUrl: API_URL });
        const thread = await clientRef.current.threads.create();
        setThreadId(thread.thread_id);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: '你好！我是 DeepResearch 助手。请告诉我你想研究什么主题？',
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error('Failed to initialize client:', error);
      }
    };

    initClient();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !clientRef.current || !threadId) return;

    const userMessageContent = inputValue;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create a placeholder for the assistant's response
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '', // Initially empty, will act as loading indicator or stream buffer
        timestamp: new Date(),
      },
    ]);

    try {
      // Start streaming the run
      const stream = clientRef.current.runs.stream(
        threadId,
        GRAPH_ID,
        {
          input: {
            messages: [{ role: 'user', content: userMessageContent }],
          },
          streamMode: 'values',
        }
      );

      for await (const chunk of stream) {
        console.log(chunk);
        
        // Type-safe check for values event with graph state
        if (!isValuesChunk(chunk)) continue;
        
        const { messages: stateMessages } = chunk.data;
        
        if (stateMessages.length > 0) {
          const lastMessage = stateMessages[stateMessages.length - 1];
          
          // Only update if the last message is from AI
          if (lastMessage.type === 'ai') {
            const content = extractMessageContent(lastMessage.content);
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content }
                  : msg
              )
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => 
        prev.map((msg) => 
            msg.id === assistantMessageId 
                ? { ...msg, content: '抱歉，处理您的请求时出现错误。请确保后端服务已启动 (http://localhost:2024)。' }
                : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">DeepResearch</h1>
        </div>
        <div className="text-xs text-muted-foreground hidden md:block">
            Powered by LangGraph
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative bg-muted/5">
        <ScrollArea className="h-full p-4 md:p-8" ref={scrollAreaRef}>
          <div className="mx-auto max-w-3xl space-y-8 pb-24">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === 'user' ? "justify-end pl-12" : "justify-start pr-12"
                )}
              >
                {message.role === 'assistant' && (
                   <Avatar className="h-8 w-8 border bg-background shadow-sm shrink-0">
                     <AvatarFallback className="bg-primary/5 text-primary"><Bot className="h-4 w-4" /></AvatarFallback>
                   </Avatar>
                )}
                
                <div
                  className={cn(
                    "relative rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm max-w-full overflow-hidden",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-background border text-foreground rounded-tl-sm"
                  )}
                >
                    {message.content ? (
                        message.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 prose-pre:bg-muted prose-pre:rounded-lg prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        )
                    ) : (
                        <div className="flex items-center gap-1 h-5">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current delay-0"></span>
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current delay-150"></span>
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current delay-300"></span>
                        </div>
                    )}
                </div>

                {message.role === 'user' && (
                    <Avatar className="h-8 w-8 border shrink-0">
                        <AvatarFallback className="bg-muted"><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/80 p-4 backdrop-blur-md md:p-6">
        <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSubmit} className="relative flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="输入研究主题，例如：'2024年人工智能发展趋势'..."
                    className="flex-1 border-none bg-transparent px-3 py-3 shadow-none focus-visible:ring-0 min-h-[44px] max-h-[200px]"
                    disabled={isLoading}
                />
                <Button 
                    type="submit" 
                    size="icon"
                    disabled={isLoading || !inputValue.trim()}
                    className={cn(
                        "h-10 w-10 rounded-xl transition-all duration-200 mb-0.5 mr-0.5",
                        (isLoading || !inputValue.trim()) ? "opacity-50" : "hover:scale-105"
                    )}
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span className="sr-only">发送</span>
                </Button>
            </form>
            <div className="mt-3 text-center text-xs text-muted-foreground">
                DeepResearch 可以帮助您进行深度话题研究，可能需要一些时间来生成报告。
            </div>
        </div>
      </div>
    </div>
  );
}

