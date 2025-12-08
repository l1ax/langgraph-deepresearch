/**
 * LLM 调用节点 (MCP 版本)
 *
 * 分析当前状态并使用 MCP 工具决定下一步行动。
 * 此节点从 MCP 服务器检索可用工具并将其绑定到语言模型。
 */

import { SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ResearcherStateAnnotation } from '../../state';
import { researchAgentPromptWithMcp } from '../../prompts';
import { getTodayStr } from '../../utils';
import { getMcpClient } from '../../tools/mcpClient';
import { thinkTool } from '../../tools';
import dotenv from 'dotenv';
import {traceable} from 'langsmith/traceable';
dotenv.config();

const model = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY,
    },
});

/**
 * LLM 调用节点，集成 MCP 工具。
 *
 * 此节点：
 * 1. 从 MCP 服务器检索可用工具
 * 2. 将工具绑定到语言模型
 * 3. 处理用户输入并决定工具使用
 *
 * 返回包含模型响应的更新状态。
 */
export const researchMcpLlmCall = traceable(async (
    state: typeof ResearcherStateAnnotation.State
) => {
    // 从 MCP 服务器获取可用工具
    const client = getMcpClient();
    const mcpTools = await client.getTools();

    // 使用 MCP 工具和 think_tool 进行本地文档访问
    const tools = [...mcpTools, thinkTool];

    // 使用工具绑定初始化模型
    const modelWithTools = model.bindTools(tools);

    // 使用当前日期格式化提示词
    const systemPrompt = researchAgentPromptWithMcp.replace(
        '{date}',
        getTodayStr()
    );

    // 使用系统提示词处理用户输入
    const response = await modelWithTools.invoke([
        new SystemMessage({ content: systemPrompt }),
        ...state.researcher_messages,
    ]);

    return {
        researcher_messages: [response],
    };
});
