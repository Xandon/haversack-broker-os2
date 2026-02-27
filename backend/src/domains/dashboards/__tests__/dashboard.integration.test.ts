import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createTestPrisma,
  disconnectTestPrisma,
  cleanDatabase,
  seedTestData,
  type TestSeedData,
} from '../../../shared/test-helpers/integration-db';
import { getRepDashboard, getCriticalAccounts } from '../rep-dashboard.service';
import { getTeamDashboard } from '../team-dashboard.service';

describe('Integration: Dashboard queries against real PostgreSQL', () => {
  let prisma: PrismaClient;
  let seed: TestSeedData;

  beforeAll(async () => {
    prisma = createTestPrisma();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    seed = await seedTestData(prisma);
  });

  describe('getRepDashboard', () => {
    test('FR-023: returns zero-state dashboard for rep with no orders', async () => {
      const result = await getRepDashboard(prisma, seed.tenantId, seed.repUser.id, {
        period: 'current_month',
      });

      expect(result.revenue.currentMonth).toBe(0);
      expect(result.revenue.trailing12Months).toBe(0);
      expect(result.activities.currentMonthCount).toBe(0);
      expect(result.opportunities.openCount).toBe(0);
      expect(result.commissions.currentMonth).toBe(0);
      expect(result.commissions.ytd).toBe(0);
      expect(result.hasData).toBe(false);
      expect(result.period.start).toBeDefined();
      expect(result.period.end).toBeDefined();
    });

    test('FR-023: includes confirmed order revenue in dashboard', async () => {
      // Create a confirmed order
      await prisma.order.create({
        data: {
          tenantId: seed.tenantId,
          orderNumber: 'ORD-INT-001',
          accountId: seed.account.id,
          repId: seed.repUser.id,
          status: 'confirmed',
          subtotal: 500,
          total: 500,
        },
      });

      const result = await getRepDashboard(prisma, seed.tenantId, seed.repUser.id, {
        period: 'current_month',
      });

      expect(result.revenue.currentMonth).toBe(500);
      expect(result.hasData).toBe(true);
    });

    test('FR-023: excludes draft orders from revenue', async () => {
      await prisma.order.create({
        data: {
          tenantId: seed.tenantId,
          orderNumber: 'ORD-INT-002',
          accountId: seed.account.id,
          repId: seed.repUser.id,
          status: 'draft',
          subtotal: 1000,
          total: 1000,
        },
      });

      const result = await getRepDashboard(prisma, seed.tenantId, seed.repUser.id, {
        period: 'current_month',
      });

      expect(result.revenue.currentMonth).toBe(0);
    });

    test('FR-023: counts activities in current period', async () => {
      await prisma.activity.create({
        data: {
          tenantId: seed.tenantId,
          userId: seed.repUser.id,
          accountId: seed.account.id,
          activityType: 'visit',
          subject: 'Store visit',
          occurredAt: new Date(),
        },
      });

      const result = await getRepDashboard(prisma, seed.tenantId, seed.repUser.id, {
        period: 'current_month',
      });

      expect(result.activities.currentMonthCount).toBe(1);
    });
  });

  describe('getCriticalAccounts', () => {
    test('FR-023: returns accounts with health score below 40', async () => {
      await prisma.accountHealthScore.create({
        data: {
          tenantId: seed.tenantId,
          accountId: seed.account.id,
          score: 25,
          breakdown: {},
          calculatedAt: new Date(),
        },
      });

      const result = await getCriticalAccounts(prisma, seed.tenantId, seed.repUser.id);

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Portland Grocery');
      expect(result[0]!.healthScore).toBe(25);
    });

    test('FR-023: excludes accounts with healthy scores', async () => {
      await prisma.accountHealthScore.create({
        data: {
          tenantId: seed.tenantId,
          accountId: seed.account.id,
          score: 85,
          breakdown: {},
          calculatedAt: new Date(),
        },
      });

      const result = await getCriticalAccounts(prisma, seed.tenantId, seed.repUser.id);
      expect(result).toHaveLength(0);
    });
  });

  describe('getTeamDashboard', () => {
    test('FR-024: aggregates orders across all reps', async () => {
      await prisma.order.create({
        data: {
          tenantId: seed.tenantId,
          orderNumber: 'ORD-INT-003',
          accountId: seed.account.id,
          repId: seed.repUser.id,
          status: 'confirmed',
          subtotal: 750,
          total: 750,
        },
      });

      const result = await getTeamDashboard(prisma, seed.tenantId, {
        period: 'current_month',
      });

      expect(result.totals.totalRevenue).toBe(750);
      expect(result.totals.totalOrders).toBe(1);
      expect(result.repRankings.length).toBeGreaterThanOrEqual(1);
      expect(result.hasData).toBe(true);
    });

    test('FR-024: returns empty state when no orders', async () => {
      const result = await getTeamDashboard(prisma, seed.tenantId, {
        period: 'current_month',
      });

      expect(result.totals.totalRevenue).toBe(0);
      expect(result.totals.totalOrders).toBe(0);
    });
  });
});
