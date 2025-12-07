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
import dotenv from 'dotenv';
dotenv.config();

// ===== 构建完整工作流图 =====

// 创建工作流图并添加所有节点
const fullAgentBuilder = new StateGraph(StateAnnotation)
    .addNode('clarify_with_user', clarifyWithUser, {
        ends: [END, 'write_research_brief'],
    })
    .addNode('write_research_brief', writeResearchBrief, {
        ends: [END],
    })
    .addNode('supervisor_subgraph', supervisorGraph as any)
    .addNode('final_report_generation', finalReportGeneration)
    .addEdge(START, 'clarify_with_user')
    .addEdge('write_research_brief', 'supervisor_subgraph')
    .addEdge('supervisor_subgraph', 'final_report_generation')
    .addEdge('final_report_generation', END);

// 编译完整工作流
export const fullAgentGraph = fullAgentBuilder.compile();

(fullAgentGraph as any).name = 'fullResearchAgent';
