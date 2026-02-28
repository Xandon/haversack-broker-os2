import { describe, test, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { territoryRoutes } from './territory.routes';

function createMockPrisma(): Record<string, unknown> {
  return {
    territory: {
      findMany: vi.fn(),
    },
  };
}

function buildTestApp(prisma: ReturnType<typeof createMockPrisma>): FastifyInstance {
  const app = Fastify();

  // Mock prisma plugin
  app.decorate('prisma', prisma);

  // Mock authenticate middleware
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return app.errorHandler(
        { statusCode: 401, message: 'Unauthorized' } as Error,
        request,
        request.raw as unknown as import('fastify').FastifyReply,
      );
    }
    request.user = {
      userId: 'user-1',
      email: 'rep@test.com',
      role: 'rep',
      tenantId: 'tenant-1',
      territories: ['territory-1'],
    };
  });

  return app;
}

describe('FR-033c: Territory routes', () => {
  let app: FastifyInstance;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = buildTestApp(mockPrisma);
    await app.register(territoryRoutes);
    await app.ready();
  });

  describe('GET /api/territories', () => {
    test('FR-033c: returns active territories for the tenant', async () => {
      const mockTerritories = [
        { id: 'territory-1', name: 'Portland Metro', region: 'Oregon' },
        { id: 'territory-2', name: 'Seattle Area', region: 'Washington' },
      ];

      (mockPrisma.territory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTerritories);

      const response = await app.inject({
        method: 'GET',
        url: '/api/territories',
        headers: { authorization: 'Bearer valid-token' },
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

    test('FR-033c: filters by tenant_id and is_active', async () => {
      (mockPrisma.territory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/api/territories',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(mockPrisma.territory.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        select: { id: true, name: true, region: true },
        orderBy: { name: 'asc' },
      });
    });

    test('FR-033c: returns 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/territories',
      });

      expect(response.statusCode).toBe(401);
    });

    test('FR-033c: returns empty array when no territories exist', async () => {
      (mockPrisma.territory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/territories',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: unknown[] };
      expect(body.data).toEqual([]);
    });
  });
});
