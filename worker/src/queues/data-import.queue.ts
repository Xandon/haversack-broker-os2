export const DATA_IMPORT_QUEUE_NAME = 'data-import';

export const MAX_RETRIES = 3;

export interface DataImportJobData {
  importId: string;
  tenantId: string;
  triggeredBy: string;
  triggeredAt: string;
}
