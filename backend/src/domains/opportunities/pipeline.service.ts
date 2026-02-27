import type { PrismaClient } from '@prisma/client';
import type { PipelineSummaryQuery, WinLossQuery } from '@haversack/shared';
import { OPEN_STAGES } from './stage-defaults';
import type { OpportunityWithRelations } from './opportunity.service';
import { formatOpportunityResponse } from './opportunity.service';

export interface StageSummary {
  opportunities: Record<string, unknown>[];
  count: number;
  totalValue: number;
}

export interface PipelineSummaryResult {
  stages: Record<string, StageSummary>;
  forecast: {
    weightedTotal: number;
    totalOpenValue: number;
    opportunityCount: number;
  };
}

export interface WinLossResult {
  totalWon: number;
  totalLost: number;
  winRate: number;
  averageWonDealSize: number;
  averageSalesCycleDays: number;
  topCloseReasons: Array<{ reason: string; count: number; percentage: number }>;
}

export async function getPipelineSummary(
  prisma: PrismaClient,
  tenantId: string,
  query: PipelineSummaryQuery,
  scopedRepId?: string,
): Promise<PipelineSummaryResult> {
  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
    stage: { in: [...OPEN_STAGES] },
  };

  if (scopedRepId) {
    where['repId'] = scopedRepId;
  } else if (query.repId) {
    where['repId'] = query.repId;
  }

  if (query.accountId) where['accountId'] = query.accountId;

  if (query.dateFrom || query.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (query.dateFrom) dateFilter['gte'] = new Date(query.dateFrom);
    if (query.dateTo) dateFilter['lte'] = new Date(query.dateTo);
    where['expectedCloseDate'] = dateFilter;
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
      rep: { select: { id: true, firstName: true, lastName: true } },
      brands: { select: { brand: { select: { id: true, name: true } } } },
    },
    orderBy: { expectedCloseDate: 'asc' },
  });

  const stages: Record<string, StageSummary> = {};
  for (const stage of OPEN_STAGES) {
    stages[stage] = { opportunities: [], count: 0, totalValue: 0 };
  }

  let weightedTotal = 0;
  let totalOpenValue = 0;

  for (const opp of opportunities) {
    const stage = opp.stage as string;
    const formatted = formatOpportunityResponse(opp as OpportunityWithRelations);
    const estimatedValue = Number(opp.estimatedValue);
    const probability = Number(opp.probability);
    const weighted = Math.round(estimatedValue * probability) / 100;

    if (stages[stage]) {
      stages[stage]!.opportunities.push(formatted);
      stages[stage]!.count += 1;
      stages[stage]!.totalValue += estimatedValue;
    }

    weightedTotal += weighted;
    totalOpenValue += estimatedValue;
  }

  return {
    stages,
    forecast: {
      weightedTotal: Math.round(weightedTotal * 100) / 100,
      totalOpenValue: Math.round(totalOpenValue * 100) / 100,
      opportunityCount: opportunities.length,
    },
  };
}

export async function getWinLossAnalytics(
  prisma: PrismaClient,
  tenantId: string,
  query: WinLossQuery,
  scopedRepId?: string,
): Promise<WinLossResult> {
  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
    stage: { in: ['closed_won', 'closed_lost'] },
    closedAt: {
      gte: new Date(query.dateFrom),
      lte: new Date(query.dateTo + 'T23:59:59.999Z'),
    },
  };

  if (scopedRepId) {
    where['repId'] = scopedRepId;
  } else if (query.repId) {
    where['repId'] = query.repId;
  }

  const closedOpps = await prisma.opportunity.findMany({
    where,
    select: {
      stage: true,
      estimatedValue: true,
      closeReason: true,
      createdAt: true,
      closedAt: true,
    },
  });

  const won = closedOpps.filter((o) => o.stage === 'closed_won');
  const lost = closedOpps.filter((o) => o.stage === 'closed_lost');
  const totalClosed = closedOpps.length;

  const totalWon = won.length;
  const totalLost = lost.length;
  const winRate = totalClosed > 0 ? Math.round((totalWon / totalClosed) * 10000) / 100 : 0;

  const averageWonDealSize = totalWon > 0
    ? Math.round(won.reduce((sum, o) => sum + Number(o.estimatedValue), 0) / totalWon * 100) / 100
    : 0;

  // Average sales cycle in days
  const cycleDays = closedOpps
    .filter((o) => o.closedAt)
    .map((o) => {
      const created = o.createdAt.getTime();
      const closed = o.closedAt!.getTime();
      return Math.round((closed - created) / (1000 * 60 * 60 * 24));
    });
  const averageSalesCycleDays = cycleDays.length > 0
    ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length)
    : 0;

  // Top close reasons (top 5)
  const reasonCounts: Record<string, number> = {};
  for (const opp of closedOpps) {
    const reason = opp.closeReason ?? 'No reason provided';
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }

  const topCloseReasons = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalClosed > 0 ? Math.round((count / totalClosed) * 10000) / 100 : 0,
    }));

  return {
    totalWon,
    totalLost,
    winRate,
    averageWonDealSize,
    averageSalesCycleDays,
    topCloseReasons,
  };
}
