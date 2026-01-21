# syntax=docker/dockerfile:1

# Base stage
FROM node:20 AS base
WORKDIR /app
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --prod=false; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Builder stage
FROM base AS builder

# Git 信息构建参数
ARG GIT_COMMIT_HASH=unknown
ARG GIT_COMMIT_SHORT=unknown
ARG GIT_COMMIT_MESSAGE=unknown
ARG GIT_AUTHOR=unknown
ARG GIT_REPO=unknown
ARG GIT_BRANCH=unknown

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH
ENV GIT_COMMIT_SHORT=$GIT_COMMIT_SHORT
ENV GIT_COMMIT_MESSAGE=$GIT_COMMIT_MESSAGE
ENV GIT_AUTHOR=$GIT_AUTHOR
ENV GIT_REPO=$GIT_REPO
ENV GIT_BRANCH=$GIT_BRANCH
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
