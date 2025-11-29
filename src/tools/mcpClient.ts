/**
 * @file MCP Client Configuration
 *
 * 此模块为 Model Context Protocol (MCP) 服务器提供配置和客户端管理。
 * MCP 允许代理通过标准化协议访问工具和资源。
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import path from 'path';

/**
 * MCP 服务器配置
 *
 * 配置文件系统 MCP 服务器以访问本地研究文档。
 * 服务器运行为子进程并通过 stdin/stdout 进行通信。
 */
// 计算 files 目录的绝对路径
// 从当前文件位置（dist/tools/ 或 src/tools/）向上两级到 backend/，然后进入 files/
// 使用 path.resolve 确保得到绝对路径，避免运行时路径问题
const filesDir = path.resolve(__dirname, '../../files');

export const mcpConfig = {
    filesystem: {
        command: 'npx',
        args: [
            '-y', // 需要时自动安装
            '@modelcontextprotocol/server-filesystem',
            filesDir, // 研究文档路径（使用绝对路径）
        ],
        transport: 'stdio' as const, // 通过 stdin/stdout 通信
    },
};

/**
 * 全局客户端变量 - 将延迟初始化以避免 LangGraph Platform 的问题
 */
let _client: MultiServerMCPClient | null = null;

/**
 * 延迟获取或初始化 MCP 客户端以避免 LangGraph Platform 的问题。
 *
 * 此函数确保 MCP 客户端仅在需要时初始化，
 * 避免在图定义时可能出现的初始化问题。
 *
 * @returns MCP 客户端实例
 */
export function getMcpClient(): MultiServerMCPClient {
    if (_client === null) {
        _client = new MultiServerMCPClient(mcpConfig);
    }
    return _client;
}
