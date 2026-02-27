/**
 * Commission Calculation Queue Configuration
 *
 * Defines the BullMQ queue for commission calculation when orders are confirmed.
 * Triggered when an order transitions to "confirmed" status.
 *
 * This module exports the queue name and configuration.
 * The actual worker connection is established in the worker entry point.
 */

export const COMMISSION_CALCULATION_QUEUE_NAME = 'commission-calculation';

export const COMMISSION_CALCULATION_MAX_RETRIES = 3;

export interface CommissionCalculationJobData {
  tenantId: string;
  orderId: string;
  triggeredBy: string;
  triggeredAt: string;
}
