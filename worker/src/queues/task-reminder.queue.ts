/**
 * Task reminder queue definition.
 * Checks for tasks due within 24h and 1h windows and creates Notification records.
 */
import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

export const TASK_REMINDER_QUEUE_NAME = 'task-reminder';

/** Job data payload for task reminder processing */
export interface TaskReminderJobData {
  tenantId: string;
}

/**
 * Create the task reminder queue.
 *
 * @param connection - Redis connection options
 * @returns The BullMQ Queue instance
 */
export function createTaskReminderQueue(
  connection: ConnectionOptions,
): Queue<TaskReminderJobData> {
  return new Queue<TaskReminderJobData>(TASK_REMINDER_QUEUE_NAME, {
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
