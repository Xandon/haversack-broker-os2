export const DATA_QUALITY_SCORE_QUEUE_NAME = 'data-quality-score';
export const DATA_QUALITY_SCORE_CRON = '0 3 * * *'; // 03:00 UTC daily

export interface DataQualityScoreJobData {
  tenantId: string;
  triggeredBy: string;
  triggeredAt: string;
}
