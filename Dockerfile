FROM node:22-slim AS panel-builder
WORKDIR /app/panel
COPY panel/package*.json ./
RUN npm ci --include=dev
COPY panel/ ./
# Sin VITE_API_URL: el panel hace requests al mismo origen (backend sirve el panel)
RUN npm run build

FROM node:22-slim AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY src/ ./src/
COPY tsconfig.json ./
RUN node node_modules/typescript/bin/tsc

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/dist ./dist
COPY --from=panel-builder /app/panel/dist ./panel/dist

RUN mkdir -p /data

ENV PORT=8080
ENV DB_DIR=/data

EXPOSE 8080

CMD ["node", "dist/index.js"]
