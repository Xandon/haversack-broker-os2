import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../../shared/test-helpers/app';
import { generateTestToken, authHeader } from '../../../shared/test-helpers/auth';
import { Decimal } from '@prisma/client/runtime/library';

const USER_ID = '00000000-0000-4000-a000-000000000010';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000030';

function createMockPrisma(): Record<string, unknown> {
  return {
    userTerritory: {
      findMany: vi.fn().mockResolvedValue([{ territoryId: TERRITORY_ID }]),
    },
    order: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: new Decimal('1000') } }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    activity: {
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([]),
    },
    opportunity: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    commissionEntry: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { commissionAmount: new Decimal('100') } }),
    },
    account: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([
        { id: USER_ID, firstName: 'Test', lastName: 'Rep', isActive: true },
      ]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    territory: {
      findMany: vi.fn().mockResolvedValue([
        { id: TERRITORY_ID, name: 'Portland Metro', _count: { accounts: 5 } },
      ]),
    },
    refreshToken: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
}

describe('FR-023/024: Dashboard routes', () => {
  let app: FastifyInstance;
  let mockPrisma: Record<string, unknown>;
  let repToken: string;
  let managerToken: string;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
    repToken = generateTestToken('rep', { userId: USER_ID });
    managerToken = generateTestToken('manager', { userId: USER_ID });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup default mocks
    (mockPrisma['userTerritory'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']!.mockResolvedValue([{ territoryId: TERRITORY_ID }]);
    (mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['aggregate']!.mockResolvedValue({ _sum: { totalAmount: new Decimal('1000') } });
    (mockPrisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']!.mockResolvedValue([]);
    (mockPrisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['count']!.mockResolvedValue(5);
    (mockPrisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']!.mockResolvedValue([]);
    (mockPrisma['opportunity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']!.mockResolvedValue([]);
    (mockPrisma['commissionEntry'] as Record<string, ReturnType<typeof vi.fn>>)['aggregate']!.mockResolvedValue({ _sum: { commissionAmount: new Decimal('100') } });
    (mockPrisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']!.mockResolvedValue([]);
    (mockPrisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']!.mockResolvedValue([
      { id: USER_ID, firstName: 'Test', lastName: 'Rep', isActive: true },
    ]);
    (mockPrisma['territory'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']!.mockResolvedValue([
      { id: TERRITORY_ID, name: 'Portland Metro', _count: { accounts: 5 } },
    ]);
  });

  // ── Rep Dashboard ───────────────────────────────────────────

  describe('GET /api/dashboards/rep', () => {
    it('FR-023: returns 200 with rep dashboard data for authenticated rep', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/rep',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['revenue']).toBeDefined();
      expect(data['activities']).toBeDefined();
      expect(data['opportunities']).toBeDefined();
      expect(data['commissions']).toBeDefined();
      expect(data['accountHealth']).toBeDefined();
      expect(data['period']).toBeDefined();
    });

    it('FR-023: returns 401 for unauthenticated request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/rep',
      });

      expect(response.statusCode).toBe(401);
    });

    it('FR-023: accepts period query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/rep?period=last_month',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/dashboards/rep/critical-accounts', () => {
    it('AC-023b: returns critical accounts for authenticated rep', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/rep/critical-accounts',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
      expect(body['count']).toBeDefined();
    });
  });

  // ── Team Dashboard ──────────────────────────────────────────

  describe('GET /api/dashboards/team', () => {
    it('AC-024a: returns 200 with team dashboard for manager', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['repRankings']).toBeDefined();
      expect(data['totals']).toBeDefined();
    });

    it('FR-024: returns 403 for rep accessing team dashboard', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('AC-024b: accepts date range filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team?period=custom&start_date=2026-01-01&end_date=2026-03-31',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/dashboards/team/revenue-by-month', () => {
    it('FR-024: returns 200 with monthly revenue data for manager', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team/revenue-by-month?months=6',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
    });

    it('FR-024: returns 403 for rep', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team/revenue-by-month',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/dashboards/team/pipeline-forecast', () => {
    it('FR-024: returns 200 with pipeline forecast for manager', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team/pipeline-forecast',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['stages']).toBeDefined();
      expect(data['totalWeightedForecast']).toBeDefined();
    });

    it('FR-024: returns 403 for rep', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team/pipeline-forecast',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/dashboards/team/territory-revenue', () => {
    it('FR-024: returns 200 with territory revenue data for manager', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team/territory-revenue',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['data']).toBeDefined();
    });

    it('FR-024: returns 403 for rep', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team/territory-revenue',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ── RBAC ────────────────────────────────────────────────────

  describe('RBAC enforcement', () => {
    it('FR-023: admin can access rep dashboard', async () => {
      const adminToken = generateTestToken('admin', { userId: USER_ID });
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/rep',
        headers: authHeader(adminToken),
      });
      expect(response.statusCode).toBe(200);
    });

    it('FR-024: admin can access team dashboard', async () => {
      const adminToken = generateTestToken('admin', { userId: USER_ID });
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team',
        headers: authHeader(adminToken),
      });
      expect(response.statusCode).toBe(200);
    });

    it('FR-024: viewer cannot access team dashboard', async () => {
      const viewerToken = generateTestToken('viewer', { userId: USER_ID });
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-024: logistics cannot access team dashboard', async () => {
      const logisticsToken = generateTestToken('logistics', { userId: USER_ID });
      const response = await app.inject({
        method: 'GET',
        url: '/api/dashboards/team',
        headers: authHeader(logisticsToken),
      });
      expect(response.statusCode).toBe(403);
    });
  });
});
