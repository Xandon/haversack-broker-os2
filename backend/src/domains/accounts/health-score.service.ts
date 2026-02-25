/**
 * Health score calculation service.
 * Computes a 0-100 engagement metric for each account based on:
 * - Recent activity count (last 30 days) — 40% weight
 * - Order recency (days since last order) — 30% weight
 * - Contact completeness (email, phone, primary contact) — 15% weight
 * - Account completeness (optional fields filled) — 15% weight
 *
 * Health scores are recalculated nightly at 02:00 UTC (FR-006).
 */
import type { PrismaClient, Account } from '@prisma/client';

import { logger } from '../../shared/utils/logger.js';

/** Weight configuration for health score factors */
const ACTIVITY_WEIGHT = 0.4;
const ORDER_RECENCY_WEIGHT = 0.3;
const CONTACT_COMPLETENESS_WEIGHT = 0.15;
const ACCOUNT_COMPLETENESS_WEIGHT = 0.15;

/** Maximum activity count that earns full marks (cap at 10 activities in 30 days) */
const MAX_ACTIVITY_COUNT = 10;

/** Maximum days since last order before score drops to zero */
const MAX_ORDER_RECENCY_DAYS = 180;

/** Result of a health score calculation */
export interface HealthScoreResult {
  score: number;
  factors: {
    activityScore: number;
    orderRecencyScore: number;
    contactCompletenessScore: number;
    accountCompletenessScore: number;
  };
}

/** Summary of a batch recalculation */
export interface BatchRecalcResult {
  totalAccounts: number;
  updatedAccounts: number;
  averageScore: number;
  duration: number;
}

/**
 * Calculate the activity factor score (0-100).
 * Counts activities in the last 30 days, capped at MAX_ACTIVITY_COUNT.
 */
export function calculateActivityScore(activityCount: number): number {
  const capped = Math.min(activityCount, MAX_ACTIVITY_COUNT);
  return Math.round((capped / MAX_ACTIVITY_COUNT) * 100);
}

/**
 * Calculate the order recency factor score (0-100).
 * Scores 100 for an order today, linearly declining to 0 at MAX_ORDER_RECENCY_DAYS.
 * Returns 0 if no orders exist.
 */
export function calculateOrderRecencyScore(daysSinceLastOrder: number | null): number {
  if (daysSinceLastOrder === null) {
    return 0;
  }
  if (daysSinceLastOrder <= 0) {
    return 100;
  }
  if (daysSinceLastOrder >= MAX_ORDER_RECENCY_DAYS) {
    return 0;
  }
  return Math.round(((MAX_ORDER_RECENCY_DAYS - daysSinceLastOrder) / MAX_ORDER_RECENCY_DAYS) * 100);
}

/**
 * Calculate contact completeness score (0-100).
 * Checks: has at least one contact, has primary contact, has email, has phone.
 */
export function calculateContactCompletenessScore(contacts: {
  hasPrimaryContact: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  contactCount: number;
}): number {
  if (contacts.contactCount === 0) {
    return 0;
  }

  let score = 25; // Base: at least one contact exists
  if (contacts.hasPrimaryContact) score += 25;
  if (contacts.hasEmail) score += 25;
  if (contacts.hasPhone) score += 25;

  return score;
}

/**
 * Calculate account completeness score (0-100).
 * Checks optional fields: phone, email, website, notes, tags.
 */
export function calculateAccountCompletenessScore(account: {
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  tags: string[];
}): number {
  const fields = [
    account.phone !== null && account.phone.length > 0,
    account.email !== null && account.email.length > 0,
    account.website !== null && account.website.length > 0,
    account.notes !== null && account.notes.length > 0,
    account.tags.length > 0,
  ];

  const filledCount = fields.filter(Boolean).length;
  return Math.round((filledCount / fields.length) * 100);
}

/**
 * Calculate the overall health score for a single account.
 * Returns a score between 0 and 100 along with individual factor scores.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param accountId - The account to calculate the score for
 * @returns The health score result, or null if the account is not found
 */
export async function calculateHealthScore(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<HealthScoreResult | null> {
  // Fetch the account with contacts
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenant_id: tenantId,
      deleted_at: null,
    },
    include: {
      contacts: {
        where: { deleted_at: null },
        select: {
          is_primary: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!account) {
    return null;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Count recent activities (last 30 days)
  const activityCount = await prisma.activity.count({
    where: {
      tenant_id: tenantId,
      account_id: accountId,
      occurred_at: { gte: thirtyDaysAgo },
    },
  });

  // Find most recent order
  const lastOrder = await prisma.order.findFirst({
    where: {
      tenant_id: tenantId,
      account_id: accountId,
    },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  });

  const daysSinceLastOrder = lastOrder
    ? Math.floor((now.getTime() - lastOrder.created_at.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate individual factor scores
  const activityScore = calculateActivityScore(activityCount);
  const orderRecencyScore = calculateOrderRecencyScore(daysSinceLastOrder);

  const contactCompletenessScore = calculateContactCompletenessScore({
    hasPrimaryContact: account.contacts.some((c) => c.is_primary),
    hasEmail: account.contacts.some((c) => c.email !== null && c.email.length > 0),
    hasPhone: account.contacts.some((c) => c.phone !== null && c.phone.length > 0),
    contactCount: account.contacts.length,
  });

  const accountCompletenessScore = calculateAccountCompletenessScore({
    phone: account.phone,
    email: account.email,
    website: account.website,
    notes: account.notes,
    tags: account.tags,
  });

  // Weighted overall score
  const score = Math.round(
    activityScore * ACTIVITY_WEIGHT +
      orderRecencyScore * ORDER_RECENCY_WEIGHT +
      contactCompletenessScore * CONTACT_COMPLETENESS_WEIGHT +
      accountCompletenessScore * ACCOUNT_COMPLETENESS_WEIGHT,
  );

  // Persist the score
  await prisma.account.update({
    where: { id: accountId },
    data: {
      health_score: score,
      health_score_calculated_at: now,
    },
  });

  logger.info(
    {
      operation: 'calculate-health-score',
      tenantId,
      accountId,
      score,
    },
    `Health score calculated: ${score}`,
  );

  return {
    score,
    factors: {
      activityScore,
      orderRecencyScore,
      contactCompletenessScore,
      accountCompletenessScore,
    },
  };
}

/**
 * Recalculate health scores for all active, non-deleted accounts in a tenant.
 * Intended to be called by the nightly BullMQ job at 02:00 UTC.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @returns Summary of the batch recalculation
 */
export async function recalculateAllHealthScores(
  prisma: PrismaClient,
  tenantId: string,
): Promise<BatchRecalcResult> {
  const startTime = performance.now();

  // Fetch all active, non-deleted account IDs for the tenant
  const accounts: Pick<Account, 'id'>[] = await prisma.account.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      is_active: true,
    },
    select: { id: true },
  });

  let updatedCount = 0;
  let totalScore = 0;

  for (const account of accounts) {
    const result = await calculateHealthScore(prisma, tenantId, account.id);
    if (result) {
      updatedCount++;
      totalScore += result.score;
    }
  }

  const duration = Math.round(performance.now() - startTime);
  const averageScore = updatedCount > 0 ? Math.round(totalScore / updatedCount) : 0;

  logger.info(
    {
      operation: 'recalculate-all-health-scores',
      tenantId,
      totalAccounts: accounts.length,
      updatedAccounts: updatedCount,
      averageScore,
      duration,
    },
    `Batch health score recalculation complete: ${updatedCount}/${accounts.length} accounts, avg=${averageScore}`,
  );

  return {
    totalAccounts: accounts.length,
    updatedAccounts: updatedCount,
    averageScore,
    duration,
  };
}
