/**
 * Activity service unit tests.
 * T072: Validates activity creation, listing, pagination,
 * type filtering, and audit trail integration with mocked Prisma calls.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { createActivity, listActivities, getActivityById } from './activity.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    auditTrail: {
      create: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_ACCOUNT_ID = '770e8400-e29b-41d4-a716-446655440000';
const TEST_CONTACT_ID = '880e8400-e29b-41d4-a716-446655440000';
const TEST_ACTIVITY_ID = '990e8400-e29b-41d4-a716-446655440000';

const NOW = new Date('2026-02-25T12:00:00.000Z');

// ---------------------------------------------------------------------------
// createActivity Tests
// ---------------------------------------------------------------------------

describe('Activity Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPrisma.auditTrail.create.mockResolvedValue({});
  });

  describe('createActivity', () => {
    test('FR-008: creates activity with required fields', async () => {
      const createdActivity = {
        id: TEST_ACTIVITY_ID,
        tenant_id: TEST_TENANT_ID,
        account_id: TEST_ACCOUNT_ID,
        user_id: TEST_USER_ID,
        contact_id: null,
        activity_type: 'visit',
        subject: null,
        notes: null,
        occurred_at: NOW,
        duration_minutes: null,
        metadata: {},
        created_at: NOW,
        updated_at: NOW,
      };

      mockPrisma.activity.create.mockResolvedValue(createdActivity);

      const result = await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'visit',
        },
        TEST_USER_ID,
      );

      expect(result).toEqual(createdActivity);
      expect(result.activity_type).toBe('visit');
      expect(result.tenant_id).toBe(TEST_TENANT_ID);
      expect(mockPrisma.activity.create).toHaveBeenCalledOnce();
    });

    test('FR-008: includes tenant_id in create data', async () => {
      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        tenant_id: TEST_TENANT_ID,
        account_id: TEST_ACCOUNT_ID,
        user_id: TEST_USER_ID,
        activity_type: 'call',
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'call',
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.activity.create.mock.calls[0]![0];
      expect(createCall.data.tenant_id).toBe(TEST_TENANT_ID);
    });

    test('FR-008: creates activity with optional subject and notes', async () => {
      const createdActivity = {
        id: TEST_ACTIVITY_ID,
        tenant_id: TEST_TENANT_ID,
        account_id: TEST_ACCOUNT_ID,
        user_id: TEST_USER_ID,
        activity_type: 'call',
        subject: 'Follow-up call',
        notes: 'Discussed pricing',
        occurred_at: NOW,
        duration_minutes: 30,
        metadata: {},
      };

      mockPrisma.activity.create.mockResolvedValue(createdActivity);

      const result = await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'call',
          subject: 'Follow-up call',
          notes: 'Discussed pricing',
          duration_minutes: 30,
        },
        TEST_USER_ID,
      );

      expect(result.subject).toBe('Follow-up call');
      expect(result.notes).toBe('Discussed pricing');
      expect(result.duration_minutes).toBe(30);
    });

    test('FR-008: creates activity with contact_id', async () => {
      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        tenant_id: TEST_TENANT_ID,
        account_id: TEST_ACCOUNT_ID,
        user_id: TEST_USER_ID,
        contact_id: TEST_CONTACT_ID,
        activity_type: 'demo',
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'demo',
          contact_id: TEST_CONTACT_ID,
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.activity.create.mock.calls[0]![0];
      expect(createCall.data.contact_id).toBe(TEST_CONTACT_ID);
    });

    test('FR-008: creates activity with custom occurred_at', async () => {
      const customDate = '2026-02-20T10:00:00.000Z';

      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        occurred_at: new Date(customDate),
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'visit',
          occurred_at: customDate,
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.activity.create.mock.calls[0]![0];
      expect(createCall.data.occurred_at).toEqual(new Date(customDate));
    });

    test('FR-008: defaults occurred_at to now when not provided', async () => {
      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        occurred_at: NOW,
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'visit',
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.activity.create.mock.calls[0]![0];
      expect(createCall.data.occurred_at).toBeInstanceOf(Date);
    });

    test('FR-008: creates activity with metadata', async () => {
      const metadata = { key: 'value', count: 42 };

      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        metadata,
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'sampling',
          metadata,
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.activity.create.mock.calls[0]![0];
      expect(createCall.data.metadata).toEqual(metadata);
    });

    test('FR-008: defaults metadata to empty object', async () => {
      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        metadata: {},
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'note',
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.activity.create.mock.calls[0]![0];
      expect(createCall.data.metadata).toEqual({});
    });

    test('FR-008: sets user_id from the actor', async () => {
      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        user_id: TEST_USER_ID,
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'visit',
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.activity.create.mock.calls[0]![0];
      expect(createCall.data.user_id).toBe(TEST_USER_ID);
    });

    test('FR-008: writes audit trail entry on activity creation', async () => {
      mockPrisma.activity.create.mockResolvedValue({
        id: TEST_ACTIVITY_ID,
        tenant_id: TEST_TENANT_ID,
        account_id: TEST_ACCOUNT_ID,
        activity_type: 'visit',
        subject: null,
      });

      await createActivity(
        mockPrisma as unknown as Parameters<typeof createActivity>[0],
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          activity_type: 'visit',
        },
        TEST_USER_ID,
      );

      // Audit entry is fire-and-forget
      await vi.waitFor(() => {
        expect(mockPrisma.auditTrail.create).toHaveBeenCalled();
      });
    });

    test('FR-008: creates activity for each activity type', async () => {
      const activityTypes = ['visit', 'call', 'email', 'demo', 'sampling', 'task', 'note', 'system'] as const;

      for (const activityType of activityTypes) {
        mockPrisma.activity.create.mockResolvedValue({
          id: TEST_ACTIVITY_ID,
          activity_type: activityType,
        });

        const result = await createActivity(
          mockPrisma as unknown as Parameters<typeof createActivity>[0],
          TEST_TENANT_ID,
          {
            account_id: TEST_ACCOUNT_ID,
            activity_type: activityType,
          },
          TEST_USER_ID,
        );

        expect(result.activity_type).toBe(activityType);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // listActivities Tests
  // ---------------------------------------------------------------------------

  describe('listActivities', () => {
    test('FR-008: returns paginated activities in reverse chronological order', async () => {
      const activities = [
        { id: '1', activity_type: 'visit', occurred_at: new Date('2026-02-25') },
        { id: '2', activity_type: 'call', occurred_at: new Date('2026-02-24') },
      ];

      mockPrisma.activity.findMany.mockResolvedValue(activities);
      mockPrisma.activity.count.mockResolvedValue(25);

      const result = await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
        { page: 2, pageSize: 10 },
      );

      expect(result.items).toEqual(activities);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    test('FR-008: uses default pagination when not specified', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      const result = await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    test('FR-008: filters by tenant_id and account_id', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      const findManyCall = mockPrisma.activity.findMany.mock.calls[0]![0];
      expect(findManyCall.where.tenant_id).toBe(TEST_TENANT_ID);
      expect(findManyCall.where.account_id).toBe(TEST_ACCOUNT_ID);
    });

    test('FR-008: filters by activity_type', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
        { activityType: 'visit' },
      );

      const findManyCall = mockPrisma.activity.findMany.mock.calls[0]![0];
      expect(findManyCall.where.activity_type).toBe('visit');
    });

    test('FR-008: does not include activity_type filter when not specified', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      const findManyCall = mockPrisma.activity.findMany.mock.calls[0]![0];
      expect(findManyCall.where.activity_type).toBeUndefined();
    });

    test('FR-008: orders results by occurred_at descending', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      const findManyCall = mockPrisma.activity.findMany.mock.calls[0]![0];
      expect(findManyCall.orderBy).toEqual({ occurred_at: 'desc' });
    });

    test('FR-008: calculates correct skip offset for pagination', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
        { page: 3, pageSize: 10 },
      );

      const findManyCall = mockPrisma.activity.findMany.mock.calls[0]![0];
      expect(findManyCall.skip).toBe(20); // (3 - 1) * 10
      expect(findManyCall.take).toBe(10);
    });

    test('FR-008: returns empty result when no activities found', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      const result = await listActivities(
        mockPrisma as unknown as Parameters<typeof listActivities>[0],
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getActivityById Tests
  // ---------------------------------------------------------------------------

  describe('getActivityById', () => {
    test('FR-008: returns activity with account info when found', async () => {
      const activity = {
        id: TEST_ACTIVITY_ID,
        tenant_id: TEST_TENANT_ID,
        account_id: TEST_ACCOUNT_ID,
        activity_type: 'visit',
        account: { id: TEST_ACCOUNT_ID, name: 'Test Account' },
      };

      mockPrisma.activity.findFirst.mockResolvedValue(activity);

      const result = await getActivityById(
        mockPrisma as unknown as Parameters<typeof getActivityById>[0],
        TEST_TENANT_ID,
        TEST_ACTIVITY_ID,
      );

      expect(result).toEqual(activity);
      expect(result?.account.name).toBe('Test Account');
    });

    test('FR-008: returns null when activity not found', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      const result = await getActivityById(
        mockPrisma as unknown as Parameters<typeof getActivityById>[0],
        TEST_TENANT_ID,
        'nonexistent-id',
      );

      expect(result).toBeNull();
    });

    test('FR-008: filters by tenant_id for isolation', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await getActivityById(
        mockPrisma as unknown as Parameters<typeof getActivityById>[0],
        TEST_TENANT_ID,
        TEST_ACTIVITY_ID,
      );

      const findFirstCall = mockPrisma.activity.findFirst.mock.calls[0]![0];
      expect(findFirstCall.where.tenant_id).toBe(TEST_TENANT_ID);
      expect(findFirstCall.where.id).toBe(TEST_ACTIVITY_ID);
    });

    test('FR-008: includes account select with id and name', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      await getActivityById(
        mockPrisma as unknown as Parameters<typeof getActivityById>[0],
        TEST_TENANT_ID,
        TEST_ACTIVITY_ID,
      );

      const findFirstCall = mockPrisma.activity.findFirst.mock.calls[0]![0];
      expect(findFirstCall.include.account.select).toEqual({
        id: true,
        name: true,
      });
    });
  });
});
