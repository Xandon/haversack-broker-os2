import type { PrismaClient } from '@prisma/client';
import type {
  DashboardDateQuery,
  TeamDashboardResponse,
  RepRanking,
  MonthlyRevenue,
  PipelineForecastResponse,
  StageForecast,
  TerritoryRevenue,
} from '@haversack/shared';
import { resolveDateRange, formatDateRangeForResponse } from './dashboard-date.util';

export async function getTeamDashboard(
  prisma: PrismaClient,
  tenantId: string,
  dateQuery: DashboardDateQuery,
): Promise<TeamDashboardResponse> {
  const period = dateQuery.period ?? 'current_month';
  const range = resolveDateRange(period, dateQuery.start_date, dateQuery.end_date);

  // Get all reps (including inactive for historical context)
  const reps = await prisma.user.findMany({
    where: {
      tenantId,
      role: 'rep',
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  // Get orders, activities, and opportunities for the period
  const [orders, activities, opportunities] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        status: 'confirmed',
        createdAt: { gte: range.start, lt: range.end },
      },
      select: {
        repId: true,
        total: true,
      },
    }),
    prisma.activity.findMany({
      where: {
        tenantId,
        createdAt: { gte: range.start, lt: range.end },
      },
      select: {
        userId: true,
      },
    }),
    prisma.opportunity.findMany({
      where: {
        tenantId,
        isActive: true,
        stage: { notIn: ['closed_won', 'closed_lost'] },
      },
      select: {
        repId: true,
        estimatedValue: true,
        probability: true,
      },
    }),
  ]);

  // Build per-rep aggregations
  const repData: Map<string, { revenue: number; orderCount: number; activityCount: number; pipelineValue: number }> = new Map();

  for (const rep of reps) {
    repData.set(rep.id, { revenue: 0, orderCount: 0, activityCount: 0, pipelineValue: 0 });
  }

  for (const order of orders) {
    const entry = repData.get(order.repId);
    if (entry) {
      entry.revenue += Number(order.total);
      entry.orderCount += 1;
    }
  }

  for (const activity of activities) {
    const entry = repData.get(activity.userId);
    if (entry) {
      entry.activityCount += 1;
    }
  }

  for (const opp of opportunities) {
    const entry = repData.get(opp.repId);
    if (entry) {
      const weighted = (Number(opp.estimatedValue) * Number(opp.probability)) / 100;
      entry.pipelineValue += weighted;
    }
  }

  // Build rankings sorted by revenue descending
  const repRankings: RepRanking[] = reps
    .map((rep) => {
      const data = repData.get(rep.id)!;
      return {
        repId: rep.id,
        repName: `${rep.firstName} ${rep.lastName}`,
        isActive: rep.isActive,
        revenue: Math.round(data.revenue * 100) / 100,
        orderCount: data.orderCount,
        activityCount: data.activityCount,
        pipelineValue: Math.round(data.pipelineValue * 100) / 100,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Calculate totals
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalActivities = 0;
  let totalPipelineValue = 0;
  let activeRepCount = 0;

  for (const ranking of repRankings) {
    totalRevenue += ranking.revenue;
    totalOrders += ranking.orderCount;
    totalActivities += ranking.activityCount;
    totalPipelineValue += ranking.pipelineValue;
    if (ranking.isActive) activeRepCount += 1;
  }

  const hasData = totalRevenue > 0 || totalOrders > 0 || totalActivities > 0;

  return {
    repRankings,
    totals: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      totalActivities,
      totalPipelineValue: Math.round(totalPipelineValue * 100) / 100,
      activeRepCount,
    },
    hasData,
    period: formatDateRangeForResponse(range),
  };
}

export async function getRevenueByMonth(
  prisma: PrismaClient,
  tenantId: string,
  months: number = 12,
): Promise<MonthlyRevenue[]> {
  const now = new Date();
  const result: MonthlyRevenue[] = [];

  for (let i = months; i >= 1; i--) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const targetDate = new Date(Date.UTC(year, month - i, 1));
    const nextMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 1));

    const revenue = await prisma.order.aggregate({
      where: {
        tenantId,
        status: 'confirmed',
        createdAt: { gte: targetDate, lt: nextMonth },
      },
      _sum: { total: true },
    });

    const monthStr = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, '0')}`;
    result.push({
      month: monthStr,
      revenue: Math.round(Number(revenue._sum.total ?? 0) * 100) / 100,
    });
  }

  return result;
}

export async function getPipelineForecast(
  prisma: PrismaClient,
  tenantId: string,
): Promise<PipelineForecastResponse> {
  const openStages = ['prospect', 'qualified', 'proposal', 'negotiation'];

  const opportunities = await prisma.opportunity.findMany({
    where: {
      tenantId,
      isActive: true,
      stage: { in: openStages },
    },
    select: {
      stage: true,
      estimatedValue: true,
      probability: true,
    },
  });

  const stageMap: Record<string, { count: number; totalValue: number; weightedValue: number }> = {};
  for (const stage of openStages) {
    stageMap[stage] = { count: 0, totalValue: 0, weightedValue: 0 };
  }

  let totalWeightedForecast = 0;
  let totalOpenValue = 0;

  for (const opp of opportunities) {
    const stage = opp.stage as string;
    const value = Number(opp.estimatedValue);
    const prob = Number(opp.probability);
    const weighted = (value * prob) / 100;

    if (stageMap[stage]) {
      stageMap[stage]!.count += 1;
      stageMap[stage]!.totalValue += value;
      stageMap[stage]!.weightedValue += weighted;
    }

    totalWeightedForecast += weighted;
    totalOpenValue += value;
  }

  const stages: StageForecast[] = openStages.map((stage) => ({
    stage,
    count: stageMap[stage]!.count,
    totalValue: Math.round(stageMap[stage]!.totalValue * 100) / 100,
    weightedValue: Math.round(stageMap[stage]!.weightedValue * 100) / 100,
  }));

  return {
    stages,
    totalWeightedForecast: Math.round(totalWeightedForecast * 100) / 100,
    totalOpenValue: Math.round(totalOpenValue * 100) / 100,
  };
}

export async function getTerritoryRevenue(
  prisma: PrismaClient,
  tenantId: string,
  dateQuery: DashboardDateQuery,
): Promise<TerritoryRevenue[]> {
  const period = dateQuery.period ?? 'current_month';
  const range = resolveDateRange(period, dateQuery.start_date, dateQuery.end_date);

  // Get all territories
  const territories = await prisma.territory.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      _count: { select: { accounts: true } },
    },
  });

  // Get orders grouped by account territory
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: 'confirmed',
      createdAt: { gte: range.start, lt: range.end },
    },
    select: {
      total: true,
      account: { select: { territoryId: true } },
    },
  });

  // Aggregate by territory
  const territoryData: Map<string, { revenue: number; orderCount: number }> = new Map();
  for (const territory of territories) {
    territoryData.set(territory.id, { revenue: 0, orderCount: 0 });
  }

  for (const order of orders) {
    const tid = order.account?.territoryId;
    if (tid && territoryData.has(tid)) {
      const entry = territoryData.get(tid)!;
      entry.revenue += Number(order.total);
      entry.orderCount += 1;
    }
  }

  return territories.map((t) => {
    const data = territoryData.get(t.id)!;
    return {
      territoryId: t.id,
      territoryName: t.name,
      revenue: Math.round(data.revenue * 100) / 100,
      orderCount: data.orderCount,
      accountCount: t._count.accounts,
    };
  });
}
