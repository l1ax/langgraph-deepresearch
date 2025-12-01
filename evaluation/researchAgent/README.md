# Research Agent 评估系统

## 概述

此评估系统测试 research agent 是否能够正确判断何时继续调用工具和何时停止研究。这是 agent 系统中最关键的能力之一。

## 评估目标

评估 research agent 的两个关键决策能力：

1. **继续研究** - 当信息不足或不相关时，agent 应该继续调用工具收集更多信息
2. **停止研究** - 当信息充足时，agent 应该停止调用工具并提供答案

## 失败模式

如果 agent 的工具调用循环调优不当，会出现以下问题：

- **过早终止**: Agent 在任务未完成时就停止调用工具，导致信息收集不足，答案过于浅薄
- **过度循环**: Agent 永远不满足于已收集的信息状态，导致使用过多 token，可能引入无关信息

## 评估数据集

### 场景 1: 应该继续 (messagesShouldContinue)

**情况**: Agent 收到了通用的咖啡馆信息（wifi、氛围等），但缺少咖啡质量的具体指标

**期望行为**: Agent 应该识别出信息不足，继续搜索专注于咖啡质量的信息

**消息流程**:
```
用户问题: "What are the top coffee shops in SF based on coffee quality?"
↓
首次搜索: "coffee shops San Francisco popular locations"
↓
搜索结果: 通用信息（wifi、氛围、座位等）- 缺少咖啡质量指标
↓
think_tool 反思: "信息专注于通用特征，缺少专业评分、认证等质量指标"
↓
期望决策: 继续搜索（应该有 tool_calls）
```

### 场景 2: 应该停止 (messagesShouldStop)

**情况**: Agent 收到了全面的咖啡质量信息（专业评分、认证、专家评价等）

**期望行为**: Agent 应该识别出信息充足，停止搜索并提供答案

**消息流程**:
```
用户问题: "What are the top coffee shops in SF based on coffee quality?"
↓
精准搜索: "best coffee quality SF specialty coffee expert reviews Coffee Review ratings"
↓
搜索结果: 全面的质量信息
  - Coffee Review 专业评分 (88-94/100)
  - 专家排名和认证
  - 5 家顶级咖啡店的详细评估
↓
think_tool 反思: "已有全面的质量信息，包括评分、认证、专家评价"
↓
期望决策: 停止搜索（不应该有 tool_calls）
```

## 文件结构

```
evaluation/researchAgent/
├── dataset.ts      # 评估数据集（2个场景）
├── evaluators.ts   # 评估函数
└── run.ts         # 主评估脚本
```

### dataset.ts

定义两个评估场景：
- `messagesShouldContinue`: Agent 应该继续的场景
- `messagesShouldStop`: Agent 应该停止的场景
- `evaluationDataset`: 包含输入和期望输出的完整数据集

### evaluators.ts

包含评估函数 `evaluateNextStep`:
- 检查最后一条消息是否包含 tool_calls
- 有 tool_calls = "continue"，无 tool_calls = "stop"
- 与期望的 `next_step` 比较
- 返回评分 (0 或 1) 和详细评论

### run.ts

主评估脚本：
1. 创建/使用 LangSmith 数据集
2. 调用 `researchAgentGraph.nodes['llm_call']` 节点
3. 使用 `evaluateNextStep` 评估器
4. 报告结果到 LangSmith

## 运行评估

### 前置条件

确保设置了 `LANGSMITH_API_KEY` 环境变量：

```bash
export LANGSMITH_API_KEY=your_api_key
```

### 运行评估

```bash
npm run evaluate:researchAgent
```

### 输出示例

```
Using existing dataset: deep_research_agent_termination (abc123...)

Starting evaluation...
This may take a few minutes as we evaluate each test case...

Evaluating two scenarios:
  1. Agent should CONTINUE - insufficient information
  2. Agent should STOP - comprehensive information

✅ Evaluation completed!

View the evaluation results in LangSmith dashboard
https://smith.langchain.com/datasets/abc123...
```

## 评估指标

### correct_next_step

- **Score**: 0 或 1
- **1**: Agent 做出了正确的决策（继续或停止）
- **0**: Agent 做出了错误的决策

### 评论示例

**正确决策**:
```
Agent decision: continue, Expected: continue ✓ Correct decision!
```

**错误决策**:
```
Agent decision: stop, Expected: continue ✗ Incorrect decision -
Agent should have continued with insufficient information
```

## 技术要点

### 测试单个节点

关键技术：我们只测试 `llm_call` 节点，而非整个图

```typescript
const result = await researchAgentGraph.nodes['llm_call'].invoke(
  inputs,
  graphConfig
);
```

**原因**:
- 精确测试决策逻辑
- 避免实际调用工具（更快、更可控）
- 专注于 agent 的判断能力

### 工具调用检测

```typescript
const toolCalls = lastMessage.tool_calls ||
                  lastMessage.additional_kwargs?.tool_calls || [];
const madeToolCall = Array.isArray(toolCalls) && toolCalls.length > 0;
```

需要检查两个位置，因为不同的消息格式可能将 tool_calls 存储在不同的位置。

## 与 Notebook 的对应关系

| Notebook 组件 | Backend 实现 | 说明 |
|--------------|-------------|------|
| `messages_should_continue` | `messagesShouldContinue` | 应该继续的场景 |
| `messages_should_stop` | `messagesShouldStop` | 应该停止的场景 |
| `evaluate_next_step()` | `evaluateNextStep()` | 评估函数 |
| `target_func()` | `targetFunc()` | 目标函数 |
| `dataset_name` | `deep_research_agent_termination` | 数据集名称 |

## Prompt 工程技术

此评估测试的是以下 prompt 工程技术的效果：

### 1. Think Like The Agent
- 给 agent 明确的人类研究者指示
- "Read the question carefully", "Start with broader searches"

### 2. Concrete Heuristics (Hard Limits)
- 简单查询: 2-3 次搜索
- 复杂查询: 最多 5 次搜索
- 防止"spin-out"问题

### 3. Show Your Thinking
- 每次搜索后使用 `think_tool`
- 分析结果、评估完整性、决定下一步

## 预期结果

成功的 agent 应该：
- ✅ 在场景 1 中识别出信息不足，继续搜索
- ✅ 在场景 2 中识别出信息充足，停止搜索
- ✅ 整体准确率 100% (2/2)

## 扩展评估

可以添加更多场景：
- 部分相关信息（边界案例）
- 不同复杂度的研究任务
- 不同领域的研究主题
- 多轮搜索的场景

## 相关文档

- [LangGraph Agent Pattern](https://langchain-ai.github.io/langgraph/tutorials/workflows/#agent)
- [Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
- [Anthropic Claude Think Tool](https://www.anthropic.com/engineering/claude-think-tool)

## 故障排除

### 评估失败

如果评估失败，检查：
1. LANGSMITH_API_KEY 是否设置
2. 网络连接是否正常
3. agent 的 prompt 是否正确配置

### 意外结果

如果 agent 做出了意外决策：
1. 检查 LangSmith trace 查看详细日志
2. 审查 prompt 中的硬性限制
3. 验证 think_tool 的反思质量
