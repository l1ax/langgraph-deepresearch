# 1. 基础镜像：使用标准版 node:20 (Debian)，确保底层库兼容性
FROM node:20 AS base

# 启用 pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- 依赖安装阶段 (最容易报错的阶段) ---
FROM base AS deps
WORKDIR /app

# 🔥 关键修复 1：手动安装编译工具
# 解决 sharp, node-gyp, bcrypt 等库在安装时报 python/make/g++ not found 的错误
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 复制包管理文件
COPY package.json pnpm-lock.yaml* ./

# 🔥 关键修复 2：提前复制 Prisma Schema
# 必须在 pnpm install 之前复制，否则 postinstall 脚本找不到 schema 会报错
COPY prisma ./prisma

# 安装依赖
# --unsafe-perm: 防止 root 用户权限问题
# --no-optional: 跳过不兼容的可选依赖
RUN pnpm install --unsafe-perm

# --- 构建阶段 ---
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 接收构建参数 (如果有 NEXT_PUBLIC_ 变量需要在这里接收)
ARG NEXT_PUBLIC_LANGGRAPH_API_URL
ENV NEXT_PUBLIC_LANGGRAPH_API_URL=${NEXT_PUBLIC_LANGGRAPH_API_URL}

# 再次生成 Prisma Client (双重保险)
RUN npx prisma generate
ENV NODE_OPTIONS="--max-old-space-size=4096"
# 🔥 构建项目 (需要服务器开启 Swap，或者在 GitHub Actions 里跑)
RUN pnpm run build

# --- 运行阶段 (最终产物) ---
# 使用 slim 镜像减小体积，但保留 Debian 兼容性
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 创建非 root 用户 (安全最佳实践)
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# 复制 public 文件夹
COPY --from=builder /app/public ./public

# 自动创建 .next 文件夹权限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 🔥 关键修复 3：正确复制 Standalone 产物
# Standalone 模式下，server.js 和 node_modules 都在 .next/standalone 里
# 我们把它直接复制到容器根目录 /app 下
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换用户
USER nextjs

# 暴露端口
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 启动命令 (这回肯定能找到 server.js 了)
CMD ["node", "server.js"]
