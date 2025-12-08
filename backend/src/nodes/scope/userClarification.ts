/**
 * @file 用户澄清节点 - 确认是否需要用户进一步说明
 */

import { AIMessage, getBufferString } from "@langchain/core/messages";
import { Command, LangGraphRunnableConfig } from "@langchain/langgraph";
import deepSeek from '../../llm';
import { clarifyWithUserInstructions } from '../../prompts';
import { getTodayStr } from '../../utils';
import { StateAnnotation } from '../../state';
import {ClarifyEvent} from '../../outputAdapters';
import {traceable} from 'langsmith/traceable';

export interface ClarifyWithUser {
  need_clarification: boolean;
  question: string;
  verification: string;
}

export const clarifyWithUser = traceable(async (
  state: typeof StateAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<Command> => {
  const event = new ClarifyEvent();

  // 发送 pending 状态
  if (config.writer) {
    config.writer(event.setStatus('pending').toJSON());
  }

  const promptContent = clarifyWithUserInstructions
    .replace('{messages}', getBufferString(state.messages || []))
    .replace('{date}', getTodayStr());

  // 发送 running 状态
  if (config.writer) {
    config.writer(event.setStatus('running').toJSON());
  }

  try {
    const response = await deepSeek.invoke({
      messages: [
        {
          role: 'user',
          content: promptContent,
        },
      ],
      response_format: { type: 'json_object' },
    });

    // Parse the structured output
    const clarification: ClarifyWithUser = JSON.parse(response as string);

    event.content.data = clarification;
    // 发送 finished 状态
    if (config.writer) {
      config.writer(event.setStatus('finished').toJSON());
    }

    // Route based on clarification need
    if (clarification.need_clarification) {
      return new Command({
        goto: "__end__",
        update: {
          messages: [new AIMessage({ content: clarification.question })],
        },
      });
    } else {
      return new Command({
        goto: "write_research_brief",
        update: {
          messages: [new AIMessage({ content: clarification.verification })],
        },
      });
    }
  } catch (error) {
    // 发送 error 状态
    if (config.writer) {
      config.writer(event.setStatus('error').toJSON());
    }
    throw error;
  }
});
