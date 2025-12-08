# Repository Guidelines

## Project Structure & Module Organization
`backend/src` hosts LangGraph code: graphs (`graph/`), nodes/tools (`nodes/`, `tools/`), prompts (`prompts/`), annotations (`state/`), and streaming helpers (`outputAdapters/`). `backend/evaluation` stores scripted runs, `backend/test` holds lightweight checks, and `backend/files` keeps shared research assets. The Next.js client sits in `frontend/` with routes in `app/`, UI primitives in `components/`, MobX stores in `stores/`, API wrappers in `services/`, and static assets in `public/`. Update `langgraph.json` whenever workflows change to keep backend and UI aligned.

## Build, Test, and Development Commands
- `cd backend && pnpm install && pnpm build` compiles TypeScript into `dist/`.
- `cd backend && langgraphjs dev` runs the interactive LangGraph server (needs global `@langchain/langgraph-cli`).
- `cd backend && pnpm type-check` ensures TS hygiene before pushing.
- `cd backend && pnpm evaluate:scope|evaluate:researchAgent|evaluate:supervisor` replays canned traces for regressions.
- `cd frontend && pnpm install && pnpm dev` serves the UI on `localhost:3000`; use `pnpm build` for release bundles and `pnpm lint` for formatting.

## Coding Style & Naming Conventions
Backend files use 4-space indentation, named exports, and camelCase identifiers (`researchToolNode`, `compressResearch`). Frontend files follow the Next.js ESLint preset: 2-space indentation, PascalCase components, and explicit prop typings. Keep filenames descriptive (`scopeGraph.ts`, `sessionStore.ts`), colocate prompt snippets with their node, and only add comments around tricky routing or graph transitions. Run `pnpm type-check` (backend) or `pnpm lint` (frontend) before requesting review to maintain consistent formatting.

## Testing Guidelines
Use `cd backend && pnpm tsx test/research-agent.test.ts` for the smoke test in `backend/test`. When fixing or adding workflows, introduce a replay in `backend/evaluation/*/run.ts` so `pnpm evaluate:*` can catch regressions. Fixtures should stay small; longer transcripts or attachments belong in `backend/files`. Document manual UI verification steps (input, node triggered, expected stream) directly in each PR until automated coverage exists.

## Commit & Pull Request Guidelines
Adopt the existing `type: summary` format (`feat:`, `fix:`, `docs:`) in present tense; mixing English/Chinese is fine when it clarifies scope. PRs must link the relevant issue, mention affected workflows or UI modules, include screenshots/log excerpts for visual or streaming changes, and list the commands you executed. Call out adjustments to `langgraph.json`, `.env` variables, or public APIs explicitly so reviewers can update their environments quickly.

## Security & Configuration Notes
Never commit `.env` files; required keys include `DEEPSEEK_API_KEY`, `TAVILY_API_KEY`, plus optional Anthropic/OpenAI tokens. Use separate secrets for dev and demo usage to avoid throttling shared accounts, and scrub any sensitive transcripts before saving them to `backend/files`.
