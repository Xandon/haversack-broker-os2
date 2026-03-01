FROM node:20-alpine AS base
WORKDIR /app

# --- Install all dependencies (monorepo root + workspaces) ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY worker/package.json ./worker/
RUN npm ci --ignore-scripts

# --- Build shared package + frontend ---
FROM deps AS build
COPY tsconfig.base.json ./
# Build shared package
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
RUN cd packages/shared && npx tsc
# Copy frontend source and build
COPY frontend/ ./frontend/
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd frontend && npm run build

# --- Production runner ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=build /app/frontend/public ./frontend/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "frontend/server.js"]
