import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createActivity,
  getActivityById,
  updateActivity,
  softDeleteActivity,
  listActivities,
  ActivityError,
} from './activity.service';

// Mock audit service
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';
const USER_ID = '00000000-0000-4000-a000-000000000020';
const ACTIVITY_ID = '00000000-0000-4000-a000-000000000030';

const auditCtx = {
  actorId: USER_ID,
  actorEmail: 'rep@haversack.com',
  requestId: '00000000-0000-4000-a000-000000000100',
};

function mockActivity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ACTIVITY_ID,
    tenantId: TENANT_ID,
    accountId: ACCOUNT_ID,
    userId: USER_ID,
    type: 'visit',
    notes: 'Good meeting',
    occurredAt: new Date('2026-02-26T10:00:00Z'),
    durationMinutes: 30,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    demos: [],
    ...overrides,
  };
}

function createMockPrisma(): Record<string, unknown> {
  return {
    account: {
      findFirst: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    demo: {
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
}

describe('FR-007: Activity service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  describe('createActivity', () => {
    test('FR-007: creates visit activity with all fields', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(account);
      const created = mockActivity();
      (prisma.activity as { create: ReturnType<typeof vi.fn> }).create.mockResolvedValue(created);

      const result = await createActivity(
        prisma as never,
        TENANT_ID,
        USER_ID,
        {
          accountId: ACCOUNT_ID,
          type: 'visit',
          notes: 'Good meeting',
          occurredAt: '2026-02-26T10:00:00.000Z',
          durationMinutes: 30,
        },
        auditCtx,
      );

      expect(result.type).toBe('visit');
      expect((prisma.activity as { create: ReturnType<typeof vi.fn> }).create).toHaveBeenCalledOnce();
    });

    test('FR-007: creates demo activity with demo records', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(account);
      const created = mockActivity({
        type: 'demo',
        demos: [{ id: 'demo-1', productId: 'prod-1', quantitySampled: 5, buyerFeedback: 'Great', outcome: 'positive' }],
      });
      (prisma.activity as { create: ReturnType<typeof vi.fn> }).create.mockResolvedValue(created);

      const result = await createActivity(
        prisma as never,
        TENANT_ID,
        USER_ID,
        {
          accountId: ACCOUNT_ID,
          type: 'demo',
          occurredAt: '2026-02-26T10:00:00.000Z',
          demos: [{ productId: '00000000-0000-4000-a000-000000000040', quantitySampled: 5, buyerFeedback: 'Great', outcome: 'positive' }],
        },
        auditCtx,
      );

      expect(result.demos).toHaveLength(1);
    });

    test('FR-007: throws ACCOUNT_NOT_FOUND for non-existent account', async () => {
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(null);

      await expect(
        createActivity(
          prisma as never,
          TENANT_ID,
          USER_ID,
          {
            accountId: ACCOUNT_ID,
            type: 'visit',
            occurredAt: '2026-02-26T10:00:00.000Z',
          },
          auditCtx,
        ),
      ).rejects.toThrow(ActivityError);
    });

    test('FR-007: throws for occurredAt more than 24h in the future', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(account);

      const futureDate = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

      await expect(
        createActivity(
          prisma as never,
          TENANT_ID,
          USER_ID,
          {
            accountId: ACCOUNT_ID,
            type: 'visit',
            occurredAt: futureDate,
          },
          auditCtx,
        ),
      ).rejects.toThrow('Activity date cannot be more than 24 hours in the future');
    });
  });

  describe('getActivityById', () => {
    test('FR-007: returns activity with demos', async () => {
      const activity = mockActivity();
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(activity);

      const result = await getActivityById(prisma as never, TENANT_ID, ACTIVITY_ID);
      expect(result.id).toBe(ACTIVITY_ID);
    });

    test('FR-007: throws ACTIVITY_NOT_FOUND for missing activity', async () => {
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(null);

      await expect(
        getActivityById(prisma as never, TENANT_ID, ACTIVITY_ID),
      ).rejects.toThrow(ActivityError);
    });
  });

  describe('updateActivity', () => {
    test('FR-007: updates activity within edit window', async () => {
      const existing = mockActivity({ createdAt: new Date() }); // just created
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(existing);
      const updated = mockActivity({ notes: 'Updated notes', version: 2 });
      (prisma.activity as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue(updated);

      const result = await updateActivity(
        prisma as never,
        TENANT_ID,
        ACTIVITY_ID,
        { notes: 'Updated notes' },
        USER_ID,
        'rep',
        undefined,
        auditCtx,
      );

      expect(result.notes).toBe('Updated notes');
    });

    test('FR-007: throws ACTIVITY_EDIT_WINDOW_EXPIRED for rep after 15 minutes', async () => {
      const oldDate = new Date(Date.now() - 16 * 60 * 1000); // 16 minutes ago
      const existing = mockActivity({ createdAt: oldDate });
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(existing);

      await expect(
        updateActivity(
          prisma as never,
          TENANT_ID,
          ACTIVITY_ID,
          { notes: 'Updated' },
          USER_ID,
          'rep',
          undefined,
          auditCtx,
        ),
      ).rejects.toThrow('Edit window expired');
    });

    test('FR-007: allows manager to edit after 15 minutes', async () => {
      const oldDate = new Date(Date.now() - 16 * 60 * 1000);
      const existing = mockActivity({ createdAt: oldDate });
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(existing);
      const updated = mockActivity({ notes: 'Manager updated', version: 2 });
      (prisma.activity as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue(updated);

      const result = await updateActivity(
        prisma as never,
        TENANT_ID,
        ACTIVITY_ID,
        { notes: 'Manager updated' },
        'other-user-id',
        'manager',
        undefined,
        auditCtx,
      );

      expect(result.notes).toBe('Manager updated');
    });

    test('FR-007: throws ACTIVITY_CONFLICT for version mismatch', async () => {
      const existing = mockActivity({ version: 2, createdAt: new Date() });
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(existing);

      await expect(
        updateActivity(
          prisma as never,
          TENANT_ID,
          ACTIVITY_ID,
          { notes: 'Updated' },
          USER_ID,
          'rep',
          1, // expecting version 1, but it's 2
          auditCtx,
        ),
      ).rejects.toThrow('Activity has been modified by another user');
    });

    test('FR-007: throws ACTIVITY_NOT_FOUND for missing activity', async () => {
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(null);

      await expect(
        updateActivity(
          prisma as never,
          TENANT_ID,
          ACTIVITY_ID,
          { notes: 'Updated' },
          USER_ID,
          'rep',
          undefined,
          auditCtx,
        ),
      ).rejects.toThrow(ActivityError);
    });
  });

  describe('softDeleteActivity', () => {
    test('FR-007: soft-deletes activity', async () => {
      const existing = mockActivity();
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(existing);
      (prisma.activity as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      const result = await softDeleteActivity(prisma as never, TENANT_ID, ACTIVITY_ID, auditCtx);
      expect(result.id).toBe(ACTIVITY_ID);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    test('FR-007: throws ACTIVITY_NOT_FOUND for missing activity', async () => {
      (prisma.activity as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(null);

      await expect(
        softDeleteActivity(prisma as never, TENANT_ID, ACTIVITY_ID, auditCtx),
      ).rejects.toThrow(ActivityError);
    });
  });

  describe('listActivities', () => {
    test('FR-008: returns paginated activities for account', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(account);

      const activities = Array.from({ length: 5 }, (_, i) =>
        mockActivity({ id: `act-${i}`, occurredAt: new Date(2026, 1, 26 - i) }),
      );
      (prisma.activity as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue(activities);
      (prisma.activity as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValue(5);

      const result = await listActivities(prisma as never, TENANT_ID, ACCOUNT_ID, { limit: 20 });
      expect(result.data).toHaveLength(5);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.hasMore).toBe(false);
    });

    test('FR-008: returns hasMore=true when more activities exist', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(account);

      // Return 3 items when limit is 2 (3 = limit + 1)
      const activities = Array.from({ length: 3 }, (_, i) =>
        mockActivity({ id: `act-${i}` }),
      );
      (prisma.activity as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue(activities);
      (prisma.activity as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValue(10);

      const result = await listActivities(prisma as never, TENANT_ID, ACCOUNT_ID, { limit: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.total).toBe(10);
    });

    test('FR-008: filters by activity type', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(account);
      (prisma.activity as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([]);
      (prisma.activity as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValue(0);

      await listActivities(prisma as never, TENANT_ID, ACCOUNT_ID, { type: 'visit' });

      const findManyCall = (prisma.activity as { findMany: ReturnType<typeof vi.fn> }).findMany.mock.calls[0][0];
      expect(findManyCall.where.type).toBe('visit');
    });

    test('FR-008: filters by date range', async () => {
      const account = { id: ACCOUNT_ID, tenantId: TENANT_ID };
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(account);
      (prisma.activity as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([]);
      (prisma.activity as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValue(0);

      await listActivities(prisma as never, TENANT_ID, ACCOUNT_ID, {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.000Z',
      });

      const findManyCall = (prisma.activity as { findMany: ReturnType<typeof vi.fn> }).findMany.mock.calls[0][0];
      expect(findManyCall.where.occurredAt.gte).toEqual(new Date('2026-01-01T00:00:00.000Z'));
      expect(findManyCall.where.occurredAt.lte).toEqual(new Date('2026-01-31T23:59:59.000Z'));
    });

    test('FR-008: throws ACCOUNT_NOT_FOUND for non-existent account', async () => {
      (prisma.account as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue(null);

      await expect(
        listActivities(prisma as never, TENANT_ID, ACCOUNT_ID, {}),
      ).rejects.toThrow(ActivityError);
    });
  });
});
