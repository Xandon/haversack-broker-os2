import { describe, test, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';

const MOCK_BRAND = {
  id: 'brand-1',
  tenantId: '00000000-0000-4000-a000-000000000001',
  name: 'Mountain Meadow Farms',
  commissionRate: 12.5,
  description: 'Premium honey producer',
  logoUrl: 'https://example.com/logo.png',
  contactName: 'John Smith',
  contactEmail: 'john@meadow.com',
  contactPhone: '555-1234',
  website: 'https://meadow.com',
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const MOCK_BRAND_WITH_COUNTS = {
  ...MOCK_BRAND,
  _count: { products: 5 },
};

describe('FR-019c: Brand routes', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let adminToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.brand.findFirst.mockResolvedValue(null);
    mockPrisma.brand.findMany.mockResolvedValue([MOCK_BRAND_WITH_COUNTS]);
    mockPrisma.brand.create.mockResolvedValue(MOCK_BRAND);
    mockPrisma.brand.update.mockResolvedValue(MOCK_BRAND);
    mockPrisma.product.groupBy.mockResolvedValue([
      { brandId: 'brand-1', _count: { id: 3 } },
    ]);
    mockPrisma.auditLog.create.mockResolvedValue({});
    app = await buildTestApp(mockPrisma);
    repToken = generateTestToken('rep');
    adminToken = generateTestToken('admin');
  });

  describe('POST /api/brands', () => {
    test('FR-019c: creates brand with all fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands',
        headers: authHeader(adminToken),
        payload: {
          name: 'Mountain Meadow Farms',
          commissionRate: 12.5,
          description: 'Premium honey producer',
          logoUrl: 'https://example.com/logo.png',
          contactName: 'John Smith',
          contactEmail: 'john@meadow.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Mountain Meadow Farms');
    });

    test('FR-019c: rejects creation by rep', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands',
        headers: authHeader(repToken),
        payload: {
          name: 'Test Brand',
          commissionRate: 10,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    test('FR-019c: rejects invalid commission rate', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands',
        headers: authHeader(adminToken),
        payload: {
          name: 'Test Brand',
          commissionRate: 101,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/brands', () => {
    test('FR-019c: lists brands with product counts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/brands',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
      expect(body.data[0]).toHaveProperty('productCount');
      expect(body.data[0]).toHaveProperty('activeProductCount');
    });
  });

  describe('GET /api/brands/:id', () => {
    test('FR-019c: returns brand detail', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);

      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/brand-1',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Mountain Meadow Farms');
    });

    test('FR-019c: returns 404 for non-existent brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/nonexistent',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/brands/:id', () => {
    test('FR-019c: updates brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/brands/brand-1',
        headers: authHeader(adminToken),
        payload: { commissionRate: 15 },
      });

      expect(response.statusCode).toBe(200);
    });

    test('FR-019c: rejects update by rep', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/brands/brand-1',
        headers: authHeader(repToken),
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
