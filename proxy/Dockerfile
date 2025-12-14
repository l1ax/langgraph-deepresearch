FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
ARG AGENT_SERVER_URL
ENV AGENT_SERVER_URL=${AGENT_SERVER_URL}
ARG PORT
ENV PORT=${PORT}
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}
ARG DIRECT_URL
ENV DIRECT_URL=${DIRECT_URL}

COPY . .

# 🔥 关键修复：按正确顺序执行构建步骤
# 1. 安装依赖（包含 prisma 和 @prisma/client）
# 2. 生成 Prisma Client（必须在 TypeScript 编译之前）
# 3. 编译 TypeScript 代码
RUN pnpm install --frozen-lockfile && \
    pnpm exec prisma generate && \
    pnpm build

EXPOSE 2024

CMD ["pnpm", "start"]
