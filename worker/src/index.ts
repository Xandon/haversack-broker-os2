import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';

import {
  HEALTH_SCORE_QUEUE_NAME,
  HEALTH_SCORE_CRON,
  type HealthScoreJobData,
} from './queues/health-score.queue';
import {
  TASK_REMINDER_QUEUE_NAME,
  type TaskReminderJobData,
} from './queues/task-reminder.queue';
import {
  EMAIL_NOTIFICATION_QUEUE_NAME,
  type EmailNotificationJobData,
} from './queues/email-notification.queue';

const logger = pino({ name: 'haversack-worker' });

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

function createRedisConnection(): IORedis {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
}

async function start(): Promise<void> {
  const connection = createRedisConnection();

  logger.info({ redisUrl: REDIS_URL }, 'Connecting to Redis');

  // Health score queue — repeatable cron job
  const healthScoreQueue = new Queue<HealthScoreJobData>(HEALTH_SCORE_QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  await healthScoreQueue.upsertJobScheduler(
    'health-score-nightly',
    { pattern: HEALTH_SCORE_CRON },
    {
      name: 'health-score-calculation',
      data: { tenantId: 'default', triggeredBy: 'cron', triggeredAt: new Date().toISOString() },
    },
  );

  logger.info({ cron: HEALTH_SCORE_CRON }, 'Health score cron job scheduled');

  // Health score worker — stub processor
  const healthScoreWorker = new Worker<HealthScoreJobData>(
    HEALTH_SCORE_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing health score job');
      // TODO: wire up processHealthScoreBatch with real Prisma client
      logger.info({ jobId: job.id }, 'Health score job completed');
    },
    { connection: createRedisConnection() },
  );

  healthScoreWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Health score job failed');
  });

  // Task reminder queue — delayed jobs scheduled per-task
  const taskReminderQueue = new Queue<TaskReminderJobData>(TASK_REMINDER_QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  logger.info('Task reminder queue initialized');

  const taskReminderWorker = new Worker<TaskReminderJobData>(
    TASK_REMINDER_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id, taskId: job.data.taskId, reminderType: job.data.reminderType }, 'Processing task reminder');
      // TODO: wire up processTaskReminder with real Prisma client
      logger.info({ jobId: job.id }, 'Task reminder processed');
    },
    { connection: createRedisConnection() },
  );

  taskReminderWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Task reminder job failed');
  });

  // Email notification queue — transactional emails with retry
  const emailNotificationQueue = new Queue<EmailNotificationJobData>(EMAIL_NOTIFICATION_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  logger.info('Email notification queue initialized');

  const emailNotificationWorker = new Worker<EmailNotificationJobData>(
    EMAIL_NOTIFICATION_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id, to: job.data.recipientEmail }, 'Sending email notification');
      // TODO: wire up processEmailNotification with real Nodemailer transport
      logger.info({ jobId: job.id }, 'Email notification sent');
    },
    { connection: createRedisConnection() },
  );

  emailNotificationWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Email notification job failed');
  });

  logger.info('Worker started successfully');

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down worker');
    await healthScoreWorker.close();
    await taskReminderWorker.close();
    await emailNotificationWorker.close();
    await healthScoreQueue.close();
    await taskReminderQueue.close();
    await emailNotificationQueue.close();
    await connection.quit();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void start();
