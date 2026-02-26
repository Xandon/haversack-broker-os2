/**
 * Tests for AI reorder suggestion service.
 * Verifies FR-018 (reorder suggestions for 6+ orders),
 * FR-035 (AI-Generated labeling), FR-036 (outage handling).
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';

import type { ReorderSuggestionResponse } from './ai.schema.js';

// Mock the provider abstraction at the integration boundary
vi.mock('./provider-abstraction.js', () => ({
  callAiProvider: vi.fn(),
  AI_TIMEOUT_MS: 5000,
  AI_HARD_TIMEOUT_MS: 10000,
}));

// Import after mock
const { callAiProvider } = await import('./provider-abstraction.js');
const { generateReorderSuggestion, submitReorderAsOrder } = await import('./ai.service.js');

// -------------------------------------------------------------------
// Test constants
// -------------------------------------------------------------------
const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_ACCOUNT_ID = 'aae08400-e29b-41d4-a716-446655440001';
const TEST_ACTOR_ID = 'bbe08400-e29b-41d4-a716-446655440002';
const TEST_ACTOR_EMAIL = 'rep@haversack.com';

const MOCK_ACCOUNT = {
  id: TEST_ACCOUNT_ID,
  name: 'Pacific Bistro',
  tenant_id: TEST_TENANT_ID,
};

const MOCK_ORDER_ITEMS_WITH_PRODUCTS = [
  {
    product_id: 'prod-1',
    quantity: 24,
    unit_price: { toNumber: () => 8.5 },
    line_total: { toNumber: () => 204.0 },
    product: {
      id: 'prod-1',
      name: 'Organic Wildflower Honey 12oz',
      sku: 'BEE-HON-12',
      brand: { id: 'brand-1', name: "Bee's Best Honey" },
      brand_id: 'brand-1',
      unit_price: { toNumber: () => 8.5 },
    },
  },
  {
    product_id: 'prod-2',
    quantity: 12,
    unit_price: { toNumber: () => 6.75 },
    line_total: { toNumber: () => 81.0 },
    product: {
      id: 'prod-2',
      name: 'Artisan Hot Sauce 5oz',
      sku: 'NWS-HTS-05',
      brand: { id: 'brand-2', name: 'NW Spice Co' },
      brand_id: 'brand-2',
      unit_price: { toNumber: () => 6.75 },
    },
  },
];

function createMockOrders(count: number): unknown[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `order-${i + 1}`,
    order_number: `ORD-2026-${String(i + 1).padStart(6, '0')}`,
    account_id: TEST_ACCOUNT_ID,
    status: 'confirmed',
    total: { toNumber: () => 285 },
    created_at: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)),
    order_items: MOCK_ORDER_ITEMS_WITH_PRODUCTS,
  }));
}

// -------------------------------------------------------------------
// Mock Prisma factory
// -------------------------------------------------------------------
type MockPrisma = {
  account: { findFirst: ReturnType<typeof vi.fn> };
  order: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  orderItem: { create: ReturnType<typeof vi.fn> };
  product: { findMany: ReturnType<typeof vi.fn> };
  auditTrail: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function createMockPrisma(): MockPrisma {
  return {
    account: { findFirst: vi.fn() },
    order: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    orderItem: { create: vi.fn() },
    product: { findMany: vi.fn() },
    auditTrail: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(createMockPrisma())),
  };
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('AI Reorder Suggestion Service (T110)', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    vi.clearAllMocks();
  });

  describe('generateReorderSuggestion', () => {
    test('FR-018: returns suggestion for account with 6+ orders in 12 months', async () => {
      // Account exists
      mockPrisma.account.findFirst.mockResolvedValue(MOCK_ACCOUNT);
      // 8 confirmed orders in last 12 months
      mockPrisma.order.count.mockResolvedValue(8);
      mockPrisma.order.findMany.mockResolvedValue(createMockOrders(8));

      // AI returns structured suggestion
      const aiSuggestion = {
        items: [
          {
            product_id: 'prod-1',
            product_name: 'Organic Wildflower Honey 12oz',
            sku: 'BEE-HON-12',
            brand_name: "Bee's Best Honey",
            suggested_quantity: 24,
            unit_price: 8.5,
            line_total: 204.0,
            reasoning: 'Ordered 24 units monthly for the past 4 months',
          },
        ],
        estimated_total: 204.0,
        based_on_orders: 8,
        analysis_period_months: 12,
      };

      vi.mocked(callAiProvider).mockResolvedValue({
        success: true,
        provider: 'anthropic',
        content: JSON.stringify(aiSuggestion),
      });

      const result: ReorderSuggestionResponse = await generateReorderSuggestion(
        mockPrisma as unknown as PrismaClient,
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      expect(result.ai_generated).toBe(true);
      expect(result.ai_label).toBe('AI-Generated');
      expect(result.suggestion).not.toBeNull();
      expect(result.suggestion!.items.length).toBeGreaterThan(0);
      expect(result.suggestion!.based_on_orders).toBe(8);
      expect(result.account_name).toBe('Pacific Bistro');
    });

    test('FR-018: returns "not enough history" for accounts with < 6 orders', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(MOCK_ACCOUNT);
      mockPrisma.order.count.mockResolvedValue(3);

      const result: ReorderSuggestionResponse = await generateReorderSuggestion(
        mockPrisma as unknown as PrismaClient,
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      expect(result.ai_generated).toBe(false);
      expect(result.suggestion).toBeNull();
      expect(result.message).toContain('Not enough order history');
      expect(result.current_order_count).toBe(3);
    });

    test('FR-035: all AI content is labeled as "AI-Generated"', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(MOCK_ACCOUNT);
      mockPrisma.order.count.mockResolvedValue(8);
      mockPrisma.order.findMany.mockResolvedValue(createMockOrders(8));

      vi.mocked(callAiProvider).mockResolvedValue({
        success: true,
        provider: 'anthropic',
        content: JSON.stringify({
          items: [],
          estimated_total: 0,
          based_on_orders: 8,
          analysis_period_months: 12,
        }),
      });

      const result = await generateReorderSuggestion(
        mockPrisma as unknown as PrismaClient,
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      expect(result.ai_generated).toBe(true);
      expect(result.ai_label).toBe('AI-Generated');
    });

    test('FR-036: returns error when AI service is unavailable', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(MOCK_ACCOUNT);
      mockPrisma.order.count.mockResolvedValue(8);
      mockPrisma.order.findMany.mockResolvedValue(createMockOrders(8));

      vi.mocked(callAiProvider).mockResolvedValue({
        success: false,
        error: 'AI service temporarily unavailable',
      });

      await expect(
        generateReorderSuggestion(
          mockPrisma as unknown as PrismaClient,
          TEST_TENANT_ID,
          TEST_ACCOUNT_ID,
        ),
      ).rejects.toThrow('AI service temporarily unavailable');
    });

    test('FR-036: no stale content returned when AI is unavailable', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(MOCK_ACCOUNT);
      mockPrisma.order.count.mockResolvedValue(8);
      mockPrisma.order.findMany.mockResolvedValue(createMockOrders(8));

      vi.mocked(callAiProvider).mockResolvedValue({
        success: false,
        error: 'timeout',
      });

      try {
        await generateReorderSuggestion(
          mockPrisma as unknown as PrismaClient,
          TEST_TENANT_ID,
          TEST_ACCOUNT_ID,
        );
      } catch {
        // Expected to throw — verify no cached data was returned
      }

      // The function should not return cached/stale data
      // Each call makes a fresh AI request
      expect(callAiProvider).toHaveBeenCalledTimes(1);
    });

    test('FR-018: throws when account not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        generateReorderSuggestion(
          mockPrisma as unknown as PrismaClient,
          TEST_TENANT_ID,
          TEST_ACCOUNT_ID,
        ),
      ).rejects.toThrow('Account not found');
    });

    test('FR-018: suggestion includes estimated total and analysis period', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(MOCK_ACCOUNT);
      mockPrisma.order.count.mockResolvedValue(10);
      mockPrisma.order.findMany.mockResolvedValue(createMockOrders(10));

      const aiSuggestion = {
        items: [
          {
            product_id: 'prod-1',
            product_name: 'Organic Wildflower Honey 12oz',
            sku: 'BEE-HON-12',
            brand_name: "Bee's Best Honey",
            suggested_quantity: 24,
            unit_price: 8.5,
            line_total: 204.0,
            reasoning: 'Consistent monthly order',
          },
        ],
        estimated_total: 204.0,
        based_on_orders: 10,
        analysis_period_months: 12,
      };

      vi.mocked(callAiProvider).mockResolvedValue({
        success: true,
        provider: 'anthropic',
        content: JSON.stringify(aiSuggestion),
      });

      const result = await generateReorderSuggestion(
        mockPrisma as unknown as PrismaClient,
        TEST_TENANT_ID,
        TEST_ACCOUNT_ID,
      );

      expect(result.suggestion!.estimated_total).toBe(204.0);
      expect(result.suggestion!.analysis_period_months).toBe(12);
      expect(result.suggestion!.based_on_orders).toBe(10);
    });
  });

  describe('submitReorderAsOrder', () => {
    test('FR-018: submits modified reorder suggestion as new order', async () => {
      const mockOrder = {
        id: 'new-order-1',
        order_number: 'ORD-2026-000100',
        status: 'pending',
        total: { toNumber: () => 204.0 },
      };

      mockPrisma.order.count.mockResolvedValue(99);
      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.orderItem.create.mockResolvedValue({});

      // Products for validation
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Organic Wildflower Honey 12oz',
          sku: 'BEE-HON-12',
          unit_price: { toNumber: () => 8.5 },
          brand_id: 'brand-1',
          revenue_model: 'broker',
          promo_price: null,
          promo_start_date: null,
          promo_end_date: null,
          brand: { id: 'brand-1', name: "Bee's Best Honey" },
        },
      ]);

      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        const txMock = {
          order: { create: mockPrisma.order.create, count: mockPrisma.order.count },
          orderItem: { create: mockPrisma.orderItem.create },
        };
        return cb(txMock);
      });

      const result = await submitReorderAsOrder(
        mockPrisma as unknown as PrismaClient,
        TEST_TENANT_ID,
        {
          account_id: TEST_ACCOUNT_ID,
          items: [{ product_id: 'prod-1', quantity: 24 }],
          notes: 'From AI reorder suggestion',
        },
        TEST_ACTOR_ID,
        TEST_ACTOR_EMAIL,
      );

      expect(result.order_id).toBeDefined();
      expect(result.source).toBe('ai_reorder_suggestion');
    });
  });
});
