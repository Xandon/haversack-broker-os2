import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getPipelineSummary, getWinLossAnalytics } from './pipeline.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

function createMockPrisma(): {
  prisma: PrismaClient;
  opportunity: { findMany: ReturnType<typeof vi.fn> };
} {
  const opportunity = { findMany: vi.fn() };
  return {
    prisma: { opportunity } as unknown as PrismaClient,
    opportunity,
  };
}

function createMockOpp(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-a000-000000000050',
    tenantId: TENANT_ID,
    accountId: '00000000-0000-4000-a000-000000000010',
    repId: '00000000-0000-4000-a000-000000000020',
    name: 'Test Opportunity',
    estimatedValue: new Decimal('25000.00'),
    probability: new Decimal('40.00'),
    expectedCloseDate: new Date('2026-06-30'),
    stage: 'qualified',
    closeReason: null,
    closedAt: null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    account: { id: '00000000-0000-4000-a000-000000000010', name: 'Fresh Market' },
    rep: { id: '00000000-0000-4000-a000-000000000020', firstName: 'Jane', lastName: 'Smith' },
    brands: [],
    ...overrides,
  };
}

describe('FR-017: Pipeline service', () => {
  let prisma: PrismaClient;
  let oppMock: { findMany: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    oppMock = mock.opportunity;
  });

  describe('getPipelineSummary', () => {
    test('FR-017a: returns opportunities grouped by stage', async () => {
      const opps = [
        createMockOpp({ id: 'opp-1', stage: 'prospect', probability: new Decimal('10') }),
        createMockOpp({ id: 'opp-2', stage: 'qualified', probability: new Decimal('40') }),
        createMockOpp({ id: 'opp-3', stage: 'proposal', probability: new Decimal('60') }),
      ];
      oppMock.findMany.mockResolvedValue(opps);

      const result = await getPipelineSummary(prisma, TENANT_ID, {});

      expect(result.stages['prospect']!.count).toBe(1);
      expect(result.stages['qualified']!.count).toBe(1);
      expect(result.stages['proposal']!.count).toBe(1);
      expect(result.stages['negotiation']!.count).toBe(0);
    });

    test('FR-017b: computes weighted forecast correctly', async () => {
      const opps = [
        createMockOpp({ estimatedValue: new Decimal('10000'), probability: new Decimal('40'), stage: 'qualified' }),
        createMockOpp({ id: 'opp-2', estimatedValue: new Decimal('20000'), probability: new Decimal('60'), stage: 'proposal' }),
      ];
      oppMock.findMany.mockResolvedValue(opps);

      const result = await getPipelineSummary(prisma, TENANT_ID, {});

      // 10000 * 40/100 + 20000 * 60/100 = 4000 + 12000 = 16000
      expect(result.forecast.weightedTotal).toBe(16000);
      expect(result.forecast.totalOpenValue).toBe(30000);
      expect(result.forecast.opportunityCount).toBe(2);
    });

    test('FR-017c: scopes to rep when scopedRepId provided', async () => {
      oppMock.findMany.mockResolvedValue([]);
      const REP_ID = '00000000-0000-4000-a000-000000000020';

      await getPipelineSummary(prisma, TENANT_ID, {}, REP_ID);

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ repId: REP_ID }),
        }),
      );
    });

    test('FR-017d: filters by accountId', async () => {
      oppMock.findMany.mockResolvedValue([]);
      const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';

      await getPipelineSummary(prisma, TENANT_ID, { accountId: ACCOUNT_ID });

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ accountId: ACCOUNT_ID }),
        }),
      );
    });

    test('FR-017a: returns empty stages when no opportunities exist', async () => {
      oppMock.findMany.mockResolvedValue([]);

      const result = await getPipelineSummary(prisma, TENANT_ID, {});

      expect(result.forecast.weightedTotal).toBe(0);
      expect(result.forecast.opportunityCount).toBe(0);
      expect(result.stages['prospect']!.count).toBe(0);
    });

    test('FR-017d: filters by date range', async () => {
      oppMock.findMany.mockResolvedValue([]);

      await getPipelineSummary(prisma, TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-06-30',
      });

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expectedCloseDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-06-30'),
            },
          }),
        }),
      );
    });
  });

  describe('getWinLossAnalytics', () => {
    test('FR-017e: computes win/loss statistics', async () => {
      const closedOpps = [
        createMockOpp({ stage: 'closed_won', estimatedValue: new Decimal('10000'), closeReason: 'Price', closedAt: new Date('2026-02-15'), createdAt: new Date('2026-01-01') }),
        createMockOpp({ id: 'opp-2', stage: 'closed_won', estimatedValue: new Decimal('20000'), closeReason: 'Quality', closedAt: new Date('2026-02-20'), createdAt: new Date('2026-01-10') }),
        createMockOpp({ id: 'opp-3', stage: 'closed_lost', estimatedValue: new Decimal('5000'), closeReason: 'Budget', closedAt: new Date('2026-02-10'), createdAt: new Date('2026-01-05') }),
      ];
      oppMock.findMany.mockResolvedValue(closedOpps);

      const result = await getWinLossAnalytics(prisma, TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(result.totalWon).toBe(2);
      expect(result.totalLost).toBe(1);
      expect(result.winRate).toBe(66.67);
      expect(result.averageWonDealSize).toBe(15000);
      expect(result.averageSalesCycleDays).toBeGreaterThan(0);
      expect(result.topCloseReasons).toHaveLength(3);
    });

    test('FR-017e: returns zero values when no closed opportunities', async () => {
      oppMock.findMany.mockResolvedValue([]);

      const result = await getWinLossAnalytics(prisma, TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(result.totalWon).toBe(0);
      expect(result.totalLost).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.averageWonDealSize).toBe(0);
    });

    test('FR-017e: scopes to rep when scopedRepId provided', async () => {
      oppMock.findMany.mockResolvedValue([]);
      const REP_ID = '00000000-0000-4000-a000-000000000020';

      await getWinLossAnalytics(prisma, TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      }, REP_ID);

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ repId: REP_ID }),
        }),
      );
    });

    test('FR-017e: limits to top 5 close reasons', async () => {
      const closedOpps = Array.from({ length: 10 }, (_, i) =>
        createMockOpp({
          id: `opp-${i}`,
          stage: i % 2 === 0 ? 'closed_won' : 'closed_lost',
          closeReason: `Reason ${i}`,
          closedAt: new Date('2026-02-15'),
          createdAt: new Date('2026-01-01'),
        }),
      );
      oppMock.findMany.mockResolvedValue(closedOpps);

      const result = await getWinLossAnalytics(prisma, TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(result.topCloseReasons.length).toBeLessThanOrEqual(5);
    });
  });
});
