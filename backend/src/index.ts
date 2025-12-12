import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { fullAgentGraph, researchAgentGraph, researchAgentMcpGraph, scopeAgentGraph, supervisorGraph } from './graph';
import { initCheckpointer } from './utils';

dotenv.config();

interface IRunRequestBody {
    graphId: string;
    threadId: string;
    input: any;
    config: any;
}

interface ICreateThreadBody {
    metadata?: Record<string, any>;
}


console.log('Backend server starting...');

const graphsMap = {
    "fullResearchAgent": fullAgentGraph,
    "scopeAgent": scopeAgentGraph,
    "researchAgent": researchAgentGraph,
    "researchAgentMcp": researchAgentMcpGraph,
    "supervisorAgent": supervisorGraph,
}

const app = express();
app.use(cors());
app.use(express.json());

// 健康检查路由（不带前缀）
// @ts-expect-error
app.get("/health", (req, res) => {
    res.send("LangGraph Backend is running!");
});

// 创建带有 /api/langgraph 前缀的路由
const apiRouter = express.Router();

apiRouter.post('/threads', (req: express.Request<{}, {}, ICreateThreadBody>, res: express.Response) => {
    try {
        const { metadata } = req.body;
        const threadId = randomUUID();

        // 返回符合 LangGraph SDK 规范的 Thread 对象
        res.json({
            thread_id: threadId,
            created_at: new Date().toISOString(),
            metadata: metadata || {},
        });
    } catch (error) {
        console.error("Error creating thread:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// @ts-expect-error
apiRouter.post('/run', async (req: express.Request<{}, {}, IRunRequestBody>, res: express.Response) => {
    try {
        console.log(req.body);
        const {graphId, threadId, input, config = {}} = req.body;

        if (!threadId) {
            return res.status(400).json({ error: "Thread ID is required" });
        }

        // 设置响应头，告诉浏览器这是一个流 (SSE 风格)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const graph = graphsMap[graphId as keyof typeof graphsMap];
        if (!graph) {
            return res.status(400).json({ error: "Invalid graph ID" });
        }

        // 创建 writer 函数，将事件以 LangGraph SDK 格式发送到 SSE 流
        const writer = async (data: unknown) => {
            try {
                // 包装为 LangGraph SDK 格式
                const chunk = {
                    event: 'custom',
                    id: randomUUID(),
                    data: data
                };
                const chunkData = JSON.stringify(chunk);
                res.write(`data: ${chunkData}\n\n`);
            } catch (err) {
                console.error('Error writing chunk:', err);
            }
        };

        // 合并配置，添加 writer 和 threadId
        const finalConfig = {
            ...config,
            configurable: {
                ...config.configurable,
                thread_id: threadId,
                threadId: threadId,
            },
            writer: writer,
        };

        // 运行 graph（使用 invoke 而不是 stream，因为我们通过 writer 处理流式输出）
        await graph.invoke(input, finalConfig);

        res.end();
    } catch (error) {
        console.error("Error running graph:", error);
        // 如果响应还没开始发送，返回 JSON 错误
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error: " + error });
        } else {
            // 如果已经开始流式传输，发送错误事件
            const errorChunk = {
                event: 'error',
                id: randomUUID(),
                data: { error: String(error) }
            };
            res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
            res.end();
        }
    }
});

apiRouter.get('/threads/:threadId/state', async (req: express.Request<{threadId: string}>, res: express.Response) => {
    try {
        const {threadId} = req.params;
        const threadState = await fullAgentGraph.getState({
            configurable: {
                threadId
            }
        });
        res.json(threadState);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" + error });
    }
});

// 挂载路由到 /api/langgraph
app.use('/api/langgraph', apiRouter);

// 启动服务器前初始化数据库
async function startServer() {
    try {
        console.log('Initializing checkpointer...');
        await initCheckpointer();
        console.log('Checkpointer initialized successfully');

        app.listen(2024, () => {
            console.log('Backend server is running on port 2024');
        });
    } catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

startServer();