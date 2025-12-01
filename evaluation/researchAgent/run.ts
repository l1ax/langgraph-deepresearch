/**
 * Research Agent 评估脚本
 *
 * 此脚本评估 research agent 是否能够正确判断何时继续或停止调用工具
 *
 * 评估流程:
 * 1. 创建或使用现有的 LangSmith 数据集
 * 2. 在测试用例上运行 research agent 的 llm_call 节点
 * 3. 使用评估器检查 agent 的决定是否正确
 * 4. 将结果报告给 LangSmith
 */

import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import { researchAgentGraph } from '../../src/graph';
import { evaluationDataset } from './dataset';
import { evaluateNextStep } from './evaluators';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import type { KVMap } from 'langsmith/schemas';

dotenv.config();

/**
 * 目标函数: 运行 research agent 的 llm_call 节点
 *
 * 关键点:
 * - 我们只测试单个节点 (llm_call)，而不是整个图
 * - 这允许我们精确测试 agent 的决策逻辑
 * - 使用 agent.nodes["llm_call"].invoke() 调用特定节点
 */
async function targetFunc(
  inputs: KVMap,
  config?: { callbacks?: any }
): Promise<KVMap> {
  const graphConfig = {
    configurable: {
      thread_id: uuidv4(),
    },
    ...config,
  };

  // 调用 research agent 的 llm_call 节点
  // 这是做出决策的节点（继续调用工具 vs 停止）
  const result = await researchAgentGraph.nodes['llm_call'].invoke(
    inputs as any,
    graphConfig
  );

  return result as KVMap;
}

/**
 * 主评估函数
 */
async function runEvaluation() {
  // 初始化 LangSmith 客户端
  const apiKey = process.env.LANGSMITH_API_KEY;
  if (!apiKey) {
    throw new Error(
      'LANGSMITH_API_KEY 环境变量未设置。请设置它以运行评估。'
    );
  }

  const langsmithClient = new Client({
    apiKey: apiKey,
  });

  // 数据集名称
  const datasetName = 'deep_research_agent_termination';

  // 检查数据集是否存在，如果不存在则创建
  let dataset;
  try {
    const hasDataset = await langsmithClient.hasDataset({
      datasetName: datasetName,
    });

    if (hasDataset) {
      dataset = await langsmithClient.readDataset({
        datasetName: datasetName,
      });
      console.log(`使用现有数据集: ${datasetName} (${dataset.id})`);

      // 检查数据集是否有示例，如果为空则添加
      const existingExamples = langsmithClient.listExamples({
        datasetId: dataset.id,
      });
      let exampleCount = 0;
      for await (const _ of existingExamples) {
        exampleCount++;
        break; // 只检查是否存在任何示例
      }

      if (exampleCount === 0) {
        console.log('数据集为空，正在添加示例...');
        await langsmithClient.createExamples(
          evaluationDataset.map((example) => ({
            dataset_id: dataset.id,
            inputs: example.inputs,
            outputs: example.outputs,
          }))
        );
        console.log(`已向数据集添加 ${evaluationDataset.length} 个示例`);
      }
    } else {
      // 创建数据集
      dataset = await langsmithClient.createDataset(datasetName, {
        description:
          '用于评估研究员是否能够准确决定继续调用工具或停止的数据集。',
      });

      // 向数据集添加示例
      await langsmithClient.createExamples(
        evaluationDataset.map((example) => ({
          dataset_id: dataset.id,
          inputs: example.inputs,
          outputs: example.outputs,
        }))
      );

      console.log(`已创建新数据集: ${datasetName} (${dataset.id})`);
    }
  } catch (error) {
    console.error('管理数据集时出错:', error);
    throw error;
  }

  // 运行评估
  console.log('\n开始评估...');
  console.log('这可能需要几分钟时间来评估每个测试用例...\n');
  console.log('评估两个场景:');
  console.log('  1. Agent 应该继续 - 信息不足');
  console.log('  2. Agent 应该停止 - 信息全面\n');

  try {
    // 使用数据集名称运行评估
    await (evaluate as any)(targetFunc, {
      data: datasetName,
      evaluators: [evaluateNextStep],
      experimentPrefix: 'Researcher Termination',
      client: langsmithClient,
    });

    console.log('\n✅ 评估完成!');
    console.log('\n在 LangSmith 仪表板中查看评估结果');
    console.log(
      `https://smith.langchain.com/datasets/${dataset.id}`
    );
  } catch (error) {
    console.error('运行评估时出错:', error);
    throw error;
  }
}

// 如果直接执行则运行
if (require.main === module) {
  runEvaluation()
    .then(() => {
      console.log('\n评估脚本成功完成。');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n评估脚本失败:', error);
      process.exit(1);
    });
}

export { runEvaluation };
