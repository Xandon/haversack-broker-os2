import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createAccountService } from './account.service.js';

function createMockPrisma() {
  return {
    account: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('AccountService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createAccountService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createAccountService(mockPrisma as any);
  });

  describe('list', () => {
    it('FR-001: returns paginated accounts', async () => {
      const mockAccounts = [{ id: '1', name: 'Pacific Bistro', tenantId: TENANT_ID }];
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.account.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockAccounts);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('FR-003: filters by search term across name, city, email, phone', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { search: 'Pacific' });

      const callArgs = mockPrisma.account.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR).toHaveLength(4);
    });

    it('FR-001: filters by account type', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { accountType: 'restaurant' });

      const callArgs = mockPrisma.account.findMany.mock.calls[0][0];
      expect(callArgs.where.accountType).toBe('restaurant');
    });

    it('FR-001: excludes soft-deleted accounts', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 });

      const callArgs = mockPrisma.account.findMany.mock.calls[0][0];
      expect(callArgs.where.deletedAt).toBeNull();
    });
  });

  describe('getById', () => {
    it('FR-002: returns account with relations', async () => {
      const mockAccount = { id: '1', name: 'Pacific Bistro', contacts: [], territory: {} };
      mockPrisma.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.getById(TENANT_ID, '1');

      expect(result).toEqual(mockAccount);
      const callArgs = mockPrisma.account.findFirst.mock.calls[0][0];
      expect(callArgs.include.contacts).toBeDefined();
      expect(callArgs.include.territory).toBeTruthy();
      expect(callArgs.include.assignedRep).toBeTruthy();
    });

    it('FR-002: returns null for non-existent account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await service.getById(TENANT_ID, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('FR-001: creates account with required fields', async () => {
      const input = {
        name: 'Pacific Bistro',
        accountType: 'restaurant' as const,
        addressLine1: '123 Main St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
        territoryId: '660e8400-e29b-41d4-a716-446655440000',
        tags: [],
      };
      const mockCreated = { id: '1', ...input, tenantId: TENANT_ID };
      mockPrisma.account.create.mockResolvedValue(mockCreated);

      const result = await service.create(TENANT_ID, 'rep-id', input);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Pacific Bistro',
            tenantId: TENANT_ID,
            assignedRepId: 'rep-id',
          }),
        }),
      );
    });
  });

  describe('findDuplicates', () => {
    it('FR-005: finds potential duplicate accounts by name', async () => {
      const mockDuplicates = [{ id: '1', name: 'Pacific Bistros', city: 'Portland', state: 'OR' }];
      mockPrisma.account.findMany.mockResolvedValue(mockDuplicates);

      const result = await service.findDuplicates(TENANT_ID, 'Pacific Bistro');

      expect(result).toEqual(mockDuplicates);
      const callArgs = mockPrisma.account.findMany.mock.calls[0][0];
      expect(callArgs.where.name.contains).toBe('Pacific Bistro');
      expect(callArgs.where.name.mode).toBe('insensitive');
    });
  });

  describe('softDelete', () => {
    it('FR-001: soft deletes account', async () => {
      mockPrisma.account.update.mockResolvedValue({ id: '1', deletedAt: new Date() });

      await service.softDelete(TENANT_ID, '1');

      expect(mockPrisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });
});
