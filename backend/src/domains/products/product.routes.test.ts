import { describe, test, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';

const MOCK_PRODUCT = {
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
  brand: { id: 'brand-1', name: 'Pacific Honey Co', commissionRate: 0.12 },
};

describe('FR-012: Product search routes', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.product.findMany.mockResolvedValue([MOCK_PRODUCT]);
    app = await buildTestApp(mockPrisma);
    repToken = generateTestToken('rep');
  });

  test('FR-012: GET /api/products/search returns matching products', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey',
      headers: authHeader(repToken),
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
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(400);
  });

  test('FR-012: GET /api/products/search filters by brand', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey&brandId=00000000-0000-4000-a000-000000000099',
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
  });

  test('FR-012: GET /api/products/search filters by availability', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey&availabilityStatus=active',
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
  });

  test('FR-012: GET /api/products/search limits results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey&limit=5',
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(200);
  });

  test('FR-012: product response includes all required fields', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/products/search?q=honey',
      headers: authHeader(repToken),
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
