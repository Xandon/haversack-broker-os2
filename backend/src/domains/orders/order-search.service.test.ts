import { describe, test, expect, vi } from 'vitest';
import {
  searchProductsForOrder,
  type OrderProductSearchResult,
} from './order-search.service';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

function createMockPrisma(products: Array<Record<string, unknown>> = []): PrismaClient {
  return {
    product: {
      findMany: vi.fn().mockResolvedValue(products),
    },
  } as unknown as PrismaClient;
}

const MOCK_PRODUCT = {
  id: 'prod-1',
  name: 'Artisan Honey 12oz',
  sku: 'SKU-HONEY-12',
  unitPrice: 10.0,
  wholesalePrice: 8.0,
  promotionalPrice: 8.5,
  promotionalPriceStart: new Date('2026-01-01'),
  promotionalPriceEnd: new Date('2026-04-01'),
  caseSize: 12,
  revenueModelDefault: 'broker',
  availabilityStatus: 'in_stock',
  isActive: true,
  brand: { id: 'brand-1', name: 'Pacific Honey Co', commissionRate: 0.12 },
};

describe('FR-012: Order product search service', () => {
  test('FR-012: returns products with effective price for current date', async () => {
    const prisma = createMockPrisma([MOCK_PRODUCT]);
    const orderDate = new Date('2026-03-15');

    const results = await searchProductsForOrder(prisma, TENANT_ID, {
      q: 'honey',
      orderDate,
    });

    expect(results.length).toBe(1);
    expect(results[0]!.effectivePrice).toBe(8.5); // promo active
    expect(results[0]!.isPromotionalPrice).toBe(true);
  });

  test('FR-012: returns regular price when promo is expired', async () => {
    const prisma = createMockPrisma([MOCK_PRODUCT]);
    const orderDate = new Date('2026-05-01'); // after promo end

    const results = await searchProductsForOrder(prisma, TENANT_ID, {
      q: 'honey',
      orderDate,
    });

    expect(results[0]!.effectivePrice).toBe(10.0);
    expect(results[0]!.isPromotionalPrice).toBe(false);
  });

  test('FR-012: adds availability warning for out-of-stock products', async () => {
    const outOfStockProduct = {
      ...MOCK_PRODUCT,
      availabilityStatus: 'out_of_stock',
    };
    const prisma = createMockPrisma([outOfStockProduct]);

    const results = await searchProductsForOrder(prisma, TENANT_ID, {
      q: 'honey',
      orderDate: new Date(),
    });

    expect(results[0]!.availabilityWarning).toContain('out of stock');
  });

  test('FR-012: includes all required search result fields', async () => {
    const prisma = createMockPrisma([MOCK_PRODUCT]);

    const results = await searchProductsForOrder(prisma, TENANT_ID, {
      q: 'honey',
      orderDate: new Date('2026-03-15'),
    });

    const result: OrderProductSearchResult = results[0]!;
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('sku');
    expect(result).toHaveProperty('brandName');
    expect(result).toHaveProperty('effectivePrice');
    expect(result).toHaveProperty('isPromotionalPrice');
    expect(result).toHaveProperty('availabilityStatus');
    expect(result).toHaveProperty('commissionRate');
  });
});
