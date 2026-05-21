FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache postgresql16-client gzip
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline
COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY scripts ./scripts
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN mkdir -p /backups && chmod +x /docker-entrypoint.sh && chown -R node:node /app /backups
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=6 \
  CMD wget -qO- http://localhost:3001/health || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
