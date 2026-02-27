import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

describe('FR-029: Admin quality routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let adminToken: string;
  let managerToken: string;
  let repToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    adminToken = generateTestToken('admin');
    managerToken = generateTestToken('manager');
    repToken = generateTestToken('rep');

    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('GET /api/admin/quality/scorecard', () => {
    it('FR-029: returns existing scorecard for admin', async () => {
      mockPrisma.dataQualityScore.findFirst.mockResolvedValue({
        id: 'score-1',
        tenantId: TENANT_ID,
        accountCompleteness: 85.5,
        contactEmailValidity: 92.0,
        productImages: 70.0,
        duplicateAccountCount: 3,
        staleAccountCount: 5,
        compositeScore: 80.0,
        calculatedAt: new Date('2026-02-27T03:00:00Z'),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('compositeScore', 80.0);
      expect(body.data).toHaveProperty('accountCompleteness', 85.5);
    });

    it('FR-029: returns scorecard for manager', async () => {
      mockPrisma.dataQualityScore.findFirst.mockResolvedValue({
        id: 'score-1',
        tenantId: TENANT_ID,
        accountCompleteness: 90.0,
        contactEmailValidity: 95.0,
        productImages: 80.0,
        duplicateAccountCount: 0,
        staleAccountCount: 2,
        compositeScore: 92.0,
        calculatedAt: new Date('2026-02-27T03:00:00Z'),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-029: calculates on-demand when no score exists', async () => {
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
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('compositeScore');
    });

    it('FR-029: returns 403 for rep', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-029: returns 401 for unauthenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/scorecard',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/admin/quality/drill-down', () => {
    it('FR-029: returns drill-down for accountCompleteness', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: '1', name: 'Acme', accountType: 'retail', phone: null, email: null, address: null },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/drill-down?metric=accountCompleteness',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { metric: string; items: unknown[] } };
      expect(body.data.metric).toBe('accountCompleteness');
      expect(body.data.items).toHaveLength(1);
    });

    it('FR-029: returns 400 for invalid metric', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/drill-down?metric=invalidMetric',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-029: returns 403 for rep', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/drill-down?metric=accountCompleteness',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-029: applies pagination defaults', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/quality/drill-down?metric=accountCompleteness',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: { page: number; limit: number } };
      expect(body.data.page).toBe(1);
      expect(body.data.limit).toBe(50);
    });
  });
});
