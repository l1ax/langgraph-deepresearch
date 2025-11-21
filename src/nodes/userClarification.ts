/**
 * @file 用户澄清节点 - 确认是否需要用户进一步说明
 */

import { AIMessage, getBufferString } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import deepSeek from '../llm';
import { clarifyWithUserInstructions } from '../prompts';
import { getTodayStr } from '../utils';
import { StateAnnotation } from '../state';

export interface ClarifyWithUser {
  need_clarification: boolean;
  question: string;
  verification: string;
}

export async function clarifyWithUser(
  state: typeof StateAnnotation.State
): Promise<Command> {
  // Format the prompt with current messages and date
  const promptContent = clarifyWithUserInstructions
    .replace('{messages}', getBufferString(state.messages || []))
    .replace('{date}', getTodayStr());

  // Invoke the model with clarification instructions
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
}
