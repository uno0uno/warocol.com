# Etapa 1: Construcción
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm,id=npm-cache-warocol \
    npm install
COPY . .
RUN --mount=type=cache,target=/app/.nuxt,id=nuxt-cache-warocol \
    npm run build

# Etapa 2: Producción
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/.output/ ./.output/
ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", ".output/server/index.mjs"]