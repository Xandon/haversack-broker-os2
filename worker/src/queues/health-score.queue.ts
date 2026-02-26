/**
 * Health Score Queue Configuration
 *
 * Defines the BullMQ queue for nightly health score calculation.
 * Schedule: Daily at 02:00 UTC
 *
 * This module exports the queue name and schedule configuration.
 * The actual worker connection is established in the worker entry point.
 */

export const HEALTH_SCORE_QUEUE_NAME = 'health-score-calculation';

export const HEALTH_SCORE_CRON = '0 2 * * *'; // Daily at 02:00 UTC

export interface HealthScoreJobData {
  tenantId: string;
  triggeredBy: 'cron' | 'manual';
  triggeredAt: string;
}
