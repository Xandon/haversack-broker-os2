export const QUICKBOOKS_EXPORT_QUEUE_NAME = 'quickbooks-export';

export const QUICKBOOKS_EXPORT_CRON = '0 * * * *'; // hourly

export const QUICKBOOKS_MAX_RETRIES = 3;

export interface QuickBooksExportJobData {
  tenantId: string;
  triggeredBy: string;
  triggeredAt: string;
}
