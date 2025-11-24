# Research Agent Implementation

本实现基于 `deep_research_from_scratch/notebooks/2_research_agent.ipynb` 将 Python 的 research agent 迁移到 TypeScript/Node.js backend。

## 实现的功能

### 1. **State 管理** (`src/state/index.ts`)
- `ResearcherStateAnnotation`: 研究 agent 的状态管理
  - `researcher_messages`: 研究过程中的消息历史
  - `tool_call_iterations`: 工具调用次数追踪
  - `research_topic`: 研究主题
  - `compressed_research`: 压缩后的研究结果
  - `raw_notes`: 原始研究笔记

- `ResearcherOutputStateAnnotation`: 研究 agent 的输出状态
  - 用于定义最终输出的结构

### 2. **Prompts** (`src/prompts/index.ts`)
添加了以下 prompts：
- `researchAgentPrompt`: 研究 agent 的主要指令，包含：
  - 任务说明
  - 工具使用指南（tavily_search 和 think_tool）
  - 研究策略（从宽泛搜索到精确搜索）
  - 硬性限制（2-3 次简单查询，最多 5 次复杂查询）
  - 反思机制（每次搜索后使用 think_tool 分析）

- `compressResearchSystemPrompt`: 研究压缩系统提示
  - 指导如何综合研究结果
  - 保留所有相关信息
  - 按主题组织

- `compressResearchHumanMessage`: 研究压缩人类消息
  - 强化压缩任务
  - 确保信息完整性

- `summarizeWebpagePrompt`: 网页内容摘要提示
  - 提取关键信息
  - 过滤无关内容

### 3. **Tools** (`src/tools/tavilySearch.ts`)
实现了两个核心工具：

#### `tavilySearchTool`
- 使用 Tavily API 进行网页搜索
- 自动对搜索结果进行去重
- 使用 LLM 对原始网页内容进行摘要
- 返回格式化的搜索结果

#### `thinkTool`
- 实现反思机制
- 在每次搜索后暂停分析
- 评估当前发现
- 决定下一步行动

### 4. **Nodes** (`src/nodes/`)
实现了三个主要节点：

#### `researchLlmCall` (`src/nodes/llmCall.ts`)
- LLM 决策节点
- 分析当前状态
- 决定是调用工具还是提供最终答案

#### `researchToolNode` (`src/nodes/toolNode.ts`)
- 工具执行节点包装器
- 处理 ToolNode 的状态转换
- **重要**: ToolNode 期望 `{ messages: BaseMessage[] }` 格式，但我们的 state 使用 `researcher_messages`
- 该函数负责在调用前后转换状态格式

#### `compressResearch` (`src/nodes/compressResearch.ts`)
- 研究压缩节点
- 综合所有研究发现
- 生成压缩摘要和原始笔记

### 5. **Graph** (`src/graph/researchAgentGraph.ts`)
实现了完整的研究工作流：

```
START → llm_call → [条件路由]
                   ├─> tool_node → llm_call (循环)
                   └─> compress_research → END
```

#### 工作流程：
1. **LLM 决策**: 分析当前状态，决定下一步行动
2. **工具执行**: 如果需要更多信息，执行搜索工具
3. **循环迭代**: 返回 LLM 决策节点继续研究
4. **研究压缩**: 当收集足够信息时，压缩研究结果
5. **结束**: 返回压缩的研究和原始笔记

#### 路由逻辑：
- `shouldContinue`: 检查最后一条消息是否包含工具调用
  - 有工具调用 → 继续到 `tool_node`
  - 无工具调用 → 进入 `compress_research`

## 与 Notebook 的对应关系

| Notebook 组件 | Backend 实现 | 说明 |
|--------------|-------------|------|
| `ResearcherState` | `ResearcherStateAnnotation` | 状态管理 |
| `tavily_search` | `tavilySearchTool` | Tavily 搜索工具 |
| `think_tool` | `thinkTool` | 反思工具 |
| `llm_call` | `researchLlmCall` | LLM 调用节点 |
| `tool_node` | `researchToolNode` | 工具执行节点 |
| `compress_research` | `compressResearch` | 研究压缩节点 |
| `should_continue` | `shouldContinue` | 路由逻辑 |
| `researcher_agent` | `researchAgentGraph` | 完整工作流图 |

## 代码风格一致性

实现遵循了现有 backend 代码的风格：

1. **文件结构**:
   - 使用 JSDoc 注释
   - 分节组织（Configuration, Nodes, Routing Logic, etc.）
   - 导出模式与现有文件一致

2. **TypeScript 类型**:
   - 使用 `Annotation.Root` 定义状态
   - 使用 LangChain 的内置类型（`BaseMessage`, `SystemMessage`, etc.）
   - 保持与 `StateAnnotation` 一致的 reducer 模式

3. **工具实现**:
   - 使用 `DynamicStructuredTool`
   - Zod schema 定义
   - 详细的 description 文档

4. **Graph 构建**:
   - 与 `scopeGraph.ts` 保持一致的模式
   - 使用 `StateGraph` + `addNode` + `addEdge`
   - 清晰的注释说明

## 环境变量

需要配置以下环境变量：

```env
TAVILY_API_KEY=your_tavily_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 使用示例

```typescript
import { HumanMessage } from '@langchain/core/messages';
import { researchAgentGraph } from './src/graph';

const result = await researchAgentGraph.invoke({
    researcher_messages: [
        new HumanMessage({
            content: "Research the best coffee shops in San Francisco."
        }),
    ],
});

console.log(result.compressed_research);
console.log(result.raw_notes);
```

## 测试

运行测试：

```bash
npm run type-check  # 类型检查
npm run build       # 编译
tsx test/research-agent.test.ts  # 运行测试
```

## 依赖

新增依赖：
- `@langchain/anthropic`: Claude 模型支持
- `@langchain/openai`: GPT 模型支持
- `@tavily/core`: Tavily 搜索 API
- `zod`: Schema 验证

## 注意事项

1. **Context Engineering**: 实现了两层内容工程
   - 网页内容摘要：减少噪音
   - 研究结果压缩：保持上下文高效

2. **Tool Call Limits**: 防止过度搜索
   - 简单查询：2-3 次
   - 复杂查询：最多 5 次
   - 硬性限制在 prompt 中明确说明

3. **Think Tool Pattern**: 在每次搜索后强制反思
   - 分析发现
   - 评估完整性
   - 决定下一步

4. **Output Token Management**:
   - 使用 `maxTokens` 配置防止输出截断
   - GPT-4.1: 32000 tokens
   - Claude Sonnet 4: 64000 tokens (可选)

5. **ToolNode 状态转换**:
   - ToolNode 期望 `{ messages: BaseMessage[] }` 格式
   - 我们的 state 使用 `researcher_messages`
   - `researchToolNode` 函数负责状态格式转换
   - 这是修复 "ToolNode only accepts BaseMessage[]" 错误的关键
