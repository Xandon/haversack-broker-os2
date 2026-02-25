/**
 * Email tracking service unit tests.
 * T072: Validates email record creation, contact matching, engagement event
 * processing, unmatched listing, and manual matching with mocked Prisma calls.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  createEmailRecord,
  matchEmailToContact,
  processEngagementEvent,
  listUnmatchedEmails,
  manualMatchEmail,
} from './email-tracking.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    emailRecord: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_ACCOUNT_ID = '770e8400-e29b-41d4-a716-446655440000';
const TEST_CONTACT_ID = '880e8400-e29b-41d4-a716-446655440000';
const TEST_EMAIL_ID = '990e8400-e29b-41d4-a716-446655440000';
const TEST_MESSAGE_ID = 'msg-12345@example.com';

const NOW = new Date('2026-02-25T12:00:00.000Z');

describe('Email Tracking Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  // ---------------------------------------------------------------------------
  // createEmailRecord Tests
  // ---------------------------------------------------------------------------

  describe('createEmailRecord', () => {
    test('FR-010: creates outbound email record', async () => {
      const createdRecord = {
        id: TEST_EMAIL_ID,
        tenant_id: TEST_TENANT_ID,
        direction: 'outbound',
        from_address: 'rep@haversack.com',
        to_addresses: ['buyer@store.com'],
        cc_addresses: [],
        subject: 'Product Introduction',
        is_matched: false,
        engagement_status: 'sent',
        created_at: NOW,
      };

      mockPrisma.emailRecord.create.mockResolvedValue(createdRecord);

      const result = await createEmailRecord(
        mockPrisma as unknown as Parameters<typeof createEmailRecord>[0],
        TEST_TENANT_ID,
        {
          direction: 'outbound',
          from_address: 'rep@haversack.com',
          to_addresses: ['buyer@store.com'],
          subject: 'Product Introduction',
        },
      );

      expect(result.direction).toBe('outbound');
      expect(result.from_address).toBe('rep@haversack.com');
      expect(mockPrisma.emailRecord.create).toHaveBeenCalledOnce();
    });

    test('FR-010: sets is_matched to true when account_id is provided', async () => {
      mockPrisma.emailRecord.create.mockResolvedValue({
        id: TEST_EMAIL_ID,
        is_matched: true,
      });

      await createEmailRecord(
        mockPrisma as unknown as Parameters<typeof createEmailRecord>[0],
        TEST_TENANT_ID,
        {
          direction: 'outbound',
          from_address: 'rep@haversack.com',
          to_addresses: ['buyer@store.com'],
          account_id: TEST_ACCOUNT_ID,
        },
      );

      const createCall = mockPrisma.emailRecord.create.mock.calls[0]![0];
      expect(createCall.data.is_matched).toBe(true);
    });

    test('FR-010: sets is_matched to false when no account or contact', async () => {
      mockPrisma.emailRecord.create.mockResolvedValue({
        id: TEST_EMAIL_ID,
        is_matched: false,
      });

      await createEmailRecord(
        mockPrisma as unknown as Parameters<typeof createEmailRecord>[0],
        TEST_TENANT_ID,
        {
          direction: 'inbound',
          from_address: 'unknown@example.com',
          to_addresses: ['rep@haversack.com'],
        },
      );

      const createCall = mockPrisma.emailRecord.create.mock.calls[0]![0];
      expect(createCall.data.is_matched).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // matchEmailToContact Tests
  // ---------------------------------------------------------------------------

  describe('matchEmailToContact', () => {
    test('FR-010: finds contact by email address', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: TEST_CONTACT_ID,
        account_id: TEST_ACCOUNT_ID,
      });

      const result = await matchEmailToContact(
        mockPrisma as unknown as Parameters<typeof matchEmailToContact>[0],
        TEST_TENANT_ID,
        'buyer@store.com',
      );

      expect(result).toEqual({
        contactId: TEST_CONTACT_ID,
        accountId: TEST_ACCOUNT_ID,
      });
    });

    test('FR-010: returns null when no contact matches', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const result = await matchEmailToContact(
        mockPrisma as unknown as Parameters<typeof matchEmailToContact>[0],
        TEST_TENANT_ID,
        'unknown@example.com',
      );

      expect(result).toBeNull();
    });

    test('FR-010: searches with lowercase email and excludes deleted contacts', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await matchEmailToContact(
        mockPrisma as unknown as Parameters<typeof matchEmailToContact>[0],
        TEST_TENANT_ID,
        'Buyer@Store.com',
      );

      const findFirstCall = mockPrisma.contact.findFirst.mock.calls[0]![0];
      expect(findFirstCall.where.email).toBe('buyer@store.com');
      expect(findFirstCall.where.deleted_at).toBeNull();
      expect(findFirstCall.where.tenant_id).toBe(TEST_TENANT_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // processEngagementEvent Tests
  // ---------------------------------------------------------------------------

  describe('processEngagementEvent', () => {
    test('FR-010: processes opened event', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue({
        id: TEST_EMAIL_ID,
        message_id: TEST_MESSAGE_ID,
      });
      mockPrisma.emailRecord.update.mockResolvedValue({
        id: TEST_EMAIL_ID,
        engagement_status: 'opened',
        opened_at: NOW,
      });

      const result = await processEngagementEvent(
        mockPrisma as unknown as Parameters<typeof processEngagementEvent>[0],
        TEST_TENANT_ID,
        TEST_MESSAGE_ID,
        'opened',
      );

      expect(result).not.toBeNull();
      const updateCall = mockPrisma.emailRecord.update.mock.calls[0]![0];
      expect(updateCall.data.engagement_status).toBe('opened');
      expect(updateCall.data.opened_at).toBeInstanceOf(Date);
    });

    test('FR-010: processes clicked event', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue({
        id: TEST_EMAIL_ID,
        message_id: TEST_MESSAGE_ID,
      });
      mockPrisma.emailRecord.update.mockResolvedValue({
        id: TEST_EMAIL_ID,
        engagement_status: 'clicked',
      });

      await processEngagementEvent(
        mockPrisma as unknown as Parameters<typeof processEngagementEvent>[0],
        TEST_TENANT_ID,
        TEST_MESSAGE_ID,
        'clicked',
      );

      const updateCall = mockPrisma.emailRecord.update.mock.calls[0]![0];
      expect(updateCall.data.engagement_status).toBe('clicked');
      expect(updateCall.data.clicked_at).toBeInstanceOf(Date);
    });

    test('FR-010: processes bounced event', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue({
        id: TEST_EMAIL_ID,
        message_id: TEST_MESSAGE_ID,
      });
      mockPrisma.emailRecord.update.mockResolvedValue({
        id: TEST_EMAIL_ID,
        engagement_status: 'bounced',
      });

      await processEngagementEvent(
        mockPrisma as unknown as Parameters<typeof processEngagementEvent>[0],
        TEST_TENANT_ID,
        TEST_MESSAGE_ID,
        'bounced',
      );

      const updateCall = mockPrisma.emailRecord.update.mock.calls[0]![0];
      expect(updateCall.data.engagement_status).toBe('bounced');
      expect(updateCall.data.bounced_at).toBeInstanceOf(Date);
    });

    test('FR-010: returns null when email record not found for message_id', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue(null);

      const result = await processEngagementEvent(
        mockPrisma as unknown as Parameters<typeof processEngagementEvent>[0],
        TEST_TENANT_ID,
        'nonexistent-message-id',
        'opened',
      );

      expect(result).toBeNull();
      expect(mockPrisma.emailRecord.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // listUnmatchedEmails Tests
  // ---------------------------------------------------------------------------

  describe('listUnmatchedEmails', () => {
    test('FR-011: returns paginated unmatched emails', async () => {
      const emails = [
        { id: '1', is_matched: false, from_address: 'a@example.com' },
        { id: '2', is_matched: false, from_address: 'b@example.com' },
      ];

      mockPrisma.emailRecord.findMany.mockResolvedValue(emails);
      mockPrisma.emailRecord.count.mockResolvedValue(50);

      const result = await listUnmatchedEmails(
        mockPrisma as unknown as Parameters<typeof listUnmatchedEmails>[0],
        TEST_TENANT_ID,
        { page: 1, pageSize: 20 },
      );

      expect(result.items).toEqual(emails);
      expect(result.total).toBe(50);
    });

    test('FR-011: filters by is_matched false and tenant_id', async () => {
      mockPrisma.emailRecord.findMany.mockResolvedValue([]);
      mockPrisma.emailRecord.count.mockResolvedValue(0);

      await listUnmatchedEmails(
        mockPrisma as unknown as Parameters<typeof listUnmatchedEmails>[0],
        TEST_TENANT_ID,
      );

      const findManyCall = mockPrisma.emailRecord.findMany.mock.calls[0]![0];
      expect(findManyCall.where.is_matched).toBe(false);
      expect(findManyCall.where.tenant_id).toBe(TEST_TENANT_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // manualMatchEmail Tests
  // ---------------------------------------------------------------------------

  describe('manualMatchEmail', () => {
    test('FR-011: manually matches email to account and contact', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue({
        id: TEST_EMAIL_ID,
        tenant_id: TEST_TENANT_ID,
        is_matched: false,
      });
      mockPrisma.emailRecord.update.mockResolvedValue({
        id: TEST_EMAIL_ID,
        is_matched: true,
        account_id: TEST_ACCOUNT_ID,
        contact_id: TEST_CONTACT_ID,
      });

      const result = await manualMatchEmail(
        mockPrisma as unknown as Parameters<typeof manualMatchEmail>[0],
        TEST_TENANT_ID,
        TEST_EMAIL_ID,
        { account_id: TEST_ACCOUNT_ID, contact_id: TEST_CONTACT_ID },
      );

      expect(result).not.toBeNull();
      expect(result!.is_matched).toBe(true);
    });

    test('FR-011: returns null when email record not found', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue(null);

      const result = await manualMatchEmail(
        mockPrisma as unknown as Parameters<typeof manualMatchEmail>[0],
        TEST_TENANT_ID,
        'nonexistent-id',
        { account_id: TEST_ACCOUNT_ID },
      );

      expect(result).toBeNull();
      expect(mockPrisma.emailRecord.update).not.toHaveBeenCalled();
    });
  });
});
