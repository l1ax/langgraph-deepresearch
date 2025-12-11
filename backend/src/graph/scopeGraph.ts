import { END, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation } from '../state';
import { clarifyWithUser, writeResearchBrief } from '../nodes';
import { checkpointer } from '../utils/checkpointer';
import dotenv from 'dotenv';
dotenv.config();

const graphBuilder = new StateGraph(StateAnnotation);

export const scopeAgentGraph = graphBuilder
    .addNode("clarify_with_user", clarifyWithUser as any, {
        ends: [END, "write_research_brief"],
    })
    .addNode("write_research_brief", writeResearchBrief as any, {
        ends: [END],
    })
    .addEdge(START, "clarify_with_user")
    .addEdge("write_research_brief", END)
    .compile({ checkpointer });

(scopeAgentGraph as any).name = 'scopeAgent'
