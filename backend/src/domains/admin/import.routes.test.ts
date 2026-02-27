import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const IMPORT_ID = '00000000-0000-4000-a000-000000000099';
const ADMIN_USER_ID = '00000000-0000-4000-a000-000000000010';

describe('FR-027: Admin import routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let adminToken: string;
  let repToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    adminToken = generateTestToken('admin', { userId: ADMIN_USER_ID });
    repToken = generateTestToken('rep');

    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /api/admin/imports', () => {
    it('FR-027: lists imports for admin with pagination', async () => {
      mockPrisma.dataImport.findMany.mockResolvedValue([
        { id: IMPORT_ID, status: 'completed', entityType: 'account', filename: 'test.csv' },
      ]);
      mockPrisma.dataImport.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/imports',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: unknown[]; meta: Record<string, number> };
      expect(body.data).toHaveLength(1);
      expect(body.meta).toHaveProperty('total', 1);
    });

    it('FR-027: returns 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/imports',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/admin/imports/:id', () => {
    it('FR-027: returns import detail for admin', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'completed',
        entityType: 'account',
        filename: 'test.csv',
        totalRows: 10,
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/imports/${IMPORT_ID}`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('id', IMPORT_ID);
    });

    it('FR-027: returns 404 for nonexistent import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/imports/nonexistent-id`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/admin/imports/:id/confirm', () => {
    it('FR-027: confirms import and returns 202', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'previewed',
        deletedAt: null,
      });
      mockPrisma.dataImport.update.mockResolvedValue({
        id: IMPORT_ID,
        status: 'processing',
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/imports/${IMPORT_ID}/confirm`,
        headers: authHeader(adminToken),
        payload: { skipErrors: true },
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('status', 'processing');
    });

    it('FR-027: returns 409 for already processing import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'processing',
        deletedAt: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/imports/${IMPORT_ID}/confirm`,
        headers: authHeader(adminToken),
        payload: { skipErrors: true },
      });

      expect(response.statusCode).toBe(409);
    });

    it('FR-027: returns 404 for nonexistent import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/imports/nonexistent-id/confirm`,
        headers: authHeader(adminToken),
        payload: { skipErrors: true },
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-027: returns 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/admin/imports/${IMPORT_ID}/confirm`,
        headers: authHeader(repToken),
        payload: { skipErrors: true },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/admin/layout-of-truth/:entityType', () => {
    it('FR-027: returns layout for account entity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/layout-of-truth/account',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { entityType: string; fields: unknown[] } };
      expect(body.data.entityType).toBe('account');
      expect(body.data.fields.length).toBeGreaterThan(0);
    });

    it('FR-027: returns 400 for invalid entity type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/layout-of-truth/invalid',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-027: returns 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/layout-of-truth/account',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-027: returns 401 for unauthenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/layout-of-truth/account',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
