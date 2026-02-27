import { describe, test, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';

const MOCK_OPPORTUNITY = {
  id: 'opp-1',
  tenantId: '00000000-0000-4000-a000-000000000001',
  accountId: 'acct-1',
  repId: '00000000-0000-4000-a000-000000000099',
  name: 'Q3 Honey Expansion',
  estimatedValue: new Decimal('25000.00'),
  probability: new Decimal('10.00'),
  expectedCloseDate: new Date('2026-06-30'),
  stage: 'prospect',
  closeReason: null,
  closedAt: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  account: { id: 'acct-1', name: 'Fresh Market PDX' },
  rep: { id: '00000000-0000-4000-a000-000000000099', firstName: 'Jane', lastName: 'Smith' },
  brands: [{ brand: { id: 'brand-1', name: 'Mountain Meadow' } }],
};

describe('FR-016/FR-017: Opportunity routes', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let adminToken: string;
  let managerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.opportunity.findFirst.mockResolvedValue(MOCK_OPPORTUNITY);
    mockPrisma.opportunity.findMany.mockResolvedValue([MOCK_OPPORTUNITY]);
    mockPrisma.opportunity.create.mockResolvedValue(MOCK_OPPORTUNITY);
    mockPrisma.opportunity.update.mockResolvedValue(MOCK_OPPORTUNITY);
    mockPrisma.opportunity.count.mockResolvedValue(1);
    mockPrisma.opportunityBrand.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.opportunityBrand.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.account.findFirst.mockResolvedValue({ id: 'acct-1', tenantId: '00000000-0000-4000-a000-000000000001' });
    mockPrisma.auditLog.create.mockResolvedValue({});
    app = await buildTestApp(mockPrisma);
    repToken = generateTestToken('rep');
    adminToken = generateTestToken('admin');
    managerToken = generateTestToken('manager');
  });

  describe('POST /api/opportunities', () => {
    test('FR-016a: creates opportunity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities',
        headers: authHeader(repToken),
        payload: {
          name: 'Q3 Honey Expansion',
          estimatedValue: 25000,
          expectedCloseDate: '2026-06-30',
          stage: 'prospect',
          accountId: '00000000-0000-4000-a000-000000000010',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('Q3 Honey Expansion');
    });

    test('FR-016a: validates required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities',
        headers: authHeader(repToken),
        payload: { name: 'Missing fields' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('FR-016a: rejects invalid stage', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities',
        headers: authHeader(repToken),
        payload: {
          name: 'Bad Stage',
          estimatedValue: 1000,
          expectedCloseDate: '2026-06-30',
          stage: 'invalid_stage',
          accountId: '00000000-0000-4000-a000-000000000010',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/opportunities', () => {
    test('FR-016a: lists opportunities with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/opportunities',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });
  });

  describe('GET /api/opportunities/:id', () => {
    test('FR-016a: returns opportunity detail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/opportunities/opp-1',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Q3 Honey Expansion');
    });

    test('FR-016a: returns 404 for non-existent opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/opportunities/nonexistent',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/opportunities/:id', () => {
    test('FR-016a: updates opportunity', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/opportunities/opp-1',
        headers: authHeader(adminToken),
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(200);
    });

    test('FR-016a: returns 409 with stale If-Match', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/opportunities/opp-1',
        headers: {
          ...authHeader(adminToken),
          'if-match': '2025-01-01T00:00:00.000Z',
        },
        payload: { name: 'Stale Update' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/opportunities/:id', () => {
    test('FR-016a: soft-deletes opportunity', async () => {
      mockPrisma.opportunity.update.mockResolvedValue({ ...MOCK_OPPORTUNITY, isActive: false });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/opportunities/opp-1',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.deleted).toBe(true);
    });
  });

  describe('POST /api/opportunities/:id/transition', () => {
    test('FR-016b: transitions stage', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(MOCK_OPPORTUNITY);
      mockPrisma.opportunity.update.mockResolvedValue({
        ...MOCK_OPPORTUNITY,
        stage: 'qualified',
        probability: new Decimal('40'),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities/opp-1/transition',
        headers: authHeader(repToken),
        payload: { stage: 'qualified' },
      });

      expect(response.statusCode).toBe(200);
    });

    test('FR-016d: requires close reason for closed_won', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({
        ...MOCK_OPPORTUNITY,
        stage: 'negotiation',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities/opp-1/transition',
        headers: authHeader(repToken),
        payload: { stage: 'closed_won' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('FR-016e: prevents reopening closed opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue({
        ...MOCK_OPPORTUNITY,
        stage: 'closed_won',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities/opp-1/transition',
        headers: authHeader(repToken),
        payload: { stage: 'prospect' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/pipeline/summary', () => {
    test('FR-017a: returns pipeline summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/pipeline/summary',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.stages).toBeDefined();
      expect(body.data.forecast).toBeDefined();
    });

    test('FR-017b: includes weighted forecast', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/pipeline/summary',
        headers: authHeader(managerToken),
      });

      const body = JSON.parse(response.body);
      expect(body.data.forecast).toHaveProperty('weightedTotal');
      expect(body.data.forecast).toHaveProperty('totalOpenValue');
      expect(body.data.forecast).toHaveProperty('opportunityCount');
    });
  });

  describe('GET /api/pipeline/analytics', () => {
    test('FR-017e: returns win/loss analytics', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/pipeline/analytics?dateFrom=2026-01-01&dateTo=2026-12-31',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty('totalWon');
      expect(body.data).toHaveProperty('winRate');
    });

    test('FR-017e: requires date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/pipeline/analytics',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('RBAC enforcement', () => {
    test('FR-017c: viewer can read opportunities', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'GET',
        url: '/api/opportunities',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(200);
    });

    test('FR-017c: viewer cannot create opportunities', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities',
        headers: authHeader(viewerToken),
        payload: {
          name: 'Viewer Opp',
          estimatedValue: 1000,
          expectedCloseDate: '2026-06-30',
          stage: 'prospect',
          accountId: '00000000-0000-4000-a000-000000000010',
        },
      });
      expect(response.statusCode).toBe(403);
    });

    test('FR-017c: logistics cannot create opportunities', async () => {
      const logisticsToken = generateTestToken('logistics');
      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities',
        headers: authHeader(logisticsToken),
        payload: {
          name: 'Logistics Opp',
          estimatedValue: 1000,
          expectedCloseDate: '2026-06-30',
          stage: 'prospect',
          accountId: '00000000-0000-4000-a000-000000000010',
        },
      });
      expect(response.statusCode).toBe(403);
    });

    test('FR-017c: manager can create opportunities', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities',
        headers: authHeader(managerToken),
        payload: {
          name: 'Manager Opp',
          estimatedValue: 1000,
          expectedCloseDate: '2026-06-30',
          stage: 'prospect',
          accountId: '00000000-0000-4000-a000-000000000010',
        },
      });
      expect(response.statusCode).toBe(201);
    });

    test('FR-017c: viewer can read pipeline summary', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'GET',
        url: '/api/pipeline/summary',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(200);
    });

    test('FR-017c: viewer cannot access analytics', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'GET',
        url: '/api/pipeline/analytics?dateFrom=2026-01-01&dateTo=2026-12-31',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(403);
    });

    test('FR-016a: unauthenticated request is rejected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/opportunities',
      });
      expect(response.statusCode).toBe(401);
    });

    test('FR-016a: viewer cannot update opportunities', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'PUT',
        url: '/api/opportunities/opp-1',
        headers: authHeader(viewerToken),
        payload: { name: 'Updated' },
      });
      expect(response.statusCode).toBe(403);
    });

    test('FR-016a: viewer cannot delete opportunities', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/opportunities/opp-1',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(403);
    });

    test('FR-016a: viewer cannot transition opportunities', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'POST',
        url: '/api/opportunities/opp-1/transition',
        headers: authHeader(viewerToken),
        payload: { stage: 'qualified' },
      });
      expect(response.statusCode).toBe(403);
    });
  });
});
