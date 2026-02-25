/**
 * Health score recalculation job processor.
 * BullMQ worker that recalculates health scores for all accounts in a tenant.
 * Designed to run nightly at 02:00 UTC via scheduled repeat.
 *
 * The recalculation logic is inlined here to avoid cross-package imports
 * between worker and backend (architecture boundary enforcement).
 */
import { Worker } from 'bullmq';
import type { ConnectionOptions, Job } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import pino from 'pino';

import {
  HEALTH_SCORE_QUEUE_NAME,
  type HealthScoreJobData,
} from '../queues/health-score.queue.js';

const logger = pino({ name: 'health-score-worker' });

/** Weight configuration for health score factors */
const ACTIVITY_WEIGHT = 0.4;
const ORDER_RECENCY_WEIGHT = 0.3;
const CONTACT_COMPLETENESS_WEIGHT = 0.15;
const ACCOUNT_COMPLETENESS_WEIGHT = 0.15;
const MAX_ACTIVITY_COUNT = 10;
const MAX_ORDER_RECENCY_DAYS = 180;

/**
 * Calculate health score for a single account and persist it.
 */
async function calculateAndPersistScore(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<number | null> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenant_id: tenantId, deleted_at: null },
    include: {
      contacts: {
        where: { deleted_at: null },
        select: { is_primary: true, email: true, phone: true },
      },
    },
  });

  if (!account) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const activityCount = await prisma.activity.count({
    where: {
      tenant_id: tenantId,
      account_id: accountId,
      occurred_at: { gte: thirtyDaysAgo },
    },
  });

  const lastOrder = await prisma.order.findFirst({
    where: { tenant_id: tenantId, account_id: accountId },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  });

  const daysSinceLastOrder = lastOrder
    ? Math.floor((now.getTime() - lastOrder.created_at.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Activity score (0-100)
  const activityScore = Math.round(
    (Math.min(activityCount, MAX_ACTIVITY_COUNT) / MAX_ACTIVITY_COUNT) * 100,
  );

  // Order recency score (0-100)
  let orderRecencyScore = 0;
  if (daysSinceLastOrder !== null) {
    if (daysSinceLastOrder <= 0) orderRecencyScore = 100;
    else if (daysSinceLastOrder < MAX_ORDER_RECENCY_DAYS) {
      orderRecencyScore = Math.round(
        ((MAX_ORDER_RECENCY_DAYS - daysSinceLastOrder) / MAX_ORDER_RECENCY_DAYS) * 100,
      );
    }
  }

  // Contact completeness score (0-100)
  let contactScore = 0;
  if (account.contacts.length > 0) {
    contactScore = 25;
    if (account.contacts.some((c) => c.is_primary)) contactScore += 25;
    if (account.contacts.some((c) => c.email !== null && c.email.length > 0)) contactScore += 25;
    if (account.contacts.some((c) => c.phone !== null && c.phone.length > 0)) contactScore += 25;
  }

  // Account completeness score (0-100)
  const optionalFields = [
    account.phone !== null && account.phone.length > 0,
    account.email !== null && account.email.length > 0,
    account.website !== null && account.website.length > 0,
    account.notes !== null && account.notes.length > 0,
    account.tags.length > 0,
  ];
  const accountScore = Math.round((optionalFields.filter(Boolean).length / optionalFields.length) * 100);

  // Weighted overall score
  const score = Math.round(
    activityScore * ACTIVITY_WEIGHT +
      orderRecencyScore * ORDER_RECENCY_WEIGHT +
      contactScore * CONTACT_COMPLETENESS_WEIGHT +
      accountScore * ACCOUNT_COMPLETENESS_WEIGHT,
  );

  await prisma.account.update({
    where: { id: accountId },
    data: { health_score: score, health_score_calculated_at: now },
  });

  return score;
}

/**
 * Process a health score recalculation job for a single tenant.
 */
async function processHealthScoreJob(
  prisma: PrismaClient,
  job: Job<HealthScoreJobData>,
): Promise<void> {
  const { tenantId } = job.data;
  const startTime = performance.now();

  logger.info(
    { tenantId, jobId: job.id },
    `Starting health score recalculation for tenant ${tenantId}`,
  );

  const accounts = await prisma.account.findMany({
    where: { tenant_id: tenantId, deleted_at: null, is_active: true },
    select: { id: true },
  });

  let updatedCount = 0;
  let totalScore = 0;

  for (const account of accounts) {
    const score = await calculateAndPersistScore(prisma, tenantId, account.id);
    if (score !== null) {
      updatedCount++;
      totalScore += score;
    }
  }

  const duration = Math.round(performance.now() - startTime);
  const averageScore = updatedCount > 0 ? Math.round(totalScore / updatedCount) : 0;

  logger.info(
    {
      tenantId,
      jobId: job.id,
      totalAccounts: accounts.length,
      updatedAccounts: updatedCount,
      averageScore,
      duration,
    },
    `Health score recalculation complete: ${updatedCount}/${accounts.length} accounts updated`,
  );
}

/**
 * Create and return the health score worker.
 *
 * @param connection - Redis connection options
 * @param prisma - PrismaClient instance for database access
 * @returns The BullMQ Worker instance
 */
export function createHealthScoreWorker(
  connection: ConnectionOptions,
  prisma: PrismaClient,
): Worker<HealthScoreJobData> {
  const worker = new Worker<HealthScoreJobData>(
    HEALTH_SCORE_QUEUE_NAME,
    async (job) => {
      await processHealthScoreJob(prisma, job);
    },
    {
      connection,
      concurrency: 1, // Process one tenant at a time
      limiter: {
        max: 1,
        duration: 60000, // Max 1 job per minute
      },
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Health score job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      'Health score job failed',
    );
  });

  return worker;
}
