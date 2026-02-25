/**
 * Task reminder job processor.
 * BullMQ worker that checks for tasks due within 24h and 1h windows,
 * creates Notification records, and updates reminder sent flags.
 *
 * The reminder logic is inlined here to avoid cross-package imports
 * between worker and backend (architecture boundary enforcement).
 */
import { Worker } from 'bullmq';
import type { ConnectionOptions, Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import pino from 'pino';

import {
  TASK_REMINDER_QUEUE_NAME,
  type TaskReminderJobData,
} from '../queues/task-reminder.queue.js';

const logger = pino({ name: 'task-reminder-worker' });

/**
 * Process task reminders for a single tenant.
 * Checks for tasks due within 24h and 1h and creates notifications.
 */
async function processTaskReminders(
  prisma: PrismaClient,
  job: Job<TaskReminderJobData>,
): Promise<void> {
  const { tenantId } = job.data;
  const startTime = performance.now();
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  logger.info(
    { tenantId, jobId: job.id },
    `Starting task reminder check for tenant ${tenantId}`,
  );

  // Find tasks due within 24h that haven't had 24h reminder sent
  const tasksDue24h = await prisma.crmTask.findMany({
    where: {
      tenant_id: tenantId,
      status: { in: ['pending', 'in_progress'] },
      due_date: {
        gte: now,
        lte: twentyFourHoursFromNow,
      },
      reminder_24h_sent: false,
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      assigned_to_id: true,
    },
  });

  // Find tasks due within 1h that haven't had 1h reminder sent
  const tasksDue1h = await prisma.crmTask.findMany({
    where: {
      tenant_id: tenantId,
      status: { in: ['pending', 'in_progress'] },
      due_date: {
        gte: now,
        lte: oneHourFromNow,
      },
      reminder_1h_sent: false,
    },
    select: {
      id: true,
      title: true,
      due_date: true,
      assigned_to_id: true,
    },
  });

  let notificationsCreated = 0;

  // Create 24h reminder notifications
  for (const task of tasksDue24h) {
    await prisma.notification.create({
      data: {
        tenant_id: tenantId,
        user_id: task.assigned_to_id,
        type: 'task_reminder',
        title: 'Task due in 24 hours',
        body: `Task "${task.title}" is due on ${task.due_date.toISOString()}.`,
        reference_type: 'CrmTask',
        reference_id: task.id,
        channel: 'both',
      },
    });

    await prisma.crmTask.update({
      where: { id: task.id },
      data: { reminder_24h_sent: true },
    });

    notificationsCreated++;
  }

  // Create 1h reminder notifications
  for (const task of tasksDue1h) {
    await prisma.notification.create({
      data: {
        tenant_id: tenantId,
        user_id: task.assigned_to_id,
        type: 'task_reminder',
        title: 'Task due in 1 hour',
        body: `Task "${task.title}" is due on ${task.due_date.toISOString()}. Please take action soon.`,
        reference_type: 'CrmTask',
        reference_id: task.id,
        channel: 'both',
      },
    });

    await prisma.crmTask.update({
      where: { id: task.id },
      data: { reminder_1h_sent: true },
    });

    notificationsCreated++;
  }

  const duration = Math.round(performance.now() - startTime);

  logger.info(
    {
      tenantId,
      jobId: job.id,
      tasksDue24h: tasksDue24h.length,
      tasksDue1h: tasksDue1h.length,
      notificationsCreated,
      duration,
    },
    `Task reminders processed: ${notificationsCreated} notifications created in ${duration}ms`,
  );
}

/**
 * Create and return the task reminder worker.
 *
 * @param connection - Redis connection options
 * @param prisma - PrismaClient instance for database access
 * @returns The BullMQ Worker instance
 */
export function createTaskReminderWorker(
  connection: ConnectionOptions,
  prisma: PrismaClient,
): Worker<TaskReminderJobData> {
  const worker = new Worker<TaskReminderJobData>(
    TASK_REMINDER_QUEUE_NAME,
    async (job) => {
      await processTaskReminders(prisma, job);
    },
    {
      connection,
      concurrency: 1, // Process one tenant at a time
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Task reminder job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Task reminder job failed',
    );
  });

  return worker;
}
