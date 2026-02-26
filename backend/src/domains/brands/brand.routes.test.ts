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

  describe('GET /api/brands/:id/line-card', () => {
    test('FR-019a: generates line card PDF', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          tenantId: '00000000-0000-4000-a000-000000000001',
          brandId: 'brand-1',
          name: 'Test Product',
          sku: 'TP-001',
          description: 'Test',
          unitPrice: 10,
          wholesalePrice: 8,
          caseSize: 12,
          certifications: ['organic'],
          allergens: [],
          dietaryAttributes: [],
          availabilityStatus: 'active',
          imageUrl: null,
          isActive: true,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/brand-1/line-card',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('line-card');
    });

    test('FR-019: returns 404 for non-existent brand', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/nonexistent/line-card',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });

    test('FR-019: returns 400 when brand has no active products', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/brand-1/line-card',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/brands/:id/line-card/share', () => {
    test('AC-019b: shares line card with account primary contact', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          tenantId: '00000000-0000-4000-a000-000000000001',
          brandId: 'brand-1',
          name: 'Test Product',
          sku: 'TP-001',
          description: 'Test',
          unitPrice: 10,
          wholesalePrice: null,
          caseSize: 12,
          certifications: [],
          allergens: [],
          dietaryAttributes: [],
          availabilityStatus: 'active',
          imageUrl: null,
          isActive: true,
        },
      ]);
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'acct-1',
        tenantId: '00000000-0000-4000-a000-000000000001',
        name: 'Test Account',
        deletedAt: null,
        contacts: [
          {
            id: 'contact-1',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            isPrimary: true,
            deletedAt: null,
          },
        ],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/brands/brand-1/line-card/share',
        headers: authHeader(repToken),
        payload: { accountId: '00000000-0000-4000-a000-000000000030' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.shared).toBe(true);
      expect(body.data.recipientEmail).toBe('jane@example.com');
    });

    test('AC-019b: returns 404 when account not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/brands/brand-1/line-card/share',
        headers: authHeader(repToken),
        payload: { accountId: '00000000-0000-4000-a000-000000000099' },
      });

      expect(response.statusCode).toBe(404);
    });

    test('AC-019b: returns 400 when account has no primary contact', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'acct-1',
        tenantId: '00000000-0000-4000-a000-000000000001',
        name: 'Test Account',
        deletedAt: null,
        contacts: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/brands/brand-1/line-card/share',
        headers: authHeader(repToken),
        payload: { accountId: '00000000-0000-4000-a000-000000000030' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('C9: viewer cannot share line card', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands/brand-1/line-card/share',
        headers: authHeader(viewerToken),
        payload: { accountId: '00000000-0000-4000-a000-000000000030' },
      });
      expect(response.statusCode).toBe(403);
    });

    test('C9: logistics cannot share line card', async () => {
      const logisticsToken = generateTestToken('logistics');
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands/brand-1/line-card/share',
        headers: authHeader(logisticsToken),
        payload: { accountId: '00000000-0000-4000-a000-000000000030' },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe('T110: RBAC enforcement for brand routes', () => {
    test('C9: viewer can list brands', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'GET',
        url: '/api/brands',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(200);
    });

    test('C9: viewer can view brand detail', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/brand-1',
        headers: authHeader(viewerToken),
      });
      expect(response.statusCode).toBe(200);
    });

    test('C9: viewer cannot create brands', async () => {
      const viewerToken = generateTestToken('viewer');
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands',
        headers: authHeader(viewerToken),
        payload: { name: 'Test', commissionRate: 10 },
      });
      expect(response.statusCode).toBe(403);
    });

    test('C9: logistics cannot create brands', async () => {
      const logisticsToken = generateTestToken('logistics');
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands',
        headers: authHeader(logisticsToken),
        payload: { name: 'Test', commissionRate: 10 },
      });
      expect(response.statusCode).toBe(403);
    });

    test('C9: logistics cannot update brands', async () => {
      const logisticsToken = generateTestToken('logistics');
      const response = await app.inject({
        method: 'PUT',
        url: '/api/brands/brand-1',
        headers: authHeader(logisticsToken),
        payload: { name: 'Updated' },
      });
      expect(response.statusCode).toBe(403);
    });

    test('C9: manager can create brands', async () => {
      const managerToken = generateTestToken('manager');
      const response = await app.inject({
        method: 'POST',
        url: '/api/brands',
        headers: authHeader(managerToken),
        payload: { name: 'Manager Brand', commissionRate: 10 },
      });
      expect(response.statusCode).toBe(201);
    });

    test('C9: rep can generate line card', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          tenantId: '00000000-0000-4000-a000-000000000001',
          brandId: 'brand-1',
          name: 'Test',
          sku: 'T-01',
          description: null,
          unitPrice: 10,
          wholesalePrice: null,
          caseSize: null,
          certifications: [],
          allergens: [],
          dietaryAttributes: [],
          availabilityStatus: 'active',
          imageUrl: null,
          isActive: true,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/brand-1/line-card',
        headers: authHeader(repToken),
      });
      expect(response.statusCode).toBe(200);
    });

    test('C9: unauthenticated request to brands is rejected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/brands',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('T115: Line card edge cases', () => {
    test('FR-019a: PDF filename format is correct', async () => {
      mockPrisma.brand.findFirst.mockResolvedValue(MOCK_BRAND);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          tenantId: '00000000-0000-4000-a000-000000000001',
          brandId: 'brand-1',
          name: 'Test',
          sku: 'T-01',
          description: null,
          unitPrice: 10,
          wholesalePrice: null,
          caseSize: null,
          certifications: [],
          allergens: [],
          dietaryAttributes: [],
          availabilityStatus: 'active',
          imageUrl: null,
          isActive: true,
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/brands/brand-1/line-card',
        headers: authHeader(repToken),
      });

      const disposition = response.headers['content-disposition'] as string;
      expect(disposition).toMatch(/mountain-meadow-farms-line-card-\d{4}-\d{2}-\d{2}\.pdf/);
    });
  });
});
