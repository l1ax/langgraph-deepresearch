import { AIMessage, getBufferString } from "@langchain/core/messages";
import { Command, LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatDeepSeek } from '@langchain/deepseek';
import { clarifyWithUserInstructions } from '../../prompts';
import { getTodayStr, eventStore } from '../../utils';
import { StateAnnotation } from '../../state';
import { ClarifyEvent, ChatEvent, BaseEvent } from '../../outputAdapters';
import {traceable} from 'langsmith/traceable';
import dotenv from 'dotenv';
dotenv.config();

const NODE_NAME = 'clarify_with_user';

const deepSeekChat = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY
    },
});

export interface ClarifyWithUser {
  need_clarification: boolean;
  question: string;
  verification: string;
}

export const clarifyWithUser = traceable(async (
  state: typeof StateAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<Command> => {
  const threadId = config.configurable?.thread_id as string | undefined;
  const checkpointId = config.configurable?.checkpoint_id as string | undefined;
  
  // 获取用户的第一条消息并包装为 ChatEvent 存储
  const eventsToAdd: Record<string, unknown>[] = [];
  const userMessage = state.messages[0];
  if (userMessage && userMessage.getType() === 'human') {
    const humanEventId = threadId 
      ? BaseEvent.generateDeterministicId(threadId, checkpointId, NODE_NAME, '/human/chat', 0)
      : undefined;
    
    const userChatEvent = new ChatEvent({
      role: 'human',
      deterministicId: humanEventId
    });
    userChatEvent.setMessage(userMessage.content as string);
    userChatEvent.setStatus('finished');

    // 直接存储到数据库（不通过 writer，避免前端重复渲染用户消息）
    if (threadId) {
      await eventStore.upsertEvent(threadId, userChatEvent.toJSON()).catch(err => {
        console.error('[clarifyWithUser] Failed to persist human chat event:', err);
      });
    }

    eventsToAdd.push(userChatEvent.toJSON() as unknown as Record<string, unknown>);
  }

  const clarifyEventId = threadId 
    ? BaseEvent.generateDeterministicId(threadId, checkpointId, NODE_NAME, '/ai/clarify', 0)
    : undefined;
  
  const event = new ClarifyEvent(clarifyEventId);

  if (config.writer) {
    config.writer(event.setStatus('pending').toJSON());
  }

  const promptContent = clarifyWithUserInstructions
    .replace('{messages}', getBufferString(state.messages || []))
    .replace('{date}', getTodayStr());

  if (config.writer) {
    config.writer(event.setStatus('running').toJSON());
  }

  try {
    let fullResponse = '';
    const stream = await deepSeekChat.stream([
      {
        role: 'user',
        content: promptContent,
      },
    ], {
      response_format: { type: 'json_object' },
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        const contentStr = typeof chunk.content === 'string' ? chunk.content : String(chunk.content);
        fullResponse += contentStr;

        // 发送流式更新（带aggregateRule: 'concat'）
        if (config.writer) {
          event.content.data = contentStr;
          event.content.aggregateRule = 'concat';
          config.writer(event.setStatus('running').toJSON());
        }
      }
    }

    const clarification: ClarifyWithUser = JSON.parse(fullResponse);

    // 发送最终结果（使用完整的data）
    event.content.data = clarification;
    event.content.aggregateRule = undefined;
    if (config.writer) {
      config.writer(event.setStatus('finished').toJSON());
    }

    eventsToAdd.push(event.toJSON() as unknown as Record<string, unknown>);

    if (clarification.need_clarification) {
      return new Command({
        goto: "__end__",
        update: {
          messages: [new AIMessage({ content: clarification.question })],
          events: eventsToAdd,
        },
      });
    } else {
      return new Command({
        goto: "write_research_brief",
        update: {
          messages: [new AIMessage({ content: clarification.verification })],
          events: eventsToAdd,
        },
      });
    }
  } catch (error) {
    if (config.writer) {
      config.writer(event.setStatus('error').toJSON());
    }
    throw error;
  }
});
