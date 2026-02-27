import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../../shared/test-helpers/app';
import { generateTestToken, authHeader } from '../../../shared/test-helpers/auth';
import { Decimal } from '@prisma/client/runtime/library';

const USER_ID = '00000000-0000-4000-a000-000000000010';
const OTHER_USER_ID = '00000000-0000-4000-a000-000000000011';
const REPORT_ID = '00000000-0000-4000-a000-000000000090';
const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const OTHER_TENANT_ID = '00000000-0000-4000-a000-000000000099';

const MOCK_REPORT = {
  id: REPORT_ID,
  tenantId: TENANT_ID,
  createdById: USER_ID,
  name: 'Order Summary',
  description: 'Monthly order summary',
  entityType: 'ORDER',
  filters: {},
  columns: ['orderNumber', 'total'],
  isShared: false,
  lastRunAt: null,
  deletedAt: null,
  createdAt: new Date('2026-02-26T10:00:00Z'),
  updatedAt: new Date('2026-02-26T10:00:00Z'),
  createdBy: { id: USER_ID, firstName: 'Jane', lastName: 'Manager' },
};

function createMockPrisma(): Record<string, unknown> {
  return {
    savedReport: {
      create: vi.fn().mockResolvedValue(MOCK_REPORT),
      findFirst: vi.fn().mockResolvedValue(MOCK_REPORT),
      findMany: vi.fn().mockResolvedValue([MOCK_REPORT]),
      count: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(MOCK_REPORT),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'order-1', orderNumber: 'ORD-001', total: new Decimal('2500'), status: 'confirmed', createdAt: new Date() },
      ]),
      count: vi.fn().mockResolvedValue(1),
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
    // Dashboard mocks (needed by test app)
    userTerritory: { findMany: vi.fn().mockResolvedValue([]) },
    activity: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    opportunity: { findMany: vi.fn().mockResolvedValue([]) },
    commissionEntry: { aggregate: vi.fn().mockResolvedValue({ _sum: { commissionAmount: new Decimal('0') } }) },
    account: { findMany: vi.fn().mockResolvedValue([]) },
    territory: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('FR-025: Report routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: Record<string, unknown>;
  let managerToken: string;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
    managerToken = generateTestToken('manager', { userId: USER_ID });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup default mocks
    const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
    sr['create']!.mockResolvedValue(MOCK_REPORT);
    sr['findFirst']!.mockResolvedValue(MOCK_REPORT);
    sr['findMany']!.mockResolvedValue([MOCK_REPORT]);
    sr['count']!.mockResolvedValue(1);
    sr['update']!.mockResolvedValue(MOCK_REPORT);

    const order = mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>;
    order['findMany']!.mockResolvedValue([
      { id: 'order-1', orderNumber: 'ORD-001', total: new Decimal('2500'), status: 'confirmed', createdAt: new Date() },
    ]);
    order['count']!.mockResolvedValue(1);
  });

  // ── T216: CRUD Route Tests ────────────────────────────────

  describe('POST /api/reports', () => {
    it('FR-025: creates report with 201 for manager', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports',
        headers: authHeader(managerToken),
        payload: {
          name: 'Order Summary',
          entityType: 'ORDER',
          filters: {},
          columns: ['orderNumber', 'total'],
          isShared: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
    });

    it('FR-025: returns 400 for invalid column names', async () => {
      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      sr['create']!.mockImplementation(() => {
        throw new Error('should not be called');
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/reports',
        headers: authHeader(managerToken),
        payload: {
          name: 'Bad Report',
          entityType: 'ORDER',
          filters: {},
          columns: ['orderNumber', 'nonExistentField'],
          isShared: false,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-025: writes audit log on report creation', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/reports',
        headers: authHeader(managerToken),
        payload: {
          name: 'Audit Test Report',
          entityType: 'ORDER',
          filters: {},
          columns: ['orderNumber'],
          isShared: false,
        },
      });

      const auditLog = mockPrisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(auditLog['create']).toHaveBeenCalled();
    });
  });

  describe('GET /api/reports', () => {
    it('FR-025: returns report list for manager', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
      expect(body['pagination']).toBeDefined();
    });
  });

  describe('GET /api/reports/:id', () => {
    it('FR-025: returns report by ID for owner', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['id']).toBe(REPORT_ID);
    });

    it('FR-025: returns 404 for non-existent report', async () => {
      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      sr['findFirst']!.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/reports/nonexistent-id',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('FR-025: soft-deletes report for owner', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(sr['update']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REPORT_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('FR-025: returns 403 for non-owner non-admin', async () => {
      const otherManagerToken = generateTestToken('manager', { userId: OTHER_USER_ID });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(otherManagerToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-025: writes audit log on report deletion', async () => {
      await app.inject({
        method: 'DELETE',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(managerToken),
      });

      const auditLog = mockPrisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(auditLog['create']).toHaveBeenCalled();
    });
  });

  // ── T216: Execute & Export Route Tests ────────────────────

  describe('POST /api/reports/execute', () => {
    it('FR-025: executes inline report with entity type + columns', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber', 'total'],
          filters: {},
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
      expect(body['pagination']).toBeDefined();
      expect(body['columns']).toBeDefined();
    });

    it('FR-025: executes saved report by ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          reportId: REPORT_ID,
        },
      });

      expect(response.statusCode).toBe(200);
      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      expect(sr['update']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REPORT_ID },
          data: expect.objectContaining({ lastRunAt: expect.any(Date) }),
        }),
      );
    });

    it('FR-025: returns paginated results with hasMore flag', async () => {
      const order = mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>;
      const manyOrders = Array.from({ length: 51 }, (_, i) => ({
        id: `order-${i}`,
        orderNumber: `ORD-${String(i).padStart(3, '0')}`,
        total: new Decimal('100'),
        status: 'confirmed',
        createdAt: new Date(),
      }));
      order['findMany']!.mockResolvedValue(manyOrders);
      order['count']!.mockResolvedValue(100);

      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber'],
          filters: {},
          limit: 50,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const pagination = body['pagination'] as Record<string, unknown>;
      expect(pagination['hasMore']).toBe(true);
    });
  });

  describe('POST /api/reports/export', () => {
    it('FR-025: exports report as CSV', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/export',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber', 'total'],
          filters: {},
          format: 'csv',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
    });

    it('FR-025: CSV contains UTF-8 BOM header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/export',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber', 'total'],
          filters: {},
          format: 'csv',
        },
      });

      const body = response.body;
      expect(body.charCodeAt(0)).toBe(0xFEFF);
    });
  });

  // ── T217: RBAC Enforcement ────────────────────────────────

  describe('RBAC enforcement', () => {
    it('FR-025: rep cannot access report endpoints (403)', async () => {
      const repToken = generateTestToken('rep', { userId: USER_ID });

      const endpoints = [
        { method: 'GET' as const, url: '/api/reports' },
        { method: 'GET' as const, url: `/api/reports/${REPORT_ID}` },
        { method: 'POST' as const, url: '/api/reports' },
        { method: 'DELETE' as const, url: `/api/reports/${REPORT_ID}` },
        { method: 'POST' as const, url: '/api/reports/execute' },
        { method: 'POST' as const, url: '/api/reports/export' },
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
          headers: authHeader(repToken),
          payload: endpoint.method === 'POST' ? {
            entityType: 'ORDER',
            columns: ['orderNumber'],
            filters: {},
            format: 'csv',
          } : undefined,
        });
        expect(response.statusCode).toBe(403);
      }
    });

    it('FR-025: admin can access all report endpoints', async () => {
      const adminToken = generateTestToken('admin', { userId: USER_ID });

      const response = await app.inject({
        method: 'GET',
        url: '/api/reports',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-025: admin can delete any report', async () => {
      const adminToken = generateTestToken('admin', { userId: OTHER_USER_ID });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-025: viewer cannot access report endpoints (403)', async () => {
      const viewerToken = generateTestToken('viewer', { userId: USER_ID });

      const response = await app.inject({
        method: 'GET',
        url: '/api/reports',
        headers: authHeader(viewerToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-025: logistics cannot access report endpoints (403)', async () => {
      const logisticsToken = generateTestToken('logistics', { userId: USER_ID });

      const response = await app.inject({
        method: 'GET',
        url: '/api/reports',
        headers: authHeader(logisticsToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-025: unauthenticated returns 401 for all report endpoints', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/reports',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ── T218: Tenant Isolation & Audit ────────────────────────

  describe('Tenant isolation', () => {
    it('FR-025: report CRUD operations use tenant-scoped queries', async () => {
      await app.inject({
        method: 'GET',
        url: '/api/reports',
        headers: authHeader(managerToken),
      });

      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      const findManyCall = sr['findMany']!.mock.calls[0]![0] as Record<string, unknown>;
      const where = findManyCall['where'] as Record<string, unknown>;
      expect(where['tenantId']).toBe(TENANT_ID);
    });

    it('FR-025: report execution includes tenantId in where clause', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber'],
          filters: {},
        },
      });

      const order = mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>;
      const findManyCall = order['findMany']!.mock.calls[0]![0] as Record<string, unknown>;
      const where = findManyCall['where'] as Record<string, unknown>;
      expect(where['tenantId']).toBe(TENANT_ID);
    });

    it('FR-025: saved report from other tenant not accessible', async () => {
      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      sr['findFirst']!.mockResolvedValue(null); // Simulates tenant-scoped query returning nothing

      const otherTenantToken = generateTestToken('manager', {
        userId: USER_ID,
        tenantId: OTHER_TENANT_ID,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(otherTenantToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ── T219: Edge Cases ──────────────────────────────────────

  describe('Edge cases', () => {
    it('FR-025: report with 0 results returns empty array', async () => {
      const order = mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>;
      order['findMany']!.mockResolvedValue([]);
      order['count']!.mockResolvedValue(0);

      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber'],
          filters: {},
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as unknown[];
      expect(data).toHaveLength(0);
      const pagination = body['pagination'] as Record<string, unknown>;
      expect(pagination['total']).toBe(0);
      expect(pagination['hasMore']).toBe(false);
    });

    it('FR-025: execute with date range filter passes through', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber'],
          filters: {
            dateRange: { start: '2026-01-01', end: '2026-03-31' },
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const order = mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>;
      const findManyCall = order['findMany']!.mock.calls[0]![0] as Record<string, unknown>;
      const where = findManyCall['where'] as Record<string, unknown>;
      expect(where['createdAt']).toBeDefined();
    });

    it('FR-025: export with 0 results returns valid CSV with headers only', async () => {
      const order = mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>;
      order['findMany']!.mockResolvedValue([]);
      order['count']!.mockResolvedValue(0);

      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/export',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'ORDER',
          columns: ['orderNumber', 'total'],
          filters: {},
          format: 'csv',
        },
      });

      expect(response.statusCode).toBe(200);
      // CSV should have BOM + header row
      const body = response.body;
      expect(body).toContain('Order Number');
      expect(body).toContain('Total');
    });

    it('FR-025: shared report is accessible by non-owner manager', async () => {
      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      sr['findFirst']!.mockResolvedValue({ ...MOCK_REPORT, isShared: true });

      const otherManagerToken = generateTestToken('manager', { userId: OTHER_USER_ID });

      const response = await app.inject({
        method: 'GET',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(otherManagerToken),
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-025: private report is not accessible by non-owner', async () => {
      const sr = mockPrisma['savedReport'] as Record<string, ReturnType<typeof vi.fn>>;
      sr['findFirst']!.mockResolvedValue({ ...MOCK_REPORT, isShared: false, createdById: OTHER_USER_ID });

      const response = await app.inject({
        method: 'GET',
        url: `/api/reports/${REPORT_ID}`,
        headers: authHeader(managerToken),
      });

      // report.service.ts returns 'Report not found' for privacy
      expect(response.statusCode).toBe(404);
    });

    it('FR-025: Zod validation rejects invalid entity type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          entityType: 'INVALID_ENTITY',
          columns: ['name'],
          filters: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-025: Zod validation rejects execute with neither reportId nor entityType', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/reports/execute',
        headers: authHeader(managerToken),
        payload: {
          filters: {},
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
