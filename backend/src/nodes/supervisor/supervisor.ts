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

// 配置监督器模型
// 注意：使用 deepseek-chat 而非 deepseek-reasoner
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

// 系统常量
// 单个研究代理的最大工具调用迭代次数
// 这防止无限循环并控制每个主题的研究深度
const maxResearcherIterations = 6;

// 监督器可以启动的最大并发研究代理数
// 这被传递给 lead_researcher_prompt 以限制并行研究任务
const maxConcurrentResearchers = 3;

const supervisorTools = [conductResearchTool, researchCompleteTool, thinkTool];
const supervisorModelWithTools = supervisorModel.bindTools(supervisorTools);

/**
 * 监督器节点
 *
 * 协调研究活动并决定下一步行动。
 */
export const supervisor = traceable(async (state: typeof StateAnnotation.State, config?: LangGraphRunnableConfig) => {
    const threadId = config?.configurable?.thread_id as string | undefined;
    const checkpointId = config?.configurable?.checkpoint_id as string | undefined;
    const iteration = state.research_iterations || 0;
    
    // 检查是否已经存在 supervisor_group_id，如果存在则复用，避免重复创建
    let supervisorGroupId = state.supervisor_group_id;
    let supervisorEvent: GroupEvent | null = null;
    
    if (!supervisorGroupId) {
        // 第一次调用，创建新的 supervisor group event
        // 使用确定性 ID
        const groupEventId = threadId 
            ? BaseEvent.generateDeterministicId(threadId, checkpointId, NODE_NAME, '/supervisor/group', 0)
            : undefined;
        supervisorEvent = new GroupEvent('supervisor', groupEventId);
        supervisorGroupId = supervisorEvent.id;
        if (config?.writer) {
            config.writer(supervisorEvent.setStatus('running').toJSON());
        }
    }
    // 如果 supervisorGroupId 已存在，则复用，不创建新的事件

    const supervisorMessages = state.supervisor_messages || [];

    // 使用当前日期和约束准备系统消息
    const systemPrompt = leadResearcherPrompt
        .replace('{date}', getTodayStr())
        .replace('{max_concurrent_research_units}', String(maxConcurrentResearchers))
        .replace('{max_researcher_iterations}', String(maxResearcherIterations));

    const messages = [new SystemMessage({ content: systemPrompt }), ...supervisorMessages];

    // 对下一步研究步骤做出决策
    const response = await supervisorModelWithTools.invoke(messages, config);

    // 如果 LLM 返回了文本内容（不是工具调用），发送 ChatEvent
    const eventsToAdd: BaseEvent.IJsonData[] = [];
    const textContent = extractContent(response.content);
    if (textContent && config?.writer) {
        // 使用确定性 ID，iteration 用于区分不同次调用
        const chatEventId = threadId 
            ? BaseEvent.generateDeterministicId(threadId, checkpointId, NODE_NAME, '/supervisor/chat', iteration)
            : undefined;
        const chatEvent = new ChatEvent('supervisor', chatEventId);
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
        eventsToAdd.push(supervisorEvent.toJSON());
    }

    // Store events to state.events
    if (eventsToAdd.length > 0) {
        returnValue.events = eventsToAdd;
    }

    return returnValue;
});
