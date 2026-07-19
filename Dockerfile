# syntax=docker/dockerfile:1

# --- base: node + build tools for the native SQLite addon ---
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- runtime ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.js ./next.config.js
EXPOSE 3000
# Provide DATABASE_URL (Postgres) and ANTHROPIC_API_KEY at run time.
CMD ["pnpm", "start"]
