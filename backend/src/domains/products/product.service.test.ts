/**
 * Product service unit tests.
 * T084/T085: Validates product search, listing, promotional pricing,
 * and effective price calculation.
 * Tests reference FR-015 and FR-016.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

import {
  searchProducts,
  listProducts,
  getProductById,
  getProductsByIds,
  isPromoActive,
  getEffectivePrice,
} from './product.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_PRODUCT_ID = '880e8400-e29b-41d4-a716-446655440001';
const TEST_BRAND_ID = '990e8400-e29b-41d4-a716-446655440001';

// ---------------------------------------------------------------------------
// isPromoActive Tests
// ---------------------------------------------------------------------------

describe('isPromoActive', () => {
  test('FR-016: returns true when promo is currently active', () => {
    expect(
      isPromoActive({
        promo_price: new Decimal('5.00'),
        promo_start_date: new Date('2020-01-01'),
        promo_end_date: new Date('2099-12-31'),
      }),
    ).toBe(true);
  });

  test('FR-016: returns false when no promo price set', () => {
    expect(
      isPromoActive({
        promo_price: null,
        promo_start_date: new Date('2020-01-01'),
        promo_end_date: new Date('2099-12-31'),
      }),
    ).toBe(false);
  });

  test('FR-016: returns true when no date bounds (always active)', () => {
    expect(
      isPromoActive({
        promo_price: new Decimal('5.00'),
        promo_start_date: null,
        promo_end_date: null,
      }),
    ).toBe(true);
  });

  test('FR-016: returns false when before start date', () => {
    expect(
      isPromoActive({
        promo_price: new Decimal('5.00'),
        promo_start_date: new Date('2099-01-01'),
        promo_end_date: new Date('2099-12-31'),
      }),
    ).toBe(false);
  });

  test('FR-016: returns false when after end date', () => {
    expect(
      isPromoActive({
        promo_price: new Decimal('5.00'),
        promo_start_date: new Date('2020-01-01'),
        promo_end_date: new Date('2020-12-31'),
      }),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEffectivePrice Tests
// ---------------------------------------------------------------------------

describe('getEffectivePrice', () => {
  test('FR-016: returns promo price when active', () => {
    const result = getEffectivePrice({
      unit_price: new Decimal('10.00'),
      promo_price: new Decimal('7.50'),
      promo_start_date: new Date('2020-01-01'),
      promo_end_date: new Date('2099-12-31'),
    });
    expect(result.price).toBe(7.50);
    expect(result.promoApplied).toBe(true);
  });

  test('FR-016: returns unit price when no promo', () => {
    const result = getEffectivePrice({
      unit_price: new Decimal('10.00'),
      promo_price: null,
      promo_start_date: null,
      promo_end_date: null,
    });
    expect(result.price).toBe(10.00);
    expect(result.promoApplied).toBe(false);
  });

  test('FR-016: returns unit price when promo expired', () => {
    const result = getEffectivePrice({
      unit_price: new Decimal('10.00'),
      promo_price: new Decimal('7.50'),
      promo_start_date: new Date('2020-01-01'),
      promo_end_date: new Date('2020-12-31'),
    });
    expect(result.price).toBe(10.00);
    expect(result.promoApplied).toBe(false);
  });

  test('FR-016: handles number type unit_price', () => {
    const result = getEffectivePrice({
      unit_price: 10.00,
      promo_price: null,
      promo_start_date: null,
      promo_end_date: null,
    });
    expect(result.price).toBe(10.00);
  });
});

// ---------------------------------------------------------------------------
// searchProducts Tests (FR-015)
// ---------------------------------------------------------------------------

describe('searchProducts', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-015: searches products by name', async () => {
    const products = [
      {
        id: TEST_PRODUCT_ID,
        tenant_id: TEST_TENANT_ID,
        brand_id: TEST_BRAND_ID,
        name: 'Organic Honey 12oz',
        sku: 'BEE-HON-12',
        category: 'Honey',
        unit_price: new Decimal('8.50'),
        promo_price: null,
        promo_start_date: null,
        promo_end_date: null,
        availability_status: 'in_stock',
        certifications: ['Organic'],
        is_active: true,
        brand: { id: TEST_BRAND_ID, name: "Bee's Best Honey" },
      },
    ];

    mockPrisma.product.findMany.mockResolvedValue(products);
    mockPrisma.product.count.mockResolvedValue(1);

    const result = await searchProducts(
      mockPrisma as unknown as Parameters<typeof searchProducts>[0],
      TEST_TENANT_ID,
      'honey',
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.name).toBe('Organic Honey 12oz');
    expect(result.items[0]!.promo_active).toBe(false);
    expect(result.totalCount).toBe(1);
  });

  test('FR-015: returns empty results for no matches', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const result = await searchProducts(
      mockPrisma as unknown as Parameters<typeof searchProducts>[0],
      TEST_TENANT_ID,
      'nonexistent-product',
    );

    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  test('FR-015: applies brand filter', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    await searchProducts(
      mockPrisma as unknown as Parameters<typeof searchProducts>[0],
      TEST_TENANT_ID,
      'honey',
      { brandId: TEST_BRAND_ID },
    );

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          brand_id: TEST_BRAND_ID,
        }),
      }),
    );
  });

  test('FR-015: applies certification filter', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    await searchProducts(
      mockPrisma as unknown as Parameters<typeof searchProducts>[0],
      TEST_TENANT_ID,
      'honey',
      { certification: 'Organic' },
    );

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          certifications: { has: 'Organic' },
        }),
      }),
    );
  });

  test('FR-015: enriches results with promo_active flag', async () => {
    const products = [
      {
        id: TEST_PRODUCT_ID,
        name: 'Promo Product',
        unit_price: new Decimal('10.00'),
        promo_price: new Decimal('7.50'),
        promo_start_date: new Date('2020-01-01'),
        promo_end_date: new Date('2099-12-31'),
        brand: { id: TEST_BRAND_ID, name: 'Test Brand' },
      },
    ];

    mockPrisma.product.findMany.mockResolvedValue(products);
    mockPrisma.product.count.mockResolvedValue(1);

    const result = await searchProducts(
      mockPrisma as unknown as Parameters<typeof searchProducts>[0],
      TEST_TENANT_ID,
      'promo',
    );

    expect(result.items[0]!.promo_active).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// listProducts Tests
// ---------------------------------------------------------------------------

describe('listProducts', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-015: lists products with pagination', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Product 1', promo_price: null, promo_start_date: null, promo_end_date: null },
      { id: 'p2', name: 'Product 2', promo_price: null, promo_start_date: null, promo_end_date: null },
    ]);
    mockPrisma.product.count.mockResolvedValue(2);

    const result = await listProducts(
      mockPrisma as unknown as Parameters<typeof listProducts>[0],
      TEST_TENANT_ID,
      { page: 1, pageSize: 25 },
    );

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  test('FR-015: filters by brand', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    await listProducts(
      mockPrisma as unknown as Parameters<typeof listProducts>[0],
      TEST_TENANT_ID,
      { brandId: TEST_BRAND_ID },
    );

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          brand_id: TEST_BRAND_ID,
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// getProductById Tests
// ---------------------------------------------------------------------------

describe('getProductById', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-015: returns product with promo_active enrichment', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: TEST_PRODUCT_ID,
      name: 'Test Product',
      promo_price: null,
      promo_start_date: null,
      promo_end_date: null,
      brand: { id: TEST_BRAND_ID, name: 'Test Brand' },
    });

    const result = await getProductById(
      mockPrisma as unknown as Parameters<typeof getProductById>[0],
      TEST_TENANT_ID,
      TEST_PRODUCT_ID,
    );

    expect(result).toBeTruthy();
    expect(result!.promo_active).toBe(false);
  });

  test('FR-015: returns null for non-existent product', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);

    const result = await getProductById(
      mockPrisma as unknown as Parameters<typeof getProductById>[0],
      TEST_TENANT_ID,
      'non-existent-id',
    );

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getProductsByIds Tests
// ---------------------------------------------------------------------------

describe('getProductsByIds', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-015: returns multiple products by IDs', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Product 1', promo_price: null, promo_start_date: null, promo_end_date: null, brand: { id: TEST_BRAND_ID, name: 'Brand' } },
      { id: 'p2', name: 'Product 2', promo_price: null, promo_start_date: null, promo_end_date: null, brand: { id: TEST_BRAND_ID, name: 'Brand' } },
    ]);

    const result = await getProductsByIds(
      mockPrisma as unknown as Parameters<typeof getProductsByIds>[0],
      TEST_TENANT_ID,
      ['p1', 'p2'],
    );

    expect(result).toHaveLength(2);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['p1', 'p2'] },
          tenant_id: TEST_TENANT_ID,
          is_active: true,
        }),
      }),
    );
  });
});
