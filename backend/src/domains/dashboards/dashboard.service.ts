import { PrismaClient } from '@prisma/client';

export interface RepKpiData {
  currentMonthRevenue: number;
  trailingTwelveMonthRevenue: number;
  accountsManaged: number;
  activitiesThisMonth: number;
  openOpportunities: number;
  weightedPipelineValue: number;
  commissionMtd: number;
  commissionYtd: number;
  healthDistribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
}

export interface RepRanking {
  repId: string;
  repName: string;
  isActive: boolean;
  revenue: number;
  orderCount: number;
  activityCount: number;
  pipelineValue: number;
}

export interface TeamDashboardData {
  monthlyRevenue: { month: string; revenue: number }[];
  repRankings: RepRanking[];
  totalTeamRevenue: number;
  totalOrders: number;
}

export function createDashboardService(prisma: PrismaClient) {
  return {
    async getRepKpi(tenantId: string, repId: string): Promise<RepKpiData> {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const [accounts, opportunities, commissions] = await Promise.all([
        prisma.account.findMany({
          where: { tenantId, assignedRepId: repId, deletedAt: null, isActive: true },
          select: { healthScore: true },
        }),
        prisma.opportunity.findMany({
          where: {
            tenantId,
            assignedRepId: repId,
            deletedAt: null,
            stage: { in: ['prospecting', 'qualified', 'proposal', 'negotiation'] },
          },
          select: { estimatedValue: true, weightedValue: true },
        }),
        prisma.commission.findMany({
          where: {
            tenantId,
            repId,
            period: { startsWith: String(currentYear) },
          },
          select: { amount: true, period: true },
        }),
      ]);

      const currentPeriod = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const commissionMtd = commissions
        .filter((c) => c.period === currentPeriod)
        .reduce((sum, c) => sum + Number(c.amount), 0);
      const commissionYtd = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

      const healthDistribution = {
        healthy: accounts.filter((a) => (a.healthScore ?? 100) >= 70).length,
        atRisk: accounts.filter((a) => (a.healthScore ?? 100) >= 40 && (a.healthScore ?? 100) < 70)
          .length,
        critical: accounts.filter((a) => (a.healthScore ?? 100) < 40).length,
      };

      return {
        currentMonthRevenue: 0,
        trailingTwelveMonthRevenue: 0,
        accountsManaged: accounts.length,
        activitiesThisMonth: 0,
        openOpportunities: opportunities.length,
        weightedPipelineValue: opportunities.reduce((sum, o) => sum + Number(o.weightedValue), 0),
        commissionMtd,
        commissionYtd,
        healthDistribution,
      };
    },

    async getTeamDashboard(
      tenantId: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      dateRange?: { start: string; end: string },
    ): Promise<TeamDashboardData> {
      const reps = await prisma.user.findMany({
        where: { tenantId, role: 'rep' },
        select: { id: true, firstName: true, lastName: true, isActive: true },
      });

      const repRankings: RepRanking[] = reps.map((rep) => ({
        repId: rep.id,
        repName: `${rep.firstName} ${rep.lastName}`,
        isActive: rep.isActive,
        revenue: 0,
        orderCount: 0,
        activityCount: 0,
        pipelineValue: 0,
      }));

      repRankings.sort((a, b) => b.revenue - a.revenue);

      return {
        monthlyRevenue: [],
        repRankings,
        totalTeamRevenue: 0,
        totalOrders: 0,
      };
    },
  };
}

export type DashboardService = ReturnType<typeof createDashboardService>;
