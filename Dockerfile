# syntax = docker/dockerfile:1
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-trixie-slim AS base
WORKDIR /src
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# Build: exakte Versionen aus package-lock.json, nichts wird nachgeladen.
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

# Migrationen mit dem gepinnten Prisma aus dem Lockfile:
#   docker compose run --rm migrate
FROM build AS migration-deps
# Reuse the locked, installed CLI dependencies; prune offline, without resolving new versions.
RUN node -e 'const fs = require("node:fs"); const p = JSON.parse(fs.readFileSync("package.json")); p.dependencies = {prisma: p.devDependencies.prisma, dotenv: p.devDependencies.dotenv}; p.devDependencies = {}; fs.writeFileSync("package.json", JSON.stringify(p));' \
 && npm prune --omit=dev --ignore-scripts --offline

FROM base AS migrate
COPY --from=migration-deps /src/node_modules ./node_modules
COPY --from=migration-deps /src/package.json ./package.json
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
ENV NODE_ENV=production
CMD ["npx", "--no-install", "prisma", "migrate", "deploy"]

# Laufzeit: nur das gebaute Nitro-Bundle. Mail-Zugangsdaten kommen zur Laufzeit
# über NUXT_*-Variablen (siehe docker-compose.yml), nicht aus dem Image.
FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runtime
WORKDIR /src
ENV NODE_ENV=production
COPY --from=build /src/.output /src/.output
USER nonroot
EXPOSE 3000
CMD [".output/server/index.mjs"]
