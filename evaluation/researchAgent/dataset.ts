/**
 * Research Agent 评估数据集
 *
 * 此数据集用于评估 research agent 是否能够正确判断何时继续或停止调用工具
 */

import { HumanMessage, AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";

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

/**
 * 评估数据集
 *
 * 每个示例包含:
 * - inputs: 输入消息历史
 * - outputs: 期望的下一步动作（continue 或 stop）
 */
export const evaluationDataset = [
    {
        inputs: {
            researcher_messages: messagesShouldContinue
        },
        outputs: {
            next_step: 'continue'
        }
    },
    {
        inputs: {
            researcher_messages: messagesShouldStop
        },
        outputs: {
            next_step: 'stop'
        }
    }
];

export {
    messagesShouldContinue,
    messagesShouldStop
}
