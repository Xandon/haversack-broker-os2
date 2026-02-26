import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  softDeleteProduct,
  listProducts,
  formatProductResponse,
  getEffectivePrice,
  ProductError,
} from './product.service';
import type { ProductWithBrand, AuditContext } from './product.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

function createMockPrisma(): {
  prisma: PrismaClient;
  product: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
} {
  const product = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const auditTrail = { create: vi.fn() };
  return {
    prisma: { product, auditTrail } as unknown as PrismaClient,
    product,
  };
}

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const PRODUCT_ID = '00000000-0000-4000-a000-000000000010';
const BRAND_ID = '00000000-0000-4000-a000-000000000020';

const AUDIT_CTX: AuditContext = {
  actorId: '00000000-0000-4000-a000-000000000099',
  actorEmail: 'admin@test.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-123',
};

function createMockProduct(overrides: Partial<ProductWithBrand> = {}): ProductWithBrand {
  return {
    id: PRODUCT_ID,
    tenantId: TENANT_ID,
    brandId: BRAND_ID,
    name: 'Artisan Honey 12oz',
    sku: 'AH-12',
    category: 'honey',
    subcategory: 'raw',
    description: 'Premium raw honey',
    unitPrice: new Decimal('10.00'),
    wholesalePrice: new Decimal('7.50'),
    promotionalPrice: null,
    promotionalPriceStart: null,
    promotionalPriceEnd: null,
    caseSize: 24,
    revenueModelDefault: 'broker',
    availabilityStatus: 'active',
    imageUrl: 'https://example.com/honey.jpg',
    certifications: ['organic', 'non_gmo'],
    allergens: [],
    dietaryAttributes: ['vegan'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    brand: {
      id: BRAND_ID,
      tenantId: TENANT_ID,
      name: 'Pacific Honey Co',
      commissionRate: new Decimal('12.00'),
      description: null,
      logoUrl: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      website: null,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    ...overrides,
  } as ProductWithBrand;
}

describe('FR-012/FR-018: Product service', () => {
  let prisma: PrismaClient;
  let productMock: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    productMock = mock.product;
  });

  describe('getProductById', () => {
    test('FR-012: returns product with brand when found', async () => {
      const mockProduct = createMockProduct();
      productMock.findFirst.mockResolvedValue(mockProduct);

      const result = await getProductById(prisma, TENANT_ID, PRODUCT_ID);
      expect(result.id).toBe(PRODUCT_ID);
      expect(result.brand.name).toBe('Pacific Honey Co');
    });

    test('FR-012: throws ProductError when not found', async () => {
      productMock.findFirst.mockResolvedValue(null);

      await expect(
        getProductById(prisma, TENANT_ID, PRODUCT_ID),
      ).rejects.toThrow(ProductError);
    });

    test('FR-012: filters by tenant_id for isolation', async () => {
      productMock.findFirst.mockResolvedValue(null);
      const otherTenant = '00000000-0000-4000-a000-000000000099';

      await getProductById(prisma, otherTenant, PRODUCT_ID).catch(() => {});
      expect(productMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: otherTenant }),
        }),
      );
    });
  });

  describe('FR-018a: createProduct', () => {
    test('FR-018a: creates product with all catalog fields', async () => {
      productMock.findFirst.mockResolvedValue(null); // no SKU conflict
      const mockCreated = createMockProduct();
      productMock.create.mockResolvedValue(mockCreated);

      const result = await createProduct(prisma, TENANT_ID, {
        name: 'Artisan Honey 12oz',
        sku: 'AH-12',
        brandId: BRAND_ID,
        unitPrice: 10.00,
        revenueModelDefault: 'broker',
        category: 'honey',
        subcategory: 'raw',
        description: 'Premium raw honey',
        imageUrl: 'https://example.com/honey.jpg',
        certifications: ['organic', 'non_gmo'],
        allergens: [],
        dietaryAttributes: ['vegan'],
      }, AUDIT_CTX);

      expect(result.id).toBe(PRODUCT_ID);
      expect(productMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            category: 'honey',
            certifications: ['organic', 'non_gmo'],
          }),
        }),
      );
    });

    test('FR-018d: rejects duplicate SKU within tenant', async () => {
      productMock.findFirst.mockResolvedValue(createMockProduct()); // SKU exists

      await expect(
        createProduct(prisma, TENANT_ID, {
          name: 'Another Honey',
          sku: 'AH-12',
          brandId: BRAND_ID,
          unitPrice: 10,
          revenueModelDefault: 'broker',
        }, AUDIT_CTX),
      ).rejects.toThrow('SKU already exists');
    });

    test('FR-018a: creates product with minimal fields', async () => {
      productMock.findFirst.mockResolvedValue(null);
      const mockCreated = createMockProduct({
        category: null,
        subcategory: null,
        description: null,
        imageUrl: null,
        certifications: [],
        allergens: [],
        dietaryAttributes: [],
      });
      productMock.create.mockResolvedValue(mockCreated);

      const result = await createProduct(prisma, TENANT_ID, {
        name: 'Basic Product',
        sku: 'BP-01',
        brandId: BRAND_ID,
        unitPrice: 5.00,
        revenueModelDefault: 'wholesale',
      }, AUDIT_CTX);

      expect(result).toBeDefined();
      expect(productMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: null,
            certifications: [],
          }),
        }),
      );
    });
  });

  describe('FR-018e: updateProduct', () => {
    test('FR-018e: updates product fields', async () => {
      const existing = createMockProduct();
      productMock.findFirst.mockResolvedValue(existing);
      const updated = createMockProduct({ category: 'condiments' });
      productMock.update.mockResolvedValue(updated);

      const result = await updateProduct(
        prisma, TENANT_ID, PRODUCT_ID,
        { category: 'condiments' },
        undefined,
        AUDIT_CTX,
      );

      expect(result.category).toBe('condiments');
    });

    test('FR-018e: optimistic concurrency check succeeds with matching timestamp', async () => {
      const existing = createMockProduct();
      productMock.findFirst.mockResolvedValue(existing);
      productMock.update.mockResolvedValue(existing);

      await expect(
        updateProduct(
          prisma, TENANT_ID, PRODUCT_ID,
          { name: 'Updated' },
          existing.updatedAt.toISOString(),
          AUDIT_CTX,
        ),
      ).resolves.toBeDefined();
    });

    test('FR-018e: optimistic concurrency check fails with stale timestamp', async () => {
      const existing = createMockProduct();
      productMock.findFirst.mockResolvedValue(existing);

      await expect(
        updateProduct(
          prisma, TENANT_ID, PRODUCT_ID,
          { name: 'Updated' },
          '2025-01-01T00:00:00.000Z',
          AUDIT_CTX,
        ),
      ).rejects.toThrow('modified by another user');
    });

    test('FR-018e: rejects update on non-existent product', async () => {
      productMock.findFirst.mockResolvedValue(null);

      await expect(
        updateProduct(
          prisma, TENANT_ID, PRODUCT_ID,
          { name: 'Updated' },
          undefined,
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Product not found');
    });

    test('FR-018d: rejects duplicate SKU on update', async () => {
      const existing = createMockProduct();
      productMock.findFirst
        .mockResolvedValueOnce(existing) // find existing
        .mockResolvedValueOnce(createMockProduct({ id: 'other-id', sku: 'DUP-SKU' })); // SKU conflict

      await expect(
        updateProduct(
          prisma, TENANT_ID, PRODUCT_ID,
          { sku: 'DUP-SKU' },
          undefined,
          AUDIT_CTX,
        ),
      ).rejects.toThrow('SKU already exists');
    });
  });

  describe('FR-018a: softDeleteProduct', () => {
    test('FR-018a: soft-deletes product by setting isActive false', async () => {
      productMock.findFirst.mockResolvedValue(createMockProduct());
      productMock.update.mockResolvedValue({ isActive: false });

      const result = await softDeleteProduct(prisma, TENANT_ID, PRODUCT_ID, AUDIT_CTX);
      expect(result.deleted).toBe(true);
      expect(productMock.update).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        data: { isActive: false },
      });
    });

    test('FR-018a: throws when product not found', async () => {
      productMock.findFirst.mockResolvedValue(null);

      await expect(
        softDeleteProduct(prisma, TENANT_ID, PRODUCT_ID, AUDIT_CTX),
      ).rejects.toThrow('Product not found');
    });
  });

  describe('FR-018b: listProducts', () => {
    test('FR-018b: lists products with default pagination', async () => {
      const products = [createMockProduct()];
      productMock.findMany.mockResolvedValue(products);

      const result = await listProducts(prisma, TENANT_ID, { limit: 20, sortBy: 'name', sortOrder: 'asc' });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    test('FR-018b: applies category filter', async () => {
      productMock.findMany.mockResolvedValue([]);

      await listProducts(prisma, TENANT_ID, {
        category: 'honey',
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'honey' }),
        }),
      );
    });

    test('FR-018b: applies certification filter with hasSome', async () => {
      productMock.findMany.mockResolvedValue([]);

      await listProducts(prisma, TENANT_ID, {
        certification: 'organic',
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            certifications: { hasSome: ['organic'] },
          }),
        }),
      );
    });

    test('FR-018b: indicates hasMore when results exceed limit', async () => {
      const products = Array.from({ length: 3 }, (_, i) =>
        createMockProduct({ id: `id-${i}` }),
      );
      productMock.findMany.mockResolvedValue(products);

      const result = await listProducts(prisma, TENANT_ID, { limit: 2, sortBy: 'name', sortOrder: 'asc' });
      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeDefined();
    });
  });

  describe('FR-018b: searchProducts enhanced', () => {
    test('FR-012: searches by name with ILIKE', async () => {
      const mockProducts = [createMockProduct()];
      productMock.findMany.mockResolvedValue(mockProducts);

      const results = await searchProducts(prisma, TENANT_ID, { q: 'honey' });
      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('Artisan Honey 12oz');
    });

    test('FR-018b: applies category filter in search', async () => {
      productMock.findMany.mockResolvedValue([]);

      await searchProducts(prisma, TENANT_ID, { q: 'test', category: 'honey' });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'honey' }),
        }),
      );
    });

    test('FR-018b: applies certification filter in search', async () => {
      productMock.findMany.mockResolvedValue([]);

      await searchProducts(prisma, TENANT_ID, { q: 'test', certification: 'organic' });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            certifications: { hasSome: ['organic'] },
          }),
        }),
      );
    });

    test('FR-012: applies brand filter when provided', async () => {
      productMock.findMany.mockResolvedValue([]);

      await searchProducts(prisma, TENANT_ID, { q: 'test', brandId: BRAND_ID });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ brandId: BRAND_ID }),
        }),
      );
    });

    test('FR-012: only returns active products', async () => {
      productMock.findMany.mockResolvedValue([]);

      await searchProducts(prisma, TENANT_ID, { q: 'test' });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('formatProductResponse', () => {
    test('FR-018: formats product with all catalog fields', () => {
      const product = createMockProduct();
      const result = formatProductResponse(product);

      expect(result.id).toBe(PRODUCT_ID);
      expect(result.name).toBe('Artisan Honey 12oz');
      expect(result.category).toBe('honey');
      expect(result.subcategory).toBe('raw');
      expect(result.description).toBe('Premium raw honey');
      expect(result.imageUrl).toBe('https://example.com/honey.jpg');
      expect(result.certifications).toEqual(['organic', 'non_gmo']);
      expect(result.allergens).toEqual([]);
      expect(result.dietaryAttributes).toEqual(['vegan']);
      expect(result.commissionRate).toBe(12.0);
    });

    test('FR-018: handles null optional catalog fields', () => {
      const product = createMockProduct({
        category: null,
        subcategory: null,
        description: null,
        imageUrl: null,
        wholesalePrice: null,
        promotionalPrice: null,
        caseSize: null,
      });
      const result = formatProductResponse(product);

      expect(result.category).toBeNull();
      expect(result.subcategory).toBeNull();
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBeNull();
      expect(result.wholesalePrice).toBeNull();
    });
  });

  describe('getEffectivePrice', () => {
    test('FR-012: returns regular price when no promotion', () => {
      const product = createMockProduct();
      const result = getEffectivePrice(product, new Date('2026-03-15'));

      expect(result.price).toBe(10.0);
      expect(result.isPromotional).toBe(false);
    });

    test('FR-012: returns promotional price when within date range', () => {
      const product = createMockProduct({
        promotionalPrice: new Decimal('8.50'),
        promotionalPriceStart: new Date('2026-01-01'),
        promotionalPriceEnd: new Date('2026-04-01'),
      });
      const result = getEffectivePrice(product, new Date('2026-03-15'));

      expect(result.price).toBe(8.5);
      expect(result.isPromotional).toBe(true);
    });

    test('FR-012: returns regular price when promotion expired', () => {
      const product = createMockProduct({
        promotionalPrice: new Decimal('8.50'),
        promotionalPriceStart: new Date('2026-01-01'),
        promotionalPriceEnd: new Date('2026-02-01'),
      });
      const result = getEffectivePrice(product, new Date('2026-03-15'));

      expect(result.price).toBe(10.0);
      expect(result.isPromotional).toBe(false);
    });

    test('FR-012: returns regular price when promotion not yet started', () => {
      const product = createMockProduct({
        promotionalPrice: new Decimal('8.50'),
        promotionalPriceStart: new Date('2026-04-01'),
        promotionalPriceEnd: new Date('2026-06-01'),
      });
      const result = getEffectivePrice(product, new Date('2026-03-15'));

      expect(result.price).toBe(10.0);
      expect(result.isPromotional).toBe(false);
    });
  });
});
