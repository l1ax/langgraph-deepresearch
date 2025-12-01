/**
 * Research Agent 评估器
 *
 * 用于评估 research agent 是否正确决定何时继续或停止调用工具
 */

import type { EvaluationResult } from "langsmith/evaluation";
import type { Run, Example } from "langsmith/schemas";

/**
 * 评估 agent 是否正确决定了下一步动作（继续或停止）
 *
 * 此评估器检查:
 * 1. 当信息不足时，agent 是否继续调用工具
 * 2. 当信息充足时，agent 是否停止调用工具
 *
 * 评分逻辑:
 * - 如果 agent 进行了工具调用 = "continue"
 * - 如果 agent 没有进行工具调用 = "stop"
 * - 将 agent 的决定与期望的 next_step 进行比较
 */
export async function evaluateNextStep(
  rootRun: Run,
  example: Example
): Promise<EvaluationResult> {
  try {
    // 获取输出
    const outputs = rootRun.outputs as Record<string, any>;
    if (!outputs) {
      return {
        key: "correct_next_step",
        score: 0,
        comment: "在运行中未找到输出",
      };
    }

    // 获取最后一条消息
    const researcherMessages = outputs.researcher_messages;
    if (!researcherMessages || !Array.isArray(researcherMessages)) {
      return {
        key: "correct_next_step",
        score: 0,
        comment: "在输出中未找到 researcher_messages",
      };
    }

    const lastMessage = researcherMessages[researcherMessages.length - 1];
    if (!lastMessage) {
      return {
        key: "correct_next_step",
        score: 0,
        comment: "未找到最后一条消息",
      };
    }

    // 检查是否进行了工具调用
    const toolCalls = lastMessage.tool_calls || lastMessage.additional_kwargs?.tool_calls || [];
    const madeToolCall = Array.isArray(toolCalls) && toolCalls.length > 0;

    // 确定 agent 的决定
    const agentDecision = madeToolCall ? "continue" : "stop";

    // 获取期望的下一步动作
    const referenceOutputs = example.outputs as Record<string, any>;
    const expectedNextStep = referenceOutputs?.next_step;

    if (!expectedNextStep) {
      return {
        key: "correct_next_step",
        score: 0,
        comment: "在参考输出中未找到期望的 next_step",
      };
    }

    // 对决定进行评分
    const isCorrect = agentDecision === expectedNextStep;
    const score = isCorrect ? 1 : 0;

    // 生成评论
    let comment = `Agent 决定: ${agentDecision}, 期望: ${expectedNextStep}`;
    if (isCorrect) {
      comment += " ✓ 正确的决定!";
    } else {
      comment += " ✗ 错误的决定";
      if (agentDecision === "continue" && expectedNextStep === "stop") {
        comment += " - Agent 应该在信息充足时停止";
      } else {
        comment += " - Agent 应该在信息不足时继续";
      }
    }

    return {
      key: "correct_next_step",
      score: score,
      comment: comment,
    };
  } catch (error) {
    return {
      key: "correct_next_step",
      score: 0,
      comment: `评估错误: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
