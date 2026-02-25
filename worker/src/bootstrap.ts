/**
 * Worker bootstrap — creates connections and starts all workers.
 * This is the actual entry point for running the worker process.
 * The index.ts exports startWorkers() for programmatic use;
 * this file wires up PrismaClient + Redis and invokes it.
 */
import { PrismaClient } from '@prisma/client';
import type { ConnectionOptions } from 'bullmq';
import pino from 'pino';

import { startWorkers } from './index.js';

const logger = pino({ name: 'haversack-worker-bootstrap' });

function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  };
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  const redisUrl = process.env['REDIS_URL'];

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  const prisma = new PrismaClient();
  const redis = parseRedisUrl(redisUrl);

  logger.info('Connecting to database and Redis...');

  await prisma.$connect();
  logger.info('Database connected');

  await startWorkers({ redis, prisma });
  logger.info('All workers started');
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Failed to bootstrap worker');
  process.exit(1);
});
