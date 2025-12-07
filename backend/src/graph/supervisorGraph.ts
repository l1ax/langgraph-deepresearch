/**
 * @file Supervisor Graph
 *
 * 监督者工作流图定义文件
 * 定义了监督者节点和工具调用的执行流程
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation } from '../state';
import { supervisor, supervisorTools } from '../nodes';
import { isAIMessage } from '@langchain/core/messages';

// ===== 路由函数 =====

/**
 * 判断监督者节点执行后的下一步操作
 *
 * 检查最后一条消息是否包含工具调用，决定是调用工具还是结束流程
 */
function shouldContinue(state: typeof StateAnnotation.State) {
    const supervisorMessages = state.supervisor_messages || [];
    const lastMessage = supervisorMessages[supervisorMessages.length - 1];

    // 如果有工具调用，执行工具
    if (
        isAIMessage(lastMessage) &&
        'tool_calls' in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length > 0
    ) {
        return 'supervisor_tools';
    }

    // 否则结束流程
    return END;
}

/**
 * 在 supervisor_tools 节点执行后的路由函数
 *
 * 如果 supervisor_tools 已经将 notes 保存到状态中且流程完成，则结束
 * 否则返回到监督者节点继续处理
 */
function routeAfterTools(state: typeof StateAnnotation.State) {
    const notes = state.notes || [];

    // 如果 notes 已经生成，说明任务完成
    // (supervisorTools 在 shouldEnd=true 时会保存 notes)
    if (notes.length > 0) {
        return END;
    }

    // 否则返回到监督者节点继续处理
    return 'supervisor';
}

// ===== 构建图 =====

// 创建工作流图
export const supervisorGraphBuilder = new StateGraph(StateAnnotation)
    .addNode('supervisor', supervisor)
    .addNode('supervisor_tools', supervisorTools)
    .addEdge(START, 'supervisor')
    .addConditionalEdges('supervisor', shouldContinue)
    .addConditionalEdges('supervisor_tools', routeAfterTools);

// 编译工作流图
export const supervisorGraph = supervisorGraphBuilder.compile();

(supervisorGraph as any).name = 'supervisorAgent';
