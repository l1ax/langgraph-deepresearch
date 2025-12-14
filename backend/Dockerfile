FROM langchain/langgraphjs-api:20
ADD . /deps/backend
ENV LANGSERVE_GRAPHS='{"scopeAgent":"./src/graph/scopeGraph.ts:scopeAgentGraph","researchAgent":"./src/graph/researchAgentGraph.ts:researchAgentGraph","researchAgentMcp":"./src/graph/researchAgentMcpGraph.ts:researchAgentMcpGraph","supervisorAgent":"./src/graph/supervisorGraph.ts:supervisorGraph","fullResearchAgent":"./src/graph/fullAgentGraph.ts:fullAgentGraph"}'
WORKDIR /deps/backend
RUN pnpm i --frozen-lockfile
RUN (test ! -f /api/langgraph_api/js/build.mts && echo "Prebuild script not found, skipping") || tsx /api/langgraph_api/js/build.mts