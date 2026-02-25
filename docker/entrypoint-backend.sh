#!/bin/sh
set -e

echo "[entrypoint-backend] Installing dependencies..."
npm ci --workspace=@haversack/backend --workspace=@haversack/shared --include-workspace-root

echo "[entrypoint-backend] Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

echo "[entrypoint-backend] Running Prisma migrations..."
if ! npx prisma migrate deploy --schema=prisma/schema.prisma; then
  echo "[entrypoint-backend] WARNING: prisma migrate deploy failed (database may already be baselined). Continuing..."
fi

echo "[entrypoint-backend] Starting backend..."
exec "$@"
