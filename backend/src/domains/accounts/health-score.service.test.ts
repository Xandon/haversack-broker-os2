/**
 * Health score calculation service tests.
 * T056: Validates health score computation for various account scenarios,
 * individual factor scores, batch recalculation, and edge cases.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  calculateActivityScore,
  calculateOrderRecencyScore,
  calculateContactCompletenessScore,
  calculateAccountCompletenessScore,
  calculateHealthScore,
  recalculateAllHealthScores,
} from './health-score.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    account: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      count: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_ACCOUNT_ID = 'aaaa0000-e29b-41d4-a716-446655440000';

// ---------------------------------------------------------------------------
// Unit Tests: Individual Factor Score Functions
// ---------------------------------------------------------------------------

describe('Health Score Factor Calculations', () => {
  describe('calculateActivityScore', () => {
    test('FR-006: returns 0 for no activities', () => {
      expect(calculateActivityScore(0)).toBe(0);
    });

    test('FR-006: returns 100 for MAX_ACTIVITY_COUNT or more activities', () => {
      expect(calculateActivityScore(10)).toBe(100);
      expect(calculateActivityScore(15)).toBe(100);
    });

    test('FR-006: returns proportional score for partial activity count', () => {
      expect(calculateActivityScore(5)).toBe(50);
      expect(calculateActivityScore(3)).toBe(30);
    });

    test('FR-006: returns 10 for 1 activity', () => {
      expect(calculateActivityScore(1)).toBe(10);
    });
  });

  describe('calculateOrderRecencyScore', () => {
    test('FR-006: returns 0 when no orders exist', () => {
      expect(calculateOrderRecencyScore(null)).toBe(0);
    });

    test('FR-006: returns 100 for order placed today', () => {
      expect(calculateOrderRecencyScore(0)).toBe(100);
    });

    test('FR-006: returns 0 for order older than 180 days', () => {
      expect(calculateOrderRecencyScore(180)).toBe(0);
      expect(calculateOrderRecencyScore(365)).toBe(0);
    });

    test('FR-006: returns proportional score for mid-range recency', () => {
      // 90 days = halfway to 180, should be ~50
      expect(calculateOrderRecencyScore(90)).toBe(50);
    });

    test('FR-006: returns score close to 100 for very recent order', () => {
      expect(calculateOrderRecencyScore(1)).toBeGreaterThan(95);
    });
  });

  describe('calculateContactCompletenessScore', () => {
    test('FR-006: returns 0 when no contacts exist', () => {
      expect(
        calculateContactCompletenessScore({
          hasPrimaryContact: false,
          hasEmail: false,
          hasPhone: false,
          contactCount: 0,
        }),
      ).toBe(0);
    });

    test('FR-006: returns 25 for a contact with no details', () => {
      expect(
        calculateContactCompletenessScore({
          hasPrimaryContact: false,
          hasEmail: false,
          hasPhone: false,
          contactCount: 1,
        }),
      ).toBe(25);
    });

    test('FR-006: returns 100 for fully complete contacts', () => {
      expect(
        calculateContactCompletenessScore({
          hasPrimaryContact: true,
          hasEmail: true,
          hasPhone: true,
          contactCount: 2,
        }),
      ).toBe(100);
    });

    test('FR-006: returns 75 for contact with email and primary but no phone', () => {
      expect(
        calculateContactCompletenessScore({
          hasPrimaryContact: true,
          hasEmail: true,
          hasPhone: false,
          contactCount: 1,
        }),
      ).toBe(75);
    });
  });

  describe('calculateAccountCompletenessScore', () => {
    test('FR-006: returns 0 when all optional fields are empty', () => {
      expect(
        calculateAccountCompletenessScore({
          phone: null,
          email: null,
          website: null,
          notes: null,
          tags: [],
        }),
      ).toBe(0);
    });

    test('FR-006: returns 100 when all optional fields are filled', () => {
      expect(
        calculateAccountCompletenessScore({
          phone: '503-555-1234',
          email: 'info@store.com',
          website: 'https://store.com',
          notes: 'Great customer',
          tags: ['organic'],
        }),
      ).toBe(100);
    });

    test('FR-006: returns 60 when 3 of 5 fields are filled', () => {
      expect(
        calculateAccountCompletenessScore({
          phone: '503-555-1234',
          email: 'info@store.com',
          website: null,
          notes: 'Some notes',
          tags: [],
        }),
      ).toBe(60);
    });

    test('FR-006: treats empty string as unfilled', () => {
      expect(
        calculateAccountCompletenessScore({
          phone: '',
          email: '',
          website: '',
          notes: '',
          tags: [],
        }),
      ).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Integration Tests: calculateHealthScore
// ---------------------------------------------------------------------------

describe('Health Score Calculation Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPrisma.account.update.mockResolvedValue({});
  });

  test('FR-006: returns null when account not found', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    const result = await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    expect(result).toBeNull();
  });

  test('FR-006: calculates score for account with full activity', async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      id: TEST_ACCOUNT_ID,
      tenant_id: TEST_TENANT_ID,
      phone: '503-555-1234',
      email: 'info@store.com',
      website: 'https://store.com',
      notes: 'Great customer',
      tags: ['organic'],
      contacts: [
        { is_primary: true, email: 'john@store.com', phone: '503-555-0001' },
      ],
    });

    mockPrisma.activity.count.mockResolvedValue(10); // Full activity
    mockPrisma.order.findFirst.mockResolvedValue({
      created_at: new Date(), // Order today
    });

    const result = await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(90);
    expect(result!.factors.activityScore).toBe(100);
    expect(result!.factors.orderRecencyScore).toBe(100);
    expect(result!.factors.contactCompletenessScore).toBe(100);
    expect(result!.factors.accountCompletenessScore).toBe(100);
  });

  test('FR-006: calculates low score for inactive account with no data', async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      id: TEST_ACCOUNT_ID,
      tenant_id: TEST_TENANT_ID,
      phone: null,
      email: null,
      website: null,
      notes: null,
      tags: [],
      contacts: [],
    });

    mockPrisma.activity.count.mockResolvedValue(0);
    mockPrisma.order.findFirst.mockResolvedValue(null);

    const result = await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    expect(result).not.toBeNull();
    expect(result!.score).toBe(0);
    expect(result!.factors.activityScore).toBe(0);
    expect(result!.factors.orderRecencyScore).toBe(0);
    expect(result!.factors.contactCompletenessScore).toBe(0);
    expect(result!.factors.accountCompletenessScore).toBe(0);
  });

  test('FR-006: persists calculated score to the account record', async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      id: TEST_ACCOUNT_ID,
      tenant_id: TEST_TENANT_ID,
      phone: '503-555-1234',
      email: null,
      website: null,
      notes: null,
      tags: [],
      contacts: [{ is_primary: true, email: 'john@store.com', phone: null }],
    });

    mockPrisma.activity.count.mockResolvedValue(5);
    mockPrisma.order.findFirst.mockResolvedValue({
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: TEST_ACCOUNT_ID },
      data: {
        health_score: expect.any(Number),
        health_score_calculated_at: expect.any(Date),
      },
    });
  });

  test('FR-006: produces deterministic scores for same inputs', async () => {
    const setupMocks = () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        id: TEST_ACCOUNT_ID,
        tenant_id: TEST_TENANT_ID,
        phone: '503-555-1234',
        email: 'info@store.com',
        website: null,
        notes: null,
        tags: [],
        contacts: [{ is_primary: true, email: 'john@store.com', phone: '503-555-0001' }],
      });
      mockPrisma.activity.count.mockResolvedValue(5);
      mockPrisma.order.findFirst.mockResolvedValue({
        created_at: new Date('2026-01-01'),
      });
    };

    setupMocks();
    const result1 = await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    setupMocks();
    const result2 = await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    expect(result1!.score).toBe(result2!.score);
    expect(result1!.factors).toEqual(result2!.factors);
  });

  test('FR-006: score is always between 0 and 100', async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      id: TEST_ACCOUNT_ID,
      tenant_id: TEST_TENANT_ID,
      phone: '503-555-1234',
      email: 'info@store.com',
      website: 'https://store.com',
      notes: 'Notes',
      tags: ['tag'],
      contacts: [{ is_primary: true, email: 'john@store.com', phone: '503-555-0001' }],
    });

    mockPrisma.activity.count.mockResolvedValue(100);
    mockPrisma.order.findFirst.mockResolvedValue({
      created_at: new Date(),
    });

    const result = await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(100);
  });

  test('FR-006: weighted score calculation is correct', async () => {
    // Set up specific factor scores for verification
    mockPrisma.account.findFirst.mockResolvedValue({
      id: TEST_ACCOUNT_ID,
      tenant_id: TEST_TENANT_ID,
      phone: null,
      email: null,
      website: null,
      notes: null,
      tags: [],
      contacts: [],
    });

    mockPrisma.activity.count.mockResolvedValue(10); // activity = 100
    mockPrisma.order.findFirst.mockResolvedValue(null); // order = 0

    const result = await calculateHealthScore(
      mockPrisma as unknown as Parameters<typeof calculateHealthScore>[0],
      TEST_TENANT_ID,
      TEST_ACCOUNT_ID,
    );

    // Expected: 100*0.4 + 0*0.3 + 0*0.15 + 0*0.15 = 40
    expect(result!.score).toBe(40);
    expect(result!.factors.activityScore).toBe(100);
    expect(result!.factors.orderRecencyScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Batch Recalculation Tests
// ---------------------------------------------------------------------------

describe('Batch Health Score Recalculation', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPrisma.account.update.mockResolvedValue({});
  });

  test('FR-006: recalculates all active non-deleted accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      { id: 'account-1' },
      { id: 'account-2' },
    ]);

    // Both accounts found with basic data
    mockPrisma.account.findFirst
      .mockResolvedValueOnce({
        id: 'account-1',
        tenant_id: TEST_TENANT_ID,
        phone: null,
        email: null,
        website: null,
        notes: null,
        tags: [],
        contacts: [],
      })
      .mockResolvedValueOnce({
        id: 'account-2',
        tenant_id: TEST_TENANT_ID,
        phone: '503-555-0001',
        email: 'info@store.com',
        website: null,
        notes: null,
        tags: [],
        contacts: [{ is_primary: true, email: 'john@store.com', phone: null }],
      });

    mockPrisma.activity.count.mockResolvedValue(0);
    mockPrisma.order.findFirst.mockResolvedValue(null);

    const result = await recalculateAllHealthScores(
      mockPrisma as unknown as Parameters<typeof recalculateAllHealthScores>[0],
      TEST_TENANT_ID,
    );

    expect(result.totalAccounts).toBe(2);
    expect(result.updatedAccounts).toBe(2);
    expect(result.averageScore).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('FR-006: handles empty tenant with no accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    const result = await recalculateAllHealthScores(
      mockPrisma as unknown as Parameters<typeof recalculateAllHealthScores>[0],
      TEST_TENANT_ID,
    );

    expect(result.totalAccounts).toBe(0);
    expect(result.updatedAccounts).toBe(0);
    expect(result.averageScore).toBe(0);
  });

  test('FR-006: queries only active non-deleted accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    await recalculateAllHealthScores(
      mockPrisma as unknown as Parameters<typeof recalculateAllHealthScores>[0],
      TEST_TENANT_ID,
    );

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: {
        tenant_id: TEST_TENANT_ID,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });
  });

  test('FR-006: computes correct average score', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      { id: 'account-1' },
      { id: 'account-2' },
    ]);

    // Account 1: activity=10 -> score=40 (only activity contributes)
    mockPrisma.account.findFirst
      .mockResolvedValueOnce({
        id: 'account-1',
        tenant_id: TEST_TENANT_ID,
        phone: null,
        email: null,
        website: null,
        notes: null,
        tags: [],
        contacts: [],
      })
      .mockResolvedValueOnce({
        id: 'account-2',
        tenant_id: TEST_TENANT_ID,
        phone: null,
        email: null,
        website: null,
        notes: null,
        tags: [],
        contacts: [],
      });

    // Account 1: 10 activities, no orders
    mockPrisma.activity.count.mockResolvedValueOnce(10).mockResolvedValueOnce(0);
    mockPrisma.order.findFirst.mockResolvedValue(null);

    const result = await recalculateAllHealthScores(
      mockPrisma as unknown as Parameters<typeof recalculateAllHealthScores>[0],
      TEST_TENANT_ID,
    );

    expect(result.updatedAccounts).toBe(2);
    // Account 1: 40, Account 2: 0 -> avg = 20
    expect(result.averageScore).toBe(20);
  });
});
