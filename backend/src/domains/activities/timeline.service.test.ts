import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

import { getTimeline } from './timeline.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';
const USER_ID = '00000000-0000-4000-a000-000000000020';

function createMockPrisma(): Record<string, unknown> {
  return {
    account: { findFirst: vi.fn() },
    activity: { findMany: vi.fn(), count: vi.fn() },
    emailRecord: { findMany: vi.fn(), count: vi.fn() },
    task: { findMany: vi.fn(), count: vi.fn() },
  };
}

function mockActivity(id: string, occurredAt: string, type = 'visit'): Record<string, unknown> {
  return {
    id,
    tenantId: TENANT_ID,
    accountId: ACCOUNT_ID,
    userId: USER_ID,
    type,
    notes: 'Test activity',
    occurredAt: new Date(occurredAt),
    durationMinutes: 30,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    demos: [],
    user: { id: USER_ID, firstName: 'Test', lastName: 'Rep' },
  };
}

describe('FR-008: Timeline Service', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  describe('getTimeline', () => {
    it('AC-008a: returns activities in reverse chronological order', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      const activities = [
        mockActivity('a1', '2026-02-26T10:00:00Z'),
        mockActivity('a2', '2026-02-25T10:00:00Z'),
        mockActivity('a3', '2026-02-24T10:00:00Z'),
      ];
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue(activities);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(3);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {});

      expect(result.data).toHaveLength(3);
      expect(result.data[0]!.type).toBe('activity');
      expect(result.data[0]!.occurredAt).toBe('2026-02-26T10:00:00.000Z');
      expect(result.data[1]!.occurredAt).toBe('2026-02-25T10:00:00.000Z');
      expect(result.data[2]!.occurredAt).toBe('2026-02-24T10:00:00.000Z');
    });

    it('AC-008a: returns paginated results with cursor', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      // Simulate limit+1 activities (hasMore = true)
      const activities = Array.from({ length: 21 }, (_, i) =>
        mockActivity(`a-${i}`, `2026-02-${String(26 - i).padStart(2, '0')}T10:00:00Z`),
      );
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue(activities);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(50);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeTruthy();
      expect(result.pagination.total).toBe(50);
    });

    it('AC-008b: filters by activity type', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      const activities = [mockActivity('a1', '2026-02-26T10:00:00Z', 'visit')];
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue(activities);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(1);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, { activityType: 'visit' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.data.type).toBe('visit');
    });

    it('returns empty array with total 0 for account with no activities', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.counts.activity).toBe(0);
    });

    it('throws error for non-existent account', async () => {
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(null);

      await expect(
        getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {}),
      ).rejects.toThrow('Account not found');
    });

    it('filters by date range', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);

      await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2026-02-28T23:59:59.999Z',
      });

      const activityCall = (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mock.calls[0]![0];
      expect(activityCall.where.occurredAt.gte).toEqual(new Date('2026-02-01T00:00:00.000Z'));
      expect(activityCall.where.occurredAt.lte).toEqual(new Date('2026-02-28T23:59:59.999Z'));
    });

    it('returns counts per source type', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        mockActivity('a1', '2026-02-26T10:00:00Z'),
      ]);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(5);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(3);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(2);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {});

      expect(result.counts.activity).toBe(5);
      expect(result.counts.email).toBe(3);
      expect(result.counts.task).toBe(2);
      expect(result.pagination.total).toBe(10);
    });

    it('filters by source types', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        mockActivity('a1', '2026-02-26T10:00:00Z'),
      ]);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(1);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, { types: 'activity' });

      expect(result.data).toHaveLength(1);
      // Should NOT have queried email or task
      expect((mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany).not.toHaveBeenCalled();
      expect((mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany).not.toHaveBeenCalled();
    });

    it('T060: merges activities, emails, and tasks in chronological order', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        mockActivity('a1', '2026-02-26T10:00:00Z'),
        mockActivity('a2', '2026-02-24T10:00:00Z'),
      ]);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(2);

      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        {
          id: 'e1',
          tenantId: TENANT_ID,
          accountId: ACCOUNT_ID,
          userId: USER_ID,
          subject: 'Follow-up',
          direction: 'outbound',
          status: 'sent',
          recipientEmail: 'buyer@store.com',
          sentAt: new Date('2026-02-25T10:00:00Z'),
          user: { id: USER_ID, firstName: 'Test', lastName: 'Rep' },
        },
      ]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(1);

      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        {
          id: 't1',
          tenantId: TENANT_ID,
          accountId: ACCOUNT_ID,
          title: 'Follow up',
          status: 'pending',
          priority: 'high',
          createdAt: new Date('2026-02-23T10:00:00Z'),
          assignee: { id: USER_ID, firstName: 'Test', lastName: 'Rep' },
        },
      ]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(1);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {});

      // Should be sorted: activity (Feb 26), email (Feb 25), activity (Feb 24), task (Feb 23)
      expect(result.data).toHaveLength(4);
      expect(result.data[0]!.type).toBe('activity');
      expect(result.data[0]!.occurredAt).toBe('2026-02-26T10:00:00.000Z');
      expect(result.data[1]!.type).toBe('email');
      expect(result.data[1]!.occurredAt).toBe('2026-02-25T10:00:00.000Z');
      expect(result.data[2]!.type).toBe('activity');
      expect(result.data[2]!.occurredAt).toBe('2026-02-24T10:00:00.000Z');
      expect(result.data[3]!.type).toBe('task');
      expect(result.data[3]!.occurredAt).toBe('2026-02-23T10:00:00.000Z');

      expect(result.counts.activity).toBe(2);
      expect(result.counts.email).toBe(1);
      expect(result.counts.task).toBe(1);
      expect(result.pagination.total).toBe(4);
    });

    it('T060: email items include correct data fields', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        {
          id: 'e1',
          tenantId: TENANT_ID,
          accountId: ACCOUNT_ID,
          userId: USER_ID,
          subject: 'Q2 Pricing',
          direction: 'outbound',
          status: 'opened',
          recipientEmail: 'buyer@store.com',
          sentAt: new Date('2026-02-25T10:00:00Z'),
          user: { id: USER_ID, firstName: 'Test', lastName: 'Rep' },
        },
      ]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(1);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {});

      expect(result.data[0]!.type).toBe('email');
      expect(result.data[0]!.data.subject).toBe('Q2 Pricing');
      expect(result.data[0]!.data.direction).toBe('outbound');
      expect(result.data[0]!.data.status).toBe('opened');
    });

    it('T060: task items include correct data fields', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(account);

      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.activity as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);
      (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(0);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        {
          id: 't1',
          tenantId: TENANT_ID,
          accountId: ACCOUNT_ID,
          title: 'Send samples',
          status: 'completed',
          priority: 'high',
          createdAt: new Date('2026-02-20T10:00:00Z'),
          assignee: { id: USER_ID, firstName: 'Test', lastName: 'Rep' },
        },
      ]);
      (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>).count.mockResolvedValue(1);

      const result = await getTimeline(mockPrisma as never, TENANT_ID, ACCOUNT_ID, {});

      expect(result.data[0]!.type).toBe('task');
      expect(result.data[0]!.data.title).toBe('Send samples');
      expect(result.data[0]!.data.status).toBe('completed');
      expect(result.data[0]!.data.priority).toBe('high');
    });
  });
});
