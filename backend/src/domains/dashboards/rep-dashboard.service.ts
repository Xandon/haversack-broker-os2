import type { PrismaClient } from '@prisma/client';
import type { DashboardDateQuery, RepDashboardResponse, CriticalAccountResponse } from '@haversack/shared';
import { resolveDateRange, resolveTrailing12Months, formatDateRangeForResponse } from './dashboard-date.util';

export async function getRepDashboard(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  dateQuery: DashboardDateQuery,
): Promise<RepDashboardResponse> {
  const period = dateQuery.period ?? 'current_month';
  const range = resolveDateRange(period, dateQuery.start_date, dateQuery.end_date);
  const trailing12 = resolveTrailing12Months();

  // Find accounts belonging to the rep's territory
  const userTerritories = await prisma.userTerritory.findMany({
    where: { userId },
    select: { territoryId: true },
  });
  const territoryIds = userTerritories.map((ut) => ut.territoryId);

  // Run all queries in parallel
  const [
    currentMonthRevenue,
    trailing12Revenue,
    activityCount,
    openOpportunities,
    commissionCurrentMonth,
    commissionYtd,
    healthCounts,
  ] = await Promise.all([
    // 1. Current period revenue (confirmed orders)
    prisma.order.aggregate({
      where: {
        tenantId,
        repId: userId,
        status: 'confirmed',
        createdAt: { gte: range.start, lt: range.end },
      },
      _sum: { total: true },
    }),

    // 2. Trailing 12-month revenue
    prisma.order.aggregate({
      where: {
        tenantId,
        repId: userId,
        status: 'confirmed',
        createdAt: { gte: trailing12.start, lt: trailing12.end },
      },
      _sum: { total: true },
    }),

    // 3. Current month activity count
    prisma.activity.count({
      where: {
        tenantId,
        userId,
        createdAt: { gte: range.start, lt: range.end },
      },
    }),

    // 4. Open opportunities (count + weighted pipeline value)
    prisma.opportunity.findMany({
      where: {
        tenantId,
        repId: userId,
        isActive: true,
        stage: { notIn: ['closed_won', 'closed_lost'] },
      },
      select: {
        estimatedValue: true,
        probability: true,
      },
    }),

    // 5. Current month commission
    prisma.commissionEntry.aggregate({
      where: {
        tenantId,
        repId: userId,
        calculatedAt: { gte: range.start, lt: range.end },
      },
      _sum: { commissionAmount: true },
    }),

    // 6. YTD commission
    prisma.commissionEntry.aggregate({
      where: {
        tenantId,
        repId: userId,
        calculatedAt: {
          gte: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
          lt: range.end,
        },
      },
      _sum: { commissionAmount: true },
    }),

    // 7. Account health distribution
    getAccountHealthDistribution(prisma, tenantId, territoryIds),
  ]);

  // Calculate weighted pipeline value
  let weightedPipelineValue = 0;
  for (const opp of openOpportunities) {
    const value = Number(opp.estimatedValue);
    const prob = Number(opp.probability);
    weightedPipelineValue += (value * prob) / 100;
  }

  const hasData = Number(currentMonthRevenue._sum.total ?? 0) > 0
    || Number(trailing12Revenue._sum.total ?? 0) > 0
    || activityCount > 0
    || openOpportunities.length > 0;

  return {
    revenue: {
      currentMonth: Math.round(Number(currentMonthRevenue._sum.total ?? 0) * 100) / 100,
      trailing12Months: Math.round(Number(trailing12Revenue._sum.total ?? 0) * 100) / 100,
    },
    activities: {
      currentMonthCount: activityCount,
    },
    opportunities: {
      openCount: openOpportunities.length,
      weightedPipelineValue: Math.round(weightedPipelineValue * 100) / 100,
    },
    commissions: {
      currentMonth: Math.round(Number(commissionCurrentMonth._sum.commissionAmount ?? 0) * 100) / 100,
      ytd: Math.round(Number(commissionYtd._sum.commissionAmount ?? 0) * 100) / 100,
    },
    accountHealth: healthCounts,
    hasData,
    period: formatDateRangeForResponse(range),
  };
}

export async function getCriticalAccounts(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<CriticalAccountResponse[]> {
  const userTerritories = await prisma.userTerritory.findMany({
    where: { userId },
    select: { territoryId: true },
  });
  const territoryIds = userTerritories.map((ut) => ut.territoryId);

  if (territoryIds.length === 0) {
    return [];
  }

  const accounts = await prisma.account.findMany({
    where: {
      tenantId,
      territoryId: { in: territoryIds },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      territory: { select: { name: true } },
      healthScores: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
        select: { score: true },
      },
    },
  });

  const criticalAccounts = accounts
    .filter((a) => {
      const score = a.healthScores[0]?.score;
      return score !== undefined && score < 40;
    })
    .map((a) => ({
      id: a.id,
      name: a.name,
      healthScore: a.healthScores[0]?.score ?? 0,
      territory: a.territory?.name ?? 'Unknown',
    }))
    .sort((a, b) => a.healthScore - b.healthScore);

  return criticalAccounts;
}

async function getAccountHealthDistribution(
  prisma: PrismaClient,
  tenantId: string,
  territoryIds: string[],
): Promise<{ healthy: number; atRisk: number; critical: number }> {
  if (territoryIds.length === 0) {
    return { healthy: 0, atRisk: 0, critical: 0 };
  }

  const accounts = await prisma.account.findMany({
    where: {
      tenantId,
      territoryId: { in: territoryIds },
      deletedAt: null,
    },
    select: {
      healthScores: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
        select: { score: true },
      },
    },
  });

  let healthy = 0;
  let atRisk = 0;
  let critical = 0;

  for (const account of accounts) {
    const score = account.healthScores[0]?.score;
    if (score === undefined) {
      continue; // No health score yet
    }
    if (score >= 70) {
      healthy += 1;
    } else if (score >= 40) {
      atRisk += 1;
    } else {
      critical += 1;
    }
  }

  return { healthy, atRisk, critical };
}
