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
import {
  ORDER_APPROVAL_QUEUE_NAME,
  type OrderApprovalJobData,
} from './queues/order-approval.queue';
import {
  QUICKBOOKS_EXPORT_QUEUE_NAME,
  QUICKBOOKS_EXPORT_CRON,
  type QuickBooksExportJobData,
} from './queues/quickbooks-export.queue';
import {
  COMMISSION_CALCULATION_QUEUE_NAME,
  type CommissionCalculationJobData,
} from './queues/commission-calculation.queue';
import {
  COMMISSION_STATEMENT_QUEUE_NAME,
  COMMISSION_STATEMENT_CRON,
  type CommissionStatementJobData,
} from './queues/commission-statement.queue';

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

  // Order approval notification queue
  const orderApprovalQueue = new Queue<OrderApprovalJobData>(ORDER_APPROVAL_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  logger.info('Order approval notification queue initialized');

  const orderApprovalWorker = new Worker<OrderApprovalJobData>(
    ORDER_APPROVAL_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id, orderId: job.data.orderId, action: job.data.action }, 'Processing order approval notification');
      // TODO: wire up processOrderApprovalNotification with real Prisma client
      logger.info({ jobId: job.id }, 'Order approval notification processed');
    },
    { connection: createRedisConnection() },
  );

  orderApprovalWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Order approval notification job failed');
  });

  // QuickBooks export queue — hourly cron job
  const quickBooksExportQueue = new Queue<QuickBooksExportJobData>(QUICKBOOKS_EXPORT_QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  await quickBooksExportQueue.upsertJobScheduler(
    'quickbooks-export-hourly',
    { pattern: QUICKBOOKS_EXPORT_CRON },
    {
      name: 'quickbooks-export',
      data: { tenantId: 'default', triggeredBy: 'cron', triggeredAt: new Date().toISOString() },
    },
  );

  logger.info({ cron: QUICKBOOKS_EXPORT_CRON }, 'QuickBooks export cron job scheduled');

  const quickBooksExportWorker = new Worker<QuickBooksExportJobData>(
    QUICKBOOKS_EXPORT_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id }, 'Processing QuickBooks export job');
      // TODO: wire up processQuickBooksExport with real Prisma client
      logger.info({ jobId: job.id }, 'QuickBooks export job completed');
    },
    { connection: createRedisConnection() },
  );

  quickBooksExportWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'QuickBooks export job failed');
  });

  // Commission calculation queue — triggered per confirmed order
  const commissionCalculationQueue = new Queue<CommissionCalculationJobData>(COMMISSION_CALCULATION_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  });

  logger.info('Commission calculation queue initialized');

  const commissionCalculationWorker = new Worker<CommissionCalculationJobData>(
    COMMISSION_CALCULATION_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id, orderId: job.data.orderId }, 'Processing commission calculation');
      // TODO: wire up processCommissionCalculation with real Prisma client
      logger.info({ jobId: job.id }, 'Commission calculation completed');
    },
    { connection: createRedisConnection() },
  );

  commissionCalculationWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Commission calculation job failed');
  });

  // Commission statement queue — monthly cron job
  const commissionStatementQueue = new Queue<CommissionStatementJobData>(COMMISSION_STATEMENT_QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  await commissionStatementQueue.upsertJobScheduler(
    'commission-statement-monthly',
    { pattern: COMMISSION_STATEMENT_CRON },
    {
      name: 'commission-statement-generation',
      data: {
        tenantId: 'default',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        triggeredBy: 'cron',
        triggeredAt: new Date().toISOString(),
      },
    },
  );

  logger.info({ cron: COMMISSION_STATEMENT_CRON }, 'Commission statement cron job scheduled');

  const commissionStatementWorker = new Worker<CommissionStatementJobData>(
    COMMISSION_STATEMENT_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id, month: job.data.month, year: job.data.year }, 'Processing commission statement generation');
      // TODO: wire up processCommissionStatements with real Prisma client
      logger.info({ jobId: job.id }, 'Commission statement generation completed');
    },
    { connection: createRedisConnection() },
  );

  commissionStatementWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Commission statement job failed');
  });

  logger.info('Worker started successfully');

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down worker');
    await healthScoreWorker.close();
    await taskReminderWorker.close();
    await emailNotificationWorker.close();
    await orderApprovalWorker.close();
    await quickBooksExportWorker.close();
    await commissionCalculationWorker.close();
    await commissionStatementWorker.close();
    await healthScoreQueue.close();
    await taskReminderQueue.close();
    await emailNotificationQueue.close();
    await orderApprovalQueue.close();
    await quickBooksExportQueue.close();
    await commissionCalculationQueue.close();
    await commissionStatementQueue.close();
    await connection.quit();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void start();
