FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=@doublea/api --include-workspace-root
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN DATABASE_URL=postgresql://generate:generate@localhost:5432/generate npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3001
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/shared ./packages/shared
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=node:node /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=node:node /app/apps/api/data ./apps/api/data
RUN mkdir -p /app/apps/api/uploads && chown node:node /app/apps/api/uploads
WORKDIR /app/apps/api
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health/live >/dev/null || exit 1
CMD ["node", "dist/main.js"]
