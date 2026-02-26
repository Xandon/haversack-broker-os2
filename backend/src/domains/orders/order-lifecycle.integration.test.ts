import { describe, test, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000040';
const PRODUCT_ID = '00000000-0000-4000-a000-000000000050';

function mockCreatedOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-a000-000000000060',
    tenantId: TENANT_ID,
    orderNumber: 'ORD-20260226-0001',
    accountId: ACCOUNT_ID,
    repId: '00000000-0000-4000-a000-000000000010',
    status: 'draft',
    subtotal: 240.0,
    tax: 0,
    total: 240.0,
    notes: null,
    exportStatus: null,
    submittedAt: null,
    confirmedAt: null,
    cancelledAt: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lineItems: [
      {
        id: 'li-1',
        productId: PRODUCT_ID,
        quantity: 24,
        unitPrice: 10.0,
        revenueModel: 'broker',
        commissionRate: 0.12,
        discount: 0,
        lineTotal: 240.0,
        promotionalPriceApplied: false,
        product: {
          id: PRODUCT_ID,
          name: 'Artisan Honey',
          sku: 'SKU-001',
          brandId: 'brand-1',
          brand: { id: 'brand-1', name: 'Test Brand' },
        },
      },
    ],
    vendorSubOrders: [],
    approvals: [],
    account: { id: ACCOUNT_ID, name: 'Test Account' },
    rep: { id: '00000000-0000-4000-a000-000000000010', firstName: 'John', lastName: 'Doe' },
    ...overrides,
  };
}

describe('FR-011/013: Order lifecycle integration tests', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let managerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    // Set up default mock responses
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.order.create.mockResolvedValue(mockCreatedOrder());
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    app = await buildTestApp(mockPrisma);
    repToken = generateTestToken('rep');
    managerToken = generateTestToken('manager', {
      userId: '00000000-0000-4000-a000-000000000030',
      email: 'manager@haversack.test',
    });
  });

  test('FR-011: create draft order with line items returns 201', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      headers: authHeader(repToken),
      payload: {
        accountId: ACCOUNT_ID,
        lineItems: [
          {
            productId: PRODUCT_ID,
            quantity: 24,
            unitPrice: 10.0,
            revenueModel: 'broker',
            commissionRate: 0.12,
          },
        ],
        notes: 'Integration test order',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe('draft');
    expect(body.data.orderNumber).toBeDefined();
  });

  test('FR-011: get order by ID returns full order detail', async () => {
    const order = mockCreatedOrder();
    mockPrisma.order.findFirst.mockResolvedValue(order);

    const orderId = order['id'] as string;
    const response = await app.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.id).toBe(orderId);
  });

  test('FR-011: list orders returns paginated results', async () => {
    mockPrisma.order.findMany.mockResolvedValue([mockCreatedOrder()]);
    mockPrisma.order.count.mockResolvedValue(1);

    const response = await app.inject({
      method: 'GET',
      url: '/api/orders',
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  test('FR-011: cancel draft order transitions to cancelled', async () => {
    const draftOrder = mockCreatedOrder({ status: 'draft' });
    mockPrisma.order.findFirst.mockResolvedValue(draftOrder);
    mockPrisma.order.update.mockResolvedValue({
      ...draftOrder,
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    const orderId = draftOrder['id'] as string;
    const response = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.status).toBe('cancelled');
  });

  test('FR-013: manager approval queue returns pending orders', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);

    const response = await app.inject({
      method: 'GET',
      url: '/api/orders/approval-queue',
      headers: authHeader(managerToken),
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  test('FR-011: returns 404 for non-existent order', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);

    const response = await app.inject({
      method: 'GET',
      url: '/api/orders/00000000-0000-4000-a000-999999999999',
      headers: authHeader(repToken),
    });

    expect(response.statusCode).toBe(404);
  });
});
