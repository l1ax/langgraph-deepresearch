/**
 * @file 研究概要生成节点
 */

import { getBufferString, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { transformMessagesIntoResearchTopicPrompt } from '../../prompts';
import { getTodayStr } from '../../utils';
import { StateAnnotation } from '../../state';
import {LangGraphRunnableConfig} from '@langchain/langgraph';
import { BriefEvent } from '../../outputAdapters';
import {traceable} from 'langsmith/traceable';

export interface ResearchQuestion {
  research_brief: string;
}

const zhipuChat = new ChatOpenAI({
  model: "glm-4.5-airx",
  apiKey: process.env.ZHIPU_API_KEY,
  configuration: {
    baseURL: process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4",
  },
  temperature: 0.05,
});

export const writeResearchBrief = traceable(async (
  state: typeof StateAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const briefEvent = new BriefEvent();

  // 发送 pending 状态
  if (config.writer) {
    config.writer(briefEvent.setStatus('pending').toJSON());
  }

  const promptContent = transformMessagesIntoResearchTopicPrompt
    .replace('{messages}', getBufferString(state.messages || []))
    .replace('{date}', getTodayStr());

  // 发送 running 状态
  if (config.writer) {
    config.writer(briefEvent.setStatus('running').toJSON());
  }

  try {
    const response = await zhipuChat.invoke(
      [new HumanMessage({ content: promptContent })],
      { response_format: { type: 'json_object' } }
    );

    const content = response.content ?? '{}';
    const researchQuestion: ResearchQuestion = JSON.parse(
      typeof content === 'string' ? content : JSON.stringify(content)
    );

    briefEvent.content.data.research_brief = researchQuestion.research_brief;
    // 发送 finished 状态
    if (config.writer) {
      config.writer(briefEvent.setStatus('finished').toJSON());
    }

    return {
      research_brief: researchQuestion.research_brief,
      supervisor_messages: [
        new HumanMessage({ content: `${researchQuestion.research_brief}.` })
      ],
    };
  } catch (error) {
    // 发送 error 状态
    if (config.writer) {
      config.writer(briefEvent.setStatus('error').toJSON());
    }
    throw error;
  }
});
