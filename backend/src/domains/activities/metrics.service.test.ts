import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

import { getActivityMetrics } from './metrics.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_1 = '00000000-0000-4000-a000-000000000010';
const USER_2 = '00000000-0000-4000-a000-000000000020';
const ACCOUNT_1 = '00000000-0000-4000-a000-000000000030';
const ACCOUNT_2 = '00000000-0000-4000-a000-000000000040';

function createMockPrisma(): Record<string, unknown> {
  return {
    $queryRawUnsafe: vi.fn(),
  };
}

describe('FR-010: Activity Metrics Service', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  describe('getActivityMetrics', () => {
    it('returns per-rep activity counts grouped by type', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          group_id: USER_1,
          group_name: 'Rep One',
          activity_type: 'visit',
          count: BigInt(10),
          last_activity: new Date('2026-02-25T10:00:00Z'),
        },
        {
          group_id: USER_1,
          group_name: 'Rep One',
          activity_type: 'call',
          count: BigInt(5),
          last_activity: new Date('2026-02-24T10:00:00Z'),
        },
        {
          group_id: USER_2,
          group_name: 'Rep Two',
          activity_type: 'demo',
          count: BigInt(3),
          last_activity: new Date('2026-02-20T10:00:00Z'),
        },
      ]);

      const result = await getActivityMetrics(
        mockPrisma as never,
        TENANT_ID,
        {
          startDate: '2026-02-01T00:00:00.000Z',
          endDate: '2026-02-28T23:59:59.999Z',
          groupBy: 'rep',
        },
      );

      expect(result.groups).toHaveLength(2);

      const rep1 = result.groups.find((g) => g.id === USER_1)!;
      expect(rep1.name).toBe('Rep One');
      expect(rep1.counts.visit).toBe(10);
      expect(rep1.counts.call).toBe(5);
      expect(rep1.total).toBe(15);

      const rep2 = result.groups.find((g) => g.id === USER_2)!;
      expect(rep2.counts.demo).toBe(3);
      expect(rep2.total).toBe(3);

      expect(result.totals.visit).toBe(10);
      expect(result.totals.call).toBe(5);
      expect(result.totals.demo).toBe(3);
    });

    it('returns per-account metrics when groupBy is account', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          group_id: ACCOUNT_1,
          group_name: 'Account One',
          activity_type: 'visit',
          count: BigInt(7),
          last_activity: new Date('2026-02-25T10:00:00Z'),
        },
        {
          group_id: ACCOUNT_2,
          group_name: 'Account Two',
          activity_type: 'email',
          count: BigInt(4),
          last_activity: new Date('2026-02-22T10:00:00Z'),
        },
      ]);

      const result = await getActivityMetrics(
        mockPrisma as never,
        TENANT_ID,
        {
          startDate: '2026-02-01T00:00:00.000Z',
          endDate: '2026-02-28T23:59:59.999Z',
          groupBy: 'account',
        },
      );

      expect(result.groups).toHaveLength(2);
      const acct1 = result.groups.find((g) => g.id === ACCOUNT_1)!;
      expect(acct1.counts.visit).toBe(7);
      expect(acct1.total).toBe(7);

      expect(result.totals.visit).toBe(7);
      expect(result.totals.email).toBe(4);
    });

    it('returns per-type metrics when groupBy is type', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          group_id: 'visit',
          group_name: 'visit',
          activity_type: 'visit',
          count: BigInt(20),
          last_activity: new Date('2026-02-26T10:00:00Z'),
        },
        {
          group_id: 'call',
          group_name: 'call',
          activity_type: 'call',
          count: BigInt(12),
          last_activity: new Date('2026-02-25T10:00:00Z'),
        },
      ]);

      const result = await getActivityMetrics(
        mockPrisma as never,
        TENANT_ID,
        {
          startDate: '2026-02-01T00:00:00.000Z',
          endDate: '2026-02-28T23:59:59.999Z',
          groupBy: 'type',
        },
      );

      expect(result.groups).toHaveLength(2);
      expect(result.totals.visit).toBe(20);
      expect(result.totals.call).toBe(12);
    });

    it('returns zero counts when no activities in range', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getActivityMetrics(
        mockPrisma as never,
        TENANT_ID,
        {
          startDate: '2026-03-01T00:00:00.000Z',
          endDate: '2026-03-31T23:59:59.999Z',
          groupBy: 'rep',
        },
      );

      expect(result.groups).toHaveLength(0);
      expect(result.totals).toEqual({
        visit: 0,
        call: 0,
        email: 0,
        demo: 0,
        sampling: 0,
      });
    });

    it('passes correct parameters to the query', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await getActivityMetrics(
        mockPrisma as never,
        TENANT_ID,
        {
          startDate: '2026-02-01T00:00:00.000Z',
          endDate: '2026-02-28T23:59:59.999Z',
          groupBy: 'rep',
        },
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      const callArgs = (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls[0];
      // Should have: query string, tenantId, startDate, endDate
      expect(callArgs[1]).toBe(TENANT_ID);
      expect(callArgs[2]).toEqual(new Date('2026-02-01T00:00:00.000Z'));
      expect(callArgs[3]).toEqual(new Date('2026-02-28T23:59:59.999Z'));
    });

    it('calculates lastActivityDate per group correctly', async () => {
      (mockPrisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          group_id: USER_1,
          group_name: 'Rep One',
          activity_type: 'visit',
          count: BigInt(5),
          last_activity: new Date('2026-02-20T10:00:00Z'),
        },
        {
          group_id: USER_1,
          group_name: 'Rep One',
          activity_type: 'call',
          count: BigInt(3),
          last_activity: new Date('2026-02-25T10:00:00Z'),
        },
      ]);

      const result = await getActivityMetrics(
        mockPrisma as never,
        TENANT_ID,
        {
          startDate: '2026-02-01T00:00:00.000Z',
          endDate: '2026-02-28T23:59:59.999Z',
          groupBy: 'rep',
        },
      );

      // lastActivityDate should be the most recent across all types
      expect(result.groups[0]!.lastActivityDate).toBe('2026-02-25T10:00:00.000Z');
    });
  });
});
