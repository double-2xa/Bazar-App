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
RUN DATABASE_URL=postgresql://generate:generate@localhost:5432/generate DIRECT_DATABASE_URL=postgresql://generate:generate@localhost:5432/generate npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/data ./apps/api/data
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
