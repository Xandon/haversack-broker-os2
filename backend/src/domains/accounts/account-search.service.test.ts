import { describe, test, expect, vi, beforeEach } from 'vitest';
import { searchAccounts } from './account-search.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

function createMockPrisma(): Record<string, unknown> {
  return {
    $queryRawUnsafe: vi.fn(),
  };
}

describe('FR-003: Account search service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
  });

  test('FR-003: searches accounts by name with ILIKE', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ total: 1 }]) // count query
      .mockResolvedValueOnce([
        {
          id: 'acc-1',
          name: 'Pacific Bistro',
          tenant_id: TENANT_ID,
          relevance_rank: 1,
        },
      ]);

    const result = await searchAccounts(prisma as never, TENANT_ID, {
      query: 'pacific',
    });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  test('FR-003: returns empty results for no matches', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    const result = await searchAccounts(prisma as never, TENANT_ID, {
      query: 'nonexistent',
    });

    expect(result.data).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  test('FR-003: applies territory filter to search', async () => {
    const territoryId = '00000000-0000-4000-a000-000000000002';
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await searchAccounts(prisma as never, TENANT_ID, {
      query: 'test',
      territoryId,
    });

    const countCall = (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(countCall?.[0]).toContain('territory_id');
    expect(countCall).toContain(territoryId);
  });

  test('FR-003: supports pagination with cursor', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ total: 50 }])
      .mockResolvedValueOnce([
        { id: 'acc-21', name: 'Test 21', relevance_rank: 1 },
      ]);

    const result = await searchAccounts(prisma as never, TENANT_ID, {
      query: 'test',
      cursor: 'acc-20',
      limit: 20,
    });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(50);
  });

  test('FR-003: limits results to requested limit + 1 for hasMore detection', async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      id: `acc-${i}`,
      name: `Test ${i}`,
      relevance_rank: 1,
    }));
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ total: 50 }])
      .mockResolvedValueOnce(items);

    const result = await searchAccounts(prisma as never, TENANT_ID, {
      query: 'test',
      limit: 20,
    });

    expect(result.data).toHaveLength(20);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.cursor).toBeDefined();
  });

  test('FR-003: includes tenant_id in all queries', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await searchAccounts(prisma as never, TENANT_ID, { query: 'test' });

    const calls = (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of calls) {
      expect(call[0]).toContain('tenant_id');
      expect(call).toContain(TENANT_ID);
    }
  });

  test('FR-003: strips relevance_rank from returned data', async () => {
    (prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        { id: 'acc-1', name: 'Test', relevance_rank: 1, city: 'Portland' },
      ]);

    const result = await searchAccounts(prisma as never, TENANT_ID, {
      query: 'test',
    });

    const firstResult = result.data[0] as Record<string, unknown>;
    expect(firstResult).not.toHaveProperty('relevance_rank');
  });
});
