/**
 * Worker entry point — BullMQ job processor.
 * Registers all queue workers and starts processing jobs.
 *
 * Health score recalculation runs nightly at 02:00 UTC.
 * Task reminders run every 15 minutes.
 * Email tracking processes engagement events on demand.
 */
import type { PrismaClient } from '@prisma/client';
import type { ConnectionOptions } from 'bullmq';
import pino from 'pino';

import { createHealthScoreQueue } from './queues/health-score.queue.js';
import { createHealthScoreWorker } from './jobs/health-score.job.js';
import { createEmailTrackingQueue } from './queues/email-tracking.queue.js';
import { createEmailTrackingWorker } from './jobs/email-tracking.job.js';
import { createTaskReminderQueue } from './queues/task-reminder.queue.js';
import { createTaskReminderWorker } from './jobs/task-reminder.job.js';
import { createImportProcessorQueue } from './queues/import-processor.queue.js';
import { createImportProcessorWorker } from './jobs/import-processor.job.js';
import { createDataQualityQueue } from './queues/data-quality.queue.js';
import { createDataQualityWorker } from './jobs/data-quality-scorecard.job.js';

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

  // Create email tracking queue and worker
  const emailTrackingQueue = createEmailTrackingQueue(redis);
  const emailTrackingWorker = createEmailTrackingWorker(redis, prisma);

  logger.info('Email tracking worker registered');

  // Create task reminder queue and worker
  const taskReminderQueue = createTaskReminderQueue(redis);
  const taskReminderWorker = createTaskReminderWorker(redis, prisma);

  // Schedule task reminders every 15 minutes
  await taskReminderQueue.upsertJobScheduler(
    'periodic-task-reminders',
    {
      pattern: '*/15 * * * *', // Every 15 minutes
    },
    {
      name: 'periodic-task-reminder-check',
      data: { tenantId: '' }, // Will need to be populated per-tenant
    },
  );

  logger.info('Task reminder worker registered and periodic schedule configured');

  // Create import processor queue and worker
  const importProcessorQueue = createImportProcessorQueue(redis);
  const importProcessorWorker = createImportProcessorWorker(redis, prisma);

  logger.info('Import processor worker registered');

  // Create data quality scorecard queue and worker
  const dataQualityQueue = createDataQualityQueue(redis);
  const dataQualityWorker = createDataQualityWorker(redis, prisma);

  // Schedule nightly data quality scorecard at 03:00 UTC (after health scores at 02:00)
  await dataQualityQueue.upsertJobScheduler(
    'nightly-data-quality',
    {
      pattern: '0 3 * * *', // Every day at 03:00 UTC
    },
    {
      name: 'nightly-data-quality-scorecard',
      data: { tenantId: '' }, // Will need to be populated per-tenant
    },
  );

  logger.info('Data quality scorecard worker registered and nightly schedule configured');

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down workers...');
    await healthScoreWorker.close();
    await healthScoreQueue.close();
    await emailTrackingWorker.close();
    await emailTrackingQueue.close();
    await taskReminderWorker.close();
    await taskReminderQueue.close();
    await importProcessorWorker.close();
    await importProcessorQueue.close();
    await dataQualityWorker.close();
    await dataQualityQueue.close();
    logger.info('Workers shut down gracefully');
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}
