import { describe, it, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

describe('FR-033c: Territory routes', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma);
    repToken = generateTestToken('rep');
  });

  describe('GET /api/territories', () => {
    it('FR-033c: returns active territories for the tenant', async () => {
      const mockTerritories = [
        { id: 'territory-1', name: 'Portland Metro', region: 'Oregon' },
        { id: 'territory-2', name: 'Seattle Area', region: 'Washington' },
      ];

      mockPrisma.territory.findMany.mockResolvedValue(mockTerritories);

      const response = await app.inject({
        method: 'GET',
        url: '/api/territories',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: typeof mockTerritories };
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toEqual({
        id: 'territory-1',
        name: 'Portland Metro',
        region: 'Oregon',
      });
    });

    it('FR-033c: filters by tenant_id and is_active', async () => {
      mockPrisma.territory.findMany.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/territories',
        headers: authHeader(repToken),
      });

      expect(mockPrisma.territory.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, isActive: true },
        select: { id: true, name: true, region: true },
        orderBy: { name: 'asc' },
      });
    });

    it('FR-033c: returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/territories',
      });

      expect(response.statusCode).toBe(401);
    });

    it('FR-033c: returns empty array when no territories exist', async () => {
      mockPrisma.territory.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/territories',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: unknown[] };
      expect(body.data).toEqual([]);
    });
  });
});
