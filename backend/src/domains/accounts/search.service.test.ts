/**
 * Account search service tests.
 * Validates search functionality including relevance ranking, pagination,
 * filtering by account type/territory, empty queries, and edge cases.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { searchAccounts, quickSearchAccounts } from './search.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    account: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_TERRITORY_ID = '770e8400-e29b-41d4-a716-446655440000';

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'account-1',
    tenant_id: TEST_TENANT_ID,
    name: 'Portland Natural Foods',
    account_type: 'store',
    address_line1: '123 Main St',
    address_line2: null,
    city: 'Portland',
    state: 'OR',
    zip_code: '97201',
    phone: '503-555-1234',
    email: 'info@portlandnatural.com',
    website: null,
    territory_id: TEST_TERRITORY_ID,
    assigned_rep_id: 'rep-1',
    parent_account_id: null,
    health_score: 75,
    health_score_calculated_at: new Date(),
    notes: null,
    tags: [],
    metadata: {},
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// searchAccounts Tests
// ---------------------------------------------------------------------------

describe('searchAccounts', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-005: returns empty results for empty query', async () => {
    const result = await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      '',
    );

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(mockPrisma.account.findMany).not.toHaveBeenCalled();
  });

  test('FR-005: returns empty results for whitespace-only query', async () => {
    const result = await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      '   ',
    );

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('FR-005: searches across name, address, and city fields', async () => {
    mockPrisma.account.count.mockResolvedValue(1);
    mockPrisma.account.findMany.mockResolvedValue([
      makeAccount({ name: 'Portland Natural Foods' }),
    ]);

    await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'Portland',
    );

    const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
    expect(findManyCall.where.OR).toEqual([
      { name: { contains: 'Portland', mode: 'insensitive' } },
      { address_line1: { contains: 'Portland', mode: 'insensitive' } },
      { city: { contains: 'Portland', mode: 'insensitive' } },
    ]);
  });

  test('FR-005: ranks exact name match higher than partial match', async () => {
    mockPrisma.account.count.mockResolvedValue(2);
    mockPrisma.account.findMany.mockResolvedValue([
      makeAccount({ id: 'partial', name: 'Portland Natural Foods Market' }),
      makeAccount({ id: 'exact', name: 'Portland' }),
    ]);

    const result = await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'Portland',
    );

    expect(result.items[0]!.relevance).toBe('exact_name');
    expect(result.items[0]!.account.id).toBe('exact');
    expect(result.items[1]!.relevance).toBe('partial_name');
  });

  test('FR-005: applies account_type filter', async () => {
    mockPrisma.account.count.mockResolvedValue(0);
    mockPrisma.account.findMany.mockResolvedValue([]);

    await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'Portland',
      { accountType: 'store' },
    );

    const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
    expect(findManyCall.where.account_type).toBe('store');
  });

  test('FR-005: applies territory_id filter', async () => {
    mockPrisma.account.count.mockResolvedValue(0);
    mockPrisma.account.findMany.mockResolvedValue([]);

    await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'Portland',
      { territoryId: TEST_TERRITORY_ID },
    );

    const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
    expect(findManyCall.where.territory_id).toBe(TEST_TERRITORY_ID);
  });

  test('FR-005: applies is_active filter', async () => {
    mockPrisma.account.count.mockResolvedValue(0);
    mockPrisma.account.findMany.mockResolvedValue([]);

    await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'Portland',
      { isActive: true },
    );

    const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
    expect(findManyCall.where.is_active).toBe(true);
  });

  test('FR-005: enforces tenant isolation in search', async () => {
    mockPrisma.account.count.mockResolvedValue(0);
    mockPrisma.account.findMany.mockResolvedValue([]);

    await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'query',
    );

    const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
    expect(findManyCall.where.tenant_id).toBe(TEST_TENANT_ID);
    expect(findManyCall.where.deleted_at).toBeNull();
  });

  test('FR-005: returns correct pagination metadata', async () => {
    mockPrisma.account.count.mockResolvedValue(50);
    mockPrisma.account.findMany.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) =>
        makeAccount({ id: `account-${i}`, name: `Store ${i}` }),
      ),
    );

    const result = await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'Store',
      { page: 2, pageSize: 10 },
    );

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(50);
    expect(result.items).toHaveLength(10);
  });

  test('FR-005: city match is ranked as city relevance', async () => {
    mockPrisma.account.count.mockResolvedValue(1);
    mockPrisma.account.findMany.mockResolvedValue([
      makeAccount({ id: 'city-match', name: 'Other Store', city: 'Seattle' }),
    ]);

    const result = await searchAccounts(
      mockPrisma as unknown as Parameters<typeof searchAccounts>[0],
      TEST_TENANT_ID,
      'Seattle',
    );

    expect(result.items[0]!.relevance).toBe('city');
  });
});

// ---------------------------------------------------------------------------
// quickSearchAccounts Tests
// ---------------------------------------------------------------------------

describe('quickSearchAccounts', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-005: returns empty results for empty query', async () => {
    const result = await quickSearchAccounts(
      mockPrisma as unknown as Parameters<typeof quickSearchAccounts>[0],
      TEST_TENANT_ID,
      '',
    );

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('FR-005: searches by name only with insensitive mode', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.account.count.mockResolvedValue(0);

    await quickSearchAccounts(
      mockPrisma as unknown as Parameters<typeof quickSearchAccounts>[0],
      TEST_TENANT_ID,
      'Portland',
    );

    const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
    expect(findManyCall.where.name).toEqual({
      contains: 'Portland',
      mode: 'insensitive',
    });
  });

  test('FR-005: uses default page size of 10 for typeahead', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.account.count.mockResolvedValue(0);

    const result = await quickSearchAccounts(
      mockPrisma as unknown as Parameters<typeof quickSearchAccounts>[0],
      TEST_TENANT_ID,
      'Portland',
    );

    expect(result.pageSize).toBe(10);
  });
});
