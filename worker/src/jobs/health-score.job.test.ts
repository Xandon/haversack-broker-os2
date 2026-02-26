import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  calculateHealthScore,
  scoreDaysSinceActivity,
  scoreOrderFrequency,
  scoreOrderValueTrend,
  scoreContactEngagement,
  processHealthScoreBatch,
} from './health-score.job';

describe('FR-006: Health score calculation', () => {
  describe('scoreDaysSinceActivity', () => {
    test('FR-006: returns 100 for 0 days since activity', () => {
      expect(scoreDaysSinceActivity(0)).toBe(100);
    });

    test('FR-006: returns 50 for 30 days since activity', () => {
      expect(scoreDaysSinceActivity(30)).toBe(50);
    });

    test('FR-006: returns 0 for 60+ days since activity', () => {
      expect(scoreDaysSinceActivity(60)).toBe(0);
      expect(scoreDaysSinceActivity(90)).toBe(0);
    });

    test('FR-006: decreases linearly between 0 and 60 days', () => {
      const score15 = scoreDaysSinceActivity(15);
      const score45 = scoreDaysSinceActivity(45);
      expect(score15).toBeGreaterThan(score45);
    });
  });

  describe('scoreOrderFrequency', () => {
    test('FR-006: returns 100 for ratio >= 1.5', () => {
      expect(scoreOrderFrequency(1.5)).toBe(100);
      expect(scoreOrderFrequency(2.0)).toBe(100);
    });

    test('FR-006: returns 0 for ratio 0', () => {
      expect(scoreOrderFrequency(0)).toBe(0);
    });

    test('FR-006: scales linearly', () => {
      expect(scoreOrderFrequency(0.75)).toBe(50);
    });
  });

  describe('scoreOrderValueTrend', () => {
    test('FR-006: returns 100 for trend >= 1.2', () => {
      expect(scoreOrderValueTrend(1.2)).toBe(100);
      expect(scoreOrderValueTrend(1.5)).toBe(100);
    });

    test('FR-006: returns 0 for trend 0', () => {
      expect(scoreOrderValueTrend(0)).toBe(0);
    });
  });

  describe('scoreContactEngagement', () => {
    test('FR-006: returns 100 for 0 days', () => {
      expect(scoreContactEngagement(0)).toBe(100);
    });

    test('FR-006: returns 0 for 60+ days', () => {
      expect(scoreContactEngagement(60)).toBe(0);
    });
  });

  describe('calculateHealthScore', () => {
    test('FR-006: calculates weighted score from all factors', () => {
      const result = calculateHealthScore(0, 1.5, 1.2, 0);

      // All factors at 100: 100*0.30 + 100*0.25 + 100*0.25 + 100*0.20 = 100
      expect(result.score).toBe(100);
    });

    test('FR-006: returns 0 for worst case (all factors at 0)', () => {
      const result = calculateHealthScore(60, 0, 0, 60);
      expect(result.score).toBe(0);
    });

    test('FR-006: uses correct weights (30%, 25%, 25%, 20%)', () => {
      const result = calculateHealthScore(0, 1.5, 1.2, 0);
      expect(result.factorBreakdown.daysSinceLastActivity.weight).toBe(0.30);
      expect(result.factorBreakdown.orderFrequency.weight).toBe(0.25);
      expect(result.factorBreakdown.orderValueTrend.weight).toBe(0.25);
      expect(result.factorBreakdown.contactEngagement.weight).toBe(0.20);
    });

    test('FR-006: includes factor breakdown in result', () => {
      const result = calculateHealthScore(15, 1.0, 1.0, 7);
      expect(result.factorBreakdown.daysSinceLastActivity.value).toBe(15);
      expect(result.factorBreakdown.orderFrequency.value).toBe(1.0);
      expect(result.factorBreakdown.orderValueTrend.value).toBe(1.0);
      expect(result.factorBreakdown.contactEngagement.value).toBe(7);
    });

    test('AC-006a: 45 days inactive decreases score significantly', () => {
      // Score with 0 days inactive vs 45 days inactive
      const activeResult = calculateHealthScore(0, 1.0, 1.0, 0);
      const inactiveResult = calculateHealthScore(45, 1.0, 1.0, 45);

      // The difference should be at least 15 points (per AC-006a)
      expect(activeResult.score - inactiveResult.score).toBeGreaterThanOrEqual(15);
    });

    test('FR-006: clamps score between 0 and 100', () => {
      const result = calculateHealthScore(0, 1.5, 1.2, 0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('processHealthScoreBatch', () => {
    let prisma: Record<string, unknown>;

    beforeEach(() => {
      prisma = {
        account: {
          findMany: vi.fn(),
          update: vi.fn().mockResolvedValue({}),
        },
        accountHealthScore: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
    });

    test('FR-006: processes all active accounts for a tenant', async () => {
      (prisma.account as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        { id: 'acc-1', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { id: 'acc-2', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      ]);

      const results = await processHealthScoreBatch(
        prisma as never,
        '00000000-0000-4000-a000-000000000001',
      );

      expect(results).toHaveLength(2);
      expect((prisma.account as Record<string, ReturnType<typeof vi.fn>>).update).toHaveBeenCalledTimes(2);
      expect((prisma.accountHealthScore as Record<string, ReturnType<typeof vi.fn>>).create).toHaveBeenCalledTimes(2);
    });

    test('FR-006: new accounts (< 1 day) get baseline score of 50', async () => {
      (prisma.account as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        { id: 'acc-new', createdAt: new Date() },
      ]);

      const results = await processHealthScoreBatch(
        prisma as never,
        '00000000-0000-4000-a000-000000000001',
      );

      expect(results[0]?.score).toBe(50);
    });

    test('FR-006: updates account health score and calculated_at', async () => {
      (prisma.account as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        { id: 'acc-1', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      ]);

      await processHealthScoreBatch(
        prisma as never,
        '00000000-0000-4000-a000-000000000001',
      );

      expect((prisma.account as Record<string, ReturnType<typeof vi.fn>>).update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: expect.objectContaining({
          healthScore: expect.any(Number),
          healthScoreCalculatedAt: expect.any(Date),
        }),
      });
    });

    test('FR-006: writes health score history record', async () => {
      (prisma.account as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        { id: 'acc-1', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      ]);

      await processHealthScoreBatch(
        prisma as never,
        '00000000-0000-4000-a000-000000000001',
      );

      expect((prisma.accountHealthScore as Record<string, ReturnType<typeof vi.fn>>).create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: '00000000-0000-4000-a000-000000000001',
          accountId: 'acc-1',
          score: expect.any(Number),
          factorBreakdown: expect.any(Object),
        }),
      });
    });

    test('FR-006: returns empty array when no accounts exist', async () => {
      (prisma.account as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);

      const results = await processHealthScoreBatch(
        prisma as never,
        '00000000-0000-4000-a000-000000000001',
      );

      expect(results).toHaveLength(0);
    });
  });
});
