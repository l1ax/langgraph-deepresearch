import { ToolNode } from '@langchain/langgraph/prebuilt';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { isAIMessage, ToolMessage } from '@langchain/core/messages';
import { tavilySearchTool, thinkTool } from '../../tools';
import { ResearcherStateAnnotation } from '../../state';
import { BaseEvent, ToolCallEvent } from '../../outputAdapters';
import {traceable} from 'langsmith/traceable';

const tools = [tavilySearchTool, thinkTool];

// 创建用于执行工具调用的工具节点
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toolNode = new ToolNode(tools as any);

/**
 * 工具节点包装器
 *
 * 包装 ToolNode 以处理状态转换。
 * ToolNode 期望 { messages: BaseMessage[] }，但我们的状态有 researcher_messages。
 */
export const researchToolNode = traceable(async (
    state: typeof ResearcherStateAnnotation.State,
    config: LangGraphRunnableConfig
) => {
    const messages = state.researcher_messages;
    const lastMessage = messages[messages.length - 1];

    // 获取 tool_calls 并为每个创建 ToolCallEvent
    // 使用 Map 存储 tool_call_id -> event 的映射，方便后续匹配结果
    const toolCallEventsMap = new Map<string, ToolCallEvent>();

    if (
        isAIMessage(lastMessage) &&
        'tool_calls' in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length > 0
    ) {
        // 获取 researcher_group_id
        const researcherGroupId = state.researcher_group_id;
        const threadId = config?.configurable?.thread_id as string | undefined;
        const runId = (config?.configurable?.run_id ||
          config?.metadata?.run_id) as string | undefined;
        const nodeName = 'researchToolNode';

        for (const toolCall of lastMessage.tool_calls) {
            const toolCallId = toolCall.id || '';
            const event = new ToolCallEvent(
              'researcher',
              BaseEvent.generateDeterministicId(
                threadId!,
                runId,
                nodeName,
                `tool-call-${toolCall.name}-${toolCallId}`
              )
            );
            event.setToolCall(
                toolCall.name,
                toolCall.args,
                toolCallId
            );

            // 设置 parentId 为 researcher GroupEvent 的 id
            if (researcherGroupId) {
                event.setParentId(researcherGroupId);
            }

            // 发送 running 状态
            if (config.writer) {
                config.writer(event.setStatus('running').toJSON());
            }

            toolCallEventsMap.set(toolCallId, event);
        }
    }

    try {
        // 使用消息执行工具节点
        const result = await toolNode.invoke({
            messages: state.researcher_messages,
        });

        // 从结果消息中提取工具调用结果
        for (const msg of result.messages) {
            if (msg instanceof ToolMessage) {
                const toolCallId = msg.tool_call_id;
                const event = toolCallEventsMap.get(toolCallId);
                if (event) {
                    // 设置工具调用结果
                    event.setToolResult(msg.content);
                    // 发送 finished 状态（包含结果）
                    if (config.writer) {
                        config.writer(event.setStatus('finished').toJSON());
                    }
                }
            }
        }

        // 以正确的状态格式返回更新的消息
        return {
            researcher_messages: result.messages,
        };
    } catch (error) {
        // 发送 error 状态
        for (const event of toolCallEventsMap.values()) {
            if (config.writer) {
                config.writer(event.setStatus('error').toJSON());
            }
        }
        throw error;
    }
});