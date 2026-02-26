import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';
const ACTIVITY_ID = '00000000-0000-4000-a000-000000000030';

// Test token default userId is 00000000-0000-4000-a000-000000000010
const TEST_USER_ID = '00000000-0000-4000-a000-000000000010';

function mockActivityRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ACTIVITY_ID,
    tenantId: TENANT_ID,
    accountId: ACCOUNT_ID,
    userId: TEST_USER_ID,
    type: 'visit',
    notes: 'Good meeting',
    occurredAt: new Date('2026-02-26T10:00:00Z'),
    durationMinutes: 30,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    demos: [],
    ...overrides,
  };
}

const validCreatePayload = {
  accountId: ACCOUNT_ID,
  type: 'visit',
  notes: 'Met with buyer about seasonal products',
  occurredAt: '2026-02-26T10:00:00.000Z',
  durationMinutes: 30,
};

describe('FR-007: Activity routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    repToken = generateTestToken('rep');
    viewerToken = generateTestToken('viewer');

    // Default audit log mock
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/activities', () => {
    it('AC-007a: creates activity with 201 for authenticated rep', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      mockPrisma.activity.create.mockResolvedValue(mockActivityRecord());

      const response = await app.inject({
        method: 'POST',
        url: '/api/activities',
        headers: authHeader(repToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.type).toBe('visit');
    });

    it('AC-007b: creates demo activity with demo records', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      mockPrisma.activity.create.mockResolvedValue(
        mockActivityRecord({
          type: 'demo',
          demos: [{ id: 'demo-1', productId: 'prod-1', quantitySampled: 5, buyerFeedback: 'Great', outcome: 'positive' }],
        }),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/activities',
        headers: authHeader(repToken),
        payload: {
          accountId: ACCOUNT_ID,
          type: 'demo',
          occurredAt: '2026-02-26T10:00:00.000Z',
          demos: [{ productId: '00000000-0000-4000-a000-000000000040', quantitySampled: 5, buyerFeedback: 'Great', outcome: 'positive' }],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.demos).toHaveLength(1);
    });

    it('FR-007: returns 400 for demo without products', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/activities',
        headers: authHeader(repToken),
        payload: {
          accountId: ACCOUNT_ID,
          type: 'demo',
          occurredAt: '2026-02-26T10:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-007: returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/activities',
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(401);
    });

    it('FR-007: returns 403 for viewer role', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/activities',
        headers: authHeader(viewerToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/activities/:id', () => {
    it('FR-007: returns activity for authenticated user', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivityRecord());

      const response = await app.inject({
        method: 'GET',
        url: `/api/activities/${ACTIVITY_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(ACTIVITY_ID);
    });

    it('FR-007: returns 404 for non-existent activity', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/activities/${ACTIVITY_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/activities/:id', () => {
    it('FR-007: updates activity within edit window', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivityRecord({ createdAt: new Date() }));
      mockPrisma.activity.update.mockResolvedValue(mockActivityRecord({ notes: 'Updated', version: 2 }));

      const response = await app.inject({
        method: 'PUT',
        url: `/api/activities/${ACTIVITY_ID}`,
        headers: authHeader(repToken),
        payload: { notes: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.notes).toBe('Updated');
    });

    it('FR-007: returns 403 for edit after window expired', async () => {
      const oldDate = new Date(Date.now() - 16 * 60 * 1000);
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivityRecord({ createdAt: oldDate }));

      const response = await app.inject({
        method: 'PUT',
        url: `/api/activities/${ACTIVITY_ID}`,
        headers: authHeader(repToken),
        payload: { notes: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/activities/:id', () => {
    it('FR-007: soft-deletes activity', async () => {
      mockPrisma.activity.findFirst.mockResolvedValue(mockActivityRecord());
      mockPrisma.activity.update.mockResolvedValue({ ...mockActivityRecord(), deletedAt: new Date() });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/activities/${ACTIVITY_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/accounts/:id/activities', () => {
    it('FR-008: returns paginated activities for account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      const activities = [mockActivityRecord()];
      mockPrisma.activity.findMany.mockResolvedValue(activities);
      mockPrisma.activity.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: `/api/accounts/${ACCOUNT_ID}/activities`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    it('FR-008: filters by activity type', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: `/api/accounts/${ACCOUNT_ID}/activities?type=visit`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-008: returns 404 for non-existent account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/accounts/${ACCOUNT_ID}/activities`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
