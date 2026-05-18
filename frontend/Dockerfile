# ── Stage 1: Build frontend ─────────────────────────────────────────────────
FROM node:22-alpine AS web-builder
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/. .

ARG VITE_APP_CHANNEL=production
ENV VITE_APP_CHANNEL=$VITE_APP_CHANNEL

RUN npm run build

# ── Stage 2: Build API ──────────────────────────────────────────────────────
FROM node:22-alpine AS api-builder
WORKDIR /app

COPY api/package*.json ./
RUN npm ci --prefer-offline

COPY api/. .
RUN npm run build

# ── Stage 3: Runtime — nginx + api in one container ─────────────────────────
FROM nginx:1.27-alpine AS runner

# Install Node.js + tini for process management
RUN apk add --no-cache nodejs npm gettext tini

# ── Frontend static files ───────────────────────────────────────────────────
COPY --from=web-builder /app/dist /usr/share/nginx/html

# ── API ─────────────────────────────────────────────────────────────────────
RUN mkdir -p /opt/velo-api && chown -R root:root /opt/velo-api
WORKDIR /opt/velo-api

# Copy API package files and install production deps
COPY api/package*.json /opt/velo-api/
RUN npm ci --omit=dev --prefer-offline

# Copy built API code, migrations, scripts
COPY --from=api-builder /app/dist ./dist
COPY api/migrations ./migrations
COPY api/scripts ./scripts
COPY api/docker-entrypoint.sh /opt/velo-api/docker-entrypoint.sh
RUN chmod +x /opt/velo-api/docker-entrypoint.sh

# ── Nginx config ────────────────────────────────────────────────────────────
COPY frontend/nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# tini manages both nginx and node processes
ENTRYPOINT ["/docker-entrypoint.sh"]
