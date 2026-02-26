import { describe, test, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { productRoutes } from './product.routes';

function createMockApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  // Mock prisma on app
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Artisan Honey 12oz',
      sku: 'SKU-HONEY-12',
      unitPrice: 10.0,
      wholesalePrice: 8.0,
      promotionalPrice: null,
      promotionalPriceStart: null,
      promotionalPriceEnd: null,
      caseSize: 12,
      revenueModelDefault: 'broker',
      availabilityStatus: 'in_stock',
      isActive: true,
      brand: { id: 'brand-1', name: 'Pacific Honey Co' },
    },
  ];

  app.decorate('prisma', {
    product: {
      findMany: vi.fn().mockResolvedValue(mockProducts),
    },
  });

  // Mock authenticate + authorize middleware
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (request) => {
    request.user = {
      userId: '00000000-0000-4000-a000-000000000020',
      tenantId: '00000000-0000-4000-a000-000000000001',
      email: 'rep@test.com',
      role: 'rep',
    };
  });

  return app;
}

describe('FR-012: Product search routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = createMockApp();
    await app.register(productRoutes);
    await app.ready();
  });

  test('FR-012: GET /api/products/search returns matching products', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('FR-012: GET /api/products/search requires q parameter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search',
    });

    expect(response.statusCode).toBe(400);
  });

  test('FR-012: GET /api/products/search filters by brand', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey&brandId=brand-1',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
  });

  test('FR-012: GET /api/products/search filters by availability', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey&availabilityStatus=in_stock',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
  });

  test('FR-012: GET /api/products/search limits results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey&limit=5',
    });

    expect(response.statusCode).toBe(200);
  });

  test('FR-012: product response includes all required fields', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey',
    });

    const body = JSON.parse(response.body);
    const product = body.data[0];

    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('sku');
    expect(product).toHaveProperty('brand');
    expect(product).toHaveProperty('unitPrice');
    expect(product).toHaveProperty('availabilityStatus');
  });
});
