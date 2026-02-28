import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createBrandService } from './brand.service.js';

function createMockPrisma() {
  return {
    brand: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('BrandService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createBrandService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createBrandService(mockPrisma as any);
  });

  describe('list', () => {
    it('FR-018: returns active brands with product count', async () => {
      const mockBrands = [
        { id: '1', name: 'Bee Best', _count: { products: 5 } },
        { id: '2', name: 'Farm Fresh', _count: { products: 12 } },
      ];
      mockPrisma.brand.findMany.mockResolvedValue(mockBrands);

      const result = await service.list(TENANT_ID);

      expect(result).toEqual(mockBrands);
      const callArgs = mockPrisma.brand.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
      expect(callArgs.include._count).toBeDefined();
    });

    it('FR-018: includes inactive brands when requested', async () => {
      mockPrisma.brand.findMany.mockResolvedValue([]);

      await service.list(TENANT_ID, false);

      const callArgs = mockPrisma.brand.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('FR-019: returns brand with active products', async () => {
      const mockBrand = {
        id: '1',
        name: 'Bee Best',
        products: [{ id: 'p1', name: 'Honey' }],
      };
      mockPrisma.brand.findFirst.mockResolvedValue(mockBrand);

      const result = await service.getById(TENANT_ID, '1');

      expect(result).toEqual(mockBrand);
      const callArgs = mockPrisma.brand.findFirst.mock.calls[0][0];
      expect(callArgs.include.products.where.isActive).toBe(true);
    });
  });

  describe('create', () => {
    it('FR-018: creates brand with required fields', async () => {
      const input = {
        name: 'Bee Best Honey Co',
        baseCommissionRate: 12,
        defaultRevenueModel: 'broker' as const,
      };
      mockPrisma.brand.create.mockResolvedValue({ id: '1', ...input });

      const result = await service.create(TENANT_ID, input);

      expect(result.name).toBe('Bee Best Honey Co');
      expect(mockPrisma.brand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });
});
