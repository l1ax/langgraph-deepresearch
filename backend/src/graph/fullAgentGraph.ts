/**
 * @file Full Agent Graph
 *
 * 完整的深度研究工作流图定义
 * 整合用户澄清、研究简要生成、监督者研究和最终报告生成
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation } from '../state';
import { clarifyWithUser } from '../nodes/scope/userClarification';
import { writeResearchBrief } from '../nodes/scope/briefGeneration';
import { supervisorGraph } from './supervisorGraph';
import { finalReportGeneration } from '../nodes/fullAgent/finalReportGeneration';
import { checkpointer, withEventPersistence } from '../utils';
import dotenv from 'dotenv';
dotenv.config();

// ===== 包装节点以支持事件持久化 =====
// 在 emit event 时同时保存到数据库，防止用户中途退出导致数据丢失

const persistingClarifyWithUser = withEventPersistence(clarifyWithUser);
const persistingWriteResearchBrief = withEventPersistence(writeResearchBrief);
const persistingFinalReportGeneration = withEventPersistence(finalReportGeneration);

// ===== 构建完整工作流图 =====

// 创建工作流图并添加所有节点
const fullAgentBuilder = new StateGraph(StateAnnotation)
    .addNode('clarify_with_user', persistingClarifyWithUser as any, {
        ends: [END, 'write_research_brief'],
    })
    .addNode('write_research_brief', persistingWriteResearchBrief as any, {
        ends: [END],
    })
    .addNode('supervisor_subgraph', supervisorGraph as any)
    .addNode('final_report_generation', persistingFinalReportGeneration as any)
    .addEdge(START, 'clarify_with_user')
    .addEdge('write_research_brief', 'supervisor_subgraph')
    .addEdge('supervisor_subgraph', 'final_report_generation')
    .addEdge('final_report_generation', END);

export const fullAgentGraph = fullAgentBuilder.compile({ checkpointer });

(fullAgentGraph as any).name = 'fullResearchAgent';
