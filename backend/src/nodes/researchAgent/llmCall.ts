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
import { getTodayStr, extractContent } from '../../utils';
import { tavilySearchTool, thinkTool } from '../../tools';
import { ChatEvent } from '../../outputAdapters';
import dotenv from 'dotenv';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
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
    state: typeof ResearcherStateAnnotation.State,
    config: LangGraphRunnableConfig
) {
    // 使用当前日期格式化提示词
    const systemPrompt = researchAgentPrompt.replace('{date}', getTodayStr());

    // 使用工具调用模型
    const response = await modelWithTools.invoke([
        new SystemMessage({ content: systemPrompt }),
        ...state.researcher_messages,
    ]);

    // 如果 LLM 返回了文本内容（不是工具调用），发送 ChatEvent
    const textContent = extractContent(response.content);
    console.log('textContent', textContent);
    console.log('content', response.content);
    if (textContent && config.writer) {
        const chatEvent = new ChatEvent('researcher');
        chatEvent.setMessage(textContent);
        // 设置 parentId 为 researcher GroupEvent 的 id
        const researcherGroupId = state.researcher_group_id;
        if (researcherGroupId) {
            chatEvent.setParentId(researcherGroupId);
        }
        config.writer(chatEvent.setStatus('finished').toJSON());
    }

    return {
        researcher_messages: [response],
    };
}