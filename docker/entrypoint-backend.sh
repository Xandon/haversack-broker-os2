#!/bin/sh
set -e

echo "Waiting for Postgres to be ready..."
until node -e "
const net = require('net');
const s = net.createConnection({ host: process.env.DB_HOST || 'haversack-db', port: 5432 });
s.on('connect', () => { s.end(); process.exit(0); });
s.on('error', () => process.exit(1));
" 2>/dev/null; do
  echo "  Postgres not ready, retrying in 2s..."
  sleep 2
done
echo "Postgres is ready."

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database (idempotent)..."
npx tsx prisma/seed.ts || echo "Seed skipped or already applied."

echo "Starting backend server..."
cd /app/backend
exec tsx src/server.ts
