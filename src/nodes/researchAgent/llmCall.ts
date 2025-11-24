/**
 * LLM 调用节点
 *
 * 分析当前状态并决定下一步行动。
 * 模型分析当前对话状态并决定是否：
 * 1. 调用搜索工具以收集更多信息
 * 2. 基于收集的信息提供最终答案
 */

import { SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ResearcherStateAnnotation } from '../../state';
import { researchAgentPrompt } from '../../prompts';
import { getTodayStr } from '../../utils';
import { tavilySearchTool, thinkTool } from '../../tools';
import dotenv from 'dotenv';
dotenv.config();

const model = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY
    },
});

const tools = [tavilySearchTool, thinkTool];

const modelWithTools = model.bindTools(tools);

export async function researchLlmCall(
    state: typeof ResearcherStateAnnotation.State
) {
    // 使用当前日期格式化提示词
    const systemPrompt = researchAgentPrompt.replace('{date}', getTodayStr());

    // 使用工具调用模型
    const response = await modelWithTools.invoke([
        new SystemMessage({ content: systemPrompt }),
        ...state.researcher_messages,
    ]);

    return {
        researcher_messages: [response],
    };
}