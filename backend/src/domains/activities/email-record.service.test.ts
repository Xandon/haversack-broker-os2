import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

import {
  createEmailRecord,
  listUnmatchedEmails,
  updateEngagement,
} from './email-record.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000010';
const CONTACT_ID = '00000000-0000-4000-a000-000000000020';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000030';
const EMAIL_ID = '00000000-0000-4000-a000-000000000050';

const auditCtx = {
  actorId: USER_ID,
  actorEmail: 'rep@haversack.test',
};

function createMockPrisma(): Record<string, unknown> {
  return {
    contact: { findFirst: vi.fn() },
    emailRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
}

function mockEmailRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: EMAIL_ID,
    tenantId: TENANT_ID,
    contactId: CONTACT_ID,
    accountId: ACCOUNT_ID,
    userId: USER_ID,
    subject: 'Re: Q2 Order',
    bodyPreview: 'Thanks for the follow-up',
    direction: 'outbound',
    status: 'sent',
    recipientEmail: 'buyer@store.com',
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    sentAt: new Date('2026-02-26T10:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('FR-010: EmailRecord Service', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  describe('createEmailRecord', () => {
    it('AC-010a: auto-links email to contact by matching email address', async () => {
      const contact = (mockPrisma.contact as Record<string, ReturnType<typeof vi.fn>>);
      contact.findFirst.mockResolvedValue({ id: CONTACT_ID, accountId: ACCOUNT_ID });
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.create.mockResolvedValue(mockEmailRecord());

      const result = await createEmailRecord(mockPrisma as never, TENANT_ID, USER_ID, {
        subject: 'Re: Q2 Order',
        bodyPreview: 'Thanks for the follow-up',
        direction: 'outbound',
        recipientEmail: 'buyer@store.com',
        sentAt: '2026-02-26T10:00:00.000Z',
      }, auditCtx);

      expect(result.contactId).toBe(CONTACT_ID);
      expect(result.accountId).toBe(ACCOUNT_ID);
      expect(result.isLinked).toBe(true);
    });

    it('AC-010b: stores unlinked when no contact match', async () => {
      const contact = (mockPrisma.contact as Record<string, ReturnType<typeof vi.fn>>);
      contact.findFirst.mockResolvedValue(null);
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.create.mockResolvedValue(mockEmailRecord({ contactId: null, accountId: null }));

      const result = await createEmailRecord(mockPrisma as never, TENANT_ID, USER_ID, {
        subject: 'Hello',
        direction: 'outbound',
        recipientEmail: 'unknown@example.com',
        sentAt: '2026-02-26T10:00:00.000Z',
      }, auditCtx);

      expect(result.contactId).toBeNull();
      expect(result.accountId).toBeNull();
      expect(result.isLinked).toBe(false);
    });
  });

  describe('listUnmatchedEmails', () => {
    it('returns only unlinked emails', async () => {
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.findMany.mockResolvedValue([mockEmailRecord({ contactId: null, accountId: null })]);
      emailRecord.count.mockResolvedValue(1);

      const result = await listUnmatchedEmails(mockPrisma as never, TENANT_ID, {});

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('supports cursor pagination', async () => {
      const emails = Array.from({ length: 21 }, (_, i) =>
        mockEmailRecord({ id: `email-${i}`, contactId: null, accountId: null }),
      );
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.findMany.mockResolvedValue(emails);
      emailRecord.count.mockResolvedValue(30);

      const result = await listUnmatchedEmails(mockPrisma as never, TENANT_ID, { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('updateEngagement', () => {
    it('updates openedAt for opened event', async () => {
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.findFirst.mockResolvedValue(mockEmailRecord());
      emailRecord.update.mockResolvedValue(mockEmailRecord({
        openedAt: new Date('2026-02-26T12:00:00Z'),
        status: 'opened',
      }));

      const result = await updateEngagement(mockPrisma as never, TENANT_ID, EMAIL_ID, {
        event: 'opened',
        occurredAt: '2026-02-26T12:00:00.000Z',
      }, auditCtx);

      expect(result.status).toBe('opened');
      const updateCall = emailRecord.update.mock.calls[0]![0];
      expect(updateCall.data.openedAt).toEqual(new Date('2026-02-26T12:00:00.000Z'));
    });

    it('updates clickedAt for clicked event', async () => {
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.findFirst.mockResolvedValue(mockEmailRecord());
      emailRecord.update.mockResolvedValue(mockEmailRecord({
        clickedAt: new Date('2026-02-26T12:00:00Z'),
        status: 'clicked',
      }));

      await updateEngagement(mockPrisma as never, TENANT_ID, EMAIL_ID, {
        event: 'clicked',
        occurredAt: '2026-02-26T12:00:00.000Z',
      }, auditCtx);

      const updateCall = emailRecord.update.mock.calls[0]![0];
      expect(updateCall.data.clickedAt).toEqual(new Date('2026-02-26T12:00:00.000Z'));
    });

    it('updates bouncedAt for bounced event', async () => {
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.findFirst.mockResolvedValue(mockEmailRecord());
      emailRecord.update.mockResolvedValue(mockEmailRecord({
        bouncedAt: new Date('2026-02-26T12:00:00Z'),
        status: 'bounced',
      }));

      await updateEngagement(mockPrisma as never, TENANT_ID, EMAIL_ID, {
        event: 'bounced',
        occurredAt: '2026-02-26T12:00:00.000Z',
      }, auditCtx);

      const updateCall = emailRecord.update.mock.calls[0]![0];
      expect(updateCall.data.bouncedAt).toEqual(new Date('2026-02-26T12:00:00.000Z'));
    });

    it('throws for non-existent email record', async () => {
      const emailRecord = (mockPrisma.emailRecord as Record<string, ReturnType<typeof vi.fn>>);
      emailRecord.findFirst.mockResolvedValue(null);

      await expect(
        updateEngagement(mockPrisma as never, TENANT_ID, EMAIL_ID, {
          event: 'opened',
          occurredAt: '2026-02-26T12:00:00.000Z',
        }, auditCtx),
      ).rejects.toThrow('Email record not found');
    });
  });
});
