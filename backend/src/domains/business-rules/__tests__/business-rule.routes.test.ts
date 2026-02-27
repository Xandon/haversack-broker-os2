import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../../shared/test-helpers/app';
import { generateTestToken, authHeader } from '../../../shared/test-helpers/auth';
import { Decimal } from '@prisma/client/runtime/library';

const USER_ID = '00000000-0000-4000-a000-000000000010';
const RULE_ID = '00000000-0000-4000-a000-000000000100';
const TENANT_ID = '00000000-0000-4000-a000-000000000001';

const MOCK_RULE = {
  id: RULE_ID,
  tenantId: TENANT_ID,
  name: 'Churn Alert',
  description: 'Alert when account health drops',
  entityType: 'Account',
  conditions: {
    logic: 'AND',
    conditions: [{ field: 'healthScore', operator: 'lt', value: 30 }],
  },
  actions: [
    { type: 'send_notification', config: { recipient: 'assignedRep', title: 'Churn Alert' } },
  ],
  priority: 100,
  status: 'active',
  createdBy: USER_ID,
  lastFiredAt: null,
  errorMessage: null,
  createdAt: new Date('2026-02-26T10:00:00Z'),
  updatedAt: new Date('2026-02-26T10:00:00Z'),
  creator: { id: USER_ID, firstName: 'Admin', lastName: 'User' },
};

const VALID_CREATE_PAYLOAD = {
  name: 'Churn Alert',
  description: 'Alert when account health drops',
  entityType: 'Account',
  conditions: {
    logic: 'AND',
    conditions: [{ field: 'healthScore', operator: 'lt', value: 30 }],
  },
  actions: [
    { type: 'send_notification', config: { recipient: 'assignedRep', title: 'Churn Alert' } },
  ],
};

function createMockPrisma(): Record<string, unknown> {
  return {
    businessRule: {
      create: vi.fn().mockResolvedValue(MOCK_RULE),
      findFirst: vi.fn().mockResolvedValue(MOCK_RULE),
      findMany: vi.fn().mockResolvedValue([MOCK_RULE]),
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(MOCK_RULE),
      delete: vi.fn().mockResolvedValue(MOCK_RULE),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    refreshToken: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    // Mocks needed by other registered routes in the test app
    userTerritory: { findMany: vi.fn().mockResolvedValue([]) },
    order: { aggregate: vi.fn().mockResolvedValue({ _sum: { total: new Decimal('0') } }), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    activity: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    opportunity: { findMany: vi.fn().mockResolvedValue([]) },
    commissionEntry: { aggregate: vi.fn().mockResolvedValue({ _sum: { commissionAmount: new Decimal('0') } }) },
    account: { findMany: vi.fn().mockResolvedValue([]) },
    territory: { findMany: vi.fn().mockResolvedValue([]) },
    savedReport: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  };
}

describe('FR-028: Business rule routes', () => {
  let app: FastifyInstance;
  let mockPrisma: Record<string, unknown>;
  let adminToken: string;
  let repToken: string;
  let managerToken: string;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
    adminToken = generateTestToken('admin', { userId: USER_ID });
    repToken = generateTestToken('rep', { userId: USER_ID });
    managerToken = generateTestToken('manager', { userId: USER_ID });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup default mocks
    const br = mockPrisma['businessRule'] as Record<string, ReturnType<typeof vi.fn>>;
    br['create']!.mockResolvedValue(MOCK_RULE);
    br['findFirst']!.mockResolvedValue(MOCK_RULE);
    br['findMany']!.mockResolvedValue([MOCK_RULE]);
    br['count']!.mockResolvedValue(1);
    br['update']!.mockResolvedValue(MOCK_RULE);
    br['delete']!.mockResolvedValue(MOCK_RULE);
  });

  // ── RBAC Tests ──────────────────────────────────────────────

  describe('RBAC enforcement', () => {
    it('FR-028: returns 403 for rep role on GET /api/business-rules', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/business-rules',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-028: returns 403 for manager role on POST /api/business-rules', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/business-rules',
        headers: authHeader(managerToken),
        payload: VALID_CREATE_PAYLOAD,
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-028: returns 403 for rep role on PUT /api/business-rules/:id', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(repToken),
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-028: returns 403 for rep role on DELETE /api/business-rules/:id', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-028: returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/business-rules',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ── POST /api/business-rules ────────────────────────────────

  describe('POST /api/business-rules', () => {
    it('FR-028: creates rule with 201 for admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/business-rules',
        headers: authHeader(adminToken),
        payload: VALID_CREATE_PAYLOAD,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
    });

    it('FR-028: returns 400 for invalid conditions (non-existent field)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/business-rules',
        headers: authHeader(adminToken),
        payload: {
          ...VALID_CREATE_PAYLOAD,
          conditions: {
            logic: 'AND',
            conditions: [{ field: 'nonExistentField', operator: 'eq', value: 'test' }],
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['code']).toBe('RULE_INVALID_CONDITIONS');
    });

    it('FR-028: returns 400 for empty actions array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/business-rules',
        headers: authHeader(adminToken),
        payload: {
          ...VALID_CREATE_PAYLOAD,
          actions: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-028: returns 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/business-rules',
        headers: authHeader(adminToken),
        payload: {
          entityType: 'Account',
          conditions: VALID_CREATE_PAYLOAD.conditions,
          actions: VALID_CREATE_PAYLOAD.actions,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['code']).toBe('VALIDATION_ERROR');
    });

    it('FR-028: writes audit log on rule creation', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/business-rules',
        headers: authHeader(adminToken),
        payload: VALID_CREATE_PAYLOAD,
      });

      const auditLog = mockPrisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(auditLog['create']).toHaveBeenCalled();
    });
  });

  // ── GET /api/business-rules ─────────────────────────────────

  describe('GET /api/business-rules', () => {
    it('FR-028: returns rule list with total for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/business-rules',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
      expect(body['total']).toBe(1);
    });

    it('FR-028: passes status filter to service', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/business-rules?status=active',
        headers: authHeader(adminToken),
      });

      const br = mockPrisma['businessRule'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(br['findMany']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        }),
      );
    });

    it('FR-028: passes entityType filter to service', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/business-rules?entityType=Account',
        headers: authHeader(adminToken),
      });

      const br = mockPrisma['businessRule'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(br['findMany']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'Account',
          }),
        }),
      );
    });
  });

  // ── GET /api/business-rules/:id ─────────────────────────────

  describe('GET /api/business-rules/:id', () => {
    it('FR-028: returns rule by ID for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
    });

    it('FR-028: returns 404 for non-existent rule', async () => {
      const br = mockPrisma['businessRule'] as Record<string, ReturnType<typeof vi.fn>>;
      br['findFirst']!.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/business-rules/non-existent-id',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['code']).toBe('RULE_NOT_FOUND');
    });
  });

  // ── PUT /api/business-rules/:id ─────────────────────────────

  describe('PUT /api/business-rules/:id', () => {
    it('FR-028: updates rule for admin', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(adminToken),
        payload: { name: 'Updated Rule Name', priority: 50 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
    });

    it('FR-028: returns 404 for non-existent rule', async () => {
      const br = mockPrisma['businessRule'] as Record<string, ReturnType<typeof vi.fn>>;
      br['findFirst']!.mockResolvedValue(null);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/business-rules/non-existent-id',
        headers: authHeader(adminToken),
        payload: { name: 'test' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-028: returns 400 for invalid conditions in update', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(adminToken),
        payload: {
          conditions: {
            logic: 'AND',
            conditions: [{ field: 'badField', operator: 'eq', value: 1 }],
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-028: returns 400 for invalid status value', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(adminToken),
        payload: { status: 'invalid_status' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['code']).toBe('VALIDATION_ERROR');
    });

    it('FR-028: writes audit log on update', async () => {
      await app.inject({
        method: 'PUT',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(adminToken),
        payload: { name: 'Audit Test Update' },
      });

      const auditLog = mockPrisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(auditLog['create']).toHaveBeenCalled();
    });
  });

  // ── DELETE /api/business-rules/:id ──────────────────────────

  describe('DELETE /api/business-rules/:id', () => {
    it('FR-028: deletes rule with 204 for admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(204);
    });

    it('FR-028: returns 404 for non-existent rule', async () => {
      const br = mockPrisma['businessRule'] as Record<string, ReturnType<typeof vi.fn>>;
      br['findFirst']!.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/business-rules/non-existent-id',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-028: writes audit log on delete', async () => {
      await app.inject({
        method: 'DELETE',
        url: `/api/business-rules/${RULE_ID}`,
        headers: authHeader(adminToken),
      });

      const auditLog = mockPrisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(auditLog['create']).toHaveBeenCalled();
    });
  });
});
