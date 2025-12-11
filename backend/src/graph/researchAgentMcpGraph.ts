/**
 * @file Research Agent MCP Graph
 *
 * 此模块实现了使用 MCP (Model Context Protocol) 工具的研究代理工作流。
 * 它使用文件系统 MCP 服务器访问本地文档进行研究。
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ResearcherStateAnnotation } from '../state';
import { researchMcpLlmCall } from '../nodes/researchAgentMcp/llmCall';
import { researchMcpToolNode } from '../nodes/researchAgentMcp/toolNode';
import { compressResearch } from '../nodes';
import { isAIMessage } from '@langchain/core/messages';

// ===== 路由逻辑 =====

/**
 * 判断是继续使用工具执行还是压缩研究。
 *
 * 根据 LLM 是否进行了工具调用来决定是继续执行工具还是压缩研究结果。
 */
function shouldContinue(state: typeof ResearcherStateAnnotation.State) {
    const messages = state.researcher_messages;
    const lastMessage = messages[messages.length - 1];

    // 检查最后一条消息是否有工具调用
    if (
        isAIMessage(lastMessage) &&
        'tool_calls' in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length > 0
    ) {
        return 'tool_node';
    }

    // 否则，压缩研究结果
    return 'compress_research';
}

// ===== 图构建 =====

// 构建代理工作流
const graphBuilder = new StateGraph(ResearcherStateAnnotation);

// 编译代理
export const researchAgentMcpGraph = graphBuilder
    .addNode('llm_call', researchMcpLlmCall as any)
    .addNode('tool_node', researchMcpToolNode as any)
    .addNode('compress_research', compressResearch as any)
    .addEdge(START, 'llm_call')
    .addConditionalEdges('llm_call', shouldContinue)
    .addEdge('tool_node', 'llm_call')
    .addEdge('compress_research', END)
    .compile();

researchAgentMcpGraph.name = 'researchAgentMcp';
