import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createTestPrisma,
  disconnectTestPrisma,
  cleanDatabase,
  seedTestData,
  type TestSeedData,
} from '../../../shared/test-helpers/integration-db';
import { createOrder, getOrderById, generateOrderNumber } from '../order.service';

describe('Integration: Order service against real PostgreSQL', () => {
  let prisma: PrismaClient;
  let seed: TestSeedData;

  const audit = {
    actorId: '',
    actorEmail: 'rep@haversack.test',
    ipAddress: '127.0.0.1',
    requestId: 'int-test-001',
  };

  beforeAll(async () => {
    prisma = createTestPrisma();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    seed = await seedTestData(prisma);
    audit.actorId = seed.repUser.id;
  });

  describe('generateOrderNumber', () => {
    test('FR-008: generates sequential order numbers', async () => {
      const first = await generateOrderNumber(prisma, seed.tenantId);
      expect(first).toMatch(/^ORD-\d{8}-0001$/);

      // Create an order with this number so the next one increments
      await prisma.order.create({
        data: {
          tenantId: seed.tenantId,
          orderNumber: first,
          accountId: seed.account.id,
          repId: seed.repUser.id,
          status: 'draft',
          subtotal: 0,
          total: 0,
        },
      });

      const second = await generateOrderNumber(prisma, seed.tenantId);
      expect(second).toMatch(/^ORD-\d{8}-0002$/);
    });
  });

  describe('createOrder', () => {
    test('FR-008: creates order with line items and calculates totals', async () => {
      const order = await createOrder(
        prisma,
        seed.tenantId,
        seed.repUser.id,
        {
          accountId: seed.account.id,
          lineItems: [
            {
              productId: seed.product.id,
              quantity: 10,
              unitPrice: 12.99,
              revenueModel: 'broker',
            },
          ],
        },
        audit,
      );

      expect(order.orderNumber).toMatch(/^ORD-/);
      expect(order.status).toBe('draft');
      expect(Number(order.total)).toBe(129.9);
      expect(order.lineItems).toHaveLength(1);
      expect(Number(order.lineItems[0]!.lineTotal)).toBe(129.9);
      expect(order.rep.id).toBe(seed.repUser.id);
      expect(order.account.id).toBe(seed.account.id);
    });

    test('FR-008: creates audit log entry for order creation', async () => {
      const order = await createOrder(
        prisma,
        seed.tenantId,
        seed.repUser.id,
        {
          accountId: seed.account.id,
          lineItems: [
            {
              productId: seed.product.id,
              quantity: 5,
              unitPrice: 10.0,
              revenueModel: 'wholesale',
            },
          ],
        },
        audit,
      );

      const auditLogs = await prisma.auditLog.findMany({
        where: { entityId: order.id, entityType: 'Order' },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]!.action).toBe('create');
      expect(auditLogs[0]!.actorId).toBe(seed.repUser.id);
    });

    test('FR-008: calculates totals with discount applied', async () => {
      const order = await createOrder(
        prisma,
        seed.tenantId,
        seed.repUser.id,
        {
          accountId: seed.account.id,
          lineItems: [
            {
              productId: seed.product.id,
              quantity: 10,
              unitPrice: 20.0,
              revenueModel: 'broker',
              discount: 10.0,
            },
          ],
        },
        audit,
      );

      // 20 * 10 - 10 = 190
      expect(Number(order.total)).toBe(190);
    });
  });

  describe('getOrderById', () => {
    test('FR-008: retrieves order with all relations', async () => {
      const created = await createOrder(
        prisma,
        seed.tenantId,
        seed.repUser.id,
        {
          accountId: seed.account.id,
          lineItems: [
            {
              productId: seed.product.id,
              quantity: 3,
              unitPrice: 15.0,
              revenueModel: 'broker',
            },
          ],
        },
        audit,
      );

      const fetched = await getOrderById(prisma, seed.tenantId, created.id);

      expect(fetched.id).toBe(created.id);
      expect(fetched.orderNumber).toBe(created.orderNumber);
      expect(fetched.lineItems).toHaveLength(1);
      expect(fetched.account.name).toBe(seed.account.name);
      expect(fetched.rep.firstName).toBe('Sales');
    });

    test('FR-008: throws for non-existent order', async () => {
      await expect(
        getOrderById(prisma, seed.tenantId, '00000000-0000-4000-a000-000000099999'),
      ).rejects.toThrow();
    });

    test('FR-008: enforces tenant isolation — cannot access other tenant order', async () => {
      const created = await createOrder(
        prisma,
        seed.tenantId,
        seed.repUser.id,
        {
          accountId: seed.account.id,
          lineItems: [
            {
              productId: seed.product.id,
              quantity: 1,
              unitPrice: 5.0,
              revenueModel: 'wholesale',
            },
          ],
        },
        audit,
      );

      // Try to access with a different tenant ID
      await expect(
        getOrderById(prisma, '00000000-0000-4000-b000-000000000002', created.id),
      ).rejects.toThrow();
    });
  });
});
