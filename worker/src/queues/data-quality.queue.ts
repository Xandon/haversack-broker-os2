/**
 * Data quality scorecard queue definition.
 * Calculates nightly data quality metrics (FR-033).
 */
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

export const DATA_QUALITY_QUEUE_NAME = 'data-quality-scorecard';

export interface DataQualityJobData {
  tenantId: string;
}

export function createDataQualityQueue(
  connection: ConnectionOptions,
): Queue<DataQualityJobData> {
  return new Queue<DataQualityJobData>(DATA_QUALITY_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 25 },
    },
  });
}
