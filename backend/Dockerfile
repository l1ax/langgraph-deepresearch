FROM node:20

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* package-lock.json* ./

RUN pnpm install

COPY . .

RUN npm run build

EXPOSE 2024

CMD ["npm", "run", "start"]