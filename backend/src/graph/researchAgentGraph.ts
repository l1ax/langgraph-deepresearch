/**
 * @file Research Agent Graph
 *
 * 此模块实现了研究代理工作流，执行迭代的工具调用以搜索信息并压缩研究结果。
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ResearcherStateAnnotation } from '../state';
import {
    researchLlmCall,
    compressResearch,
    researchToolNode,
} from '../nodes';
import {isAIMessage} from '@langchain/core/messages';

// ===== 路由逻辑 =====

/**
 * 判断是继续研究还是提供最终答案。
 *
 * 根据LLM是否进行了工具调用来决定代理应该继续研究循环还是提供最终答案。
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

    // 否则，我们有了最终答案
    return 'compress_research';
}

// ===== 图构建 =====

// 构建代理工作流
const graphBuilder = new StateGraph(ResearcherStateAnnotation)

// 编译代理
const compiledGraph = graphBuilder
    .addNode('llm_call', researchLlmCall as any)
    .addNode('tool_node', researchToolNode as any)
    .addNode('compress_research', compressResearch as any)
    .addEdge(START, 'llm_call')
    .addConditionalEdges('llm_call', shouldContinue)
    .addEdge('tool_node', 'llm_call')
    .addEdge('compress_research', END)
    .compile();

// 导出时设置名称
export const researchAgentGraph = Object.assign(compiledGraph, {
    name: 'researchAgent'
});

