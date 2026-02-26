import { describe, test, expect } from 'vitest';
import {
  emailDirectionSchema,
  emailStatusSchema,
  createEmailRecordSchema,
  emailRecordResponseSchema,
  emailEngagementSchema,
  unmatchedEmailQuerySchema,
} from './email-record.schema';

describe('FR-010: Email Record Zod schemas', () => {
  describe('emailDirectionSchema', () => {
    test('FR-010: accepts inbound and outbound', () => {
      expect(emailDirectionSchema.parse('inbound')).toBe('inbound');
      expect(emailDirectionSchema.parse('outbound')).toBe('outbound');
    });

    test('FR-010: rejects invalid direction', () => {
      expect(() => emailDirectionSchema.parse('forwarded')).toThrow();
    });
  });

  describe('emailStatusSchema', () => {
    test('FR-010: accepts all valid statuses', () => {
      expect(emailStatusSchema.parse('sent')).toBe('sent');
      expect(emailStatusSchema.parse('delivered')).toBe('delivered');
      expect(emailStatusSchema.parse('opened')).toBe('opened');
      expect(emailStatusSchema.parse('clicked')).toBe('clicked');
      expect(emailStatusSchema.parse('bounced')).toBe('bounced');
      expect(emailStatusSchema.parse('failed')).toBe('failed');
    });
  });

  describe('createEmailRecordSchema', () => {
    const validEmail = {
      subject: 'Re: Order for next quarter',
      bodyPreview: 'Hi, I wanted to follow up on...',
      direction: 'outbound' as const,
      recipientEmail: 'buyer@pacificbistro.com',
      sentAt: '2026-02-26T10:00:00.000Z',
    };

    test('FR-010: accepts valid email record', () => {
      const result = createEmailRecordSchema.parse(validEmail);
      expect(result.subject).toBe('Re: Order for next quarter');
      expect(result.recipientEmail).toBe('buyer@pacificbistro.com');
    });

    test('FR-010: accepts email without optional bodyPreview', () => {
      const { bodyPreview: _, ...withoutPreview } = validEmail;
      const result = createEmailRecordSchema.parse(withoutPreview);
      expect(result.bodyPreview).toBeUndefined();
    });

    test('FR-010: rejects blank subject', () => {
      expect(() =>
        createEmailRecordSchema.parse({ ...validEmail, subject: '' }),
      ).toThrow();
    });

    test('FR-010: rejects subject exceeding 500 characters', () => {
      expect(() =>
        createEmailRecordSchema.parse({ ...validEmail, subject: 'x'.repeat(501) }),
      ).toThrow();
    });

    test('FR-010: rejects invalid email format', () => {
      expect(() =>
        createEmailRecordSchema.parse({ ...validEmail, recipientEmail: 'not-an-email' }),
      ).toThrow();
    });

    test('FR-010: rejects invalid datetime for sentAt', () => {
      expect(() =>
        createEmailRecordSchema.parse({ ...validEmail, sentAt: 'yesterday' }),
      ).toThrow();
    });
  });

  describe('emailRecordResponseSchema', () => {
    test('FR-010: validates complete email record response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        contactId: '00000000-0000-4000-a000-000000000003',
        accountId: '00000000-0000-4000-a000-000000000004',
        userId: '00000000-0000-4000-a000-000000000005',
        subject: 'Test email',
        bodyPreview: 'Preview text',
        direction: 'outbound',
        status: 'sent',
        recipientEmail: 'buyer@test.com',
        openedAt: null,
        clickedAt: null,
        bouncedAt: null,
        sentAt: '2026-02-26T10:00:00.000Z',
        createdAt: '2026-02-26T10:00:00.000Z',
        isLinked: true,
      };
      const result = emailRecordResponseSchema.parse(response);
      expect(result.isLinked).toBe(true);
    });

    test('FR-010: validates unlinked email response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        contactId: null,
        accountId: null,
        userId: '00000000-0000-4000-a000-000000000005',
        subject: 'Unknown sender',
        bodyPreview: null,
        direction: 'inbound',
        status: 'sent',
        recipientEmail: 'unknown@test.com',
        openedAt: null,
        clickedAt: null,
        bouncedAt: null,
        sentAt: '2026-02-26T10:00:00.000Z',
        createdAt: '2026-02-26T10:00:00.000Z',
        isLinked: false,
      };
      const result = emailRecordResponseSchema.parse(response);
      expect(result.isLinked).toBe(false);
      expect(result.contactId).toBeNull();
    });
  });

  describe('emailEngagementSchema', () => {
    test('FR-010: accepts valid engagement event', () => {
      const result = emailEngagementSchema.parse({
        event: 'opened',
        occurredAt: '2026-02-26T12:00:00.000Z',
      });
      expect(result.event).toBe('opened');
    });

    test('FR-010: accepts all valid event types', () => {
      expect(emailEngagementSchema.parse({ event: 'opened', occurredAt: '2026-02-26T12:00:00.000Z' }).event).toBe('opened');
      expect(emailEngagementSchema.parse({ event: 'clicked', occurredAt: '2026-02-26T12:00:00.000Z' }).event).toBe('clicked');
      expect(emailEngagementSchema.parse({ event: 'bounced', occurredAt: '2026-02-26T12:00:00.000Z' }).event).toBe('bounced');
    });

    test('FR-010: rejects invalid event type', () => {
      expect(() =>
        emailEngagementSchema.parse({ event: 'forwarded', occurredAt: '2026-02-26T12:00:00.000Z' }),
      ).toThrow();
    });
  });

  describe('unmatchedEmailQuerySchema', () => {
    test('FR-010: defaults limit to 20', () => {
      const result = unmatchedEmailQuerySchema.parse({});
      expect(result.limit).toBe(20);
    });

    test('FR-010: accepts custom limit', () => {
      const result = unmatchedEmailQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
    });
  });
});
