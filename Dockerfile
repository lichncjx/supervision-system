FROM node:20-alpine AS deps

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com && npm install -g pnpm

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm config set registry https://registry.npmmirror.com && pnpm install --no-frozen-lockfile


FROM node:20-alpine AS source

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com && npm install -g pnpm && pnpm config set registry https://registry.npmmirror.com

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm prisma generate


FROM source AS builder

WORKDIR /app

RUN pnpm build


FROM node:20-alpine AS runner

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
