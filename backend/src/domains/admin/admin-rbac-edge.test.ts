import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000050';
const IMPORT_ID = '00000000-0000-4000-a000-000000000099';
const ADMIN_USER_ID = '00000000-0000-4000-a000-000000000010';

describe('T180: RBAC enforcement across admin routes', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let adminToken: string;
  let managerToken: string;
  let repToken: string;
  let logisticsToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    adminToken = generateTestToken('admin', { userId: ADMIN_USER_ID });
    managerToken = generateTestToken('manager');
    repToken = generateTestToken('rep');
    logisticsToken = generateTestToken('logistics');
    viewerToken = generateTestToken('viewer');

    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('User management RBAC (FR-026)', () => {
    it('FR-026: manager gets 403 on user creation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(managerToken),
        payload: {
          email: 'new@test.com',
          firstName: 'New',
          lastName: 'User',
          role: 'rep',
          temporaryPassword: 'TempPass123!',
        },
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-026: logistics gets 403 on user list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: authHeader(logisticsToken),
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-026: viewer gets 403 on user update', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${USER_ID}`,
        headers: authHeader(viewerToken),
        payload: { role: 'manager' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-026: rep gets 403 on user deactivation', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${USER_ID}`,
        headers: authHeader(repToken),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe('Import RBAC (FR-027)', () => {
    it('FR-027: manager gets 403 on import list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/imports',
        headers: authHeader(managerToken),
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-027: logistics gets 403 on import detail', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/imports/${IMPORT_ID}`,
        headers: authHeader(logisticsToken),
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-027: viewer gets 403 on import confirm', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/imports/${IMPORT_ID}/confirm`,
        headers: authHeader(viewerToken),
        payload: { skipErrors: true },
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-027: rep gets 403 on layout-of-truth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/layout-of-truth/account',
        headers: authHeader(repToken),
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe('Quality scorecard RBAC (FR-029)', () => {
    it('FR-029: admin gets 200 on quality scorecard', async () => {
      mockPrisma.dataQualityScore.findFirst.mockResolvedValue({
        id: 'score-1',
        tenantId: TENANT_ID,
        accountCompleteness: 80,
        contactEmailValidity: 90,
        productImages: 70,
        duplicateAccountCount: 2,
        staleAccountCount: 3,
        compositeScore: 78,
        calculatedAt: new Date(),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
        headers: authHeader(adminToken),
      });
      expect(response.statusCode).toBe(200);
    });

    it('FR-029: manager gets 200 on quality scorecard', async () => {
      mockPrisma.dataQualityScore.findFirst.mockResolvedValue({
        id: 'score-1',
        tenantId: TENANT_ID,
        accountCompleteness: 80,
        contactEmailValidity: 90,
        productImages: 70,
        duplicateAccountCount: 2,
        staleAccountCount: 3,
        compositeScore: 78,
        calculatedAt: new Date(),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
        headers: authHeader(managerToken),
      });
      expect(response.statusCode).toBe(200);
    });

    it('FR-029: rep gets 403 on quality scorecard', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
        headers: authHeader(repToken),
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-029: logistics gets 403 on quality drill-down', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/drill-down?metric=accountCompleteness',
        headers: authHeader(logisticsToken),
      });
      expect(response.statusCode).toBe(403);
    });

    it('FR-029: viewer gets 403 on quality drill-down', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/drill-down?metric=accountCompleteness',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(403);
    });
  });
});

describe('T181: Edge case and concurrency tests', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let adminToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    adminToken = generateTestToken('admin', { userId: ADMIN_USER_ID });
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('User edge cases (FR-026)', () => {
    it('FR-026: returns 404 for nonexistent user on GET', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users/nonexistent-id',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-026: returns 409 for duplicate email on create', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: USER_ID,
        email: 'existing@haversack.test',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: {
          email: 'existing@haversack.test',
          firstName: 'Duplicate',
          lastName: 'User',
          role: 'rep',
          temporaryPassword: 'TempPass123!',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('FR-026: returns 400 for invalid role in create', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: {
          email: 'new@haversack.test',
          firstName: 'New',
          lastName: 'User',
          role: 'superadmin',
          temporaryPassword: 'TempPass123!',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Import edge cases (FR-027)', () => {
    it('FR-027: confirm returns 404 for deleted import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/imports/deleted-id/confirm',
        headers: authHeader(adminToken),
        payload: { skipErrors: true },
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-027: returns empty list when no imports exist', async () => {
      mockPrisma.dataImport.findMany.mockResolvedValue([]);
      mockPrisma.dataImport.count.mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/imports',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: unknown[]; meta: { total: number } };
      expect(body.data).toHaveLength(0);
      expect(body.meta.total).toBe(0);
    });

    it('FR-027: returns 400 for invalid entity type in layout-of-truth', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/layout-of-truth/unknown',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Quality scorecard edge cases (FR-029)', () => {
    it('FR-029: handles first-time scorecard calculation', async () => {
      mockPrisma.dataQualityScore.findFirst.mockResolvedValue(null);
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.account.count.mockResolvedValue(0);
      mockPrisma.dataQualityScore.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-new',
        ...data,
        calculatedAt: new Date(),
        createdAt: new Date(),
      }));

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { compositeScore: number } };
      expect(body.data.compositeScore).toBe(100);
    });

    it('FR-029: rejects drill-down with missing metric param', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/drill-down',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
