/**
 * LangGraph Proxy Server
 *
 * 职责：
 * 1. 转发请求到 LangGraph Agent Server
 * 2. 拦截 SSE 流并持久化事件到数据库
 * 3. 实现 joinStream 恢复未完成的执行
 * 4. 提供统一的数据 API（Threads, Events）
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import threadsRouter from './routes/threads.js';
import crudThreadsRouter from './routes/crudThreads.js';
import eventsRouter from './routes/events.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2024;
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://langgraph-api:8000';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'langgraph-proxy',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/threads', crudThreadsRouter);  // Threads CRUD
app.use('/api/events', eventsRouter);        // Events 读取

// 2. LangGraph API override
app.use('/threads', threadsRouter);

// 3. Fallback：未匹配的 /threads 路径直接转发到 Agent Server
app.use('/', createProxyMiddleware({
    target: AGENT_SERVER_URL,
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
            console.log(`[Proxy] Forwarding to Agent Server: ${req.method} ${req.url}`);
        },
        proxyRes: (proxyRes: any, req: any, res: any) => {
            console.log(`[Proxy] Agent Server responded: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
        },
        error: (err: any, req: any, res: any) => {
            console.error(`[Proxy] Forwarding error:`, err);
            if (!res.headersSent) {
                (res as express.Response).status(500).json({
                    error: 'Proxy error',
                    message: err.message
                });
            }
        }
    }
}));

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 启动服务器
async function startServer() {
    try {
        app.listen(PORT, () => {
            console.log(`[Proxy] Server running on port ${PORT}`);
            console.log(`[Proxy] Agent Server URL: ${process.env.AGENT_SERVER_URL || 'http://langgraph-api:8000'}`);
            console.log(`[Proxy] Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
        });
    } catch (error) {
        console.error('[Proxy] Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
