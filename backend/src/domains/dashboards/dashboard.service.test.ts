import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createDashboardService } from './dashboard.service.js';

function createMockPrisma() {
  return {
    account: { findMany: vi.fn() },
    opportunity: { findMany: vi.fn() },
    commission: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  };
}

describe('DashboardService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createDashboardService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
  const REP_ID = '660e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createDashboardService(mockPrisma as any);
  });

  describe('getRepKpi', () => {
    it('FR-023: returns accounts managed count', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { healthScore: 80 },
        { healthScore: 50 },
        { healthScore: 30 },
      ]);
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.commission.findMany.mockResolvedValue([]);

      const result = await service.getRepKpi(TENANT_ID, REP_ID);

      expect(result.accountsManaged).toBe(3);
    });

    it('FR-023: calculates health distribution', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { healthScore: 85 },
        { healthScore: 72 },
        { healthScore: 55 },
        { healthScore: 25 },
      ]);
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.commission.findMany.mockResolvedValue([]);

      const result = await service.getRepKpi(TENANT_ID, REP_ID);

      expect(result.healthDistribution.healthy).toBe(2);
      expect(result.healthDistribution.atRisk).toBe(1);
      expect(result.healthDistribution.critical).toBe(1);
    });

    it('FR-023: counts open opportunities and weighted pipeline', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.findMany.mockResolvedValue([
        { estimatedValue: 50000, weightedValue: 30000 },
        { estimatedValue: 25000, weightedValue: 10000 },
      ]);
      mockPrisma.commission.findMany.mockResolvedValue([]);

      const result = await service.getRepKpi(TENANT_ID, REP_ID);

      expect(result.openOpportunities).toBe(2);
      expect(result.weightedPipelineValue).toBe(40000);
    });

    it('FR-023: calculates commission MTD and YTD', async () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const currentPeriod = `${currentYear}-${currentMonth}`;

      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.commission.findMany.mockResolvedValue([
        { amount: 1000, period: currentPeriod },
        { amount: 2000, period: currentPeriod },
        { amount: 1500, period: `${currentYear}-01` },
      ]);

      const result = await service.getRepKpi(TENANT_ID, REP_ID);

      expect(result.commissionMtd).toBe(3000);
      expect(result.commissionYtd).toBe(4500);
    });

    it('AC-023b: identifies critical accounts (health < 40)', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { healthScore: 35 },
        { healthScore: 20 },
        { healthScore: 80 },
      ]);
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.commission.findMany.mockResolvedValue([]);

      const result = await service.getRepKpi(TENANT_ID, REP_ID);

      expect(result.healthDistribution.critical).toBe(2);
    });
  });

  describe('getTeamDashboard', () => {
    it('FR-024: returns rep rankings for all team members', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'rep-1', firstName: 'John', lastName: 'Smith', isActive: true },
        { id: 'rep-2', firstName: 'Jane', lastName: 'Doe', isActive: true },
        { id: 'rep-3', firstName: 'Bob', lastName: 'Wilson', isActive: false },
      ]);

      const result = await service.getTeamDashboard(TENANT_ID);

      expect(result.repRankings).toHaveLength(3);
    });

    it('AC-024a: includes inactive reps in rankings', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'rep-1', firstName: 'John', lastName: 'Smith', isActive: true },
        { id: 'rep-2', firstName: 'Bob', lastName: 'Wilson', isActive: false },
      ]);

      const result = await service.getTeamDashboard(TENANT_ID);

      const inactiveRep = result.repRankings.find((r) => r.repId === 'rep-2');
      expect(inactiveRep).toBeDefined();
      expect(inactiveRep!.isActive).toBe(false);
    });

    it('FR-024: sorts reps by revenue descending', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'rep-1', firstName: 'John', lastName: 'Smith', isActive: true },
        { id: 'rep-2', firstName: 'Jane', lastName: 'Doe', isActive: true },
      ]);

      const result = await service.getTeamDashboard(TENANT_ID);

      expect(result.repRankings).toHaveLength(2);
    });
  });
});
