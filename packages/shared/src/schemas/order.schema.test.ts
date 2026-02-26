import { describe, test, expect } from 'vitest';
import {
  orderStatusSchema,
  revenueModelSchema,
  approvalDecisionSchema,
  exportStatusSchema,
  createOrderLineItemSchema,
  createOrderSchema,
  updateOrderSchema,
  orderListQuerySchema,
  rejectionReasonSchema,
  orderResponseSchema,
  orderListResponseSchema,
} from './order.schema';

describe('FR-011: Order schemas', () => {
  describe('orderStatusSchema', () => {
    test('FR-011: accepts valid order statuses', () => {
      const statuses = ['draft', 'pending_approval', 'confirmed', 'rejected', 'cancelled'];
      for (const status of statuses) {
        expect(orderStatusSchema.parse(status)).toBe(status);
      }
    });

    test('FR-011: rejects invalid order status', () => {
      expect(() => orderStatusSchema.parse('invalid')).toThrow();
    });
  });

  describe('revenueModelSchema', () => {
    test('FR-011: accepts broker and wholesale', () => {
      expect(revenueModelSchema.parse('broker')).toBe('broker');
      expect(revenueModelSchema.parse('wholesale')).toBe('wholesale');
    });

    test('FR-011: rejects invalid revenue model', () => {
      expect(() => revenueModelSchema.parse('commission')).toThrow();
    });
  });

  describe('approvalDecisionSchema', () => {
    test('FR-013: accepts approved and rejected', () => {
      expect(approvalDecisionSchema.parse('approved')).toBe('approved');
      expect(approvalDecisionSchema.parse('rejected')).toBe('rejected');
    });
  });

  describe('exportStatusSchema', () => {
    test('FR-015: accepts valid export statuses', () => {
      const statuses = ['queued', 'exported', 'failed'];
      for (const status of statuses) {
        expect(exportStatusSchema.parse(status)).toBe(status);
      }
    });
  });

  describe('createOrderLineItemSchema', () => {
    const validLineItem = {
      productId: '550e8400-e29b-41d4-a716-446655440000',
      quantity: 24,
      unitPrice: 10.0,
      revenueModel: 'broker' as const,
      commissionRate: 12.0,
      discount: 0,
    };

    test('FR-011: accepts valid line item', () => {
      const result = createOrderLineItemSchema.parse(validLineItem);
      expect(result.productId).toBe(validLineItem.productId);
      expect(result.quantity).toBe(24);
      expect(result.unitPrice).toBe(10.0);
      expect(result.revenueModel).toBe('broker');
    });

    test('FR-011: rejects quantity less than 1', () => {
      expect(() =>
        createOrderLineItemSchema.parse({ ...validLineItem, quantity: 0 }),
      ).toThrow();
    });

    test('FR-011: rejects negative unit price', () => {
      expect(() =>
        createOrderLineItemSchema.parse({ ...validLineItem, unitPrice: -5 }),
      ).toThrow();
    });

    test('FR-011: commission rate must be 0-100', () => {
      expect(() =>
        createOrderLineItemSchema.parse({ ...validLineItem, commissionRate: 101 }),
      ).toThrow();
    });

    test('FR-011: defaults discount to 0', () => {
      const { discount: _discount, ...noDiscount } = validLineItem;
      const result = createOrderLineItemSchema.parse(noDiscount);
      expect(result.discount).toBe(0);
    });
  });

  describe('createOrderSchema', () => {
    const validOrder = {
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      lineItems: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440001',
          quantity: 10,
          unitPrice: 15.0,
          revenueModel: 'wholesale' as const,
        },
      ],
    };

    test('FR-011: accepts valid order', () => {
      const result = createOrderSchema.parse(validOrder);
      expect(result.accountId).toBe(validOrder.accountId);
      expect(result.lineItems).toHaveLength(1);
    });

    test('FR-011: rejects order without line items', () => {
      expect(() =>
        createOrderSchema.parse({ ...validOrder, lineItems: [] }),
      ).toThrow();
    });

    test('FR-011: rejects missing accountId', () => {
      const { accountId: _id, ...noAccount } = validOrder;
      expect(() => createOrderSchema.parse(noAccount)).toThrow();
    });

    test('FR-011: accepts optional notes', () => {
      const result = createOrderSchema.parse({ ...validOrder, notes: 'Rush order' });
      expect(result.notes).toBe('Rush order');
    });
  });

  describe('updateOrderSchema', () => {
    test('FR-011: accepts partial update with notes only', () => {
      const result = updateOrderSchema.parse({ notes: 'Updated notes' });
      expect(result.notes).toBe('Updated notes');
    });

    test('FR-011: accepts update with new line items', () => {
      const result = updateOrderSchema.parse({
        lineItems: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 5,
            unitPrice: 20.0,
            revenueModel: 'broker' as const,
          },
        ],
      });
      expect(result.lineItems).toHaveLength(1);
    });
  });

  describe('orderListQuerySchema', () => {
    test('FR-011: applies defaults for empty query', () => {
      const result = orderListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    test('FR-011: accepts status filter', () => {
      const result = orderListQuerySchema.parse({ status: 'pending_approval' });
      expect(result.status).toBe('pending_approval');
    });

    test('FR-011: coerces limit from string', () => {
      const result = orderListQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    test('FR-011: rejects limit over 100', () => {
      expect(() => orderListQuerySchema.parse({ limit: '101' })).toThrow();
    });
  });

  describe('rejectionReasonSchema', () => {
    test('FR-013: accepts valid rejection reason', () => {
      const result = rejectionReasonSchema.parse({ reason: 'Pricing not approved' });
      expect(result.reason).toBe('Pricing not approved');
    });

    test('FR-013: rejects empty reason', () => {
      expect(() => rejectionReasonSchema.parse({ reason: '' })).toThrow();
    });
  });

  describe('orderResponseSchema', () => {
    test('FR-011: validates complete order response', () => {
      const response = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderNumber: 'ORD-20260226-0001',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        accountName: 'Test Store',
        repId: '550e8400-e29b-41d4-a716-446655440002',
        repName: 'John Doe',
        status: 'draft',
        subtotal: 240.0,
        tax: 0,
        total: 240.0,
        notes: null,
        lineItems: [],
        vendorSubOrders: [],
        approvals: [],
        exportStatus: null,
        submittedAt: null,
        confirmedAt: null,
        cancelledAt: null,
        version: 1,
        createdAt: '2026-02-26T00:00:00.000Z',
        updatedAt: '2026-02-26T00:00:00.000Z',
      };
      const result = orderResponseSchema.parse(response);
      expect(result.orderNumber).toBe('ORD-20260226-0001');
    });
  });

  describe('orderListResponseSchema', () => {
    test('FR-011: validates order list item response', () => {
      const item = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        orderNumber: 'ORD-20260226-0001',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        accountName: 'Test Store',
        repName: 'John Doe',
        status: 'draft',
        total: 240.0,
        lineItemCount: 3,
        exportStatus: null,
        submittedAt: null,
        createdAt: '2026-02-26T00:00:00.000Z',
      };
      const result = orderListResponseSchema.parse(item);
      expect(result.lineItemCount).toBe(3);
    });
  });
});
