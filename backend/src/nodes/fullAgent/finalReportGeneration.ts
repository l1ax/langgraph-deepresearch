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

const writerModel = new ChatDeepSeek({
    model: 'deepseek-reasoner',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY,
    },
});

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
    const findings = notes.join('\n\n');

    const threadId = config?.configurable?.thread_id as string | undefined;
    const runId = (config?.configurable?.run_id || config?.metadata?.run_id) as
      | string
      | undefined;
    const nodeName = 'finalReportGeneration';

    const chatEvent = new ChatEvent({
      role: 'ai',
      subType: 'report_generation',
      deterministicId: BaseEvent.generateDeterministicId(
        threadId!,
        runId,
        nodeName,
        'final-report-chat'
      ),
    });
    chatEvent.setMessage('报告生成中...');
    if (config.writer) {
        config.writer(chatEvent.setStatus('running').toJSON());
    }

    const finalReportPrompt = finalReportGenerationPrompt
        .replace('{research_brief}', researchBrief)
        .replace('{findings}', findings)
        .replace('{date}', getTodayStr());

    const response = await writerModel.stream(
        [new HumanMessage({ content: finalReportPrompt })],
        config
    );

    let finalReport = '';
    let bufferString = '';

    for await (const chunk of response) {
        bufferString += chunk.content as string;
        if (config.writer && bufferString.length > 10) {
            finalReport += bufferString;
            bufferString = '';
            config.writer(chatEvent.setMessage(finalReport).setStatus('running').toJSON());
        }
    }

    if (config.writer) {
        config.writer(chatEvent.setMessage(finalReport).setStatus('finished').toJSON());
    }

    const eventsToAdd = [chatEvent.toJSON()];

    return {
        final_report: finalReport,
        messages: [new HumanMessage({ content: 'Here is the final report: ' + finalReport })],
        events: eventsToAdd,
    };
});
