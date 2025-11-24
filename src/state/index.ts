import {Annotation, messagesStateReducer} from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

export const StateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer, // 使用内置的 reducer，自动处理序列化问题
        default: () => [],
    }),
    research_brief: Annotation<string | null>({
        default: () => null,
        reducer: (_left: string | null, right: string | null) => {
            return right;
        },
    }),
    supervisor_messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer, // 使用内置的 reducer，自动处理序列化问题
        default: () => [],
    }),
    raw_notes: Annotation<string[]>({
        reducer: (left: string[], right: string | string[]) => {
            if (Array.isArray(right)) {
                return left.concat(right);
            }
            return left.concat([right]);
        },
        default: () => [],
    }),
    notes: Annotation<string[]>({
        reducer: (left: string[], right: string | string[]) => {
            if (Array.isArray(right)) {
                return left.concat(right);
            }
            return left.concat([right]);
        },
        default: () => [],
    }),
    final_report: Annotation<string | null>({
        default: () => null,
        reducer: (_left: string | null, right: string | null) => {
            return right;
        },
    }),
});

/**
 * 研究代理的状态，包含消息历史和研究元数据。
 *
 * 此状态跟踪研究者的对话、用于限制工具调用的迭代计数、
 * 正在调查的研究主题、压缩的研究结果以及用于详细分析的原始研究笔记。
 */
export const ResearcherStateAnnotation = Annotation.Root({
    researcher_messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    tool_call_iterations: Annotation<number>({
        reducer: (_left: number, right: number) => right,
        default: () => 0,
    }),
    research_topic: Annotation<string>({
        reducer: (_left: string, right: string) => right,
        default: () => '',
    }),
    compressed_research: Annotation<string>({
        reducer: (_left: string, right: string) => right,
        default: () => '',
    }),
    raw_notes: Annotation<string[]>({
        reducer: (left: string[], right: string | string[]) => {
            if (Array.isArray(right)) {
                return left.concat(right);
            }
            return left.concat([right]);
        },
        default: () => [],
    }),
});

/**
 * 研究代理的输出状态，包含最终的研究结果。
 *
 * 这表示研究过程的最终输出，包含压缩的研究结果和研究过程中的所有原始笔记。
 */
export const ResearcherOutputStateAnnotation = Annotation.Root({
    compressed_research: Annotation<string>({
        reducer: (_left: string, right: string) => right,
        default: () => '',
    }),
    raw_notes: Annotation<string[]>({
        reducer: (left: string[], right: string | string[]) => {
            if (Array.isArray(right)) {
                return left.concat(right);
            }
            return left.concat([right]);
        },
        default: () => [],
    }),
    researcher_messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
});