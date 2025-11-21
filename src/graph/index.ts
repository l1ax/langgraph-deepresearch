import { END, START, StateGraph } from '@langchain/langgraph';
import { StateAnnotation } from '../state';
import {clarifyWithUser, writeResearchBrief} from '../nodes';
import dotenv from 'dotenv';
dotenv.config();

const graphBuilder = new StateGraph(StateAnnotation);

export const graph = graphBuilder
    .addNode("clarify_with_user", clarifyWithUser, {
        ends: [END, "write_research_brief"],
    })
    .addNode("write_research_brief", writeResearchBrief, {
        ends: [END],
    })
    .addEdge(START, "clarify_with_user")
    .addEdge("write_research_brief", END)
    .compile();

graph.name = 'deepResearch'