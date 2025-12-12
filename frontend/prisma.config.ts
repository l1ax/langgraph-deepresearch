import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// 加载环境变量（优先加载 .env.local）
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config(); // 加载 .env 作为后备

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),

  // 用于 Prisma CLI 命令 (db push, migrate 等)
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
