import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  // 生产环境删除 console 语句
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // 保留 console.error 和 console.warn
    } : false,
  },
  // 注意：如果存在 babel.config.js，Next.js 会自动使用 Babel（而不是 SWC）
  // 这样可以启用 React Compiler 插件
};

export default nextConfig;
