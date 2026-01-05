/**
 * 监督器节点
 *
 * 协调研究活动并决定如何委派研究任务。
 * 分析研究简要和当前进度，决定：
 * - 需要调查哪些研究主题
 * - 是否进行并行研究
 * - 何时完成研究
 */

import { SystemMessage } from '@langchain/core/messages';
import { ChatDeepSeek } from '@langchain/deepseek';
import { LangGraphRunnableConfig } from '@langchain/langgraph';
import { StateAnnotation } from '../../state';
import { leadResearcherPrompt } from '../../prompts';
import { getTodayStr, extractContent } from '../../utils';
import { thinkTool, conductResearchTool, researchCompleteTool } from '../../tools';
import { ChatEvent, GroupEvent, BaseEvent } from '../../outputAdapters';
import dotenv from 'dotenv';
import {traceable} from 'langsmith/traceable';
dotenv.config();

const NODE_NAME = 'supervisor';

// 使用 deepseek-chat 而非 deepseek-reasoner
// deepseek-reasoner 在工具调用时需要特殊的 reasoning_content 字段
// deepseek-chat 对工具调用有更好的支持
const supervisorModel = new ChatDeepSeek({
    model: 'deepseek-chat',
    temperature: 0,
    configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
        apiKey: process.env.DEEPSEEK_API_KEY,
    },
});

const maxResearcherIterations = 6;
const maxConcurrentResearchers = 3;

const supervisorTools = [conductResearchTool, researchCompleteTool, thinkTool];
const supervisorModelWithTools = supervisorModel.bindTools(supervisorTools);

export const supervisor = traceable(async (state: typeof StateAnnotation.State, config?: LangGraphRunnableConfig) => {
    const threadId = config?.configurable?.thread_id as string | undefined;
    const runId = (config?.configurable?.run_id || config?.metadata?.run_id) as
      | string
      | undefined;
    const iteration = state.research_iterations || 0;
    
    let supervisorGroupId = state.supervisor_group_id;
    let supervisorEvent: GroupEvent;
    
    if (!supervisorGroupId) {
      const groupEventId = threadId
        ? BaseEvent.generateDeterministicId(
            threadId,
            runId,
            NODE_NAME,
            '/supervisor/group',
            0
          )
        : undefined;
      supervisorEvent = new GroupEvent('supervisor', groupEventId);
      supervisorGroupId = supervisorEvent.id;
    } else {
       // 如果已存在 group ID，重建事件对象以确保能发送到流
       supervisorEvent = new GroupEvent('supervisor', supervisorGroupId);
    }

    // CRITICAL: 无论是否新建，都发送一次 GroupEvent
    // 这确保了在恢复执行或重连时，前端（和 Proxy）一定能先收到父节点事件
    // 防止后续的 tool_calls 或 chat 事件变成“孤儿”
    if (config?.writer) {
        config.writer(supervisorEvent.setStatus('running').toJSON());
    }

    const supervisorMessages = state.supervisor_messages || [];

    const systemPrompt = leadResearcherPrompt
      .replace('{date}', getTodayStr())
      .replace(
        '{max_concurrent_research_units}',
        String(maxConcurrentResearchers)
      )
      .replace('{max_researcher_iterations}', String(maxResearcherIterations));

    const messages = [
      new SystemMessage({ content: systemPrompt }),
      ...supervisorMessages,
    ];

    const response = await supervisorModelWithTools.invoke(messages, config);

    const eventsToAdd: BaseEvent.IJsonData[] = [];

    if (supervisorEvent) {
      eventsToAdd.push(supervisorEvent.toJSON());
    }

    const textContent = extractContent(response.content);
    if (textContent && config?.writer) {
      // 使用确定性 ID，iteration 用于区分不同次调用
      const chatEventId = threadId
        ? BaseEvent.generateDeterministicId(
            threadId,
            runId,
            NODE_NAME,
            '/supervisor/chat',
            iteration
          )
        : undefined;
      const chatEvent = new ChatEvent({
        role: 'supervisor',
        deterministicId: chatEventId,
      });
      chatEvent.setMessage(textContent);
      // 设置 parentId 为 supervisor GroupEvent 的 id
      chatEvent.setParentId(supervisorGroupId);
      config.writer(chatEvent.setStatus('finished').toJSON());
      eventsToAdd.push(chatEvent.toJSON());
    }

    // 只在第一次创建时更新 supervisor_group_event 和 supervisor_group_id
    const returnValue: any = {
        supervisor_messages: [response],
        research_iterations: (state.research_iterations || 0) + 1,
    };

    if (supervisorEvent) {
        // 第一次创建，更新 state
        returnValue.supervisor_group_event = supervisorEvent.toJSON();
        returnValue.supervisor_group_id = supervisorGroupId;
    }

    if (eventsToAdd.length > 0) {
        returnValue.events = eventsToAdd;
    }

    return returnValue;
});
