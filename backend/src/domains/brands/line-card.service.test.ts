import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  fetchLineCardData,
  generateLineCardPdf,
  generateLineCard,
} from './line-card.service';
import type { LineCardData } from './line-card.service';
import { BrandError } from './brand.service';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const BRAND_ID = '00000000-0000-4000-a000-000000000020';

const MOCK_BRAND = {
  id: BRAND_ID,
  tenantId: TENANT_ID,
  name: 'Mountain Meadow Farms',
  description: 'Premium honey producer',
  logoUrl: 'https://example.com/logo.png',
  commissionRate: 12.5,
  isActive: true,
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  website: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

function createMockProducts(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `prod-${i + 1}`,
    tenantId: TENANT_ID,
    brandId: BRAND_ID,
    name: `Product ${i + 1}`,
    sku: `SKU-${String(i + 1).padStart(3, '0')}`,
    description: `Description for product ${i + 1}`,
    unitPrice: 10 + i,
    wholesalePrice: i % 2 === 0 ? 8 + i : null,
    caseSize: 12,
    certifications: i % 3 === 0 ? ['organic'] : [],
    allergens: [],
    dietaryAttributes: [],
    availabilityStatus: 'active',
    imageUrl: null,
    category: 'honey',
    subcategory: null,
    revenueModelDefault: 'broker',
    isActive: true,
    promotionalPrice: null,
    promotionalPriceStart: null,
    promotionalPriceEnd: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  }));
}

function createMockPrisma(): {
  prisma: PrismaClient;
  brand: { findFirst: ReturnType<typeof vi.fn> };
  product: { findMany: ReturnType<typeof vi.fn> };
} {
  const brand = { findFirst: vi.fn() };
  const product = { findMany: vi.fn() };
  return {
    prisma: { brand, product } as unknown as PrismaClient,
    brand,
    product,
  };
}

describe('FR-019: Line card service', () => {
  let prisma: PrismaClient;
  let brandMock: { findFirst: ReturnType<typeof vi.fn> };
  let productMock: { findMany: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    brandMock = mock.brand;
    productMock = mock.product;
  });

  describe('fetchLineCardData', () => {
    test('FR-019a: fetches brand and active products', async () => {
      brandMock.findFirst.mockResolvedValue(MOCK_BRAND);
      productMock.findMany.mockResolvedValue(createMockProducts(5));

      const data = await fetchLineCardData(prisma, TENANT_ID, BRAND_ID);

      expect(data.brandName).toBe('Mountain Meadow Farms');
      expect(data.brandDescription).toBe('Premium honey producer');
      expect(data.products).toHaveLength(5);
      expect(data.generatedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('FR-019: throws when brand not found', async () => {
      brandMock.findFirst.mockResolvedValue(null);

      await expect(
        fetchLineCardData(prisma, TENANT_ID, BRAND_ID),
      ).rejects.toThrow('Brand not found');
    });

    test('FR-019: throws when brand has no active products', async () => {
      brandMock.findFirst.mockResolvedValue(MOCK_BRAND);
      productMock.findMany.mockResolvedValue([]);

      await expect(
        fetchLineCardData(prisma, TENANT_ID, BRAND_ID),
      ).rejects.toThrow('No active products found');
    });

    test('FR-019: error is BrandError with correct code for no products', async () => {
      brandMock.findFirst.mockResolvedValue(MOCK_BRAND);
      productMock.findMany.mockResolvedValue([]);

      await expect(
        fetchLineCardData(prisma, TENANT_ID, BRAND_ID),
      ).rejects.toThrow(BrandError);
    });

    test('FR-019a: formats product data correctly', async () => {
      brandMock.findFirst.mockResolvedValue(MOCK_BRAND);
      productMock.findMany.mockResolvedValue(createMockProducts(1));

      const data = await fetchLineCardData(prisma, TENANT_ID, BRAND_ID);
      const product = data.products[0]!;

      expect(product.name).toBe('Product 1');
      expect(product.sku).toBe('SKU-001');
      expect(product.unitPrice).toBe(10);
      expect(product.wholesalePrice).toBe(8);
      expect(product.caseSize).toBe(12);
      expect(product.certifications).toEqual(['organic']);
    });

    test('FR-019a: filters only active non-discontinued products', async () => {
      brandMock.findFirst.mockResolvedValue(MOCK_BRAND);
      productMock.findMany.mockResolvedValue(createMockProducts(3));

      await fetchLineCardData(prisma, TENANT_ID, BRAND_ID);

      expect(productMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            brandId: BRAND_ID,
            isActive: true,
            availabilityStatus: { not: 'discontinued' },
          }),
        }),
      );
    });
  });

  describe('generateLineCardPdf', () => {
    test('SC-006: generates non-empty PDF buffer', async () => {
      const data: LineCardData = {
        brandName: 'Test Brand',
        brandDescription: 'A test brand',
        logoUrl: null,
        generatedDate: '2026-02-26',
        products: [
          {
            name: 'Test Product',
            sku: 'TP-001',
            description: 'A test product',
            unitPrice: 12.99,
            wholesalePrice: 9.99,
            caseSize: 12,
            certifications: ['organic', 'non_gmo'],
            availabilityStatus: 'active',
          },
        ],
      };

      const buffer = await generateLineCardPdf(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF signature check
      expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    });

    test('SC-006: PDF contains brand name', async () => {
      const data: LineCardData = {
        brandName: 'UniqueTestBrandName',
        brandDescription: null,
        logoUrl: null,
        generatedDate: '2026-02-26',
        products: [
          {
            name: 'Product A',
            sku: 'PA-001',
            description: null,
            unitPrice: 5.0,
            wholesalePrice: null,
            caseSize: null,
            certifications: [],
            availabilityStatus: 'active',
          },
        ],
      };

      const buffer = await generateLineCardPdf(data);
      const content = buffer.toString('utf-8');

      expect(content).toContain('UniqueTestBrandName');
    });

    test('SC-006: PDF is valid and non-trivial size', async () => {
      const data: LineCardData = {
        brandName: 'Brand',
        brandDescription: null,
        logoUrl: null,
        generatedDate: '2026-02-26',
        products: [
          {
            name: 'Artisan Honey',
            sku: 'AH-001',
            description: 'Premium raw honey',
            unitPrice: 12.99,
            wholesalePrice: 9.99,
            caseSize: 12,
            certifications: ['organic'],
            availabilityStatus: 'active',
          },
        ],
      };

      const buffer = await generateLineCardPdf(data);

      // Valid PDF with non-trivial content
      expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
      // A PDF with product data should be reasonably sized (> 1KB)
      expect(buffer.length).toBeGreaterThan(1000);
    });

    test('SC-003: handles multiple products', async () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        name: `Product ${i + 1}`,
        sku: `SKU-${i + 1}`,
        description: `Description ${i + 1}`,
        unitPrice: 10 + i,
        wholesalePrice: 8 + i,
        caseSize: 12,
        certifications: ['organic'],
        availabilityStatus: 'active' as const,
      }));

      const data: LineCardData = {
        brandName: 'Big Brand',
        brandDescription: 'Many products',
        logoUrl: null,
        generatedDate: '2026-02-26',
        products,
      };

      const buffer = await generateLineCardPdf(data);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateLineCard', () => {
    test('FR-019a: returns buffer and filename', async () => {
      brandMock.findFirst.mockResolvedValue(MOCK_BRAND);
      productMock.findMany.mockResolvedValue(createMockProducts(3));

      const result = await generateLineCard(prisma, TENANT_ID, BRAND_ID);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toMatch(/^mountain-meadow-farms-line-card-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    test('FR-019a: filename uses kebab-case brand name', async () => {
      const customBrand = { ...MOCK_BRAND, name: 'Pacific  Honey & Co' };
      brandMock.findFirst.mockResolvedValue(customBrand);
      productMock.findMany.mockResolvedValue(createMockProducts(1));

      const result = await generateLineCard(prisma, TENANT_ID, BRAND_ID);

      expect(result.filename).toMatch(/^pacific-honey-co-line-card-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    test('FR-019: propagates BrandError for missing brand', async () => {
      brandMock.findFirst.mockResolvedValue(null);

      await expect(
        generateLineCard(prisma, TENANT_ID, BRAND_ID),
      ).rejects.toThrow(BrandError);
    });

    test('FR-019: propagates BrandError for no active products', async () => {
      brandMock.findFirst.mockResolvedValue(MOCK_BRAND);
      productMock.findMany.mockResolvedValue([]);

      await expect(
        generateLineCard(prisma, TENANT_ID, BRAND_ID),
      ).rejects.toThrow(BrandError);
    });
  });
});
