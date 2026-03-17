# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS build
WORKDIR /app

# Install dependencies (layer cached separately from source)
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-cache-warocol \
    bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN --mount=type=cache,target=/app/.nuxt,id=nuxt-cache-warocol \
    bun run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM oven/bun:1-alpine
WORKDIR /app

COPY --from=build /app/.output/ ./.output/

ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 3001
CMD ["bun", ".output/server/index.mjs"]
