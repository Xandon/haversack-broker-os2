#!/bin/sh
set -e

echo "[entrypoint-worker] Installing dependencies..."
npm ci --workspace=@haversack/worker --workspace=@haversack/shared --include-workspace-root

echo "[entrypoint-worker] Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

echo "[entrypoint-worker] Starting worker..."
exec "$@"
