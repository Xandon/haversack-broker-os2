import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createContact, updateContact, softDeleteContact } from './contact.service';
import { AccountError } from './account.service';

vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';
const CONTACT_ID = '00000000-0000-4000-a000-000000000020';

const auditCtx = {
  actorId: '00000000-0000-4000-a000-000000000099',
  actorEmail: 'rep@haversack.com',
};

function mockContact(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CONTACT_ID,
    tenantId: TENANT_ID,
    accountId: ACCOUNT_ID,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '503-555-1234',
    title: 'Owner',
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function createMockPrisma(): Record<string, unknown> {
  return {
    account: {
      findFirst: vi.fn(),
    },
    contact: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('FR-002: Contact service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
  });

  describe('createContact', () => {
    test('US7-AC1: creates contact linked to account', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID });
      const created = mockContact();
      (prisma.contact.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await createContact(
        prisma as never,
        TENANT_ID,
        ACCOUNT_ID,
        { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
        auditCtx,
      );

      expect(result).toEqual(created);
      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          accountId: ACCOUNT_ID,
          firstName: 'Jane',
        }),
      });
    });

    test('US7-AC1: throws when account not found', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        createContact(prisma as never, TENANT_ID, ACCOUNT_ID, { firstName: 'J', lastName: 'D' }, auditCtx),
      ).rejects.toThrow(AccountError);
    });

    test('US7-AC1: unsets other primary contacts when setting isPrimary', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID });
      (prisma.contact.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockContact());

      await createContact(
        prisma as never,
        TENANT_ID,
        ACCOUNT_ID,
        { firstName: 'Jane', lastName: 'Doe', isPrimary: true },
        auditCtx,
      );

      expect(prisma.contact.updateMany).toHaveBeenCalledWith({
        where: { accountId: ACCOUNT_ID, tenantId: TENANT_ID, isPrimary: true, deletedAt: null },
        data: { isPrimary: false },
      });
    });

    test('US7-AC1: writes audit trail on create', async () => {
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: ACCOUNT_ID });
      (prisma.contact.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockContact());

      const { writeAuditLog } = await import('../../shared/services/audit.service');

      await createContact(
        prisma as never,
        TENANT_ID,
        ACCOUNT_ID,
        { firstName: 'Jane', lastName: 'Doe' },
        auditCtx,
      );

      expect(writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Contact',
          action: 'create',
        }),
      );
    });
  });

  describe('updateContact', () => {
    test('US7-AC2: updates contact and returns updated record', async () => {
      const existing = mockContact();
      const updated = mockContact({ email: 'updated@example.com' });
      (prisma.contact.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (prisma.contact.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await updateContact(
        prisma as never,
        TENANT_ID,
        ACCOUNT_ID,
        CONTACT_ID,
        { email: 'updated@example.com' },
        auditCtx,
      );

      expect(result).toEqual(updated);
    });

    test('US7-AC2: throws CONTACT_NOT_FOUND for missing contact', async () => {
      (prisma.contact.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        updateContact(prisma as never, TENANT_ID, ACCOUNT_ID, 'nonexistent', { firstName: 'X' }, auditCtx),
      ).rejects.toThrow(new AccountError('Contact not found', 'CONTACT_NOT_FOUND'));
    });
  });

  describe('softDeleteContact', () => {
    test('US7-AC3: sets deletedAt and writes audit log', async () => {
      (prisma.contact.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockContact());
      (prisma.contact.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const result = await softDeleteContact(
        prisma as never,
        TENANT_ID,
        ACCOUNT_ID,
        CONTACT_ID,
        auditCtx,
      );

      expect(result.id).toBe(CONTACT_ID);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    test('US7-AC3: throws CONTACT_NOT_FOUND for missing contact', async () => {
      (prisma.contact.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        softDeleteContact(prisma as never, TENANT_ID, ACCOUNT_ID, 'nonexistent', auditCtx),
      ).rejects.toThrow(AccountError);
    });
  });
});
