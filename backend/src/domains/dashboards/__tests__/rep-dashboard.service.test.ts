import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getRepDashboard, getCriticalAccounts } from '../rep-dashboard.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000020';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000030';

function createMockPrisma(): {
  prisma: PrismaClient;
  mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
} {
  const userTerritory = { findMany: vi.fn() };
  const order = { aggregate: vi.fn() };
  const activity = { count: vi.fn() };
  const opportunity = { findMany: vi.fn() };
  const commissionEntry = { aggregate: vi.fn() };
  const account = { findMany: vi.fn() };

  return {
    prisma: {
      userTerritory,
      order,
      activity,
      opportunity,
      commissionEntry,
      account,
    } as unknown as PrismaClient,
    mocks: { userTerritory, order, activity, opportunity, commissionEntry, account },
  };
}

describe('FR-023: Rep dashboard service', () => {
  let prisma: PrismaClient;
  let mocks: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    mocks = mock.mocks;

    // Default: user has one territory
    mocks['userTerritory']!['findMany']!.mockResolvedValue([{ territoryId: TERRITORY_ID }]);
  });

  describe('getRepDashboard', () => {
    test('AC-023a: returns all 7 KPI sections with correct data', async () => {
      mocks['order']!['aggregate']!
        .mockResolvedValueOnce({ _sum: { total: new Decimal('45200.50') } }) // current month
        .mockResolvedValueOnce({ _sum: { total: new Decimal('523000.00') } }); // trailing 12
      mocks['activity']!['count']!.mockResolvedValue(47);
      mocks['opportunity']!['findMany']!.mockResolvedValue([
        { estimatedValue: new Decimal('50000'), probability: new Decimal('40') },
        { estimatedValue: new Decimal('30000'), probability: new Decimal('60') },
      ]);
      mocks['commissionEntry']!['aggregate']!
        .mockResolvedValueOnce({ _sum: { commissionAmount: new Decimal('3800.25') } }) // current month
        .mockResolvedValueOnce({ _sum: { commissionAmount: new Decimal('28500.00') } }); // ytd
      mocks['account']!['findMany']!.mockResolvedValue([
        { healthScores: [{ score: 85 }] },
        { healthScores: [{ score: 55 }] },
        { healthScores: [{ score: 30 }] },
      ]);

      const result = await getRepDashboard(prisma, TENANT_ID, USER_ID, {
        period: 'current_month',
      });

      expect(result.revenue.currentMonth).toBe(45200.50);
      expect(result.revenue.trailing12Months).toBe(523000.00);
      expect(result.activities.currentMonthCount).toBe(47);
      expect(result.opportunities.openCount).toBe(2);
      expect(result.opportunities.weightedPipelineValue).toBe(38000); // (50000*40/100) + (30000*60/100) = 20000 + 18000
      expect(result.commissions.currentMonth).toBe(3800.25);
      expect(result.commissions.ytd).toBe(28500.00);
      expect(result.accountHealth).toEqual({ healthy: 1, atRisk: 1, critical: 1 });
      expect(result.hasData).toBe(true);
      expect(result.period.start).toBeDefined();
      expect(result.period.end).toBeDefined();
    });

    test('FR-023: returns zeros when no data exists for the period', async () => {
      mocks['order']!['aggregate']!
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { total: null } });
      mocks['activity']!['count']!.mockResolvedValue(0);
      mocks['opportunity']!['findMany']!.mockResolvedValue([]);
      mocks['commissionEntry']!['aggregate']!
        .mockResolvedValueOnce({ _sum: { commissionAmount: null } })
        .mockResolvedValueOnce({ _sum: { commissionAmount: null } });
      mocks['account']!['findMany']!.mockResolvedValue([]);

      const result = await getRepDashboard(prisma, TENANT_ID, USER_ID, {
        period: 'current_month',
      });

      expect(result.revenue.currentMonth).toBe(0);
      expect(result.revenue.trailing12Months).toBe(0);
      expect(result.activities.currentMonthCount).toBe(0);
      expect(result.opportunities.openCount).toBe(0);
      expect(result.opportunities.weightedPipelineValue).toBe(0);
      expect(result.commissions.currentMonth).toBe(0);
      expect(result.commissions.ytd).toBe(0);
      expect(result.accountHealth).toEqual({ healthy: 0, atRisk: 0, critical: 0 });
      expect(result.hasData).toBe(false);
    });

    test('FR-023: correctly scopes queries to authenticated user', async () => {
      mocks['order']!['aggregate']!.mockResolvedValue({ _sum: { total: null } });
      mocks['activity']!['count']!.mockResolvedValue(0);
      mocks['opportunity']!['findMany']!.mockResolvedValue([]);
      mocks['commissionEntry']!['aggregate']!.mockResolvedValue({ _sum: { commissionAmount: null } });
      mocks['account']!['findMany']!.mockResolvedValue([]);

      await getRepDashboard(prisma, TENANT_ID, USER_ID, { period: 'current_month' });

      // Verify order queries include userId
      expect(mocks['order']!['aggregate']!).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID, repId: USER_ID }),
        }),
      );
      // Verify activity count includes userId
      expect(mocks['activity']!['count']!).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID, userId: USER_ID }),
        }),
      );
    });

    test('FR-023: handles user with no territory assignments', async () => {
      mocks['userTerritory']!['findMany']!.mockResolvedValue([]);
      mocks['order']!['aggregate']!.mockResolvedValue({ _sum: { total: null } });
      mocks['activity']!['count']!.mockResolvedValue(0);
      mocks['opportunity']!['findMany']!.mockResolvedValue([]);
      mocks['commissionEntry']!['aggregate']!.mockResolvedValue({ _sum: { commissionAmount: null } });

      const result = await getRepDashboard(prisma, TENANT_ID, USER_ID, {
        period: 'current_month',
      });

      expect(result.accountHealth).toEqual({ healthy: 0, atRisk: 0, critical: 0 });
    });
  });

  describe('getCriticalAccounts', () => {
    test('AC-023b: returns accounts with health score below 40, sorted ascending', async () => {
      mocks['account']!['findMany']!.mockResolvedValue([
        { id: 'a1', name: 'Healthy Store', territory: { name: 'Portland' }, healthScores: [{ score: 85 }] },
        { id: 'a2', name: 'Critical Deli', territory: { name: 'Portland' }, healthScores: [{ score: 15 }] },
        { id: 'a3', name: 'At Risk Cafe', territory: { name: 'Portland' }, healthScores: [{ score: 55 }] },
        { id: 'a4', name: 'Worst Account', territory: { name: 'Seattle' }, healthScores: [{ score: 8 }] },
      ]);

      const result = await getCriticalAccounts(prisma, TENANT_ID, USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('Worst Account');
      expect(result[0]!.healthScore).toBe(8);
      expect(result[1]!.name).toBe('Critical Deli');
      expect(result[1]!.healthScore).toBe(15);
    });

    test('FR-023: returns empty array when no critical accounts', async () => {
      mocks['account']!['findMany']!.mockResolvedValue([
        { id: 'a1', name: 'Healthy Store', territory: { name: 'Portland' }, healthScores: [{ score: 85 }] },
      ]);

      const result = await getCriticalAccounts(prisma, TENANT_ID, USER_ID);
      expect(result).toHaveLength(0);
    });

    test('FR-023: returns empty array when user has no territories', async () => {
      mocks['userTerritory']!['findMany']!.mockResolvedValue([]);

      const result = await getCriticalAccounts(prisma, TENANT_ID, USER_ID);
      expect(result).toHaveLength(0);
    });

    test('FR-023: skips accounts with no health score', async () => {
      mocks['account']!['findMany']!.mockResolvedValue([
        { id: 'a1', name: 'No Score', territory: { name: 'Portland' }, healthScores: [] },
        { id: 'a2', name: 'Critical', territory: { name: 'Portland' }, healthScores: [{ score: 20 }] },
      ]);

      const result = await getCriticalAccounts(prisma, TENANT_ID, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Critical');
    });
  });
});
