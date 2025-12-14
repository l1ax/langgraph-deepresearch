/**
 * @file 研究概要生成节点
 */

import { getBufferString, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { transformMessagesIntoResearchTopicPrompt } from '../../prompts';
import { getTodayStr } from '../../utils';
import { StateAnnotation } from '../../state';
import {LangGraphRunnableConfig} from '@langchain/langgraph';
import { BriefEvent, BaseEvent } from '../../outputAdapters';
import {traceable} from 'langsmith/traceable';
import dotenv from 'dotenv';

dotenv.config();

const NODE_NAME = 'write_research_brief';

export interface ResearchQuestion {
  research_brief: string;
  research_brief_reasoning: string;
}

const zhipuChat = new ChatOpenAI({
  model: "glm-4.5",
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
  const threadId = config.configurable?.thread_id as string | undefined;
  const checkpointId = config.configurable?.checkpoint_id as string | undefined;
  
  // 生成确定性 ID
  const briefEventId = threadId 
    ? BaseEvent.generateDeterministicId(threadId, checkpointId, NODE_NAME, '/ai/brief', 0)
    : undefined;
  
  const briefEvent = new BriefEvent(briefEventId);

  if (config.writer) {
    config.writer(briefEvent.setStatus('pending').toJSON());
  }

  const promptContent = transformMessagesIntoResearchTopicPrompt
    .replace('{messages}', getBufferString(state.messages || []))
    .replace('{date}', getTodayStr());

  if (config.writer) {
    config.writer(briefEvent.setStatus('running').toJSON());
  }

  try {
    let fullResponse = '';
    const stream = await zhipuChat.stream(
      [new HumanMessage({ content: promptContent })],
      { response_format: { type: 'json_object' } }
    );

    for await (const chunk of stream) {
      const content = chunk.content;
      if (content) {
        const chunkStr = typeof content === 'string' ? content : JSON.stringify(content);
        if (chunkStr.length > 0) {
          fullResponse += chunkStr;

          // 发送流式更新（带aggregateRule: 'concat'）
          if (config.writer) {
            briefEvent.content.data = chunkStr;
            briefEvent.content.aggregateRule = 'concat';
            config.writer(briefEvent.setStatus('running').toJSON());
          }
        }
      }
    }

    const researchQuestion: ResearchQuestion = JSON.parse(fullResponse);

    // 发送最终结果（使用完整的data）
    briefEvent.content.data = researchQuestion;
    briefEvent.content.aggregateRule = undefined;
    if (config.writer) {
      config.writer(briefEvent.setStatus('finished').toJSON());
    }

    const eventsToAdd = [briefEvent.toJSON()];

    return {
      research_brief: researchQuestion.research_brief,
      supervisor_messages: [
        new HumanMessage({ content: `${researchQuestion.research_brief}.` })
      ],
      events: eventsToAdd,
    };
  } catch (error) {
    if (config.writer) {
      config.writer(briefEvent.setStatus('error').toJSON());
    }
    throw error;
  }
});
