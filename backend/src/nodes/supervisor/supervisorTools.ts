/**
 * 监督器工具节点
 *
 * 执行监督器决策 - 进行研究或结束流程。
 * 处理：
 * - 执行 think_tool 调用以进行战略反思
 * - 为不同主题启动并行研究代理
 * - 聚合研究结果
 * - 确定何时完成研究
 */

import { ToolMessage, isToolMessage } from '@langchain/core/messages';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { StateAnnotation } from '../../state';
import { researchAgentGraph } from '../../graph/researchAgentGraph';
import { HumanMessage } from '@langchain/core/messages';
import { thinkTool } from '../../tools';
import { BaseEvent, GroupEvent, ToolCallEvent } from '../../outputAdapters';
import {traceable} from 'langsmith/traceable';

// 系统常量 - 应与 supervisor.ts 中的值匹配
const maxResearcherIterations = 6;

/**
 * 从监督器消息历史中的 ToolMessage 对象提取研究笔记。
 *
 * 当监督器通过 ConductResearch 工具调用将研究委派给子代理时，
 * 每个子代理将其压缩的研究结果作为 ToolMessage 的内容返回。
 * 此函数提取所有此类 ToolMessage 内容以编译最终研究笔记。
 */
function getNotesFromToolCalls(supervisorMessages: any[]): string[] {
    return supervisorMessages
        .filter((msg) => isToolMessage(msg))
        .map((msg) => String(msg.content));
}

/**
 * 监督器工具节点
 *
 * 执行监督器决策并管理研究代理的生命周期。
 */
export const supervisorTools = traceable(async (
    state: typeof StateAnnotation.State,
    config?: LangGraphRunnableConfig
) => {
    const supervisorMessages = state.supervisor_messages || [];
    const researchIterations = state.research_iterations || 0;
    const mostRecentMessage = supervisorMessages[supervisorMessages.length - 1];

    // 初始化单个返回模式的变量
    const toolMessages: ToolMessage[] = [];
    let allRawNotes: string[] = [];
    let shouldEnd = false;
    const eventsToAdd: BaseEvent.IJsonData[] = [];

    // 首先检查退出标准
    const exceededIterations = researchIterations >= maxResearcherIterations;
    const noToolCalls =
        !mostRecentMessage ||
        !('tool_calls' in mostRecentMessage) ||
        !Array.isArray(mostRecentMessage.tool_calls) ||
        mostRecentMessage.tool_calls.length === 0;

    // 如果没有工具调用，直接结束
    if (noToolCalls) {
        return {
            notes: getNotesFromToolCalls(supervisorMessages),
            research_brief: state.research_brief || '',
        };
    }

    // 如果超过迭代次数，标记为结束但仍需处理最后的工具调用
    if (exceededIterations) {
        shouldEnd = true;
    }

    // 获取 tool_calls 并为每个创建 ToolCallEvent
    // 使用 Map 存储 tool_call_id -> event 的映射，方便后续匹配结果
    const toolCallEventsMap = new Map<string, ToolCallEvent>();

    // 执行所有工具调用
    try {
        // 获取工具调用数组
        const toolCalls = 'tool_calls' in mostRecentMessage && Array.isArray(mostRecentMessage.tool_calls)
            ? mostRecentMessage.tool_calls
            : [];

        // 获取 supervisor_group_id
        const supervisorGroupId = state.supervisor_group_id;

        // 为每个工具调用创建并发送 running 状态的 ToolCallEvent
        const threadId = config?.configurable?.thread_id as string | undefined;
        const checkpointId = config?.configurable?.checkpoint_id as string | undefined;
        const nodeName = 'supervisorTools';

        for (const toolCall of toolCalls) {
            // ConductResearch 调用不创建 ToolCallEvent，直接用 research group展示
            if (toolCall.name === 'ConductResearch') {
                continue;
            }

            const toolCallId = toolCall.id || '';
            const event = new ToolCallEvent(
                'supervisor',
                BaseEvent.generateDeterministicId(
                    threadId!,
                    checkpointId,
                    nodeName,
                    `tool-call-${toolCall.name}-${toolCallId}`
                )
            );
            event.setToolCall(
                toolCall.name,
                toolCall.args,
                toolCallId
            );

            // 设置 parentId 为 supervisor GroupEvent 的 id
            if (supervisorGroupId) {
                event.setParentId(supervisorGroupId);
            }

            // 发送 running 状态
            if (config?.writer) {
                config.writer(event.setStatus('running').toJSON());
            }

            toolCallEventsMap.set(toolCallId, event);
            eventsToAdd.push(event.toJSON());
        }

        // 将 think_tool 调用与其他调用分开
        const thinkToolCalls = toolCalls.filter(
            (toolCall: any) => toolCall.name === 'think_tool'
        );

        const conductResearchCalls = toolCalls.filter(
            (toolCall: any) => toolCall.name === 'ConductResearch'
        );

        const researchCompleteCalls = toolCalls.filter(
            (toolCall: any) => toolCall.name === 'ResearchComplete'
        );

        // 处理 think_tool 调用（同步）
        for (const toolCall of thinkToolCalls) {
            const observation = await thinkTool.invoke(toolCall.args);
            const toolCallId = toolCall.id || '';
            toolMessages.push(
                new ToolMessage({
                    content: String(observation),
                    tool_call_id: toolCallId,
                })
            );
            
            // 发送 finished 状态
            const event = toolCallEventsMap.get(toolCallId);
            if (event && config?.writer) {
                event.setToolResult(observation);
                config.writer(event.setStatus('finished').toJSON());
            }
        }

        // 处理 ResearchComplete 调用
        for (const toolCall of researchCompleteCalls) {
            const toolCallId = toolCall.id || '';
            const resultContent = 'Research marked as complete';
            toolMessages.push(
                new ToolMessage({
                    content: resultContent,
                    tool_call_id: toolCallId,
                })
            );
            shouldEnd = true;
            
            // 发送 finished 状态
            const event = toolCallEventsMap.get(toolCallId);
            if (event && config?.writer) {
                event.setToolResult(resultContent);
                config.writer(event.setStatus('finished').toJSON());
            }
        }

        // 处理 ConductResearch 调用（异步）
        // 如果已经超过迭代次数，不再启动新的研究
        if (conductResearchCalls.length > 0 && !shouldEnd) {
            // 启动并行研究代理
            const researchPromises = conductResearchCalls.map((toolCall: any, index: number) => {
                const groupEvent = new GroupEvent(
                    'researcher',
                    BaseEvent.generateDeterministicId(
                        threadId!,
                        checkpointId,
                        nodeName,
                        `researcher-group-${toolCall.args.research_topic}-${index}`
                    )
                );

                // 设置 parentId 为 supervisor GroupEvent 的 id，使 researcher group event 被聚合到 supervisor group event 里
                if (supervisorGroupId) {
                    groupEvent.setParentId(supervisorGroupId);
                }

                // 初始化researcher event，开始聚合后续researcher产出的events
                if (config?.writer) {
                    config.writer(groupEvent.setStatus('running').toJSON());
                }

                // Store group event to eventsToAdd
                eventsToAdd.push(groupEvent.toJSON());

                return (researchAgentGraph as any).invoke({
                    researcher_messages: [
                        new HumanMessage({
                            content: toolCall.args.research_topic,
                        }),
                    ],
                    research_topic: toolCall.args.research_topic,
                    researcher_group_id: groupEvent.id,
                }, config).then((result: any) => {
                    if (config?.writer) {
                        config.writer(groupEvent.setStatus('finished').toJSON());
                    }

                    return result;
                }).catch((error: any) => {
                    if (config?.writer) {
                        config.writer(groupEvent.setStatus('error').toJSON());
                    }

                    throw error;
                });
            });

            // 等待所有研究完成
            const toolResults = await Promise.all(researchPromises);

            // 将研究结果格式化为工具消息
            // 每个子代理在 result.compressed_research 中返回压缩的研究结果
            // 我们将此压缩的研究作为 ToolMessage 的内容写入，这允许
            // 监督器稍后通过 get_notes_from_tool_calls() 检索这些结果
            const researchToolMessages = toolResults.map((result: any, index: number) => {
                const toolCall = conductResearchCalls[index];
                const toolCallId = toolCall.id || '';
                const resultContent = result.compressed_research || 'Error synthesizing research report';
                
                // 发送 finished 状态
                const event = toolCallEventsMap.get(toolCallId);
                if (event && config?.writer) {
                    event.setToolResult(resultContent);
                    config.writer(event.setStatus('finished').toJSON());
                }
                
                return new ToolMessage({
                    content: resultContent,
                    tool_call_id: toolCallId,
                });
            });

            toolMessages.push(...researchToolMessages);

            // 从所有研究中聚合原始笔记
            allRawNotes = toolResults
                .map((result: any) => (result.raw_notes || []).join('\n'))
                .filter((notes: string) => notes.length > 0);
        } else if (conductResearchCalls.length > 0 && shouldEnd) {
            // 如果已超过迭代次数但还有 ConductResearch 调用，返回错误响应
            for (const toolCall of conductResearchCalls) {
                const toolCallId = toolCall.id || '';
                const resultContent = 'Research iteration limit reached. Unable to conduct further research.';
                toolMessages.push(
                    new ToolMessage({
                        content: resultContent,
                        tool_call_id: toolCallId,
                    })
                );
                
                // 发送 finished 状态
                const event = toolCallEventsMap.get(toolCallId);
                if (event && config?.writer) {
                    event.setToolResult(resultContent);
                    config.writer(event.setStatus('finished').toJSON());
                }
            }
        }
    } catch (error) {
        console.error('Error in supervisor tools:', error);
        // 发送 error 状态
        for (const event of toolCallEventsMap.values()) {
            if (config?.writer) {
                config.writer(event.setStatus('error').toJSON());
            }
        }
        shouldEnd = true;
    }

    // 具有适当状态更新的单个返回点
    if (shouldEnd) {
        // 即使要结束，也需要返回 toolMessages 以确保所有 tool_calls 都有响应
        const notes = getNotesFromToolCalls([...supervisorMessages, ...toolMessages]);
        console.log('[supervisorTools] shouldEnd=true, returning notes:', notes);
        const result: any = {
            notes,
            research_brief: state.research_brief || '',
        };

        // 如果有工具消息，需要追加到 supervisor_messages 中
        if (toolMessages.length > 0) {
            result.supervisor_messages = toolMessages;
        }

        // Store events to state.events
        if (eventsToAdd.length > 0) {
            result.events = eventsToAdd;
        }

        return result;
    } else {
        // CRITICAL: 确保所有 tool_calls 都有对应的 ToolMessage
        // 如果 mostRecentMessage 有 tool_calls，我们必须为每个 tool_call 返回 ToolMessage
        const result: any = {
            supervisor_messages: toolMessages,
            raw_notes: allRawNotes,
        };

        // Store events to state.events
        if (eventsToAdd.length > 0) {
            result.events = eventsToAdd;
        }

        return result;
    }
});
