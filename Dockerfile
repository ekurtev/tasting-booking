# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Application files stay owned by root (read-only for the app); only the cache dir is writable.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY migrations ./migrations
COPY seed ./seed
COPY scripts/migrate.mjs scripts/docker-entrypoint.sh ./scripts/
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]
