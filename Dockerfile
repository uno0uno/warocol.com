# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

ARG NODE_BUILD_MAX_OLD_SPACE_SIZE=6144
ENV NODE_OPTIONS="--max-old-space-size=${NODE_BUILD_MAX_OLD_SPACE_SIZE}"

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache-warocol \
    npm ci

# .env is passed as a secret mount — never stored in image layers
COPY . .
RUN --mount=type=secret,id=env_file,target=/app/.env \
    --mount=type=cache,target=/app/.nuxt,id=nuxt-cache-warocol \
    npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM oven/bun:1-alpine
WORKDIR /app

COPY --from=build /app/.output/ ./.output/
COPY --from=build /app/docs/ ./docs/

ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 3001

# Liveness: Bun event-loop hang accepts TCP but fails HTTP (#2133).
# Probe /health (not /api/* — that prefix is proxied to the API).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", ".output/server/index.mjs"]
