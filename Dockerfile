# syntax=docker/dockerfile:1.7

# ---------- deps ----------
# better-sqlite3 ships a prebuild for most platforms, but Alpine needs musl
# build prerequisites available for the rebuild fallback (and any other
# native module that has no prebuilt binary for node-musl).
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app

COPY package.json bun.lock ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# ---------- build ----------
FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Prune dev dependencies so the runtime image stays small.
RUN npm prune --omit=dev

# ---------- runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache libc6-compat tini \
    && addgroup -S app && adduser -S app -G app
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Persisted SQLite job/batch state lives under data/ (see lib/job-store.ts).
# Mount a volume at /app/data in production to survive container restarts.
RUN mkdir -p /app/data && chown -R app:app /app

COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/next.config.mjs ./next.config.mjs

USER app
EXPOSE 3000

VOLUME ["/app/data"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
