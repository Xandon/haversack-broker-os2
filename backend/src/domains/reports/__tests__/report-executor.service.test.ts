import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  executeReport,
  checkConcurrencyLimit,
  buildWhereClause,
} from '../report-executor.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

function createMockRedis(): {
  incr: ReturnType<typeof vi.fn>;
  decr: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
} {
  return {
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
  };
}

function createMockPrisma(): PrismaClient {
  const order = {
    findMany: vi.fn().mockResolvedValue([
      { id: 'order-1', orderNumber: 'ORD-001', total: new Decimal('2500'), status: 'confirmed', createdAt: new Date() },
    ]),
    count: vi.fn().mockResolvedValue(1),
  };

  return { order } as unknown as PrismaClient;
}

describe('FR-025: Report executor service', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = createMockRedis();
  });

  describe('checkConcurrencyLimit', () => {
    test('FR-025: allows up to 3 concurrent executions', async () => {
      redis.incr.mockResolvedValue(3);
      await expect(checkConcurrencyLimit(redis, TENANT_ID)).resolves.toBeUndefined();
    });

    test('FR-025: rejects 4th concurrent execution', async () => {
      redis.incr.mockResolvedValue(4);
      await expect(checkConcurrencyLimit(redis, TENANT_ID)).rejects.toThrow('Too many concurrent');
      expect(redis.decr).toHaveBeenCalled();
    });

    test('FR-025: skips check when redis is null', async () => {
      await expect(checkConcurrencyLimit(null, TENANT_ID)).resolves.toBeUndefined();
    });
  });

  describe('buildWhereClause', () => {
    test('FR-025: includes tenantId in all queries', () => {
      const where = buildWhereClause(TENANT_ID, 'ORDER', {});
      expect(where['tenantId']).toBe(TENANT_ID);
    });

    test('FR-025: applies date range filter', () => {
      const where = buildWhereClause(TENANT_ID, 'ORDER', {
        dateRange: { start: '2026-01-01', end: '2026-03-31' },
      });
      expect(where['createdAt']).toBeDefined();
    });

    test('FR-025: applies territory filter for accounts', () => {
      const where = buildWhereClause(TENANT_ID, 'ACCOUNT', {
        territoryId: 'territory-1',
      });
      expect(where['territoryId']).toBe('territory-1');
    });

    test('FR-025: applies rep filter for orders', () => {
      const where = buildWhereClause(TENANT_ID, 'ORDER', {
        repId: 'rep-1',
      });
      expect(where['repId']).toBe('rep-1');
    });

    test('FR-025: applies status filter', () => {
      const where = buildWhereClause(TENANT_ID, 'ORDER', {
        status: 'confirmed',
      });
      expect(where['status']).toBe('confirmed');
    });

    test('FR-025: adds soft-delete filter for ACCOUNT only', () => {
      const accountWhere = buildWhereClause(TENANT_ID, 'ACCOUNT', {});
      expect(accountWhere['deletedAt']).toBeNull();

      const orderWhere = buildWhereClause(TENANT_ID, 'ORDER', {});
      expect(orderWhere['deletedAt']).toBeUndefined();
    });

    test('FR-025: uses calculatedAt for COMMISSION date filter', () => {
      const where = buildWhereClause(TENANT_ID, 'COMMISSION', {
        dateRange: { start: '2026-01-01', end: '2026-03-31' },
      });
      expect(where['calculatedAt']).toBeDefined();
      expect(where['createdAt']).toBeUndefined();
    });
  });

  describe('executeReport', () => {
    test('FR-025: returns paginated results with column metadata', async () => {
      const prisma = createMockPrisma();
      const result = await executeReport(prisma, redis, TENANT_ID, {
        entityType: 'ORDER',
        filters: {},
        columns: ['orderNumber', 'total'],
      }, { limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.columns).toHaveLength(2);
      expect(result.columns[0]!.key).toBe('orderNumber');
      expect(result.truncated).toBe(false);
    });

    test('FR-025: decrements Redis counter on success', async () => {
      const prisma = createMockPrisma();
      await executeReport(prisma, redis, TENANT_ID, {
        entityType: 'ORDER',
        filters: {},
        columns: ['orderNumber'],
      }, { limit: 50 });

      expect(redis.decr).toHaveBeenCalled();
    });

    test('FR-025: decrements Redis counter on error', async () => {
      const prisma = { order: { findMany: vi.fn().mockRejectedValue(new Error('DB error')), count: vi.fn() } } as unknown as PrismaClient;

      await expect(
        executeReport(prisma, redis, TENANT_ID, {
          entityType: 'ORDER',
          filters: {},
          columns: ['orderNumber'],
        }, { limit: 50 }),
      ).rejects.toThrow('DB error');

      expect(redis.decr).toHaveBeenCalled();
    });
  });
});
