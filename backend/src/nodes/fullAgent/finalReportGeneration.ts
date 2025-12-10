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
import {ChatDeepSeek} from '@langchain/deepseek';
import {LangGraphRunnableConfig} from '@langchain/langgraph';
import {BaseEvent, ChatEvent} from '../../outputAdapters';
import {traceable} from 'langsmith/traceable';
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
export const finalReportGeneration = traceable(async (
    state: typeof StateAnnotation.State,
    config: LangGraphRunnableConfig
) => {
    // 更新 supervisorGroupEvent 的 status 为 finished 并写入
    const supervisorGroupEvent = state.supervisor_group_event;
    if (supervisorGroupEvent && config.writer) {
        const updatedEvent = {
            ...supervisorGroupEvent,
            status: 'finished' as const,
        };
        config.writer(updatedEvent);
    }

    const notes = state.notes || [];
    const researchBrief = state.research_brief || '';

    // 合并所有研究笔记
    const findings = notes.join('\n\n');

    const threadId = config?.configurable?.thread_id as string | undefined;
    const checkpointId = config?.configurable?.checkpoint_id as string | undefined;
    const nodeName = 'finalReportGeneration';

    const chatEvent = new ChatEvent(
        'ai',
        BaseEvent.generateDeterministicId(
            threadId,
            checkpointId,
            nodeName,
            'final-report-chat'
        )
    );
    chatEvent.setMessage('Generating final report...');
    if (config.writer) {
        config.writer(chatEvent.setStatus('running').toJSON());
    }

    // 准备最终报告生成提示词
    const finalReportPrompt = finalReportGenerationPrompt
        .replace('{research_brief}', researchBrief)
        .replace('{findings}', findings)
        .replace('{date}', getTodayStr());

    // 生成最终报告
    const response = await writerModel.stream(
        [new HumanMessage({ content: finalReportPrompt })],
        config
    );

    let finalReport = '';

    for await (const chunk of response) {
        finalReport += chunk.content as string;
        if (config.writer && finalReport.length > 0) {
            config.writer(chatEvent.setMessage(finalReport).setStatus('running').toJSON());
        }
    }

    if (config.writer) {
        config.writer(chatEvent.setStatus('finished').toJSON());
    }

    // Store chat event to state.events
    const eventsToAdd = [chatEvent.toJSON()];

    return {
        final_report: finalReport,
        messages: [new HumanMessage({ content: 'Here is the final report: ' + finalReport })],
        events: eventsToAdd,
    };
});
