/**
 * 压缩研究节点
 *
 * 将研究发现压缩为简洁的摘要。
 * 获取所有研究消息和工具输出，创建适合报告生成的压缩摘要。
 */

import { SystemMessage, HumanMessage, isToolMessage, isAIMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ResearcherStateAnnotation } from '../../state';
import { compressResearchSystemPrompt, compressResearchHumanMessage } from '../../prompts';
import { getTodayStr } from '../../utils';
import dotenv from 'dotenv';
import {traceable} from 'langsmith/traceable';
dotenv.config();

const compressModel = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY
    },
});

export const compressResearch = traceable(async (
    state: typeof ResearcherStateAnnotation.State
) => {
    // 使用当前日期格式化系统提示词
    const systemPrompt = compressResearchSystemPrompt.replace(
        '{date}',
        getTodayStr()
    );

    // 准备用于压缩的消息
    const messages = [
        new SystemMessage({ content: systemPrompt }),
        ...state.researcher_messages,
        new HumanMessage({ content: compressResearchHumanMessage }),
    ];

    // 调用压缩模型
    const response = await compressModel.invoke(messages);

    // 工具输出（think tool的reflection结果 & tavily search压缩总结后的以url为单位的搜索结果）以及AI tool call的输出
    const rawNotes: string[] = [];
    for (const msg of state.researcher_messages) {
        if (isToolMessage(msg) || isAIMessage(msg)) {
            rawNotes.push(String(msg.content));
        }
    }

    return {
        compressed_research: String(response.content),
        raw_notes: [rawNotes.join('\n')],
    };
});
