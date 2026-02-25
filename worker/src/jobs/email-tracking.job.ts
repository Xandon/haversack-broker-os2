/**
 * Email tracking engagement event job processor.
 * BullMQ worker that processes email open/click/bounce events within 60 seconds.
 *
 * The engagement processing logic is inlined here to avoid cross-package imports
 * between worker and backend (architecture boundary enforcement).
 */
import { Worker } from 'bullmq';
import type { ConnectionOptions, Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import pino from 'pino';

import {
  EMAIL_TRACKING_QUEUE_NAME,
  type EmailTrackingJobData,
} from '../queues/email-tracking.queue.js';

const logger = pino({ name: 'email-tracking-worker' });

/**
 * Process a single email engagement event.
 * Finds the email record by message_id and updates engagement fields.
 */
async function processEmailEngagementEvent(
  prisma: PrismaClient,
  job: Job<EmailTrackingJobData>,
): Promise<void> {
  const { tenantId, messageId, event } = job.data;
  const startTime = performance.now();

  logger.info(
    { tenantId, messageId, event, jobId: job.id },
    `Processing email engagement event: ${event} for message ${messageId}`,
  );

  // Find the email record by tenant and message_id
  const emailRecord = await prisma.emailRecord.findFirst({
    where: {
      tenant_id: tenantId,
      message_id: messageId,
    },
  });

  if (!emailRecord) {
    logger.warn(
      { tenantId, messageId, event, jobId: job.id },
      `Email record not found for message_id: ${messageId}`,
    );
    return;
  }

  // Build update based on event type
  const now = new Date();
  const updateData: Record<string, unknown> = {};

  switch (event) {
    case 'opened':
      updateData['engagement_status'] = 'opened';
      updateData['opened_at'] = now;
      break;
    case 'clicked':
      updateData['engagement_status'] = 'clicked';
      updateData['clicked_at'] = now;
      break;
    case 'bounced':
      updateData['engagement_status'] = 'bounced';
      updateData['bounced_at'] = now;
      break;
  }

  await prisma.emailRecord.update({
    where: { id: emailRecord.id },
    data: updateData,
  });

  const duration = Math.round(performance.now() - startTime);

  logger.info(
    {
      tenantId,
      messageId,
      event,
      emailRecordId: emailRecord.id,
      jobId: job.id,
      duration,
    },
    `Email engagement event processed in ${duration}ms: ${event} for ${emailRecord.id}`,
  );
}

/**
 * Create and return the email tracking worker.
 *
 * @param connection - Redis connection options
 * @param prisma - PrismaClient instance for database access
 * @returns The BullMQ Worker instance
 */
export function createEmailTrackingWorker(
  connection: ConnectionOptions,
  prisma: PrismaClient,
): Worker<EmailTrackingJobData> {
  const worker = new Worker<EmailTrackingJobData>(
    EMAIL_TRACKING_QUEUE_NAME,
    async (job) => {
      await processEmailEngagementEvent(prisma, job);
    },
    {
      connection,
      concurrency: 5, // Process multiple events concurrently
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Email tracking job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Email tracking job failed',
    );
  });

  return worker;
}
