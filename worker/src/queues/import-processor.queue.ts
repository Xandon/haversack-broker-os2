/**
 * Import processor queue definition.
 * Processes CSV/XLSX file imports asynchronously (FR-031).
 */
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

export const IMPORT_PROCESSOR_QUEUE_NAME = 'import-processor';

export interface ImportProcessorJobData {
  tenantId: string;
  importJobId: string;
  importValidOnly: boolean;
}

export function createImportProcessorQueue(
  connection: ConnectionOptions,
): Queue<ImportProcessorJobData> {
  return new Queue<ImportProcessorJobData>(IMPORT_PROCESSOR_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
}
