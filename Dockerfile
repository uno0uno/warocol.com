# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache-warocol \
    npm install

# .env is passed as a secret mount — never stored in image layers
COPY . .
RUN --mount=type=secret,id=env_file,target=/app/.env \
    --mount=type=cache,target=/app/.nuxt,id=nuxt-cache-warocol \
    npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM oven/bun:1-alpine
WORKDIR /app

COPY --from=build /app/.output/ ./.output/

ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 3001
CMD ["bun", ".output/server/index.mjs"]
