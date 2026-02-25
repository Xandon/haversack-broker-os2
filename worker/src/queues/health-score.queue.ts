/**
 * Health score recalculation queue definition.
 * Runs nightly at 02:00 UTC to recalculate health scores for all accounts.
 */
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

export const HEALTH_SCORE_QUEUE_NAME = 'health-score-recalculation';

/** Job data payload for health score recalculation */
export interface HealthScoreJobData {
  tenantId: string;
}

/**
 * Create the health score recalculation queue.
 *
 * @param connection - Redis connection options
 * @returns The BullMQ Queue instance
 */
export function createHealthScoreQueue(
  connection: ConnectionOptions,
): Queue<HealthScoreJobData> {
  return new Queue<HealthScoreJobData>(HEALTH_SCORE_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: {
        count: 500,
      },
    },
  });
}
