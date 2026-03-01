FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
WORKDIR /app

# --- Production runner (tsx runtime, no tsc build needed) ---
FROM base AS runner
ENV NODE_ENV=production

# Copy monorepo root package files for workspace resolution
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY packages/shared/package.json ./packages/shared/
COPY worker/package.json ./worker/
COPY frontend/package.json ./frontend/
# --ignore-scripts skips husky prepare; rebuild native modules manually
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild bcrypt

# Install tsx globally for runtime TypeScript transpilation
RUN npm install -g tsx

# Copy Prisma schema + migrations and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy tsconfig files (tsx needs these for module resolution)
COPY tsconfig.base.json ./
COPY packages/shared/tsconfig.json ./packages/shared/
COPY backend/tsconfig.json ./backend/

# Copy source code
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/package.json ./packages/shared/
COPY backend/src ./backend/src

# Copy entrypoint
COPY docker/entrypoint-backend.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./entrypoint.sh"]
