import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000010';
const CONTACT_ID = '00000000-0000-4000-a000-000000000020';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000030';
const EMAIL_ID = '00000000-0000-4000-a000-000000000050';

function mockEmailRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: EMAIL_ID,
    tenantId: TENANT_ID,
    contactId: CONTACT_ID,
    accountId: ACCOUNT_ID,
    userId: USER_ID,
    subject: 'Re: Q2 Order',
    bodyPreview: 'Thanks',
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

describe('FR-010: Email record routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    repToken = generateTestToken('rep');
    viewerToken = generateTestToken('viewer');

    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/email-records', () => {
    it('creates email record with auto-linking', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({ id: CONTACT_ID, accountId: ACCOUNT_ID });
      mockPrisma.emailRecord.create.mockResolvedValue(mockEmailRecord());

      const response = await app.inject({
        method: 'POST',
        url: '/api/email-records',
        headers: authHeader(repToken),
        payload: {
          subject: 'Re: Q2 Order',
          direction: 'outbound',
          recipientEmail: 'buyer@store.com',
          sentAt: '2026-02-26T10:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.subject).toBe('Re: Q2 Order');
    });

    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/email-records',
        payload: {
          subject: 'Test',
          direction: 'outbound',
          recipientEmail: 'buyer@store.com',
          sentAt: '2026-02-26T10:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for viewer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/email-records',
        headers: authHeader(viewerToken),
        payload: {
          subject: 'Test',
          direction: 'outbound',
          recipientEmail: 'buyer@store.com',
          sentAt: '2026-02-26T10:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/email-records/unmatched', () => {
    it('returns unmatched emails', async () => {
      mockPrisma.emailRecord.findMany.mockResolvedValue([
        mockEmailRecord({ contactId: null, accountId: null }),
      ]);
      mockPrisma.emailRecord.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/email-records/unmatched',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
    });
  });

  describe('PUT /api/email-records/:id/engagement', () => {
    it('updates engagement event', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue(mockEmailRecord());
      mockPrisma.emailRecord.update.mockResolvedValue(
        mockEmailRecord({ openedAt: new Date(), status: 'opened' }),
      );

      const response = await app.inject({
        method: 'PUT',
        url: `/api/email-records/${EMAIL_ID}/engagement`,
        headers: authHeader(repToken),
        payload: {
          event: 'opened',
          occurredAt: '2026-02-26T12:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe('opened');
    });

    it('returns 404 for non-existent email', async () => {
      mockPrisma.emailRecord.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/email-records/${EMAIL_ID}/engagement`,
        headers: authHeader(repToken),
        payload: {
          event: 'opened',
          occurredAt: '2026-02-26T12:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
