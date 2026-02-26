import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  getProductById,
  searchProducts,
  formatProductResponse,
  getEffectivePrice,
  ProductError,
} from './product.service';
import type { ProductWithBrand } from './product.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

function createMockPrisma(): {
  prisma: PrismaClient;
  product: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
} {
  const product = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };
  return {
    prisma: { product } as unknown as PrismaClient,
    product,
  };
}

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const PRODUCT_ID = '00000000-0000-4000-a000-000000000010';

function createMockProduct(overrides: Partial<ProductWithBrand> = {}): ProductWithBrand {
  return {
    id: PRODUCT_ID,
    tenantId: TENANT_ID,
    brandId: '00000000-0000-4000-a000-000000000020',
    name: 'Artisan Honey 12oz',
    sku: 'AH-12',
    unitPrice: new Decimal('10.00'),
    wholesalePrice: new Decimal('7.50'),
    promotionalPrice: null,
    promotionalPriceStart: null,
    promotionalPriceEnd: null,
    caseSize: 24,
    revenueModelDefault: 'broker',
    availabilityStatus: 'active',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    brand: {
      id: '00000000-0000-4000-a000-000000000020',
      tenantId: TENANT_ID,
      name: 'Pacific Honey Co',
      commissionRate: new Decimal('12.00'),
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    ...overrides,
  } as ProductWithBrand;
}

describe('FR-012: Product service', () => {
  let prisma: PrismaClient;
  let productMock: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };

  beforeEach(() => {
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
      expect(productMock.findFirst).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, tenantId: TENANT_ID, isActive: true },
        include: { brand: true },
      });
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

  describe('searchProducts', () => {
    test('FR-012: searches by name with ILIKE', async () => {
      const mockProducts = [createMockProduct()];
      productMock.findMany.mockResolvedValue(mockProducts);

      const results = await searchProducts(prisma, TENANT_ID, { q: 'honey' });
      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('Artisan Honey 12oz');
    });

    test('FR-012: applies brand filter when provided', async () => {
      productMock.findMany.mockResolvedValue([]);
      const brandId = '00000000-0000-4000-a000-000000000020';

      await searchProducts(prisma, TENANT_ID, { q: 'test', brandId });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ brandId }),
        }),
      );
    });

    test('FR-012: applies availability filter when provided', async () => {
      productMock.findMany.mockResolvedValue([]);

      await searchProducts(prisma, TENANT_ID, {
        q: 'test',
        availabilityStatus: 'active',
      });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ availabilityStatus: 'active' }),
        }),
      );
    });

    test('FR-012: respects limit parameter', async () => {
      productMock.findMany.mockResolvedValue([]);

      await searchProducts(prisma, TENANT_ID, { q: 'test', limit: 10 });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    test('FR-012: defaults limit to 20', async () => {
      productMock.findMany.mockResolvedValue([]);

      await searchProducts(prisma, TENANT_ID, { q: 'test' });
      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
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
    test('FR-012: formats product with all fields', () => {
      const product = createMockProduct();
      const result = formatProductResponse(product);

      expect(result.id).toBe(PRODUCT_ID);
      expect(result.name).toBe('Artisan Honey 12oz');
      expect(result.sku).toBe('AH-12');
      expect(result.brand.name).toBe('Pacific Honey Co');
      expect(result.unitPrice).toBe(10.0);
      expect(result.wholesalePrice).toBe(7.5);
      expect(result.commissionRate).toBe(12.0);
      expect(result.availabilityStatus).toBe('active');
    });

    test('FR-012: handles null optional fields', () => {
      const product = createMockProduct({
        wholesalePrice: null,
        promotionalPrice: null,
        caseSize: null,
      });
      const result = formatProductResponse(product);

      expect(result.wholesalePrice).toBeNull();
      expect(result.promotionalPrice).toBeNull();
      expect(result.caseSize).toBeNull();
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
