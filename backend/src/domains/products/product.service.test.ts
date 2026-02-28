import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createProductService } from './product.service.js';

function createMockPrisma() {
  return {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('ProductService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createProductService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createProductService(mockPrisma as any);
  });

  describe('list', () => {
    it('FR-018: returns paginated products with brand', async () => {
      const mockProducts = [{ id: '1', name: 'Artisan Honey', brand: { name: 'Bee Best' } }];
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockProducts);
      expect(result.total).toBe(1);
      const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
      expect(callArgs.include.brand).toBeTruthy();
    });

    it('FR-012: filters by search term across name, SKU, category', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { search: 'honey' });

      const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toHaveLength(3);
    });

    it('FR-018: filters by brand', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { brandId: 'brand-1' });

      const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
      expect(callArgs.where.brandId).toBe('brand-1');
    });

    it('FR-018: filters by availability status', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { availabilityStatus: 'in_stock' });

      const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
      expect(callArgs.where.availabilityStatus).toBe('in_stock');
    });
  });

  describe('getById', () => {
    it('FR-018: returns product with brand', async () => {
      const mockProduct = { id: '1', name: 'Artisan Honey', brand: { name: 'Bee Best' } };
      mockPrisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getById(TENANT_ID, '1');
      expect(result).toEqual(mockProduct);
    });

    it('FR-018: returns null for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      const result = await service.getById(TENANT_ID, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('FR-018: creates product with all fields', async () => {
      const input = {
        brandId: 'brand-1',
        name: 'Artisan Honey 12oz',
        sku: 'AH-12OZ',
        category: 'Condiments',
        unitPrice: 12.99,
        revenueModel: 'broker' as const,
        certifications: ['Organic'],
        allergens: [],
        dietaryAttributes: [],
        availabilityStatus: 'in_stock' as const,
      };
      mockPrisma.product.create.mockResolvedValue({ id: '1', ...input });

      const result = await service.create(TENANT_ID, input);
      expect(result.name).toBe('Artisan Honey 12oz');
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID, sku: 'AH-12OZ' }),
        }),
      );
    });
  });

  describe('searchForOrder', () => {
    it('FR-012: returns active products matching search query', async () => {
      const mockResults = [
        { id: '1', name: 'Artisan Honey', brand: { id: 'b1', name: 'Bee Best' } },
      ];
      mockPrisma.product.findMany.mockResolvedValue(mockResults);

      const result = await service.searchForOrder(TENANT_ID, 'honey');

      expect(result).toEqual(mockResults);
      const callArgs = mockPrisma.product.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
      expect(callArgs.take).toBe(10);
    });
  });
});
