import { describe, test, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';

const MOCK_PRODUCT = {
  id: 'prod-1',
  tenantId: '00000000-0000-4000-a000-000000000001',
  brandId: 'brand-1',
  name: 'Artisan Honey 12oz',
  sku: 'SKU-HONEY-12',
  category: 'honey',
  subcategory: 'raw',
  description: 'Premium raw honey',
  unitPrice: 10.0,
  wholesalePrice: 8.0,
  promotionalPrice: null,
  promotionalPriceStart: null,
  promotionalPriceEnd: null,
  caseSize: 12,
  revenueModelDefault: 'broker',
  availabilityStatus: 'active',
  imageUrl: 'https://example.com/honey.jpg',
  certifications: ['organic', 'non_gmo'],
  allergens: [],
  dietaryAttributes: ['vegan'],
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  brand: { id: 'brand-1', name: 'Pacific Honey Co', commissionRate: 0.12 },
};

describe('FR-012/FR-018: Product routes', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let adminToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.product.findMany.mockResolvedValue([MOCK_PRODUCT]);
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.product.create.mockResolvedValue(MOCK_PRODUCT);
    mockPrisma.product.update.mockResolvedValue(MOCK_PRODUCT);
    mockPrisma.auditLog.create.mockResolvedValue({});
    app = await buildTestApp(mockPrisma);
    repToken = generateTestToken('rep');
    adminToken = generateTestToken('admin');
  });

  describe('GET /api/products/search', () => {
    test('FR-012: returns matching products', async () => {
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

    test('FR-012: requires q parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/products/search',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(400);
    });

    test('FR-018b: accepts category filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/products/search?q=honey&category=honey',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
    });

    test('FR-018b: accepts certification filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/products/search?q=honey&certification=organic',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
    });

    test('FR-018b: rejects invalid category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/products/search?q=honey&category=invalid',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(400);
    });

    test('FR-018: product response includes catalog fields', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/products/search?q=honey',
        headers: authHeader(repToken),
      });

      const body = JSON.parse(response.body);
      const product = body.data[0];

      expect(product).toHaveProperty('category');
      expect(product).toHaveProperty('certifications');
      expect(product).toHaveProperty('allergens');
      expect(product).toHaveProperty('dietaryAttributes');
    });
  });

  describe('POST /api/products', () => {
    test('FR-018a: creates product with catalog fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/products',
        headers: authHeader(adminToken),
        payload: {
          name: 'New Honey',
          sku: 'NH-01',
          brandId: '00000000-0000-4000-a000-000000000020',
          unitPrice: 12.99,
          revenueModelDefault: 'broker',
          category: 'honey',
          certifications: ['organic'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    test('FR-018a: rejects creation by rep', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/products',
        headers: authHeader(repToken),
        payload: {
          name: 'New Product',
          sku: 'NP-01',
          brandId: '00000000-0000-4000-a000-000000000020',
          unitPrice: 10,
          revenueModelDefault: 'broker',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/products', () => {
    test('FR-018b: lists products with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/products',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });
  });

  describe('GET /api/products/:id', () => {
    test('FR-018a: returns product detail', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(MOCK_PRODUCT);

      const response = await app.inject({
        method: 'GET',
        url: '/api/products/prod-1',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Artisan Honey 12oz');
    });

    test('FR-018a: returns 404 for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/products/nonexistent',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    test('FR-018e: updates product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(MOCK_PRODUCT);
      mockPrisma.product.update.mockResolvedValue({ ...MOCK_PRODUCT, category: 'condiments' });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/products/prod-1',
        headers: { ...authHeader(adminToken) },
        payload: { category: 'condiments' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/products/:id', () => {
    test('FR-018a: soft-deletes product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(MOCK_PRODUCT);
      mockPrisma.product.update.mockResolvedValue({ ...MOCK_PRODUCT, isActive: false });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/products/prod-1',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.deleted).toBe(true);
    });
  });
});
