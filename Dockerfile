FROM node:20-alpine AS base

WORKDIR /app

ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

RUN corepack enable && corepack prepare pnpm@10.34.5 --activate


FROM base AS deps

COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN pnpm config set registry https://registry.npmmirror.com && pnpm install --frozen-lockfile


FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm prisma generate
RUN pnpm build


FROM node:20-alpine AS app

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 5000

CMD ["node", "server.js"]


FROM node:20-alpine AS ops

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations
COPY prisma/bootstrap-admin.ts ./prisma/bootstrap-admin.ts
COPY scripts/wait-for-db.mjs ./scripts/wait-for-db.mjs
COPY scripts/deployment-migrations ./scripts/deployment-migrations

RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

CMD ["sh", "-c", "node ./scripts/wait-for-db.mjs && ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma"]
