import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  getTeamDashboard,
  getRevenueByMonth,
  getPipelineForecast,
  getTerritoryRevenue,
} from '../team-dashboard.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const REP1_ID = '00000000-0000-4000-a000-000000000021';
const REP2_ID = '00000000-0000-4000-a000-000000000022';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000030';

function createMockPrisma(): {
  prisma: PrismaClient;
  mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
} {
  const user = { findMany: vi.fn() };
  const order = { findMany: vi.fn(), aggregate: vi.fn() };
  const activity = { findMany: vi.fn() };
  const opportunity = { findMany: vi.fn() };
  const territory = { findMany: vi.fn() };

  return {
    prisma: { user, order, activity, opportunity, territory } as unknown as PrismaClient,
    mocks: { user, order, activity, opportunity, territory },
  };
}

describe('FR-024: Team dashboard service', () => {
  let prisma: PrismaClient;
  let mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    mocks = mock.mocks;
  });

  describe('getTeamDashboard', () => {
    test('AC-024a: returns rep rankings sorted by revenue descending', async () => {
      mocks['user']!['findMany']!.mockResolvedValue([
        { id: REP1_ID, firstName: 'Jane', lastName: 'Smith', isActive: true },
        { id: REP2_ID, firstName: 'Bob', lastName: 'Jones', isActive: true },
      ]);
      mocks['order']!['findMany']!.mockResolvedValue([
        { repId: REP1_ID, total: new Decimal('10000') },
        { repId: REP2_ID, total: new Decimal('25000') },
        { repId: REP1_ID, total: new Decimal('5000') },
      ]);
      mocks['activity']!['findMany']!.mockResolvedValue([
        { userId: REP1_ID },
        { userId: REP1_ID },
        { userId: REP2_ID },
      ]);
      mocks['opportunity']!['findMany']!.mockResolvedValue([
        { repId: REP1_ID, estimatedValue: new Decimal('50000'), probability: new Decimal('40') },
      ]);

      const result = await getTeamDashboard(prisma, TENANT_ID, { period: 'current_month' });

      expect(result.repRankings).toHaveLength(2);
      expect(result.repRankings[0]!.repName).toBe('Bob Jones');
      expect(result.repRankings[0]!.revenue).toBe(25000);
      expect(result.repRankings[1]!.repName).toBe('Jane Smith');
      expect(result.repRankings[1]!.revenue).toBe(15000);
      expect(result.repRankings[1]!.activityCount).toBe(2);
      expect(result.repRankings[1]!.pipelineValue).toBe(20000); // 50000*40/100
      expect(result.totals.totalRevenue).toBe(40000);
      expect(result.totals.totalOrders).toBe(3);
      expect(result.totals.activeRepCount).toBe(2);
      expect(result.hasData).toBe(true);
    });

    test('FR-024: includes inactive reps marked as inactive', async () => {
      mocks['user']!['findMany']!.mockResolvedValue([
        { id: REP1_ID, firstName: 'Jane', lastName: 'Smith', isActive: true },
        { id: REP2_ID, firstName: 'Bob', lastName: 'Jones', isActive: false },
      ]);
      mocks['order']!['findMany']!.mockResolvedValue([
        { repId: REP2_ID, total: new Decimal('10000') },
      ]);
      mocks['activity']!['findMany']!.mockResolvedValue([]);
      mocks['opportunity']!['findMany']!.mockResolvedValue([]);

      const result = await getTeamDashboard(prisma, TENANT_ID, { period: 'current_month' });

      const bob = result.repRankings.find((r) => r.repName === 'Bob Jones');
      expect(bob).toBeDefined();
      expect(bob!.isActive).toBe(false);
      expect(result.totals.activeRepCount).toBe(1);
    });

    test('FR-024: returns empty rankings when no reps exist', async () => {
      mocks['user']!['findMany']!.mockResolvedValue([]);
      mocks['order']!['findMany']!.mockResolvedValue([]);
      mocks['activity']!['findMany']!.mockResolvedValue([]);
      mocks['opportunity']!['findMany']!.mockResolvedValue([]);

      const result = await getTeamDashboard(prisma, TENANT_ID, { period: 'current_month' });

      expect(result.repRankings).toHaveLength(0);
      expect(result.hasData).toBe(false);
    });
  });

  describe('getRevenueByMonth', () => {
    test('FR-024: returns monthly revenue for trailing N months', async () => {
      mocks['order']!['aggregate']!
        .mockResolvedValueOnce({ _sum: { total: new Decimal('10000') } })
        .mockResolvedValueOnce({ _sum: { total: new Decimal('15000') } })
        .mockResolvedValueOnce({ _sum: { total: new Decimal('20000') } });

      const result = await getRevenueByMonth(prisma, TENANT_ID, 3);

      expect(result).toHaveLength(3);
      expect(result[0]!.revenue).toBe(10000);
      expect(result[1]!.revenue).toBe(15000);
      expect(result[2]!.revenue).toBe(20000);
      // Verify month format is YYYY-MM
      expect(result[0]!.month).toMatch(/^\d{4}-\d{2}$/);
    });

    test('FR-024: returns zero revenue for months with no orders', async () => {
      mocks['order']!['aggregate']!.mockResolvedValue({ _sum: { total: null } });

      const result = await getRevenueByMonth(prisma, TENANT_ID, 1);

      expect(result).toHaveLength(1);
      expect(result[0]!.revenue).toBe(0);
    });
  });

  describe('getPipelineForecast', () => {
    test('FR-024: returns opportunity counts and weighted values by stage', async () => {
      mocks['opportunity']!['findMany']!.mockResolvedValue([
        { stage: 'prospect', estimatedValue: new Decimal('100000'), probability: new Decimal('10') },
        { stage: 'qualified', estimatedValue: new Decimal('50000'), probability: new Decimal('40') },
        { stage: 'qualified', estimatedValue: new Decimal('30000'), probability: new Decimal('40') },
        { stage: 'proposal', estimatedValue: new Decimal('25000'), probability: new Decimal('60') },
      ]);

      const result = await getPipelineForecast(prisma, TENANT_ID);

      const prospect = result.stages.find((s) => s.stage === 'prospect');
      expect(prospect!.count).toBe(1);
      expect(prospect!.totalValue).toBe(100000);
      expect(prospect!.weightedValue).toBe(10000);

      const qualified = result.stages.find((s) => s.stage === 'qualified');
      expect(qualified!.count).toBe(2);
      expect(qualified!.totalValue).toBe(80000);
      expect(qualified!.weightedValue).toBe(32000);

      expect(result.totalOpenValue).toBe(205000);
      expect(result.totalWeightedForecast).toBe(57000); // 10000+20000+12000+15000
    });

    test('FR-024: excludes closed_won and closed_lost from forecast', async () => {
      mocks['opportunity']!['findMany']!.mockResolvedValue([]);

      const result = await getPipelineForecast(prisma, TENANT_ID);

      // Verify query excludes closed stages
      expect(mocks['opportunity']!['findMany']!).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stage: { in: ['prospect', 'qualified', 'proposal', 'negotiation'] },
          }),
        }),
      );
      expect(result.stages).toHaveLength(4);
      expect(result.totalWeightedForecast).toBe(0);
    });
  });

  describe('getTerritoryRevenue', () => {
    test('FR-024: returns revenue grouped by territory', async () => {
      mocks['territory']!['findMany']!.mockResolvedValue([
        { id: TERRITORY_ID, name: 'Portland Metro', _count: { accounts: 10 } },
      ]);
      mocks['order']!['findMany']!.mockResolvedValue([
        { total: new Decimal('15000'), account: { territoryId: TERRITORY_ID } },
        { total: new Decimal('10000'), account: { territoryId: TERRITORY_ID } },
      ]);

      const result = await getTerritoryRevenue(prisma, TENANT_ID, { period: 'current_month' });

      expect(result).toHaveLength(1);
      expect(result[0]!.territoryName).toBe('Portland Metro');
      expect(result[0]!.revenue).toBe(25000);
      expect(result[0]!.orderCount).toBe(2);
      expect(result[0]!.accountCount).toBe(10);
    });

    test('FR-024: shows territory with zero revenue', async () => {
      mocks['territory']!['findMany']!.mockResolvedValue([
        { id: TERRITORY_ID, name: 'Portland Metro', _count: { accounts: 5 } },
      ]);
      mocks['order']!['findMany']!.mockResolvedValue([]);

      const result = await getTerritoryRevenue(prisma, TENANT_ID, { period: 'current_month' });

      expect(result[0]!.revenue).toBe(0);
      expect(result[0]!.orderCount).toBe(0);
      expect(result[0]!.accountCount).toBe(5);
    });
  });
});
