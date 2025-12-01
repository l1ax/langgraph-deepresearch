/**
 * 监督器节点
 *
 * 协调研究活动并决定如何委派研究任务。
 * 分析研究简要和当前进度，决定：
 * - 需要调查哪些研究主题
 * - 是否进行并行研究
 * - 何时完成研究
 */

import { SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { StateAnnotation } from '../../state';
import { leadResearcherPrompt } from '../../prompts';
import { getTodayStr } from '../../utils';
import { thinkTool, conductResearchTool, researchCompleteTool } from '../../tools';
import dotenv from 'dotenv';
import type { RunnableConfig } from '@langchain/core/runnables';
dotenv.config();

// 配置监督器模型
// 注意：使用 deepseek-chat 而非 deepseek-reasoner
// deepseek-reasoner 在工具调用时需要特殊的 reasoning_content 字段
// deepseek-chat 对工具调用有更好的支持
const supervisorModel = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY,
    },
});

// 系统常量
// 单个研究代理的最大工具调用迭代次数
// 这防止无限循环并控制每个主题的研究深度
const maxResearcherIterations = 6;

// 监督器可以启动的最大并发研究代理数
// 这被传递给 lead_researcher_prompt 以限制并行研究任务
const maxConcurrentResearchers = 3;

const supervisorTools = [conductResearchTool, researchCompleteTool, thinkTool];
const supervisorModelWithTools = supervisorModel.bindTools(supervisorTools);

/**
 * 监督器节点
 *
 * 协调研究活动并决定下一步行动。
 */
export async function supervisor(state: typeof StateAnnotation.State, config?: RunnableConfig) {
    const supervisorMessages = state.supervisor_messages || [];

    // 使用当前日期和约束准备系统消息
    const systemPrompt = leadResearcherPrompt
        .replace('{date}', getTodayStr())
        .replace('{max_concurrent_research_units}', String(maxConcurrentResearchers))
        .replace('{max_researcher_iterations}', String(maxResearcherIterations));

    const messages = [new SystemMessage({ content: systemPrompt }), ...supervisorMessages];

    // 对下一步研究步骤做出决策
    const response = await supervisorModelWithTools.invoke(messages, config);

    return {
        supervisor_messages: [response],
        research_iterations: (state.research_iterations || 0) + 1,
    };
}
