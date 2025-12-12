/**
 * Type definitions for self-hosted LangGraph API
 * These replace the types from @langchain/langgraph-sdk
 */

/** Thread configuration */
export interface Config {
  recursion_limit?: number;
  configurable?: {
    thread_id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/** Thread object returned from API */
export interface Thread {
  thread_id: string;
  created_at: string;
  metadata?: Record<string, any>;
}

/** Thread state */
export interface ThreadState<T = any> {
  values: T;
  next: string[];
  created_at?: string;
  metadata?: Record<string, any>;
}

/** Stream chunk structure */
export interface StreamChunk {
  event: string;
  id: string;
  data: unknown;
}
