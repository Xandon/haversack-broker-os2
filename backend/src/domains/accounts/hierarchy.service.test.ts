/**
 * Account hierarchy service tests.
 * Validates parent-child hierarchy management, circular reference prevention,
 * parent chain building, rollup metrics, and child account queries.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  getAccountHierarchy,
  getChildAccounts,
  setParentAccount,
} from './hierarchy.service.js';

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
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const ACCOUNT_A_ID = 'aaaa0000-0000-0000-0000-000000000001';
const ACCOUNT_B_ID = 'bbbb0000-0000-0000-0000-000000000002';
const ACCOUNT_C_ID = 'cccc0000-0000-0000-0000-000000000003';

// ---------------------------------------------------------------------------
// getChildAccounts Tests
// ---------------------------------------------------------------------------

describe('getChildAccounts', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-002: returns direct child accounts for a parent', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      { id: ACCOUNT_B_ID, name: 'Child Store', account_type: 'store', health_score: 75, is_active: true },
      { id: ACCOUNT_C_ID, name: 'Child Restaurant', account_type: 'restaurant', health_score: 60, is_active: true },
    ]);

    const children = await getChildAccounts(
      mockPrisma as unknown as Parameters<typeof getChildAccounts>[0],
      TEST_TENANT_ID,
      ACCOUNT_A_ID,
    );

    expect(children).toHaveLength(2);
    expect(children[0]!.id).toBe(ACCOUNT_B_ID);
    expect(children[1]!.id).toBe(ACCOUNT_C_ID);
  });

  test('FR-002: returns empty array when no children exist', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    const children = await getChildAccounts(
      mockPrisma as unknown as Parameters<typeof getChildAccounts>[0],
      TEST_TENANT_ID,
      ACCOUNT_A_ID,
    );

    expect(children).toEqual([]);
  });

  test('FR-002: excludes deleted child accounts', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    await getChildAccounts(
      mockPrisma as unknown as Parameters<typeof getChildAccounts>[0],
      TEST_TENANT_ID,
      ACCOUNT_A_ID,
    );

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: {
        tenant_id: TEST_TENANT_ID,
        parent_account_id: ACCOUNT_A_ID,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        account_type: true,
        health_score: true,
        is_active: true,
      },
      orderBy: { name: 'asc' },
    });
  });
});

// ---------------------------------------------------------------------------
// getAccountHierarchy Tests
// ---------------------------------------------------------------------------

describe('getAccountHierarchy', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-002: returns null when account not found', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    const result = await getAccountHierarchy(
      mockPrisma as unknown as Parameters<typeof getAccountHierarchy>[0],
      TEST_TENANT_ID,
      'nonexistent-id',
    );

    expect(result).toBeNull();
  });

  test('FR-002: returns hierarchy with parent chain and children', async () => {
    // First call: the account itself
    mockPrisma.account.findFirst
      .mockResolvedValueOnce({
        id: ACCOUNT_B_ID,
        name: 'Child Store',
        account_type: 'store',
        health_score: 75,
        is_active: true,
        parent_account_id: ACCOUNT_A_ID,
      })
      // Second call: parent chain walk (the parent)
      .mockResolvedValueOnce({
        id: ACCOUNT_A_ID,
        name: 'Parent Corp',
        account_type: 'distributor',
        health_score: 80,
        is_active: true,
        parent_account_id: null,
      });

    // Children of Account B
    mockPrisma.account.findMany.mockResolvedValue([
      { id: ACCOUNT_C_ID, name: 'Grandchild', account_type: 'store', health_score: 50, is_active: true },
    ]);

    const result = await getAccountHierarchy(
      mockPrisma as unknown as Parameters<typeof getAccountHierarchy>[0],
      TEST_TENANT_ID,
      ACCOUNT_B_ID,
    );

    expect(result).not.toBeNull();
    expect(result!.account.id).toBe(ACCOUNT_B_ID);
    expect(result!.parentChain).toHaveLength(1);
    expect(result!.parentChain[0]!.id).toBe(ACCOUNT_A_ID);
    expect(result!.children).toHaveLength(1);
    expect(result!.children[0]!.id).toBe(ACCOUNT_C_ID);
  });

  test('FR-002: calculates rollup metrics from children', async () => {
    mockPrisma.account.findFirst.mockResolvedValueOnce({
      id: ACCOUNT_A_ID,
      name: 'Parent Corp',
      account_type: 'distributor',
      health_score: 80,
      is_active: true,
      parent_account_id: null,
    });

    mockPrisma.account.findMany.mockResolvedValue([
      { id: ACCOUNT_B_ID, name: 'Child 1', account_type: 'store', health_score: 60, is_active: true },
      { id: ACCOUNT_C_ID, name: 'Child 2', account_type: 'restaurant', health_score: 80, is_active: true },
    ]);

    const result = await getAccountHierarchy(
      mockPrisma as unknown as Parameters<typeof getAccountHierarchy>[0],
      TEST_TENANT_ID,
      ACCOUNT_A_ID,
    );

    expect(result!.rollupMetrics.totalChildCount).toBe(2);
    expect(result!.rollupMetrics.averageHealthScore).toBe(70);
  });

  test('FR-002: handles children with null health scores in rollup', async () => {
    mockPrisma.account.findFirst.mockResolvedValueOnce({
      id: ACCOUNT_A_ID,
      name: 'Parent',
      account_type: 'distributor',
      health_score: null,
      is_active: true,
      parent_account_id: null,
    });

    mockPrisma.account.findMany.mockResolvedValue([
      { id: ACCOUNT_B_ID, name: 'Child 1', account_type: 'store', health_score: null, is_active: true },
      { id: ACCOUNT_C_ID, name: 'Child 2', account_type: 'restaurant', health_score: 80, is_active: true },
    ]);

    const result = await getAccountHierarchy(
      mockPrisma as unknown as Parameters<typeof getAccountHierarchy>[0],
      TEST_TENANT_ID,
      ACCOUNT_A_ID,
    );

    // Only 1 child has a score, average should be 80
    expect(result!.rollupMetrics.totalChildCount).toBe(2);
    expect(result!.rollupMetrics.averageHealthScore).toBe(80);
  });

  test('FR-002: returns null average when no children have health scores', async () => {
    mockPrisma.account.findFirst.mockResolvedValueOnce({
      id: ACCOUNT_A_ID,
      name: 'Parent',
      account_type: 'distributor',
      health_score: null,
      is_active: true,
      parent_account_id: null,
    });

    mockPrisma.account.findMany.mockResolvedValue([
      { id: ACCOUNT_B_ID, name: 'Child 1', account_type: 'store', health_score: null, is_active: true },
    ]);

    const result = await getAccountHierarchy(
      mockPrisma as unknown as Parameters<typeof getAccountHierarchy>[0],
      TEST_TENANT_ID,
      ACCOUNT_A_ID,
    );

    expect(result!.rollupMetrics.averageHealthScore).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setParentAccount Tests
// ---------------------------------------------------------------------------

describe('setParentAccount', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-002: returns null when account not found', async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);

    const result = await setParentAccount(
      mockPrisma as unknown as Parameters<typeof setParentAccount>[0],
      TEST_TENANT_ID,
      'nonexistent-id',
      ACCOUNT_A_ID,
    );

    expect(result).toBeNull();
  });

  test('FR-002: throws error when setting self as parent', async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      id: ACCOUNT_A_ID,
      tenant_id: TEST_TENANT_ID,
    });

    await expect(
      setParentAccount(
        mockPrisma as unknown as Parameters<typeof setParentAccount>[0],
        TEST_TENANT_ID,
        ACCOUNT_A_ID,
        ACCOUNT_A_ID,
      ),
    ).rejects.toThrow('An account cannot be its own parent');
  });

  test('FR-002: throws error when parent account not found', async () => {
    mockPrisma.account.findFirst
      .mockResolvedValueOnce({ id: ACCOUNT_A_ID, tenant_id: TEST_TENANT_ID }) // account exists
      .mockResolvedValueOnce(null); // parent not found

    await expect(
      setParentAccount(
        mockPrisma as unknown as Parameters<typeof setParentAccount>[0],
        TEST_TENANT_ID,
        ACCOUNT_A_ID,
        'nonexistent-parent',
      ),
    ).rejects.toThrow('Parent account not found');
  });

  test('FR-002: throws error on circular reference (A -> B -> A)', async () => {
    // Account A exists
    mockPrisma.account.findFirst
      .mockResolvedValueOnce({ id: ACCOUNT_B_ID, tenant_id: TEST_TENANT_ID }) // account B exists
      .mockResolvedValueOnce({ id: ACCOUNT_A_ID, tenant_id: TEST_TENANT_ID }) // parent A exists
      // Circular check: walk from A upward
      .mockResolvedValueOnce({ parent_account_id: ACCOUNT_B_ID }); // A's parent is B -> circular!

    await expect(
      setParentAccount(
        mockPrisma as unknown as Parameters<typeof setParentAccount>[0],
        TEST_TENANT_ID,
        ACCOUNT_B_ID,
        ACCOUNT_A_ID,
      ),
    ).rejects.toThrow('Setting this parent would create a circular reference');
  });

  test('FR-002: successfully sets parent when no circular reference', async () => {
    const updatedAccount = {
      id: ACCOUNT_B_ID,
      tenant_id: TEST_TENANT_ID,
      parent_account_id: ACCOUNT_A_ID,
    };

    mockPrisma.account.findFirst
      .mockResolvedValueOnce({ id: ACCOUNT_B_ID, tenant_id: TEST_TENANT_ID }) // account exists
      .mockResolvedValueOnce({ id: ACCOUNT_A_ID, tenant_id: TEST_TENANT_ID }) // parent exists
      // Circular check: walk from A upward - A has no parent
      .mockResolvedValueOnce({ parent_account_id: null });

    mockPrisma.account.update.mockResolvedValue(updatedAccount);

    const result = await setParentAccount(
      mockPrisma as unknown as Parameters<typeof setParentAccount>[0],
      TEST_TENANT_ID,
      ACCOUNT_B_ID,
      ACCOUNT_A_ID,
    );

    expect(result).toEqual(updatedAccount);
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: ACCOUNT_B_ID },
      data: { parent_account_id: ACCOUNT_A_ID },
    });
  });

  test('FR-002: successfully removes parent by setting null', async () => {
    const updatedAccount = {
      id: ACCOUNT_B_ID,
      tenant_id: TEST_TENANT_ID,
      parent_account_id: null,
    };

    mockPrisma.account.findFirst.mockResolvedValue({
      id: ACCOUNT_B_ID,
      tenant_id: TEST_TENANT_ID,
    });

    mockPrisma.account.update.mockResolvedValue(updatedAccount);

    const result = await setParentAccount(
      mockPrisma as unknown as Parameters<typeof setParentAccount>[0],
      TEST_TENANT_ID,
      ACCOUNT_B_ID,
      null,
    );

    expect(result).toEqual(updatedAccount);
    expect(mockPrisma.account.update).toHaveBeenCalledWith({
      where: { id: ACCOUNT_B_ID },
      data: { parent_account_id: null },
    });
  });
});
