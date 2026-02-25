/**
 * Email tracking engagement event queue definition.
 * Processes email open/click/bounce events within 60 seconds.
 */
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

export const EMAIL_TRACKING_QUEUE_NAME = 'email-tracking-engagement';

/** Job data payload for email tracking engagement events */
export interface EmailTrackingJobData {
  tenantId: string;
  messageId: string;
  event: 'opened' | 'clicked' | 'bounced';
}

/**
 * Create the email tracking engagement queue.
 *
 * @param connection - Redis connection options
 * @returns The BullMQ Queue instance
 */
export function createEmailTrackingQueue(
  connection: ConnectionOptions,
): Queue<EmailTrackingJobData> {
  return new Queue<EmailTrackingJobData>(EMAIL_TRACKING_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        count: 500,
      },
      removeOnFail: {
        count: 1000,
      },
    },
  });
}
