import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tavilySearchTool, thinkTool } from '../../tools';
import { ResearcherStateAnnotation } from '../../state';

const tools = [tavilySearchTool, thinkTool];

// 创建用于执行工具调用的工具节点
const toolNode = new ToolNode(tools);

/**
 * 工具节点包装器
 *
 * 包装 ToolNode 以处理状态转换。
 * ToolNode 期望 { messages: BaseMessage[] }，但我们的状态有 researcher_messages。
 */
export async function researchToolNode(
    state: typeof ResearcherStateAnnotation.State
) {
    // 使用消息执行工具节点
    const result = await toolNode.invoke({
        messages: state.researcher_messages,
    });

    // 以正确的状态格式返回更新的消息
    return {
        researcher_messages: result.messages,
    };
}