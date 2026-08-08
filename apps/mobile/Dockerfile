FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --workspace=@doublea/mobile --include-workspace-root

COPY packages/shared ./packages/shared
COPY apps/mobile ./apps/mobile

ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_ADMIN_URL
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=""
RUN test -n "$EXPO_PUBLIC_API_URL" && test -n "$EXPO_PUBLIC_ADMIN_URL"
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL \
    EXPO_PUBLIC_ADMIN_URL=$EXPO_PUBLIC_ADMIN_URL \
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID \
    NODE_ENV=production

RUN npm run build --workspace=@doublea/shared
WORKDIR /app/apps/mobile
RUN npx expo export --platform web --output-dir dist

FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=101:101 /app/apps/mobile/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/_health >/dev/null || exit 1
