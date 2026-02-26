import { describe, test, expect, vi } from 'vitest';
import {
  getReorderSuggestions,
  ReorderError,
  MIN_ORDER_HISTORY,
} from './reorder-suggestion.service';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';

function createMockPrisma(overrides: Record<string, unknown> = {}): PrismaClient {
  return {
    order: {
      count: vi.fn().mockResolvedValue(overrides['orderCount'] ?? 8),
      findMany: vi.fn().mockResolvedValue(overrides['orders'] ?? []),
    },
    product: {
      findMany: vi.fn().mockResolvedValue(overrides['products'] ?? []),
    },
  } as unknown as PrismaClient;
}

function makeMockOrder(lineItems: Array<{ productId: string; quantity: number }>): Record<string, unknown> {
  return {
    id: crypto.randomUUID(),
    accountId: ACCOUNT_ID,
    tenantId: TENANT_ID,
    lineItems: lineItems.map((li) => ({
      productId: li.productId,
      quantity: li.quantity,
      unitPrice: 10.0,
      lineTotal: li.quantity * 10.0,
      product: {
        id: li.productId,
        name: `Product ${li.productId.slice(0, 4)}`,
        sku: `SKU-${li.productId.slice(0, 4)}`,
        isActive: true,
        availabilityStatus: 'in_stock',
        brand: { id: 'brand-1', name: 'Test Brand' },
      },
    })),
    createdAt: new Date(),
  };
}

describe('FR-014: AI Reorder Suggestion Service', () => {
  test('FR-014: exports MIN_ORDER_HISTORY constant as 6', () => {
    expect(MIN_ORDER_HISTORY).toBe(6);
  });

  test('FR-014: throws INSUFFICIENT_HISTORY when account has fewer than 6 orders', async () => {
    const prisma = createMockPrisma({ orderCount: 3 });

    await expect(
      getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID),
    ).rejects.toThrow(ReorderError);

    await expect(
      getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID),
    ).rejects.toThrow(/Not enough order history/);
  });

  test('FR-014: returns suggestions with product info and median quantities', async () => {
    const orders = [
      makeMockOrder([
        { productId: 'prod-aaa1', quantity: 10 },
        { productId: 'prod-bbb2', quantity: 5 },
      ]),
      makeMockOrder([
        { productId: 'prod-aaa1', quantity: 12 },
        { productId: 'prod-bbb2', quantity: 8 },
      ]),
      makeMockOrder([
        { productId: 'prod-aaa1', quantity: 14 },
        { productId: 'prod-bbb2', quantity: 6 },
      ]),
    ];

    const prisma = createMockPrisma({
      orderCount: 8,
      orders,
      products: [
        {
          id: 'prod-aaa1',
          name: 'Product AAA1',
          sku: 'SKU-AAA1',
          unitPrice: 10.0,
          isActive: true,
          availabilityStatus: 'in_stock',
          brand: { id: 'brand-1', name: 'Test Brand' },
        },
        {
          id: 'prod-bbb2',
          name: 'Product BBB2',
          sku: 'SKU-BBB2',
          unitPrice: 10.0,
          isActive: true,
          availabilityStatus: 'in_stock',
          brand: { id: 'brand-1', name: 'Test Brand' },
        },
      ],
    });

    const result = await getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID);

    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toHaveProperty('productId');
    expect(result.suggestions[0]).toHaveProperty('suggestedQuantity');
    expect(result.suggestions[0]).toHaveProperty('productName');
    expect(result.estimatedTotal).toBeGreaterThan(0);
  });

  test('FR-014: excludes discontinued (inactive) products from suggestions', async () => {
    const orders = [
      makeMockOrder([
        { productId: 'prod-active', quantity: 10 },
        { productId: 'prod-discontinued', quantity: 5 },
      ]),
    ];

    const prisma = createMockPrisma({
      orderCount: 8,
      orders,
      products: [
        {
          id: 'prod-active',
          name: 'Active Product',
          sku: 'SKU-ACTIVE',
          unitPrice: 10.0,
          isActive: true,
          availabilityStatus: 'in_stock',
          brand: { id: 'brand-1', name: 'Test Brand' },
        },
        // prod-discontinued NOT in active products list
      ],
    });

    const result = await getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID);

    const discontinuedSuggestion = result.suggestions.find(
      (s) => s.productId === 'prod-discontinued',
    );
    expect(discontinuedSuggestion).toBeUndefined();
    expect(result.discontinuedCount).toBe(1);
  });

  test('FR-014: calculates median quantity correctly for odd-count', async () => {
    const orders = [
      makeMockOrder([{ productId: 'prod-1', quantity: 5 }]),
      makeMockOrder([{ productId: 'prod-1', quantity: 10 }]),
      makeMockOrder([{ productId: 'prod-1', quantity: 15 }]),
    ];

    const prisma = createMockPrisma({
      orderCount: 8,
      orders,
      products: [
        {
          id: 'prod-1',
          name: 'Product 1',
          sku: 'SKU-1',
          unitPrice: 10.0,
          isActive: true,
          availabilityStatus: 'in_stock',
          brand: { id: 'brand-1', name: 'Test Brand' },
        },
      ],
    });

    const result = await getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID);

    const suggestion = result.suggestions.find((s) => s.productId === 'prod-1');
    expect(suggestion).toBeDefined();
    expect(suggestion!.suggestedQuantity).toBe(10); // median of [5, 10, 15]
  });

  test('FR-014: calculates median quantity correctly for even-count', async () => {
    const orders = [
      makeMockOrder([{ productId: 'prod-1', quantity: 4 }]),
      makeMockOrder([{ productId: 'prod-1', quantity: 8 }]),
      makeMockOrder([{ productId: 'prod-1', quantity: 12 }]),
      makeMockOrder([{ productId: 'prod-1', quantity: 16 }]),
    ];

    const prisma = createMockPrisma({
      orderCount: 8,
      orders,
      products: [
        {
          id: 'prod-1',
          name: 'Product 1',
          sku: 'SKU-1',
          unitPrice: 10.0,
          isActive: true,
          availabilityStatus: 'in_stock',
          brand: { id: 'brand-1', name: 'Test Brand' },
        },
      ],
    });

    const result = await getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID);

    const suggestion = result.suggestions.find((s) => s.productId === 'prod-1');
    expect(suggestion).toBeDefined();
    expect(suggestion!.suggestedQuantity).toBe(10); // median of [4, 8, 12, 16] = (8+12)/2
  });

  test('FR-014: includes tenant isolation in all queries', async () => {
    const prisma = createMockPrisma({ orderCount: 8, orders: [], products: [] });
    const countSpy = prisma.order.count as ReturnType<typeof vi.fn>;
    const findManySpy = prisma.order.findMany as ReturnType<typeof vi.fn>;

    await getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID);

    expect(countSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
      }),
    );
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
      }),
    );
  });

  test('FR-014: labels all suggestions as AI-generated', async () => {
    const orders = [
      makeMockOrder([{ productId: 'prod-1', quantity: 10 }]),
    ];

    const prisma = createMockPrisma({
      orderCount: 8,
      orders,
      products: [
        {
          id: 'prod-1',
          name: 'Product 1',
          sku: 'SKU-1',
          unitPrice: 10.0,
          isActive: true,
          availabilityStatus: 'in_stock',
          brand: { id: 'brand-1', name: 'Test Brand' },
        },
      ],
    });

    const result = await getReorderSuggestions(prisma, TENANT_ID, ACCOUNT_ID);

    expect(result.aiGenerated).toBe(true);
  });
});
