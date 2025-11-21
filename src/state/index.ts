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