/**
 * @file 研究概要生成节点
 */

import { getBufferString, HumanMessage } from "@langchain/core/messages";
import deepSeek from '../llm';
import { transformMessagesIntoResearchTopicPrompt } from '../prompts';
import { getTodayStr } from '../utils';
import { StateAnnotation } from '../state';

export interface ResearchQuestion {
  research_brief: string;
}

export async function writeResearchBrief(
  state: typeof StateAnnotation.State
) {
  // Format the prompt with current messages and date
  const promptContent = transformMessagesIntoResearchTopicPrompt
    .replace('{messages}', getBufferString(state.messages || []))
    .replace('{date}', getTodayStr());

  // Generate research brief from conversation history∂
  const response = await deepSeek.invoke({
    model: "deepseek-reasoner",
    temperature: 0.05,
    messages: [
      {
        role: 'user',
        content: promptContent,
      },
    ],
    response_format: { type: 'json_object' },
  });

  // Parse the structured output
  const researchQuestion: ResearchQuestion = JSON.parse(response as string);

  // Update state with generated research brief and pass it to the supervisor
  return {
    research_brief: researchQuestion.research_brief,
    supervisor_messages: [
      new HumanMessage({ content: `${researchQuestion.research_brief}.` })
    ],
  };
}
