import type { PrismaClient } from '@prisma/client';

export interface HealthScoreFactors {
  daysSinceLastActivity: { value: number; score: number; weight: number };
  orderFrequency: { value: number; score: number; weight: number };
  orderValueTrend: { value: number; score: number; weight: number };
  contactEngagement: { value: number; score: number; weight: number };
}

export interface HealthScoreResult {
  accountId: string;
  score: number;
  factorBreakdown: HealthScoreFactors;
}

const WEIGHTS = {
  daysSinceLastActivity: 0.30,
  orderFrequency: 0.25,
  orderValueTrend: 0.25,
  contactEngagement: 0.20,
} as const;

const BASELINE_SCORE = 50;

/**
 * Calculate factor score for days since last activity.
 * 0 days = 100, 30 days = 50, 60+ days = 0
 */
export function scoreDaysSinceActivity(days: number): number {
  if (days <= 0) return 100;
  if (days >= 60) return 0;
  return Math.round(100 - (days * 100 / 60));
}

/**
 * Calculate factor score for order frequency.
 * ratio = current frequency / historical average
 * ratio >= 1.5 = 100, ratio = 1.0 = 75, ratio = 0.5 = 50, ratio = 0 = 0
 */
export function scoreOrderFrequency(ratio: number): number {
  if (ratio <= 0) return 0;
  if (ratio >= 1.5) return 100;
  return Math.round((ratio / 1.5) * 100);
}

/**
 * Calculate factor score for order value trend.
 * trend >= 1.2 = 100, trend = 1.0 = 80, trend = 0.5 = 40, trend = 0 = 0
 */
export function scoreOrderValueTrend(trend: number): number {
  if (trend <= 0) return 0;
  if (trend >= 1.2) return 100;
  return Math.round((trend / 1.2) * 100);
}

/**
 * Calculate factor score for contact engagement recency.
 * 0 days = 100, 14 days = 75, 30 days = 50, 60+ days = 0
 */
export function scoreContactEngagement(daysSinceContact: number): number {
  if (daysSinceContact <= 0) return 100;
  if (daysSinceContact >= 60) return 0;
  return Math.round(100 - (daysSinceContact * 100 / 60));
}

export function calculateHealthScore(
  daysSinceLastActivity: number,
  orderFrequencyRatio: number,
  orderValueTrend: number,
  daysSinceContactEngagement: number,
): HealthScoreResult {
  const factors: HealthScoreFactors = {
    daysSinceLastActivity: {
      value: daysSinceLastActivity,
      score: scoreDaysSinceActivity(daysSinceLastActivity),
      weight: WEIGHTS.daysSinceLastActivity,
    },
    orderFrequency: {
      value: orderFrequencyRatio,
      score: scoreOrderFrequency(orderFrequencyRatio),
      weight: WEIGHTS.orderFrequency,
    },
    orderValueTrend: {
      value: orderValueTrend,
      score: scoreOrderValueTrend(orderValueTrend),
      weight: WEIGHTS.orderValueTrend,
    },
    contactEngagement: {
      value: daysSinceContactEngagement,
      score: scoreContactEngagement(daysSinceContactEngagement),
      weight: WEIGHTS.contactEngagement,
    },
  };

  const weightedScore = Math.round(
    factors.daysSinceLastActivity.score * factors.daysSinceLastActivity.weight +
    factors.orderFrequency.score * factors.orderFrequency.weight +
    factors.orderValueTrend.score * factors.orderValueTrend.weight +
    factors.contactEngagement.score * factors.contactEngagement.weight,
  );

  const score = Math.max(0, Math.min(100, weightedScore));

  return {
    accountId: '',
    score,
    factorBreakdown: factors,
  };
}

/**
 * Process a batch of accounts for health score calculation.
 * For accounts with no data, returns baseline score of 50.
 */
export async function processHealthScoreBatch(
  prisma: PrismaClient,
  tenantId: string,
): Promise<HealthScoreResult[]> {
  // Get all active, non-deleted accounts for the tenant
  const accounts = await prisma.account.findMany({
    where: { tenantId, deletedAt: null, isActive: true },
    select: { id: true, createdAt: true },
  });

  const results: HealthScoreResult[] = [];
  const now = new Date();

  for (const account of accounts) {
    // For now, since we don't have activities/orders tables yet,
    // calculate based on account age. New accounts get baseline 50.
    const daysSinceCreated = Math.floor(
      (now.getTime() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Default values for factors when no activity/order data exists
    const result = calculateHealthScore(
      daysSinceCreated, // days since last activity (using creation date as proxy)
      0, // no order frequency data yet
      0, // no order value trend yet
      daysSinceCreated, // contact engagement (using creation date as proxy)
    );

    // New accounts (created within last 24h) get baseline score
    if (daysSinceCreated < 1) {
      result.score = BASELINE_SCORE;
    }

    result.accountId = account.id;
    results.push(result);

    // Update account with new health score
    await prisma.account.update({
      where: { id: account.id },
      data: {
        healthScore: result.score,
        healthScoreCalculatedAt: now,
      },
    });

    // Write health score history
    await prisma.accountHealthScore.create({
      data: {
        tenantId,
        accountId: account.id,
        score: result.score,
        factorBreakdown: result.factorBreakdown as Record<string, unknown>,
        calculatedAt: now,
      },
    });
  }

  return results;
}
