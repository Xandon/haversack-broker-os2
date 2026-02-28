import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createContactService } from './contact.service.js';

function createMockPrisma() {
  return {
    contact: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('ContactService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createContactService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
  const ACCOUNT_ID = '660e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createContactService(mockPrisma as any);
  });

  describe('listByAccount', () => {
    it('FR-002: returns contacts for an account sorted by primary then name', async () => {
      const mockContacts = [
        { id: '1', firstName: 'John', lastName: 'Doe', isPrimary: true },
        { id: '2', firstName: 'Jane', lastName: 'Smith', isPrimary: false },
      ];
      mockPrisma.contact.findMany.mockResolvedValue(mockContacts);

      const result = await service.listByAccount(TENANT_ID, ACCOUNT_ID);

      expect(result).toEqual(mockContacts);
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, accountId: ACCOUNT_ID, deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
        }),
      );
    });
  });

  describe('create', () => {
    it('FR-001: creates contact with required fields', async () => {
      const input = {
        accountId: ACCOUNT_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isPrimary: false,
        optOutEmail: false,
      };
      const mockCreated = { id: '1', ...input, tenantId: TENANT_ID };
      mockPrisma.contact.create.mockResolvedValue(mockCreated);

      const result = await service.create(TENANT_ID, input);

      expect(result).toEqual(mockCreated);
    });

    it('FR-001: unsets existing primary when creating new primary contact', async () => {
      const input = {
        accountId: ACCOUNT_ID,
        firstName: 'Jane',
        lastName: 'Smith',
        isPrimary: true,
        optOutEmail: false,
      };
      mockPrisma.contact.create.mockResolvedValue({ id: '2', ...input });

      await service.create(TENANT_ID, input);

      expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: ACCOUNT_ID,
            isPrimary: true,
          }),
          data: { isPrimary: false },
        }),
      );
    });

    it('FR-001: does not unset primary when creating non-primary contact', async () => {
      const input = {
        accountId: ACCOUNT_ID,
        firstName: 'Bob',
        lastName: 'Jones',
        isPrimary: false,
        optOutEmail: false,
      };
      mockPrisma.contact.create.mockResolvedValue({ id: '3', ...input });

      await service.create(TENANT_ID, input);

      expect(mockPrisma.contact.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('FR-002: updates contact fields', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: '1',
        accountId: ACCOUNT_ID,
        tenantId: TENANT_ID,
      });
      mockPrisma.contact.update.mockResolvedValue({
        id: '1',
        firstName: 'Updated',
      });

      const result = await service.update(TENANT_ID, '1', { firstName: 'Updated' });

      expect(result).toBeDefined();
      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { firstName: 'Updated' },
        }),
      );
    });

    it('FR-002: returns null for non-existent contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const result = await service.update(TENANT_ID, 'nonexistent', { firstName: 'Test' });

      expect(result).toBeNull();
      expect(mockPrisma.contact.update).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('FR-001: soft deletes contact', async () => {
      mockPrisma.contact.update.mockResolvedValue({ id: '1', deletedAt: new Date() });

      await service.softDelete(TENANT_ID, '1');

      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
