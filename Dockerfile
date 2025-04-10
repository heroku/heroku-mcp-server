FROM node:23.11-slim AS node_base
WORKDIR /app

FROM node_base AS builder
RUN npm install -g typescript shx

COPY package.json package-lock.json tsconfig.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --omit-dev

COPY src ./src
RUN --mount=type=cache,target=/root/.npm npm run build

FROM node_base
COPY package.json package-lock.json ./
COPY --from=builder /app/dist ./dist
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --omit-dev
ENTRYPOINT ["node", "/app/dist/index.js"]
