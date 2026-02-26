import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createAccount,
  getAccountById,
  updateAccount,
  softDeleteAccount,
  listAccounts,
  validateParentChild,
  AccountError,
} from './account.service';
import type { CreateAccountInput } from '@haversack/shared';

// Mock audit service
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000002';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';

const auditCtx = {
  actorId: '00000000-0000-4000-a000-000000000099',
  actorEmail: 'rep@haversack.com',
  requestId: '00000000-0000-4000-a000-000000000100',
};

function mockAccount(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ACCOUNT_ID,
    tenantId: TENANT_ID,
    name: 'Pacific Bistro',
    accountType: 'restaurant',
    streetAddress: '123 Main St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    territoryId: TERRITORY_ID,
    parentAccountId: null,
    healthScore: null,
    healthScoreCalculatedAt: null,
    isActive: true,
    createdAt: new Date('2026-02-26T00:00:00Z'),
    updatedAt: new Date('2026-02-26T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function createMockPrisma(): Record<string, unknown> {
  return {
    account: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

const validInput: CreateAccountInput = {
  name: 'Pacific Bistro',
  accountType: 'restaurant',
  streetAddress: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zipCode: '97201',
  territoryId: TERRITORY_ID,
  primaryContact: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@pacific.com',
    phone: '503-555-1234',
  },
  skipDuplicateCheck: false,
};

describe('FR-001: Account service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
  });

  describe('createAccount', () => {
    test('US1-AC1: creates account with required fields and primary contact', async () => {
      const created = mockAccount();
      (prisma.account.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await createAccount(
        prisma as never,
        TENANT_ID,
        validInput,
        auditCtx,
      );

      expect(result).toEqual(created);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'Pacific Bistro',
          accountType: 'restaurant',
          contacts: {
            create: expect.objectContaining({
              tenantId: TENANT_ID,
              firstName: 'Jane',
              lastName: 'Doe',
              isPrimary: true,
            }),
          },
        }),
      });
    });

    test('US1-AC1: writes audit trail on create', async () => {
      (prisma.account.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount());

      const { writeAuditLog } = await import('../../shared/services/audit.service');

      await createAccount(prisma as never, TENANT_ID, validInput, auditCtx);

      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Account',
          action: 'create',
          actorId: auditCtx.actorId,
        }),
      );
    });

    test('US1-AC1: sets parentAccountId to null when not provided', async () => {
      (prisma.account.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount());

      await createAccount(prisma as never, TENANT_ID, validInput, auditCtx);

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentAccountId: null,
        }),
      });
    });
  });

  describe('getAccountById', () => {
    test('US2-AC1: returns account with contacts and territory', async () => {
      const accountWithRelations = {
        ...mockAccount(),
        territory: { id: TERRITORY_ID, name: 'Portland Metro' },
        parentAccount: null,
        childAccounts: [],
        contacts: [
          {
            id: '00000000-0000-4000-a000-000000000020',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@pacific.com',
            phone: '503-555-1234',
            title: null,
            isPrimary: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(accountWithRelations);

      const result = await getAccountById(prisma as never, TENANT_ID, ACCOUNT_ID);

      expect(result.name).toBe('Pacific Bistro');
      expect(result.contacts).toHaveLength(1);
      expect(result.territory.name).toBe('Portland Metro');
    });

    test('US2-AC1: queries with tenant isolation', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        getAccountById(prisma as never, TENANT_ID, ACCOUNT_ID),
      ).rejects.toThrow(AccountError);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: ACCOUNT_ID, tenantId: TENANT_ID, deletedAt: null },
        include: expect.any(Object),
      });
    });

    test('US2-AC1: throws ACCOUNT_NOT_FOUND for missing account', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        getAccountById(prisma as never, TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(new AccountError('Account not found', 'ACCOUNT_NOT_FOUND'));
    });

    test('US2-AC2: excludes soft-deleted contacts', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockAccount(),
        territory: { id: TERRITORY_ID, name: 'Portland Metro' },
        parentAccount: null,
        childAccounts: [],
        contacts: [],
      });

      await getAccountById(prisma as never, TENANT_ID, ACCOUNT_ID);

      expect(prisma.account.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            contacts: expect.objectContaining({
              where: { deletedAt: null },
            }),
          }),
        }),
      );
    });
  });

  describe('updateAccount', () => {
    test('US6-AC1: updates account fields and returns updated record', async () => {
      const existing = mockAccount();
      const updated = mockAccount({ name: 'Updated Bistro' });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.account.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await updateAccount(
        prisma as never,
        TENANT_ID,
        ACCOUNT_ID,
        { name: 'Updated Bistro' },
        undefined,
        auditCtx,
      );

      expect(result.name).toBe('Updated Bistro');
    });

    test('US6-AC1: throws ACCOUNT_NOT_FOUND for missing account', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        updateAccount(prisma as never, TENANT_ID, ACCOUNT_ID, { name: 'X' }, undefined, auditCtx),
      ).rejects.toThrow(new AccountError('Account not found', 'ACCOUNT_NOT_FOUND'));
    });

    test('US6-AC1: detects concurrent edit conflict (409)', async () => {
      const existing = mockAccount({ updatedAt: new Date('2026-02-26T00:00:00Z') });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

      await expect(
        updateAccount(
          prisma as never,
          TENANT_ID,
          ACCOUNT_ID,
          { name: 'X' },
          '2026-02-25T00:00:00Z', // Stale timestamp
          auditCtx,
        ),
      ).rejects.toThrow(new AccountError('Account has been modified by another user', 'ACCOUNT_CONFLICT'));
    });

    test('US6-AC1: skips concurrency check when no expectedUpdatedAt', async () => {
      const existing = mockAccount();
      const updated = mockAccount({ name: 'Updated' });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.account.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      await expect(
        updateAccount(prisma as never, TENANT_ID, ACCOUNT_ID, { name: 'Updated' }, undefined, auditCtx),
      ).resolves.toBeDefined();
    });
  });

  describe('softDeleteAccount', () => {
    test('US6-AC2: sets deletedAt and writes audit log', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount());
      (prisma.account.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await softDeleteAccount(prisma as never, TENANT_ID, ACCOUNT_ID, auditCtx);

      expect(result.id).toBe(ACCOUNT_ID);
      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: ACCOUNT_ID },
        data: { deletedAt: expect.any(Date) },
      });
    });

    test('US6-AC2: throws ACCOUNT_NOT_FOUND for missing account', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        softDeleteAccount(prisma as never, TENANT_ID, 'nonexistent', auditCtx),
      ).rejects.toThrow(AccountError);
    });
  });

  describe('listAccounts', () => {
    test('FR-001: returns paginated accounts with tenant isolation', async () => {
      const accounts = [mockAccount(), mockAccount({ id: 'id2' })];
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(accounts);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

      const result = await listAccounts(prisma as never, TENANT_ID, {});

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.hasMore).toBe(false);
    });

    test('FR-001: applies territory filter', async () => {
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await listAccounts(prisma as never, TENANT_ID, { territoryId: TERRITORY_ID });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ territoryId: TERRITORY_ID }),
        }),
      );
    });

    test('FR-006: applies health score range filter', async () => {
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await listAccounts(prisma as never, TENANT_ID, {
        healthScoreMin: 0,
        healthScoreMax: 39,
      });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            healthScore: { gte: 0, lte: 39 },
          }),
        }),
      );
    });

    test('FR-001: excludes soft-deleted by default', async () => {
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await listAccounts(prisma as never, TENANT_ID, {});

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    test('FR-001: includes soft-deleted when flag set', async () => {
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await listAccounts(prisma as never, TENANT_ID, { includeDeleted: true });

      const callArgs = (prisma.account.findMany as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(callArgs?.where?.deletedAt).toBeUndefined();
    });

    test('FR-001: indicates hasMore when more results exist', async () => {
      const manyAccounts = Array.from({ length: 21 }, (_, i) =>
        mockAccount({ id: `id-${i}` }),
      );
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(manyAccounts);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(50);

      const result = await listAccounts(prisma as never, TENANT_ID, { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeDefined();
    });
  });

  describe('validateParentChild', () => {
    test('FR-004: rejects self-referencing parent', async () => {
      await expect(
        validateParentChild(prisma as never, TENANT_ID, ACCOUNT_ID, ACCOUNT_ID),
      ).rejects.toThrow(
        new AccountError('An account cannot be its own parent', 'ACCOUNT_CIRCULAR_HIERARCHY'),
      );
    });

    test('FR-004: rejects when parent already has a parent (depth > 2)', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockAccount({ parentAccountId: 'some-other-id' }),
      );

      await expect(
        validateParentChild(prisma as never, TENANT_ID, ACCOUNT_ID, 'parent-id'),
      ).rejects.toThrow(
        new AccountError('Parent-child hierarchies are limited to 2 levels', 'ACCOUNT_CIRCULAR_HIERARCHY'),
      );
    });

    test('FR-004: rejects when parent not found', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        validateParentChild(prisma as never, TENANT_ID, ACCOUNT_ID, 'nonexistent'),
      ).rejects.toThrow(
        new AccountError('Parent account not found', 'ACCOUNT_NOT_FOUND'),
      );
    });

    test('FR-004: allows valid parent-child link', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccount({ id: 'parent-id', parentAccountId: null }))
        .mockResolvedValueOnce(null); // No circular dependency

      await expect(
        validateParentChild(prisma as never, TENANT_ID, ACCOUNT_ID, 'parent-id'),
      ).resolves.toBeUndefined();
    });
  });
});
