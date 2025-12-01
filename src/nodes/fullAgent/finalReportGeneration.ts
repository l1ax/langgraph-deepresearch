/**
 * Final Report Generation Node
 *
 * 合成所有研究结果生成最终报告。
 * 使用研究简要和收集的笔记创建全面的最终报告。
 */

import { HumanMessage } from '@langchain/core/messages';
import { StateAnnotation } from '../../state';
import { finalReportGenerationPrompt } from '../../prompts';
import { getTodayStr } from '../../utils';
import dotenv from 'dotenv';
import type { RunnableConfig } from '@langchain/core/runnables';
import {ChatDeepSeek} from '@langchain/deepseek';
dotenv.config();

// 配置写作模型
// const writerModel = new ChatOpenAI({
//     model: 'gpt-4o',
//     temperature: 0,
//     maxTokens: 32000,
//     configuration: {
//         baseURL: process.env.OPENAI_BASE_URL,
//         apiKey: process.env.OPENAI_API_KEY,
//     },
// });
const writerModel = new ChatDeepSeek({
    model: 'deepseek-reasoner',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY,
    },
});

/**
 * Final Report Generation Node
 *
 * 将所有研究结果合成为综合性最终报告
 */
export async function finalReportGeneration(
    state: typeof StateAnnotation.State,
    config?: RunnableConfig
) {
    const notes = state.notes || [];
    const researchBrief = state.research_brief || '';

    // 合并所有研究笔记
    const findings = notes.join('\n\n');

    // 准备最终报告生成提示词
    const finalReportPrompt = finalReportGenerationPrompt
        .replace('{research_brief}', researchBrief)
        .replace('{findings}', findings)
        .replace('{date}', getTodayStr());

    // 生成最终报告
    const response = await writerModel.invoke(
        [new HumanMessage({ content: finalReportPrompt })],
        config
    );

    return {
        final_report: response.content as string,
        messages: [new HumanMessage({ content: 'Here is the final report: ' + response.content })],
    };
}
