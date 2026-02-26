import { describe, test, expect, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { orderRoutes } from './order.routes';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const REP_ID = '00000000-0000-4000-a000-000000000020';
const MANAGER_ID = '00000000-0000-4000-a000-000000000030';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000040';
const PRODUCT_ID = '00000000-0000-4000-a000-000000000050';

// Track order state across the lifecycle
const orderStore: Record<string, Record<string, unknown>> = {};
let orderIdCounter = 0;

function createLifecycleApp(userRole: string = 'rep'): FastifyInstance {
  const app = Fastify({ logger: false });

  const userId = userRole === 'manager' ? MANAGER_ID : REP_ID;

  // Mock Prisma with stateful order tracking
  const mockOrderCreate = vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
    orderIdCounter++;
    const id = `order-${orderIdCounter}`;
    const data = args['data'] as Record<string, unknown>;
    const lineItemsCreate = data['lineItems'] as Record<string, unknown>;
    const lineItems = ((lineItemsCreate as Record<string, unknown>)['create'] as Array<Record<string, unknown>>) ?? [];
    const order = {
      id,
      tenantId: data['tenantId'],
      orderNumber: `ORD-20260226-${String(orderIdCounter).padStart(4, '0')}`,
      accountId: data['accountId'],
      repId: data['repId'],
      status: 'draft',
      subtotal: data['subtotal'],
      tax: data['tax'] ?? 0,
      total: data['total'],
      notes: data['notes'] ?? null,
      exportStatus: null,
      submittedAt: null,
      confirmedAt: null,
      cancelledAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lineItems: lineItems.map((li, i) => ({
        id: `li-${orderIdCounter}-${i}`,
        ...li,
        product: { id: li['productId'], name: 'Test Product', sku: 'SKU-001', brand: { name: 'Test Brand' } },
      })),
      vendorSubOrders: [],
      approvals: [],
      account: { id: data['accountId'], name: 'Test Account' },
      rep: { id: data['repId'], firstName: 'John', lastName: 'Doe' },
    };
    orderStore[id] = order;
    return order;
  });

  const mockOrderFindFirst = vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
    const where = args['where'] as Record<string, unknown>;
    const id = where['id'] as string;
    return orderStore[id] ?? null;
  });

  const mockOrderFindMany = vi.fn().mockResolvedValue([]);
  const mockOrderCount = vi.fn().mockResolvedValue(0);
  const mockOrderUpdate = vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
    const where = args['where'] as Record<string, unknown>;
    const id = where['id'] as string;
    const data = args['data'] as Record<string, unknown>;
    const order = orderStore[id];
    if (order) {
      Object.assign(order, data, { updatedAt: new Date() });
    }
    return order;
  });

  app.decorate('prisma', {
    order: {
      create: mockOrderCreate,
      findFirst: mockOrderFindFirst,
      findMany: mockOrderFindMany,
      count: mockOrderCount,
      update: mockOrderUpdate,
    },
    orderLineItem: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    vendorSubOrder: {
      create: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
        const data = args['data'] as Record<string, unknown>;
        return { id: `vso-${crypto.randomUUID().slice(0, 8)}`, ...data, lineItems: [] };
      }),
    },
    orderApproval: {
      create: vi.fn().mockResolvedValue({ id: 'approval-1', decision: 'approved' }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Simple passthrough for testing
      return fn({
        vendorSubOrder: {
          create: vi.fn().mockResolvedValue({ id: 'vso-1' }),
        },
        orderLineItem: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        order: {
          update: mockOrderUpdate,
        },
        orderApproval: {
          create: vi.fn().mockResolvedValue({ id: 'approval-1' }),
        },
      });
    }),
  });

  // Mock authenticate + authorize
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (request) => {
    request.user = {
      userId,
      tenantId: TENANT_ID,
      email: userRole === 'manager' ? 'manager@test.com' : 'rep@test.com',
      role: userRole,
    };
  });

  return app;
}

describe('FR-011/013: Order lifecycle integration tests', () => {
  test('FR-011: full lifecycle — create draft order with line items', async () => {
    const app = createLifecycleApp('rep');
    await app.register(orderRoutes);
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
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
    const app = createLifecycleApp('rep');
    await app.register(orderRoutes);
    await app.ready();

    // Create first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        accountId: ACCOUNT_ID,
        lineItems: [
          { productId: PRODUCT_ID, quantity: 10, unitPrice: 5.0, revenueModel: 'wholesale' },
        ],
      },
    });

    const orderId = JSON.parse(createRes.body).data.id;

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/orders/${orderId}`,
    });

    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body);
    expect(body.data.id).toBe(orderId);
  });

  test('FR-011: list orders returns paginated results', async () => {
    const app = createLifecycleApp('rep');
    await app.register(orderRoutes);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/orders',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  test('FR-011: cancel draft order transitions to cancelled', async () => {
    const app = createLifecycleApp('rep');
    await app.register(orderRoutes);
    await app.ready();

    // Create draft
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: {
        accountId: ACCOUNT_ID,
        lineItems: [
          { productId: PRODUCT_ID, quantity: 5, unitPrice: 10.0, revenueModel: 'broker' },
        ],
      },
    });

    const orderId = JSON.parse(createRes.body).data.id;

    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/cancel`,
    });

    expect(cancelRes.statusCode).toBe(200);
    const body = JSON.parse(cancelRes.body);
    expect(body.data.status).toBe('cancelled');
  });

  test('FR-013: manager approval queue returns pending orders', async () => {
    const app = createLifecycleApp('manager');
    await app.register(orderRoutes);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/orders/approval-queue',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  test('FR-011: returns 404 for non-existent order', async () => {
    const app = createLifecycleApp('rep');
    await app.register(orderRoutes);
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/orders/00000000-0000-4000-a000-999999999999',
    });

    expect(response.statusCode).toBe(404);
  });
});
