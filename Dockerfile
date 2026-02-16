# Etapa 1: Construcción
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .npmrc ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/.output/ ./.output/
ENV PORT=3001
ENV HOST=0.0.0.0
EXPOSE 3001
CMD ["node", ".output/server/index.mjs"]