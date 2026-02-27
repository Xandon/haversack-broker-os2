/**
 * Commission Statement Queue Configuration
 *
 * Defines the BullMQ queue for monthly commission statement generation.
 * Schedule: 1st of every month at 03:00 UTC (after health score at 02:00 UTC)
 *
 * This module exports the queue name and schedule configuration.
 * The actual worker connection is established in the worker entry point.
 */

export const COMMISSION_STATEMENT_QUEUE_NAME = 'commission-statement';

export const COMMISSION_STATEMENT_CRON = '0 3 1 * *'; // 1st of month at 03:00 UTC

export interface CommissionStatementJobData {
  tenantId: string;
  month: number;
  year: number;
  triggeredBy: 'cron' | 'manual';
  triggeredAt: string;
}
