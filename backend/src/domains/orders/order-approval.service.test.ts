import { describe, test, expect, vi, beforeEach } from 'vitest';
import { approveOrder, rejectOrder, listApprovalQueue } from './order-approval.service';
import { OrderError } from './order.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ORDER_ID = '00000000-0000-4000-a000-000000000010';
const APPROVER_ID = '00000000-0000-4000-a000-000000000030';

const AUDIT = {
  actorId: APPROVER_ID,
  actorEmail: 'manager@test.com',
  ipAddress: '127.0.0.1',
  requestId: '00000000-0000-4000-a000-000000000099',
};

function createMockOrder(status: string): Record<string, unknown> {
  return {
    id: ORDER_ID,
    tenantId: TENANT_ID,
    orderNumber: 'ORD-20260226-0001',
    status,
    subtotal: new Decimal('6200.00'),
    tax: new Decimal('0'),
    total: new Decimal('6200.00'),
    lineItems: [],
    vendorSubOrders: [],
    approvals: [],
    account: { id: '00000000-0000-4000-a000-000000000020', name: 'Test Store' },
    rep: { id: '00000000-0000-4000-a000-000000000040', firstName: 'John', lastName: 'Doe' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockPrisma(): Record<string, unknown> {
  const order = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
  const orderApproval = { create: vi.fn() };
  const auditLog = { create: vi.fn() };

  return {
    order,
    orderApproval,
    auditLog,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({ order, orderApproval, auditLog });
    }),
  };
}

describe('FR-013: Order approval service', () => {
  let prisma: Record<string, unknown>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  describe('approveOrder', () => {
    test('FR-013: approves pending_approval order', async () => {
      const mockOrder = createMockOrder('pending_approval');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({
        ...mockOrder,
        status: 'confirmed',
      });
      (prisma['orderApproval'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await approveOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        APPROVER_ID,
        AUDIT,
      );

      expect(result['status']).toBe('confirmed');
    });

    test('FR-013: creates approval record on approve', async () => {
      const mockOrder = createMockOrder('pending_approval');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({
        ...mockOrder,
        status: 'confirmed',
      });
      (prisma['orderApproval'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      await approveOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        APPROVER_ID,
        AUDIT,
      );

      expect((prisma['orderApproval'] as Record<string, ReturnType<typeof vi.fn>>)['create']).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decision: 'approved',
            approverId: APPROVER_ID,
          }),
        }),
      );
    });

    test('FR-013: rejects approving non-pending order', async () => {
      const mockOrder = createMockOrder('draft');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        approveOrder(
          prisma as unknown as PrismaClient,
          TENANT_ID,
          ORDER_ID,
          APPROVER_ID,
          AUDIT,
        ),
      ).rejects.toThrow(OrderError);
    });
  });

  describe('rejectOrder', () => {
    test('FR-013: rejects pending_approval order with reason', async () => {
      const mockOrder = createMockOrder('pending_approval');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({
        ...mockOrder,
        status: 'rejected',
      });
      (prisma['orderApproval'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      const result = await rejectOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        APPROVER_ID,
        'Pricing not approved by vendor',
        AUDIT,
      );

      expect(result['status']).toBe('rejected');
    });

    test('FR-013: requires rejection reason', async () => {
      const mockOrder = createMockOrder('pending_approval');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        rejectOrder(
          prisma as unknown as PrismaClient,
          TENANT_ID,
          ORDER_ID,
          APPROVER_ID,
          '',
          AUDIT,
        ),
      ).rejects.toThrow('Rejection reason is required');
    });

    test('FR-013: rejects rejecting non-pending order', async () => {
      const mockOrder = createMockOrder('confirmed');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);

      await expect(
        rejectOrder(
          prisma as unknown as PrismaClient,
          TENANT_ID,
          ORDER_ID,
          APPROVER_ID,
          'reason',
          AUDIT,
        ),
      ).rejects.toThrow(OrderError);
    });

    test('FR-013: stores rejection reason in approval record', async () => {
      const mockOrder = createMockOrder('pending_approval');
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockOrder);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['update'].mockResolvedValue({
        ...mockOrder,
        status: 'rejected',
      });
      (prisma['orderApproval'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});
      (prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue({});

      await rejectOrder(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        ORDER_ID,
        APPROVER_ID,
        'Price too high',
        AUDIT,
      );

      expect((prisma['orderApproval'] as Record<string, ReturnType<typeof vi.fn>>)['create']).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decision: 'rejected',
            reason: 'Price too high',
          }),
        }),
      );
    });
  });

  describe('listApprovalQueue', () => {
    test('FR-013: lists only pending_approval orders', async () => {
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mockResolvedValue([
        createMockOrder('pending_approval'),
      ]);
      (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['count'].mockResolvedValue(1);

      const result = await listApprovalQueue(
        prisma as unknown as PrismaClient,
        TENANT_ID,
        {},
      );

      expect(result.data).toHaveLength(1);
      expect((prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending_approval',
            tenantId: TENANT_ID,
          }),
        }),
      );
    });
  });
});
