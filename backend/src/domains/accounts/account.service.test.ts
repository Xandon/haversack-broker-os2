/**
 * Account service, fuzzy match, and duplicate detection unit tests.
 * T047: Account service tests — validates account CRUD, fuzzy matching,
 * and duplicate detection logic with mocked Prisma calls.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  levenshteinDistance,
  similarityScore,
  normalizeForComparison,
  fuzzyMatch,
} from '../../shared/utils/fuzzy-match.js';
import { findDuplicates } from './duplicate-detection.service.js';
import {
  createAccount,
  getAccountById,
  listAccounts,
  updateAccount,
} from './account.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    account: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
const TEST_ACTOR_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_ACTOR_EMAIL = 'rep@haversack.com';
const TEST_TERRITORY_ID = '770e8400-e29b-41d4-a716-446655440000';
const TEST_REP_ID = '880e8400-e29b-41d4-a716-446655440000';

const VALID_INPUT = {
  name: 'Portland Natural Foods',
  account_type: 'store' as const,
  address_line1: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zip_code: '97201',
  phone: '503-555-1234',
  email: 'info@portlandnatural.com',
  territory_id: TEST_TERRITORY_ID,
  assigned_rep_id: TEST_REP_ID,
  tags: [],
};

// ---------------------------------------------------------------------------
// Fuzzy Match Utility Tests
// ---------------------------------------------------------------------------

describe('Fuzzy Match Utility', () => {
  describe('normalizeForComparison', () => {
    test('FR-003: lowercases input', () => {
      expect(normalizeForComparison('Hello World')).toBe('hello world');
    });

    test('FR-003: trims whitespace', () => {
      expect(normalizeForComparison('  hello  ')).toBe('hello');
    });

    test('FR-003: collapses multiple spaces', () => {
      expect(normalizeForComparison('hello    world')).toBe('hello world');
    });

    test('FR-003: handles empty string', () => {
      expect(normalizeForComparison('')).toBe('');
    });

    test('FR-003: handles mixed case and whitespace', () => {
      expect(normalizeForComparison('  Portland   Natural   FOODS  ')).toBe(
        'portland natural foods',
      );
    });
  });

  describe('levenshteinDistance', () => {
    test('FR-003: returns 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    test('FR-003: returns correct distance for single edit', () => {
      expect(levenshteinDistance('kitten', 'sitten')).toBe(1);
    });

    test('FR-003: returns correct distance for multiple edits', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    });

    test('FR-003: handles empty first string', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
    });

    test('FR-003: handles empty second string', () => {
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    test('FR-003: handles both empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
    });

    test('FR-003: is case-insensitive', () => {
      expect(levenshteinDistance('Hello', 'hello')).toBe(0);
    });

    test('FR-003: ignores extra whitespace', () => {
      expect(levenshteinDistance('hello  world', 'hello world')).toBe(0);
    });
  });

  describe('similarityScore', () => {
    test('FR-003: returns 1.0 for identical strings', () => {
      expect(similarityScore('Portland Natural Foods', 'Portland Natural Foods')).toBe(1.0);
    });

    test('FR-003: returns 0.0 for completely different strings', () => {
      const score = similarityScore('abc', 'xyz');
      expect(score).toBe(0);
    });

    test('FR-003: returns value between 0 and 1 for similar strings', () => {
      const score = similarityScore('Portland Natural Foods', 'Portland Naturals Food');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    test('FR-003: is case-insensitive', () => {
      expect(similarityScore('Hello', 'hello')).toBe(1.0);
    });

    test('FR-003: handles both empty strings', () => {
      expect(similarityScore('', '')).toBe(1.0);
    });
  });

  describe('fuzzyMatch', () => {
    const candidates = ['Portland Natural Foods', 'Seattle Gourmet', 'Portland Naturals'];

    test('FR-003: returns matches above threshold sorted by score', () => {
      const results = fuzzyMatch('Portland Natural', candidates, (item) => item, 0.6);
      expect(results.length).toBeGreaterThanOrEqual(1);
      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
      }
    });

    test('FR-003: excludes matches below threshold', () => {
      const results = fuzzyMatch('Portland Natural Foods', candidates, (item) => item, 0.99);
      // Only exact match should pass 0.99 threshold
      expect(results.length).toBe(1);
      expect(results[0]!.item).toBe('Portland Natural Foods');
    });

    test('FR-003: returns empty array when no matches', () => {
      const results = fuzzyMatch('Completely Different Name', candidates, (item) => item, 0.9);
      expect(results).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// Duplicate Detection Tests
// ---------------------------------------------------------------------------

describe('Duplicate Detection Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-003: detects duplicate by name similarity', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: 'existing-id-1',
        name: 'Portland Natural Foods',
        phone: null,
        address_line1: '999 Different St',
        city: 'Seattle',
        state: 'WA',
        zip_code: '98101',
      },
    ]);

    const duplicates = await findDuplicates(mockPrisma as unknown as Parameters<typeof findDuplicates>[0], TEST_TENANT_ID, {
      name: 'Portland Naturals Foods', // Very similar name
      address_line1: '123 Main St',
      city: 'Portland',
      state: 'OR',
      zip_code: '97201',
    });

    expect(duplicates.length).toBe(1);
    expect(duplicates[0]!.matchedFields.some((f) => f.field === 'name')).toBe(true);
    expect(duplicates[0]!.confidence).toBeGreaterThan(0);
  });

  test('FR-003: detects duplicate by exact phone match', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: 'existing-id-2',
        name: 'Completely Different Name',
        phone: '503-555-1234',
        address_line1: '999 Different St',
        city: 'Seattle',
        state: 'WA',
        zip_code: '98101',
      },
    ]);

    const duplicates = await findDuplicates(mockPrisma as unknown as Parameters<typeof findDuplicates>[0], TEST_TENANT_ID, {
      name: 'New Account Name',
      phone: '(503) 555-1234', // Same digits, different format
      address_line1: '123 Main St',
      city: 'Portland',
      state: 'OR',
      zip_code: '97201',
    });

    expect(duplicates.length).toBe(1);
    expect(duplicates[0]!.matchedFields.some((f) => f.field === 'phone')).toBe(true);
  });

  test('FR-003: detects duplicate by address similarity', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: 'existing-id-3',
        name: 'Completely Different Name',
        phone: null,
        address_line1: '123 Main Street',
        city: 'Portland',
        state: 'OR',
        zip_code: '97201',
      },
    ]);

    const duplicates = await findDuplicates(mockPrisma as unknown as Parameters<typeof findDuplicates>[0], TEST_TENANT_ID, {
      name: 'Another Different Name',
      address_line1: '123 Main St',
      city: 'Portland',
      state: 'OR',
      zip_code: '97201',
    });

    expect(duplicates.length).toBe(1);
    expect(duplicates[0]!.matchedFields.some((f) => f.field === 'address')).toBe(true);
  });

  test('FR-003: returns empty array when no duplicates found', async () => {
    mockPrisma.account.findMany.mockResolvedValue([
      {
        id: 'existing-id-4',
        name: 'Totally Unique Store',
        phone: '999-999-9999',
        address_line1: '999 Far Away Ave',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
      },
    ]);

    const duplicates = await findDuplicates(mockPrisma as unknown as Parameters<typeof findDuplicates>[0], TEST_TENANT_ID, {
      name: 'Portland Natural Foods',
      phone: '503-555-1234',
      address_line1: '123 Main St',
      city: 'Portland',
      state: 'OR',
      zip_code: '97201',
    });

    expect(duplicates.length).toBe(0);
  });

  test('FR-003: queries only active non-deleted accounts for the tenant', async () => {
    mockPrisma.account.findMany.mockResolvedValue([]);

    await findDuplicates(mockPrisma as unknown as Parameters<typeof findDuplicates>[0], TEST_TENANT_ID, {
      name: 'Test',
    });

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: {
        tenant_id: TEST_TENANT_ID,
        deleted_at: null,
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address_line1: true,
        city: true,
        state: true,
        zip_code: true,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Account Service Tests
// ---------------------------------------------------------------------------

describe('Account Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // Default: no duplicates found
    mockPrisma.account.findMany.mockResolvedValue([]);
    mockPrisma.auditTrail.create.mockResolvedValue({});
  });

  describe('createAccount', () => {
    test('FR-001: creates account with required fields', async () => {
      const createdAccount = {
        id: 'new-account-id',
        tenant_id: TEST_TENANT_ID,
        ...VALID_INPUT,
        address_line2: null,
        website: null,
        parent_account_id: null,
        notes: null,
        health_score: null,
        health_score_calculated_at: null,
        metadata: {},
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      mockPrisma.account.create.mockResolvedValue(createdAccount);

      const result = await createAccount(
        mockPrisma as unknown as Parameters<typeof createAccount>[0],
        TEST_TENANT_ID,
        VALID_INPUT,
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      expect(result.account).toEqual(createdAccount);
      expect(result.account.name).toBe('Portland Natural Foods');
      expect(result.account.tenant_id).toBe(TEST_TENANT_ID);
      expect(mockPrisma.account.create).toHaveBeenCalledOnce();
    });

    test('FR-001: includes tenant_id in create data', async () => {
      mockPrisma.account.create.mockResolvedValue({
        id: 'new-id',
        tenant_id: TEST_TENANT_ID,
        ...VALID_INPUT,
      });

      await createAccount(
        mockPrisma as unknown as Parameters<typeof createAccount>[0],
        TEST_TENANT_ID,
        VALID_INPUT,
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      const createCall = mockPrisma.account.create.mock.calls[0]![0];
      expect(createCall.data.tenant_id).toBe(TEST_TENANT_ID);
    });

    test('FR-001: returns duplicate matches along with created account', async () => {
      // Set up existing duplicate
      mockPrisma.account.findMany.mockResolvedValue([
        {
          id: 'existing-dup-id',
          name: 'Portland Natural Foods', // Exact match
          phone: null,
          address_line1: '999 Other St',
          city: 'Seattle',
          state: 'WA',
          zip_code: '98101',
        },
      ]);

      mockPrisma.account.create.mockResolvedValue({
        id: 'new-id',
        tenant_id: TEST_TENANT_ID,
        ...VALID_INPUT,
      });

      const result = await createAccount(
        mockPrisma as unknown as Parameters<typeof createAccount>[0],
        TEST_TENANT_ID,
        VALID_INPUT,
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      expect(result.duplicates.length).toBeGreaterThan(0);
    });

    test('FR-001: writes audit trail entry on account creation', async () => {
      mockPrisma.account.create.mockResolvedValue({
        id: 'new-id',
        name: 'Test Account',
        account_type: 'store',
        territory_id: TEST_TERRITORY_ID,
        tenant_id: TEST_TENANT_ID,
      });

      await createAccount(
        mockPrisma as unknown as Parameters<typeof createAccount>[0],
        TEST_TENANT_ID,
        VALID_INPUT,
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      // Audit entry is fire-and-forget, but the mock should be called
      // We need to wait for the next tick since it's a void promise
      await vi.waitFor(() => {
        expect(mockPrisma.auditTrail.create).toHaveBeenCalled();
      });
    });
  });

  describe('getAccountById', () => {
    test('FR-001: returns account with contacts when found', async () => {
      const account = {
        id: 'account-id',
        tenant_id: TEST_TENANT_ID,
        name: 'Test Account',
        contacts: [{ id: 'contact-1', first_name: 'John', last_name: 'Doe' }],
      };

      mockPrisma.account.findFirst.mockResolvedValue(account);

      const result = await getAccountById(
        mockPrisma as unknown as Parameters<typeof getAccountById>[0],
        TEST_TENANT_ID,
        'account-id',
      );

      expect(result).toEqual(account);
      expect(result?.contacts).toHaveLength(1);
    });

    test('FR-001: returns null when account not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await getAccountById(
        mockPrisma as unknown as Parameters<typeof getAccountById>[0],
        TEST_TENANT_ID,
        'nonexistent-id',
      );

      expect(result).toBeNull();
    });

    test('FR-001: filters by tenant_id and excludes deleted', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await getAccountById(
        mockPrisma as unknown as Parameters<typeof getAccountById>[0],
        TEST_TENANT_ID,
        'account-id',
      );

      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'account-id',
          tenant_id: TEST_TENANT_ID,
          deleted_at: null,
        },
        include: {
          contacts: {
            where: { deleted_at: null },
            orderBy: { is_primary: 'desc' },
          },
        },
      });
    });
  });

  describe('listAccounts', () => {
    test('FR-001: returns paginated accounts', async () => {
      const accounts = [
        { id: '1', name: 'Account 1' },
        { id: '2', name: 'Account 2' },
      ];

      mockPrisma.account.findMany.mockResolvedValue(accounts);
      mockPrisma.account.count.mockResolvedValue(25);

      const result = await listAccounts(
        mockPrisma as unknown as Parameters<typeof listAccounts>[0],
        TEST_TENANT_ID,
        { page: 2, pageSize: 10 },
      );

      expect(result.items).toEqual(accounts);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
    });

    test('FR-001: applies territory filter', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);

      await listAccounts(
        mockPrisma as unknown as Parameters<typeof listAccounts>[0],
        TEST_TENANT_ID,
        { territoryId: TEST_TERRITORY_ID },
      );

      const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
      expect(findManyCall.where.territory_id).toBe(TEST_TERRITORY_ID);
    });

    test('FR-001: applies search filter with case-insensitive matching', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);

      await listAccounts(
        mockPrisma as unknown as Parameters<typeof listAccounts>[0],
        TEST_TENANT_ID,
        { search: 'Portland' },
      );

      const findManyCall = mockPrisma.account.findMany.mock.calls[0]![0];
      expect(findManyCall.where.name).toEqual({
        contains: 'Portland',
        mode: 'insensitive',
      });
    });

    test('FR-001: uses default pagination when not specified', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);

      const result = await listAccounts(
        mockPrisma as unknown as Parameters<typeof listAccounts>[0],
        TEST_TENANT_ID,
      );

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe('updateAccount', () => {
    test('FR-001: updates account and returns updated record', async () => {
      const existing = {
        id: 'account-id',
        tenant_id: TEST_TENANT_ID,
        name: 'Old Name',
        account_type: 'store',
      };
      const updated = { ...existing, name: 'New Name' };

      mockPrisma.account.findFirst.mockResolvedValue(existing);
      mockPrisma.account.update.mockResolvedValue(updated);

      const result = await updateAccount(
        mockPrisma as unknown as Parameters<typeof updateAccount>[0],
        TEST_TENANT_ID,
        'account-id',
        { name: 'New Name' },
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      expect(result).toEqual(updated);
      expect(result!.name).toBe('New Name');
    });

    test('FR-001: returns null when account not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await updateAccount(
        mockPrisma as unknown as Parameters<typeof updateAccount>[0],
        TEST_TENANT_ID,
        'nonexistent-id',
        { name: 'New Name' },
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      expect(result).toBeNull();
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
    });

    test('FR-001: writes audit trail with change summary on update', async () => {
      const existing = {
        id: 'account-id',
        tenant_id: TEST_TENANT_ID,
        name: 'Old Name',
      };
      const updated = { ...existing, name: 'New Name' };

      mockPrisma.account.findFirst.mockResolvedValue(existing);
      mockPrisma.account.update.mockResolvedValue(updated);

      await updateAccount(
        mockPrisma as unknown as Parameters<typeof updateAccount>[0],
        TEST_TENANT_ID,
        'account-id',
        { name: 'New Name' },
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      await vi.waitFor(() => {
        expect(mockPrisma.auditTrail.create).toHaveBeenCalled();
      });
    });
  });
});
