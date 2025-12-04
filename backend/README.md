# Deep Research Agent
## scope
划定研究范围，生成研究简报

### 关键节点
#### Clarify With User
用户需求澄清阶段，确保用户提供了足够多的信息来开展接下来的research

#### Research Brief Generation
根据用户的信息，使用第一人称生成研究简报，确保简报的内容准确且无信息丢失

### 评测
两个方面：
1. research brief中没有丢失用户的信息
2. research brief中没有对 用户未提及的部分 做出假设。

#### Example
```javascript
conversation_1 = [
    HumanMessage(content="What's the best way to invest $50,000 for retirement?"),
    AIMessage(content="Could you please provide some additional information to tailor the investment advice for your $50,000 retirement goal? Specifically:\n Your current age or desired retirement age\n Your risk tolerance (low, medium, high)\n Any preferences for investment types (e.g., stocks, bonds, mutual funds, real estate)\n Whether you are investing through a tax-advantaged account (e.g., IRA, 401(k)) or a regular brokerage account\n This will help me provide more personalized and relevant suggestions."),
    HumanMessage(content="I'm 25 and I want to retire by 45. My risk tolerance is high right now but I think will decrease over time. I have heard that stocks and ETFs are a good choice, but I'm open to anything. And I already have a 401k, but this would just be through a regular brokerage account."),
]
```
基于这个案例，我们期望llm能够提取出以下几个信息：
- "Current age is 25",
- "Desired retirement age is 45",
- "Current risk tolerance is high",
- "Interested in investing in stocks and ETFs",
- "Open to forms of investment beyond stocks and ETFs"
- "Investment account is a regular brokerage account"

且确保生成的brief中不包含任何假设信息

## research agent
### 流程
[llmCall -> [tavilySearch -> thinkTool -> tavilySearch -> ...] -> compressResearch]
基础的研究Agent，主要工作流程为：
1. 接收research brief, research agent 根据system prompt和brief 按照【tavilySearch -> thinkTool -> tavilySearch ..】的工具调用顺序进行循环
2. 当research Agent根据目前的上下文（包括thinkTool的reflection & tavily Search 压缩后的结果）认为 目前的信息已经足够回答时，就运行到compressResearch节点，进行研究信息和结果的压缩

### 评测
这个阶段主要评估 工具调用循环的可靠性，尤其是llm能否正确判断 上下文信息足够回答，是否会陷入 过度收集信息 or 目标偏移的问题
#### Example
```javascript
/**
 * 场景 1: Agent 应该继续 - 信息不足/不相关 + think_tool 意识到需要更多研究
 */
const messagesShouldContinue: BaseMessage[] = [
    new HumanMessage({
        content: 'What are the top coffee shops in San Francisco based on coffee quality?'
    }),
    new AIMessage({
        content: 'I will search for information about top coffee shops in San Francisco focusing on coffee quality.',
        tool_calls: [
            {
                name: 'tavily_search',
                args: {
                    query: 'coffee shops San Francisco popular locations'
                },
                id: 'call_continue_search_001',
                type: 'tool_call'
            }
        ]
    }),
    // Tavily 搜索提供了通用的咖啡馆信息 - 不是专注于咖啡质量
    new ToolMessage({
        content: 'Search results show popular San Francisco cafes: Blue Bottle Coffee has great wifi and ambiance, Philz Coffee is known for custom blends and friendly service, Café Reveille has multiple locations with good pastries and laptop-friendly spaces. Ritual Coffee offers cozy seating and is popular with students.',
        tool_call_id: 'call_continue_search_001'
    }),
    // Agent 使用 think_tool 进行反思并意识到搜索结果不足
    new AIMessage({
        content: 'Let me use the think_tool to analyze these search results and determine next steps.',
        tool_calls: [
            {
                name: 'think_tool',
                args: {
                    reflection: 'Analysis of search results: The information I found focuses on general cafe features like wifi, ambiance, custom blends, and seating - but lacks specific coffee quality metrics. The user specifically asked for evaluation based on coffee quality, which would require expert reviews, professional ratings, specialty certifications, or quality-focused customer feedback. I need to search specifically for coffee quality assessments, Coffee Review scores, specialty coffee credentials, or expert evaluations of SF coffee shops. The current information is insufficient to answer the user\'s question about coffee quality.'
                },
                id: 'call_continue_think_001',
                type: 'tool_call'
            }
        ]
    }),
    // think_tool 响应识别了差距并需要更有针对性的研究
    new ToolMessage({
        content: 'Reflection recorded: Analysis of search results: The information I found focuses on general cafe features like wifi, ambiance, custom blends, and seating - but lacks specific coffee quality metrics. The user specifically asked for evaluation based on coffee quality, which would require expert reviews, professional ratings, specialty certifications, or quality-focused customer feedback. I need to search specifically for coffee quality assessments, Coffee Review scores, specialty coffee credentials, or expert evaluations of SF coffee shops. The current information is insufficient to answer the user\'s question about coffee quality.',
        tool_call_id: 'call_continue_think_001'
    }),
];

/**
 * 场景 2: Agent 应该停止 - 拥有全面的咖啡质量信息 + think_tool 反思
 */
const messagesShouldStop: BaseMessage[] = [
    new HumanMessage({
        content: 'What are the top coffee shops in San Francisco based on coffee quality?'
    }),
    new AIMessage({
        content: 'I will research San Francisco coffee shops specifically focusing on coffee quality assessments and expert reviews.',
        tool_calls: [
            {
                name: 'tavily_search',
                args: {
                    query: 'best coffee quality San Francisco specialty coffee expert reviews Coffee Review ratings 2024'
                },
                id: 'call_stop_search_001',
                type: 'tool_call'
            }
        ]
    }),
    // 此 ToolMessage 提供了全面的咖啡质量信息 - 足以回答问题
    new ToolMessage({
        content: `Coffee quality research for San Francisco reveals top establishments based on expert reviews and specialty coffee credentials:

**Top Quality-Focused Coffee Shops:**
1. **Sightglass Coffee** - Coffee Review score 94/100, known for single-origin beans and precise roasting techniques. Featured in Bon Appétit's "Best Coffee in America" list for exceptional coffee quality.

2. **Saint Frank Coffee** - Ranked #3 coffee shop in America by The Daily Meal based on coffee quality. 4.3/5 Yelp rating with reviews specifically praising "exceptional bean quality" and "perfect extraction."

3. **Ritual Coffee Roasters** - Specialty Coffee Association member, direct trade relationships, consistently rated 4.4/5 on Google with reviews highlighting "superior coffee taste" and "expert barista skills."

4. **Blue Bottle Coffee** - Third-wave coffee pioneer, Coffee Review scores averaging 90+/100, known for rigorous quality control and fresh roasting practices.

5. **Four Barrel Coffee** - Local roaster with Coffee Review scores 88-92/100, praised by industry experts for "exceptional coffee quality" and innovative brewing methods.

**Quality Indicators Found:**
- Coffee Review professional scores (88-94/100 range)
- Specialty Coffee Association certifications
- Direct trade/single-origin sourcing
- Expert recognition from food publications
- Customer reviews specifically mentioning coffee taste and quality

This provides a comprehensive assessment of SF coffee shops based specifically on coffee quality rather than ambiance or service.`,
        tool_call_id: 'call_stop_search_001'
    }),
    // Agent 现在使用 think_tool 对搜索结果进行反思
    new AIMessage({
        content: 'Let me reflect on the search results using the think_tool to assess whether I have sufficient information.',
        tool_calls: [
            {
                name: 'think_tool',
                args: {
                    reflection: 'Analysis of search results: I found comprehensive coffee quality information for SF coffee shops including: 1) Professional Coffee Review scores (88-94/100), 2) Expert rankings from reputable publications, 3) Specialty Coffee Association certifications, 4) Specific quality indicators (single-origin, roasting techniques, extraction methods), 5) Five top-rated establishments with detailed quality assessments. This covers all aspects requested: expert reviews, customer ratings, specialty certifications. I have enough information to provide a well-supported ranking based specifically on coffee quality. No additional searches needed - I should provide my comprehensive answer now.'
                },
                id: 'call_stop_think_001',
                type: 'tool_call'
            }
        ]
    }),
    // think_tool 响应确认反思已被记录
    new ToolMessage({
        content: 'Reflection recorded: Analysis of search results: I found comprehensive coffee quality information for SF coffee shops including: 1) Professional Coffee Review scores (88-94/100), 2) Expert rankings from reputable publications, 3) Specialty Coffee Association certifications, 4) Specific quality indicators (single-origin, roasting techniques, extraction methods), 5) Five top-rated establishments with detailed quality assessments. This covers all aspects requested: expert reviews, customer ratings, specialty certifications. I have enough information to provide a well-supported ranking based specifically on coffee quality. No additional searches needed - I should provide my comprehensive answer now.',
        tool_call_id: 'call_stop_think_001'
    }),
];
```
通过判断最后llmCall中是否存在 toolCall 来判断llm决定继续工具循环 or 终止。

## supervisor
### supervisor的必要性
在处理复杂请求且包含多个子主题时，单agent的响应和质量会受到影响。这是因为agent需要在单个上下文窗口中存储所有子主题的工具反馈和响应，这会导致上下文长度迅速膨胀、上下文冲突，产生模型注意力偏移的问题，从而影响回答效果。

因此，在进行多子主题研究时，可以将问题拆解给多个子agent进行处理，每个agent拥有独立的上下文窗口；每个子agent有supervisor来委托派发任务。

### supervisor的作用
supervisor 通过 工具循环 进行任务分发与终止研究，其拥有的节点大致有三个【thinkTool, conductResearch, researchComplete】，supervisor的任务大致如下：
- 根据research判断是否为可并行任务
- 生成子主题，派发给research Agent进行研究
- 根据上下文对现状进行总结、反思
- 判断收集的信息是否足够回答问题，如果不够，继续派发给research Agent

### 评测
supervisor的评测主要评估其 判断是否可以使用并行化研究 的准确度。
通常在需要研究多个子主题，且子主题之间没有明显依赖关系时可以使用并行化研究，比如compare类型主题。

## 待修复的问题
- supervisor 生成子agent research topic时，会使用模型的过期信息影响研究，比如topic是 research Google's AI model and architectures，在生成子agent topic时他会有 "eg: gemini-1.5-pro"的过期信息