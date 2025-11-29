/**
 * 工具节点 (MCP 版本)
 *
 * 使用 MCP 工具执行工具调用。
 * MCP 工具需要异步操作，因为它们通过进程间通信与 MCP 服务器子进程通信。
 */

import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ResearcherStateAnnotation } from '../../state';
import { getMcpClient } from '../../tools/mcpClient';
import { thinkTool } from '../../tools';

/**
 * 执行工具调用的工具节点 (MCP 版本)。
 *
 * 此节点：
 * 1. 从 MCP 服务器检索可用工具
 * 2. 使用 ToolNode 执行工具调用
 * 3. 返回格式化的工具结果
 *
 * 注意：MCP 需要异步操作，因为它与 MCP 服务器子进程进行进程间通信。
 */
export async function researchMcpToolNode(
    state: typeof ResearcherStateAnnotation.State
) {
    // 从 MCP 服务器获取新的工具引用
    const client = getMcpClient();
    const mcpTools = await client.getTools();
    const tools = [...mcpTools, thinkTool];

    // 创建动态工具节点
    const toolNode = new ToolNode(tools);

    // 使用消息执行工具节点
    const result = await toolNode.invoke({
        messages: state.researcher_messages,
    });

    // 以正确的状态格式返回更新的消息
    return {
        researcher_messages: result.messages,
    };
}
