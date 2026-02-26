/**
 * Order service unit tests.
 * T095: Validates order creation, line item management, vendor splitting,
 * promotional pricing, approval workflow, and status transitions.
 * Tests reference FR-013 through FR-017.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

import { getOrderById, listOrders, listPendingApproval, updateOrder } from './order.service.js';
import { approveOrder, rejectOrder, confirmOrder, requiresApproval } from './approval.service.js';
import type { splitOrderByVendor } from './vendor-split.service.js';
import { isPromoActive, getEffectivePrice } from '../products/product.service.js';

import type * as ProductServiceModule from '../products/product.service.js';
import type * as VendorSplitModule from './vendor-split.service.js';

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------
vi.mock('../products/product.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof ProductServiceModule>();
  return {
    ...actual,
    getProductsByIds: vi.fn(),
  };
});

vi.mock('./vendor-split.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof VendorSplitModule>();
  return {
    ...actual,
    splitOrderByVendor: vi.fn().mockResolvedValue([]),
  };
});

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    order: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
    },
    brand: {
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    auditTrail: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_ACCOUNT_ID = '770e8400-e29b-41d4-a716-446655440000';
const TEST_PRODUCT_ID_1 = '880e8400-e29b-41d4-a716-446655440001';
const TEST_PRODUCT_ID_2 = '880e8400-e29b-41d4-a716-446655440002';
const TEST_BRAND_ID_1 = '990e8400-e29b-41d4-a716-446655440001';
const TEST_BRAND_ID_2 = '990e8400-e29b-41d4-a716-446655440002';
const TEST_ORDER_ID = 'aae08400-e29b-41d4-a716-446655440000';
const TEST_MANAGER_ID = 'bbe08400-e29b-41d4-a716-446655440000';

const NOW = new Date('2026-02-25T12:00:00.000Z');

// ---------------------------------------------------------------------------
// Promotional Pricing Tests (FR-016)
// ---------------------------------------------------------------------------

describe('Promotional Pricing (FR-016)', () => {
  test('FR-016: isPromoActive returns true during promo window', () => {
    const product = {
      promo_price: new Decimal('7.25'),
      promo_start_date: new Date('2026-01-01'),
      promo_end_date: new Date('2026-12-31'),
    };
    expect(isPromoActive(product)).toBe(true);
  });

  test('FR-016: isPromoActive returns false when no promo price', () => {
    const product = {
      promo_price: null,
      promo_start_date: null,
      promo_end_date: null,
    };
    expect(isPromoActive(product)).toBe(false);
  });

  test('FR-016: isPromoActive returns false before promo start', () => {
    const product = {
      promo_price: new Decimal('7.25'),
      promo_start_date: new Date('2099-01-01'),
      promo_end_date: new Date('2099-12-31'),
    };
    expect(isPromoActive(product)).toBe(false);
  });

  test('FR-016: isPromoActive returns false after promo end', () => {
    const product = {
      promo_price: new Decimal('7.25'),
      promo_start_date: new Date('2020-01-01'),
      promo_end_date: new Date('2020-12-31'),
    };
    expect(isPromoActive(product)).toBe(false);
  });

  test('FR-016: getEffectivePrice returns promo price during active promo', () => {
    const product = {
      unit_price: new Decimal('10.00'),
      promo_price: new Decimal('7.50'),
      promo_start_date: new Date('2026-01-01'),
      promo_end_date: new Date('2026-12-31'),
    };
    const result = getEffectivePrice(product);
    expect(result.price).toBe(7.50);
    expect(result.promoApplied).toBe(true);
  });

  test('FR-016: getEffectivePrice returns unit price when no active promo', () => {
    const product = {
      unit_price: new Decimal('10.00'),
      promo_price: null,
      promo_start_date: null,
      promo_end_date: null,
    };
    const result = getEffectivePrice(product);
    expect(result.price).toBe(10.00);
    expect(result.promoApplied).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Approval Threshold Tests (FR-017)
// ---------------------------------------------------------------------------

describe('Approval Threshold (FR-017)', () => {
  test('FR-017: orders >= $5,000 require approval', () => {
    expect(requiresApproval(5000)).toBe(true);
    expect(requiresApproval(5001)).toBe(true);
    expect(requiresApproval(10000)).toBe(true);
  });

  test('FR-017: orders < $5,000 do not require approval', () => {
    expect(requiresApproval(4999)).toBe(false);
    expect(requiresApproval(4999.99)).toBe(false);
    expect(requiresApproval(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Order Approval Service Tests (FR-017)
// ---------------------------------------------------------------------------

describe('Order Approval Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPrisma.auditTrail.create.mockResolvedValue({});
  });

  describe('approveOrder', () => {
    test('FR-017: approves order in pending_approval status', async () => {
      const existingOrder = {
        id: TEST_ORDER_ID,
        tenant_id: TEST_TENANT_ID,
        order_number: 'ORD-2026-000001',
        status: 'pending_approval',
        total: new Decimal('5500.00'),
        notes: null,
        parent_order_id: null,
      };

      const approvedOrder = {
        ...existingOrder,
        status: 'approved',
        approved_by_id: TEST_MANAGER_ID,
        approved_at: NOW,
      };

      mockPrisma.order.findFirst.mockResolvedValue(existingOrder);
      mockPrisma.order.update.mockResolvedValue(approvedOrder);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await approveOrder(
        mockPrisma as unknown as Parameters<typeof approveOrder>[0],
        TEST_TENANT_ID,
        TEST_ORDER_ID,
        TEST_MANAGER_ID,
        'manager@test.com',
      );

      expect(result.status).toBe('approved');
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: TEST_ORDER_ID },
        data: expect.objectContaining({ status: 'approved' }),
      });
    });

    test('FR-017: rejects approval for non-pending_approval order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: TEST_ORDER_ID,
        status: 'confirmed',
        parent_order_id: null,
      });

      await expect(
        approveOrder(
          mockPrisma as unknown as Parameters<typeof approveOrder>[0],
          TEST_TENANT_ID,
          TEST_ORDER_ID,
          TEST_MANAGER_ID,
          'manager@test.com',
        ),
      ).rejects.toThrow("Cannot approve order in status 'confirmed'");
    });

    test('FR-017: throws error when order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        approveOrder(
          mockPrisma as unknown as Parameters<typeof approveOrder>[0],
          TEST_TENANT_ID,
          TEST_ORDER_ID,
          TEST_MANAGER_ID,
          'manager@test.com',
        ),
      ).rejects.toThrow('Order not found');
    });
  });

  describe('rejectOrder', () => {
    test('FR-017: rejects order with reason and audit trail', async () => {
      const existingOrder = {
        id: TEST_ORDER_ID,
        tenant_id: TEST_TENANT_ID,
        order_number: 'ORD-2026-000001',
        status: 'pending_approval',
        total: new Decimal('6000.00'),
        parent_order_id: null,
      };

      const rejectedOrder = {
        ...existingOrder,
        status: 'rejected',
        rejection_reason: 'Exceeds quarterly budget',
      };

      mockPrisma.order.findFirst.mockResolvedValue(existingOrder);
      mockPrisma.order.update.mockResolvedValue(rejectedOrder);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await rejectOrder(
        mockPrisma as unknown as Parameters<typeof rejectOrder>[0],
        TEST_TENANT_ID,
        TEST_ORDER_ID,
        TEST_MANAGER_ID,
        'manager@test.com',
        'Exceeds quarterly budget',
      );

      expect(result.status).toBe('rejected');
      expect(result.rejection_reason).toBe('Exceeds quarterly budget');
    });

    test('FR-017: cannot reject non-pending_approval order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: TEST_ORDER_ID,
        status: 'draft',
        parent_order_id: null,
      });

      await expect(
        rejectOrder(
          mockPrisma as unknown as Parameters<typeof rejectOrder>[0],
          TEST_TENANT_ID,
          TEST_ORDER_ID,
          TEST_MANAGER_ID,
          'manager@test.com',
          'Reason',
        ),
      ).rejects.toThrow("Cannot reject order in status 'draft'");
    });
  });

  describe('confirmOrder', () => {
    test('FR-013: confirms approved order', async () => {
      const existingOrder = {
        id: TEST_ORDER_ID,
        tenant_id: TEST_TENANT_ID,
        order_number: 'ORD-2026-000001',
        status: 'approved',
        parent_order_id: null,
      };

      const confirmedOrder = {
        ...existingOrder,
        status: 'confirmed',
        confirmed_at: NOW,
      };

      mockPrisma.order.findFirst.mockResolvedValue(existingOrder);
      mockPrisma.order.update.mockResolvedValue(confirmedOrder);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await confirmOrder(
        mockPrisma as unknown as Parameters<typeof confirmOrder>[0],
        TEST_TENANT_ID,
        TEST_ORDER_ID,
        TEST_USER_ID,
        'rep@test.com',
      );

      expect(result.status).toBe('confirmed');
      expect(result.confirmed_at).toBeTruthy();
    });

    test('FR-013: confirms pending (non-approval-required) order', async () => {
      const existingOrder = {
        id: TEST_ORDER_ID,
        status: 'pending',
        order_number: 'ORD-2026-000002',
        parent_order_id: null,
      };

      const confirmedOrder = {
        ...existingOrder,
        status: 'confirmed',
        confirmed_at: NOW,
      };

      mockPrisma.order.findFirst.mockResolvedValue(existingOrder);
      mockPrisma.order.update.mockResolvedValue(confirmedOrder);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await confirmOrder(
        mockPrisma as unknown as Parameters<typeof confirmOrder>[0],
        TEST_TENANT_ID,
        TEST_ORDER_ID,
        TEST_USER_ID,
        'rep@test.com',
      );

      expect(result.status).toBe('confirmed');
    });

    test('FR-017: cannot confirm pending_approval order directly', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: TEST_ORDER_ID,
        status: 'pending_approval',
        parent_order_id: null,
      });

      await expect(
        confirmOrder(
          mockPrisma as unknown as Parameters<typeof confirmOrder>[0],
          TEST_TENANT_ID,
          TEST_ORDER_ID,
          TEST_USER_ID,
          'rep@test.com',
        ),
      ).rejects.toThrow("Cannot confirm order in status 'pending_approval'");
    });
  });
});

// ---------------------------------------------------------------------------
// Order Service Tests (FR-013, FR-014)
// ---------------------------------------------------------------------------

describe('Order Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPrisma.auditTrail.create.mockResolvedValue({});
    vi.clearAllMocks();
  });

  describe('getOrderById', () => {
    test('FR-013: returns order with line items', async () => {
      const order = {
        id: TEST_ORDER_ID,
        tenant_id: TEST_TENANT_ID,
        order_number: 'ORD-2026-000001',
        status: 'pending',
        total: new Decimal('250.00'),
        order_items: [
          {
            id: 'item-1',
            product_id: TEST_PRODUCT_ID_1,
            quantity: 10,
            unit_price: new Decimal('25.00'),
            line_total: new Decimal('250.00'),
            revenue_model: 'broker',
            product: { id: TEST_PRODUCT_ID_1, name: 'Honey', sku: 'HON-001' },
          },
        ],
        sub_orders: [],
        account: { id: TEST_ACCOUNT_ID, name: 'Pacific Bistro' },
        rep: { id: TEST_USER_ID, first_name: 'Jane', last_name: 'Smith' },
        approved_by: null,
      };

      mockPrisma.order.findFirst.mockResolvedValue(order);

      const result = await getOrderById(
        mockPrisma as unknown as Parameters<typeof getOrderById>[0],
        TEST_TENANT_ID,
        TEST_ORDER_ID,
      );

      expect(result).toBeTruthy();
      expect(result!.order_number).toBe('ORD-2026-000001');
      expect(result!.order_items).toHaveLength(1);
      expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: TEST_ORDER_ID, tenant_id: TEST_TENANT_ID },
        include: expect.objectContaining({
          order_items: expect.any(Object),
          sub_orders: expect.any(Object),
        }),
      });
    });

    test('FR-013: returns null for non-existent order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const result = await getOrderById(
        mockPrisma as unknown as Parameters<typeof getOrderById>[0],
        TEST_TENANT_ID,
        'non-existent-id',
      );

      expect(result).toBeNull();
    });
  });

  describe('listOrders', () => {
    test('FR-013: lists orders with pagination', async () => {
      const orders = [
        { id: 'order-1', order_number: 'ORD-2026-000001', total: new Decimal('500') },
        { id: 'order-2', order_number: 'ORD-2026-000002', total: new Decimal('1500') },
      ];

      mockPrisma.order.findMany.mockResolvedValue(orders);
      mockPrisma.order.count.mockResolvedValue(2);

      const result = await listOrders(
        mockPrisma as unknown as Parameters<typeof listOrders>[0],
        TEST_TENANT_ID,
        { page: 1, pageSize: 25 },
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    test('FR-013: excludes sub-orders by default', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await listOrders(
        mockPrisma as unknown as Parameters<typeof listOrders>[0],
        TEST_TENANT_ID,
      );

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parent_order_id: null,
          }),
        }),
      );
    });

    test('FR-013: filters by status', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await listOrders(
        mockPrisma as unknown as Parameters<typeof listOrders>[0],
        TEST_TENANT_ID,
        { status: 'confirmed' },
      );

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'confirmed',
          }),
        }),
      );
    });

    test('FR-013: filters by account', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await listOrders(
        mockPrisma as unknown as Parameters<typeof listOrders>[0],
        TEST_TENANT_ID,
        { accountId: TEST_ACCOUNT_ID },
      );

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            account_id: TEST_ACCOUNT_ID,
          }),
        }),
      );
    });
  });

  describe('listPendingApproval', () => {
    test('FR-017: lists only pending_approval orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await listPendingApproval(
        mockPrisma as unknown as Parameters<typeof listPendingApproval>[0],
        TEST_TENANT_ID,
      );

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending_approval',
            approval_required: true,
            parent_order_id: null,
          }),
        }),
      );
    });
  });

  describe('updateOrder', () => {
    test('FR-013: updates order notes', async () => {
      const existing = {
        id: TEST_ORDER_ID,
        status: 'draft',
        order_number: 'ORD-2026-000001',
        parent_order_id: null,
      };

      const updated = { ...existing, notes: 'Updated notes' };

      mockPrisma.order.findFirst.mockResolvedValue(existing);
      mockPrisma.order.update.mockResolvedValue(updated);

      const result = await updateOrder(
        mockPrisma as unknown as Parameters<typeof updateOrder>[0],
        TEST_TENANT_ID,
        TEST_ORDER_ID,
        { notes: 'Updated notes' },
        TEST_USER_ID,
        'rep@test.com',
      );

      expect(result!.notes).toBe('Updated notes');
    });

    test('FR-013: allows cancel from draft status', async () => {
      const existing = {
        id: TEST_ORDER_ID,
        status: 'draft',
        order_number: 'ORD-2026-000001',
        parent_order_id: null,
      };

      const cancelled = { ...existing, status: 'cancelled' };

      mockPrisma.order.findFirst.mockResolvedValue(existing);
      mockPrisma.order.update.mockResolvedValue(cancelled);

      const result = await updateOrder(
        mockPrisma as unknown as Parameters<typeof updateOrder>[0],
        TEST_TENANT_ID,
        TEST_ORDER_ID,
        { status: 'cancelled' },
        TEST_USER_ID,
        'rep@test.com',
      );

      expect(result!.status).toBe('cancelled');
    });

    test('FR-013: rejects invalid status transition', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: TEST_ORDER_ID,
        status: 'confirmed',
        parent_order_id: null,
      });

      await expect(
        updateOrder(
          mockPrisma as unknown as Parameters<typeof updateOrder>[0],
          TEST_TENANT_ID,
          TEST_ORDER_ID,
          { status: 'cancelled' },
          TEST_USER_ID,
          'rep@test.com',
        ),
      ).rejects.toThrow('Invalid status transition');
    });

    test('FR-013: returns null for non-existent order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const result = await updateOrder(
        mockPrisma as unknown as Parameters<typeof updateOrder>[0],
        TEST_TENANT_ID,
        'non-existent-id',
        { notes: 'test' },
        TEST_USER_ID,
        'rep@test.com',
      );

      expect(result).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Vendor Split Tests (FR-014)
// ---------------------------------------------------------------------------

describe('Vendor Split Service (FR-014)', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  test('FR-014: splits order into per-vendor sub-orders', async () => {
    const parentOrder = {
      id: TEST_ORDER_ID,
      tenant_id: TEST_TENANT_ID,
      order_number: 'ORD-2026-000001',
      account_id: TEST_ACCOUNT_ID,
      rep_id: TEST_USER_ID,
      status: 'pending',
      approval_required: false,
      notes: null,
    };

    const lineItems = [
      {
        product_id: TEST_PRODUCT_ID_1,
        brand_id: TEST_BRAND_ID_1,
        quantity: 5,
        unit_price: 10.00,
        line_total: 50.00,
        revenue_model: 'broker',
        promo_applied: false,
        commission_rate: 10,
        lot_number: null,
        batch_id: null,
        notes: null,
      },
      {
        product_id: TEST_PRODUCT_ID_2,
        brand_id: TEST_BRAND_ID_2,
        quantity: 3,
        unit_price: 20.00,
        line_total: 60.00,
        revenue_model: 'wholesale',
        promo_applied: false,
        commission_rate: null,
        lot_number: null,
        batch_id: null,
        notes: null,
      },
    ];

    // Mock sub-order creation
    let callIndex = 0;
    mockPrisma.order.create.mockImplementation(() => {
      callIndex++;
      return Promise.resolve({
        id: `sub-order-${callIndex}`,
        order_number: `ORD-2026-000001-${String.fromCharCode(64 + callIndex)}`,
        tenant_id: TEST_TENANT_ID,
        account_id: TEST_ACCOUNT_ID,
        rep_id: TEST_USER_ID,
        status: 'pending',
        parent_order_id: TEST_ORDER_ID,
        vendor_brand_id: callIndex === 1 ? TEST_BRAND_ID_1 : TEST_BRAND_ID_2,
        subtotal: callIndex === 1 ? new Decimal('50.00') : new Decimal('60.00'),
        total: callIndex === 1 ? new Decimal('50.00') : new Decimal('60.00'),
      });
    });

    mockPrisma.orderItem.create.mockImplementation((args: Record<string, unknown>) => {
      return Promise.resolve({
        id: `item-${callIndex}`,
        ...((args as { data: Record<string, unknown> }).data),
      });
    });

    mockPrisma.brand.findUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === TEST_BRAND_ID_1) {
        return Promise.resolve({ id: TEST_BRAND_ID_1, name: "Bee's Best Honey" });
      }
      return Promise.resolve({ id: TEST_BRAND_ID_2, name: 'Pacific Preserves' });
    });

    // Need to import the actual function (not mocked)
    const { splitOrderByVendor: actualSplit } = await vi.importActual<typeof VendorSplitModule>('./vendor-split.service.js');

    const result = await actualSplit(
      mockPrisma as unknown as Parameters<typeof splitOrderByVendor>[0],
      TEST_TENANT_ID,
      parentOrder as unknown as Parameters<typeof splitOrderByVendor>[2],
      [],
      lineItems,
    );

    expect(result).toHaveLength(2);
    expect(mockPrisma.order.create).toHaveBeenCalledTimes(2);
  });

  test('FR-014: does not split when single brand', async () => {
    const parentOrder = {
      id: TEST_ORDER_ID,
      tenant_id: TEST_TENANT_ID,
      order_number: 'ORD-2026-000001',
    };

    const lineItems = [
      { product_id: TEST_PRODUCT_ID_1, brand_id: TEST_BRAND_ID_1, quantity: 5, unit_price: 10, line_total: 50, revenue_model: 'broker', promo_applied: false, commission_rate: 10, lot_number: null, batch_id: null, notes: null },
      { product_id: TEST_PRODUCT_ID_2, brand_id: TEST_BRAND_ID_1, quantity: 3, unit_price: 20, line_total: 60, revenue_model: 'broker', promo_applied: false, commission_rate: 10, lot_number: null, batch_id: null, notes: null },
    ];

    const { splitOrderByVendor: actualSplit } = await vi.importActual<typeof VendorSplitModule>('./vendor-split.service.js');

    const result = await actualSplit(
      mockPrisma as unknown as Parameters<typeof splitOrderByVendor>[0],
      TEST_TENANT_ID,
      parentOrder as unknown as Parameters<typeof splitOrderByVendor>[2],
      [],
      lineItems,
    );

    expect(result).toHaveLength(0);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });
});
