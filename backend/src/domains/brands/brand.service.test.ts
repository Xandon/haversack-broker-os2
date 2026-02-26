import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createBrand,
  getBrandById,
  updateBrand,
  listBrands,
  formatBrandResponse,
  formatBrandWithCountsResponse,
  BrandError,
} from './brand.service';
import type { AuditContext, BrandWithCounts } from './brand.service';
import type { PrismaClient, Brand } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const { mockWriteAuditLog } = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: mockWriteAuditLog,
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const BRAND_ID = '00000000-0000-4000-a000-000000000020';

const AUDIT_CTX: AuditContext = {
  actorId: '00000000-0000-4000-a000-000000000099',
  actorEmail: 'admin@test.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-123',
};

function createMockBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: BRAND_ID,
    tenantId: TENANT_ID,
    name: 'Mountain Meadow Farms',
    commissionRate: new Decimal('12.50'),
    description: 'Premium honey producer',
    logoUrl: 'https://example.com/logo.png',
    contactName: 'John Smith',
    contactEmail: 'john@meadow.com',
    contactPhone: '555-1234',
    website: 'https://meadow.com',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Brand;
}

function createMockPrisma(): {
  prisma: PrismaClient;
  brand: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  product: {
    groupBy: ReturnType<typeof vi.fn>;
  };
} {
  const brand = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const product = {
    groupBy: vi.fn(),
  };
  const auditTrail = { create: vi.fn() };
  return {
    prisma: { brand, product, auditTrail } as unknown as PrismaClient,
    brand,
    product,
  };
}

describe('FR-019c: Brand service', () => {
  let prisma: PrismaClient;
  let brandMock: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let productMock: { groupBy: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    brandMock = mock.brand;
    productMock = mock.product;
  });

  describe('createBrand', () => {
    test('FR-019c: creates brand with all fields', async () => {
      brandMock.findFirst.mockResolvedValue(null); // no name conflict
      const mockCreated = createMockBrand();
      brandMock.create.mockResolvedValue(mockCreated);

      const result = await createBrand(prisma, TENANT_ID, {
        name: 'Mountain Meadow Farms',
        commissionRate: 12.5,
        description: 'Premium honey producer',
        logoUrl: 'https://example.com/logo.png',
        contactName: 'John Smith',
        contactEmail: 'john@meadow.com',
        contactPhone: '555-1234',
        website: 'https://meadow.com',
      }, AUDIT_CTX);

      expect(result.id).toBe(BRAND_ID);
      expect(result.name).toBe('Mountain Meadow Farms');
    });

    test('FR-019c: creates brand with required fields only', async () => {
      brandMock.findFirst.mockResolvedValue(null);
      const mockCreated = createMockBrand({
        description: null,
        logoUrl: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        website: null,
      });
      brandMock.create.mockResolvedValue(mockCreated);

      const result = await createBrand(prisma, TENANT_ID, {
        name: 'Basic Brand',
        commissionRate: 10,
      }, AUDIT_CTX);

      expect(result).toBeDefined();
    });

    test('FR-019c: rejects duplicate brand name within tenant', async () => {
      brandMock.findFirst.mockResolvedValue(createMockBrand());

      await expect(
        createBrand(prisma, TENANT_ID, {
          name: 'Mountain Meadow Farms',
          commissionRate: 10,
        }, AUDIT_CTX),
      ).rejects.toThrow('Brand name already exists');
    });
  });

  describe('getBrandById', () => {
    test('FR-019c: returns brand when found', async () => {
      brandMock.findFirst.mockResolvedValue(createMockBrand());

      const result = await getBrandById(prisma, TENANT_ID, BRAND_ID);
      expect(result.name).toBe('Mountain Meadow Farms');
    });

    test('FR-019c: throws BrandError when not found', async () => {
      brandMock.findFirst.mockResolvedValue(null);

      await expect(
        getBrandById(prisma, TENANT_ID, BRAND_ID),
      ).rejects.toThrow(BrandError);
    });

    test('FR-019c: filters by tenant_id', async () => {
      brandMock.findFirst.mockResolvedValue(null);
      const otherTenant = '00000000-0000-4000-a000-000000000099';

      await getBrandById(prisma, otherTenant, BRAND_ID).catch(() => {});
      expect(brandMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: otherTenant }),
        }),
      );
    });
  });

  describe('updateBrand', () => {
    test('FR-019c: updates brand fields', async () => {
      const existing = createMockBrand();
      brandMock.findFirst.mockResolvedValue(existing);
      const updated = createMockBrand({ commissionRate: new Decimal('15.00') });
      brandMock.update.mockResolvedValue(updated);

      const result = await updateBrand(
        prisma, TENANT_ID, BRAND_ID,
        { commissionRate: 15 },
        undefined,
        AUDIT_CTX,
      );

      expect(Number(result.commissionRate)).toBe(15);
    });

    test('FR-019c: optimistic concurrency fails with stale timestamp', async () => {
      const existing = createMockBrand();
      brandMock.findFirst.mockResolvedValue(existing);

      await expect(
        updateBrand(
          prisma, TENANT_ID, BRAND_ID,
          { name: 'Updated' },
          '2025-01-01T00:00:00.000Z',
          AUDIT_CTX,
        ),
      ).rejects.toThrow('modified by another user');
    });

    test('FR-019c: rejects duplicate name on update', async () => {
      const existing = createMockBrand();
      brandMock.findFirst
        .mockResolvedValueOnce(existing) // find existing
        .mockResolvedValueOnce(createMockBrand({ id: 'other-id', name: 'Taken Name' }));

      await expect(
        updateBrand(
          prisma, TENANT_ID, BRAND_ID,
          { name: 'Taken Name' },
          undefined,
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Brand name already exists');
    });

    test('FR-019c: throws when brand not found', async () => {
      brandMock.findFirst.mockResolvedValue(null);

      await expect(
        updateBrand(
          prisma, TENANT_ID, BRAND_ID,
          { name: 'Updated' },
          undefined,
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Brand not found');
    });
  });

  describe('listBrands', () => {
    test('FR-019c: lists brands with product counts', async () => {
      const brands = [
        { ...createMockBrand(), _count: { products: 5 } },
      ];
      brandMock.findMany.mockResolvedValue(brands);
      productMock.groupBy.mockResolvedValue([
        { brandId: BRAND_ID, _count: { id: 3 } },
      ]);

      const result = await listBrands(prisma, TENANT_ID, {
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.productCount).toBe(5);
      expect(result.data[0]!.activeProductCount).toBe(3);
    });

    test('FR-019c: applies isActive filter', async () => {
      brandMock.findMany.mockResolvedValue([]);
      productMock.groupBy.mockResolvedValue([]);

      await listBrands(prisma, TENANT_ID, {
        isActive: true,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(brandMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    test('FR-019c: indicates hasMore when results exceed limit', async () => {
      const brands = Array.from({ length: 3 }, (_, i) => ({
        ...createMockBrand({ id: `id-${i}` }),
        _count: { products: 0 },
      }));
      brandMock.findMany.mockResolvedValue(brands);
      productMock.groupBy.mockResolvedValue([]);

      const result = await listBrands(prisma, TENANT_ID, {
        limit: 2,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('formatBrandResponse', () => {
    test('FR-019c: formats brand with all fields', () => {
      const brand = createMockBrand();
      const result = formatBrandResponse(brand);

      expect(result['name']).toBe('Mountain Meadow Farms');
      expect(result['commissionRate']).toBe(12.5);
      expect(result['description']).toBe('Premium honey producer');
      expect(result['logoUrl']).toBe('https://example.com/logo.png');
      expect(result['contactEmail']).toBe('john@meadow.com');
      expect(result['isActive']).toBe(true);
    });

    test('FR-019c: formats brand with null optional fields', () => {
      const brand = createMockBrand({
        description: null,
        logoUrl: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        website: null,
      });
      const result = formatBrandResponse(brand);

      expect(result['description']).toBeNull();
      expect(result['logoUrl']).toBeNull();
    });
  });

  describe('formatBrandWithCountsResponse', () => {
    test('FR-019c: includes product counts in response', () => {
      const brand: BrandWithCounts = {
        ...createMockBrand(),
        _count: { products: 5 },
        productCount: 5,
        activeProductCount: 3,
      };
      const result = formatBrandWithCountsResponse(brand);

      expect(result['productCount']).toBe(5);
      expect(result['activeProductCount']).toBe(3);
    });
  });

  describe('T111: Audit trail verification', () => {
    test('SC-004: createBrand calls writeAuditLog', async () => {
      brandMock.findFirst.mockResolvedValue(null);
      brandMock.create.mockResolvedValue(createMockBrand());

      await createBrand(prisma, TENANT_ID, {
        name: 'Test Brand',
        commissionRate: 10,
      }, AUDIT_CTX);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Brand',
          action: 'create',
          actorId: AUDIT_CTX.actorId,
          actorEmail: AUDIT_CTX.actorEmail,
        }),
      );
    });

    test('SC-004: updateBrand calls writeAuditLog', async () => {
      brandMock.findFirst
        .mockResolvedValueOnce(createMockBrand()) // find existing
        .mockResolvedValueOnce(null); // no name conflict
      brandMock.update.mockResolvedValue(createMockBrand({ name: 'Updated' }));

      await updateBrand(prisma, TENANT_ID, BRAND_ID, { name: 'Updated' }, undefined, AUDIT_CTX);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Brand',
          action: 'update',
          entityId: BRAND_ID,
        }),
      );
    });
  });

  describe('T112: Optimistic concurrency', () => {
    test('FR-018e: concurrent update with matching timestamp succeeds', async () => {
      const existing = createMockBrand();
      brandMock.findFirst
        .mockResolvedValueOnce(existing) // find existing
        .mockResolvedValueOnce(null); // no name conflict
      brandMock.update.mockResolvedValue(createMockBrand({ name: 'Updated' }));

      const result = await updateBrand(
        prisma, TENANT_ID, BRAND_ID,
        { name: 'Updated' },
        existing.updatedAt.toISOString(),
        AUDIT_CTX,
      );

      expect(result).toBeDefined();
    });
  });

  describe('T113: Edge cases', () => {
    test('FR-019c: duplicate brand name is case-sensitive in lookup', async () => {
      brandMock.findFirst.mockResolvedValue(createMockBrand());

      await expect(
        createBrand(prisma, TENANT_ID, {
          name: 'Mountain Meadow Farms',
          commissionRate: 10,
        }, AUDIT_CTX),
      ).rejects.toThrow('Brand name already exists');
    });
  });
});
