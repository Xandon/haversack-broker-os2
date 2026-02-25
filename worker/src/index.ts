/**
 * Worker entry point — BullMQ job processor.
 * Registers all queue workers and starts processing jobs.
 *
 * Health score recalculation runs nightly at 02:00 UTC.
 */
import type { PrismaClient } from '@prisma/client';
import type { ConnectionOptions } from 'bullmq';
import pino from 'pino';

import { createHealthScoreQueue } from './queues/health-score.queue.js';
import { createHealthScoreWorker } from './jobs/health-score.job.js';

const logger = pino({ name: 'haversack-worker' });

/** Worker configuration */
export interface WorkerConfig {
  redis: ConnectionOptions;
  prisma: PrismaClient;
}

/**
 * Start all workers and schedule recurring jobs.
 *
 * @param config - Worker configuration with Redis and Prisma connections
 */
export async function startWorkers(config: WorkerConfig): Promise<void> {
  const { redis, prisma } = config;

  logger.info('Starting Haversack workers...');

  // Create health score queue and worker
  const healthScoreQueue = createHealthScoreQueue(redis);
  const healthScoreWorker = createHealthScoreWorker(redis, prisma);

  // Schedule nightly health score recalculation at 02:00 UTC
  // Uses BullMQ repeatable jobs with cron pattern
  await healthScoreQueue.upsertJobScheduler(
    'nightly-health-score',
    {
      pattern: '0 2 * * *', // Every day at 02:00 UTC
    },
    {
      name: 'nightly-health-score-recalc',
      data: { tenantId: '' }, // Will need to be populated per-tenant
    },
  );

  logger.info('Health score worker registered and nightly schedule configured');

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down workers...');
    await healthScoreWorker.close();
    await healthScoreQueue.close();
    logger.info('Workers shut down gracefully');
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}
