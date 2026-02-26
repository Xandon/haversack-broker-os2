import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createOrder,
  getOrderById,
  listOrders,
  updateDraftOrder,
  submitOrder,
  cancelOrder,
  generateOrderNumber,
  OrderError,
  APPROVAL_THRESHOLD,
} from './order.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ORDER_ID = '00000000-0000-4000-a000-000000000010';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000020';
const REP_ID = '00000000-0000-4000-a000-000000000030';
const PRODUCT_ID = '00000000-0000-4000-a000-000000000040';
const BRAND_ID = '00000000-0000-4000-a000-000000000050';

const AUDIT = {
  actorId: REP_ID,
  actorEmail: 'rep@test.com',
  ipAddress: '127.0.0.1',
  requestId: '00000000-0000-4000-a000-000000000099',
};

function createMockOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ORDER_ID,
    tenantId: TENANT_ID,
    orderNumber: 'ORD-20260226-0001',
    accountId: ACCOUNT_ID,
    repId: REP_ID,
    status: 'draft',
    subtotal: new Decimal('240.00'),
    tax: new Decimal('0'),
    total: new Decimal('240.00'),
    notes: null,
    submittedAt: null,
    confirmedAt: null,
    cancelledAt: null,
    exportStatus: null,
    version: 1,
    createdAt: new Date('2026-02-26'),
    updatedAt: new Date('2026-02-26'),
    lineItems: [
      {
        id: '00000000-0000-4000-a000-000000000060',
        productId: PRODUCT_ID,
        vendorSubOrderId: null,
        quantity: 24,
        unitPrice: new Decimal('10.00'),
        revenueModel: 'broker',
        commissionRate: new Decimal('12.00'),
        discount: new Decimal('0'),
        lineTotal: new Decimal('240.00'),
        promotionalPriceApplied: false,
        product: {
          id: PRODUCT_ID,
          brandId: BRAND_ID,
          name: 'Artisan Honey 12oz',
          sku: 'AH-12',
          brand: { id: BRAND_ID, name: 'Pacific Honey Co' },
        },
      },
    ],
    vendorSubOrders: [],
    approvals: [],
    account: { id: ACCOUNT_ID, name: 'Test Store' },
    rep: { id: REP_ID, firstName: 'John', lastName: 'Doe' },
    ...overrides,
  };
}

function createMockPrisma(): Record<string, unknown> {
  const order = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
  const orderLineItem = {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
  };
  const vendorSubOrder = {
    create: vi.fn(),
  };
  const auditLog = {
    create: vi.fn(),
  };
  return {
    order,
    orderLineItem,
    vendorSubOrder,
    auditLog,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        order,
        orderLineItem,
        vendorSubOrder,
        auditLog,
      });
    }),
  };
}

describe('FR-011: Order service', () => {
  let prisma: Record<string, unknown>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  describe('generateOrderNumber', () => {
    test('FR-011: generates first order number of the day', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);

      const result = await generateOrderNumber(prisma as unknown as PrismaClient, TENANT_ID);
      expect(result).toMatch(/^ORD-\d{8}-0001$/);
    });

    test('FR-011: increments order number', async () => {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue({
        orderNumber: `ORD-${dateStr}-0005`,
      });

      const result = await generateOrderNumber(prisma as unknown as PrismaClient, TENANT_ID);
      expect(result).toBe(`ORD-${dateStr}-0006`);
    });
  });

  describe('createOrder', () => {
    test('FR-011: creates draft order with line items', async () => {
      const mockOrder = createMockOrder();
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue(mockOrder);
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await createOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        REP_ID,
        {
          accountId: ACCOUNT_ID,
          lineItems: [
            {
              productId: PRODUCT_ID,
              quantity: 24,
              unitPrice: 10.0,
              revenueModel: 'broker',
              commissionRate: 12.0,
              discount: 0,
            },
          ],
        },
        AUDIT,
      );

      expect(result).toBeDefined();
      expect((prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['create']).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            repId: REP_ID,
            status: 'draft',
          }),
        }),
      );
    });

    test('FR-011: calculates line totals correctly', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue(createMockOrder());
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      await createOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        REP_ID,
        {
          accountId: ACCOUNT_ID,
          lineItems: [
            { productId: PRODUCT_ID, quantity: 10, unitPrice: 15.0, revenueModel: 'wholesale', discount: 5 },
          ],
        },
        AUDIT,
      );

      const createCall = (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mock.calls[0]![0];
      const lineItemData = createCall.data.lineItems.create[0];
      // 10 * 15 - 5 = 145
      expect(lineItemData.lineTotal).toBe(145);
    });

    test('FR-011: writes audit log on create', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue(createMockOrder());
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      await createOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        REP_ID,
        {
          accountId: ACCOUNT_ID,
          lineItems: [
            { productId: PRODUCT_ID, quantity: 1, unitPrice: 10, revenueModel: 'broker' },
          ],
        },
        AUDIT,
      );

      expect((prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create']).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'Order',
            action: 'create',
            actorId: REP_ID,
          }),
        }),
      );
    });
  });

  describe('getOrderById', () => {
    test('FR-011: returns order when found', async () => {
      const mockOrder = createMockOrder();
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      const result = await getOrderById(prisma as unknown as PrismaClient, TENANT_ID, ORDER_ID);
      expect(result['id']).toBe(ORDER_ID);
    });

    test('FR-011: throws OrderError when not found', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);

      await expect(
        getOrderById(prisma as unknown as PrismaClient, TENANT_ID, ORDER_ID),
      ).rejects.toThrow(OrderError);
    });

    test('FR-011: filters by tenant_id', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);

      await getOrderById(prisma as unknown as PrismaClient, TENANT_ID, ORDER_ID).catch(() => {});
      expect((prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      );
    });
  });

  describe('listOrders', () => {
    test('FR-011: returns paginated orders', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mockResolvedValue([createMockOrder()]);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['count'].mockResolvedValue(1);

      const result = await listOrders(prisma as unknown as PrismaClient, TENANT_ID, {});
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    test('FR-011: applies status filter', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mockResolvedValue([]);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['count'].mockResolvedValue(0);

      await listOrders(prisma as unknown as PrismaClient, TENANT_ID, { status: 'draft' });
      expect((prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    test('FR-011: uses cursor pagination', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mockResolvedValue([]);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['count'].mockResolvedValue(0);
      const cursor = '00000000-0000-4000-a000-000000000099';

      await listOrders(prisma as unknown as PrismaClient, TENANT_ID, { cursor });
      expect((prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: cursor },
          skip: 1,
        }),
      );
    });
  });

  describe('updateDraftOrder', () => {
    test('FR-011: updates notes on draft order', async () => {
      const mockOrder = createMockOrder();
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({ ...mockOrder, notes: 'Updated' });
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await updateDraftOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        { notes: 'Updated' },
        undefined,
        AUDIT,
      );

      expect(result).toBeDefined();
    });

    test('FR-011: rejects editing non-draft order', async () => {
      const mockOrder = createMockOrder({ status: 'confirmed' });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        updateDraftOrder(
          prisma as unknown as PrismaClient,
          TENANT_ID,
          ORDER_ID,
          { notes: 'test' },
          undefined,
          AUDIT,
        ),
      ).rejects.toThrow('Only draft orders can be edited');
    });

    test('FR-011: rejects concurrent edit with version conflict', async () => {
      const mockOrder = createMockOrder({ updatedAt: new Date('2026-02-26T10:00:00Z') });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        updateDraftOrder(
          prisma as unknown as PrismaClient,
          TENANT_ID,
          ORDER_ID,
          { notes: 'test' },
          '2026-02-25T00:00:00Z',
          AUDIT,
        ),
      ).rejects.toThrow('Order has been modified by another user');
    });
  });

  describe('submitOrder', () => {
    test('FR-011: submits order under $5,000 as confirmed', async () => {
      const mockOrder = createMockOrder({ total: new Decimal('4999.99') });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({
        ...mockOrder,
        status: 'confirmed',
      });
      (prisma['vendorSubOrder'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({
        id: '00000000-0000-4000-a000-000000000070',
      });
      (prisma['orderLineItem'] as Record<string, ReturnType<typeof vi.fn>>)['updateMany'].mockResolvedValue({ count: 1 });
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await submitOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        AUDIT,
      );

      expect(result['status']).toBe('confirmed');
    });

    test('FR-013: submits order >= $5,000 as pending_approval', async () => {
      const mockOrder = createMockOrder({ total: new Decimal('6200.00') });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({
        ...mockOrder,
        status: 'pending_approval',
      });
      (prisma['vendorSubOrder'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({
        id: '00000000-0000-4000-a000-000000000070',
      });
      (prisma['orderLineItem'] as Record<string, ReturnType<typeof vi.fn>>)['updateMany'].mockResolvedValue({ count: 1 });
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await submitOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        AUDIT,
      );

      expect(result['status']).toBe('pending_approval');
    });

    test('FR-013: approval threshold is $5,000', () => {
      expect(APPROVAL_THRESHOLD).toBe(5000);
    });

    test('FR-011: rejects submitting non-draft order', async () => {
      const mockOrder = createMockOrder({ status: 'confirmed' });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        submitOrder(prisma as unknown as PrismaClient, TENANT_ID, ORDER_ID, AUDIT),
      ).rejects.toThrow('Only draft orders can be submitted');
    });

    test('FR-011: rejects submitting order with no line items', async () => {
      const mockOrder = createMockOrder({ lineItems: [] });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        submitOrder(prisma as unknown as PrismaClient, TENANT_ID, ORDER_ID, AUDIT),
      ).rejects.toThrow('Order must have at least one line item');
    });

    test('FR-011: creates vendor sub-orders grouped by brand', async () => {
      const lineItems = [
        {
          id: '00000000-0000-4000-a000-000000000061',
          productId: PRODUCT_ID,
          lineTotal: new Decimal('100'),
          product: { brandId: BRAND_ID, name: 'P1', sku: 'S1', brand: { id: BRAND_ID, name: 'Brand A' } },
        },
        {
          id: '00000000-0000-4000-a000-000000000062',
          productId: '00000000-0000-4000-a000-000000000041',
          lineTotal: new Decimal('200'),
          product: {
            brandId: '00000000-0000-4000-a000-000000000051',
            name: 'P2',
            sku: 'S2',
            brand: { id: '00000000-0000-4000-a000-000000000051', name: 'Brand B' },
          },
        },
      ];
      const mockOrder = createMockOrder({ lineItems, total: new Decimal('300') });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({ ...mockOrder, status: 'confirmed' });
      (prisma['vendorSubOrder'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({ id: 'sub1' });
      (prisma['orderLineItem'] as Record<string, ReturnType<typeof vi.fn>>)['updateMany'].mockResolvedValue({ count: 1 });
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      await submitOrder(prisma as unknown as PrismaClient, TENANT_ID, ORDER_ID, AUDIT);

      // Should create 2 vendor sub-orders (one per brand)
      expect((prisma['vendorSubOrder'] as Record<string, ReturnType<typeof vi.fn>>)['create']).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelOrder', () => {
    test('FR-011: cancels draft order', async () => {
      const mockOrder = createMockOrder({ status: 'draft' });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({ ...mockOrder, status: 'cancelled' });
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await cancelOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        AUDIT,
      );

      expect(result['status']).toBe('cancelled');
    });

    test('FR-011: cancels pending_approval order', async () => {
      const mockOrder = createMockOrder({ status: 'pending_approval' });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({ ...mockOrder, status: 'cancelled' });
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await cancelOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        AUDIT,
      );

      expect(result['status']).toBe('cancelled');
    });

    test('FR-011: rejects cancelling confirmed order', async () => {
      const mockOrder = createMockOrder({ status: 'confirmed' });
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        cancelOrder(prisma as unknown as PrismaClient, TENANT_ID, ORDER_ID, AUDIT),
      ).rejects.toThrow('Cannot cancel a confirmed or already cancelled order');
    });
  });
});
