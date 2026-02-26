import { describe, test, expect, vi } from 'vitest';
import {
  processOrderApprovalNotification,
  buildApprovalRequiredNotification,
  buildApprovalDecisionNotification,
} from './order-approval-notification.job';
import type { PrismaClient } from '@prisma/client';
import type { OrderApprovalJobData } from '../queues/order-approval.queue';

function createMockPrisma(): { prisma: PrismaClient; notification: { create: ReturnType<typeof vi.fn> } } {
  const notification = { create: vi.fn().mockResolvedValue({ id: 'notif-1' }) };
  return {
    prisma: { notification } as unknown as PrismaClient,
    notification,
  };
}

const BASE_DATA: OrderApprovalJobData = {
  tenantId: '00000000-0000-4000-a000-000000000001',
  orderId: '00000000-0000-4000-a000-000000000010',
  orderNumber: 'ORD-20260226-0001',
  orderTotal: 6200,
  repId: '00000000-0000-4000-a000-000000000020',
  repEmail: 'rep@test.com',
  repName: 'John Doe',
  managerId: '00000000-0000-4000-a000-000000000030',
  managerEmail: 'manager@test.com',
  managerName: 'Jane Manager',
  action: 'approval_required',
};

describe('FR-013: Order approval notification job', () => {
  describe('processOrderApprovalNotification', () => {
    test('FR-013: creates notification for approval_required', async () => {
      const { prisma, notification } = createMockPrisma();

      const result = await processOrderApprovalNotification(prisma, {
        ...BASE_DATA,
        action: 'approval_required',
      });

      expect(result.notificationCreated).toBe(true);
      expect(result.recipientId).toBe(BASE_DATA.managerId);
      expect(result.notificationType).toBe('order_approval_required');
      expect(notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'order_approval_required',
            userId: BASE_DATA.managerId,
          }),
        }),
      );
    });

    test('FR-013: creates notification for approved', async () => {
      const { prisma } = createMockPrisma();

      const result = await processOrderApprovalNotification(prisma, {
        ...BASE_DATA,
        action: 'approved',
      });

      expect(result.recipientId).toBe(BASE_DATA.repId);
      expect(result.notificationType).toBe('order_approved');
    });

    test('FR-013: creates notification for rejected with reason', async () => {
      const { prisma } = createMockPrisma();

      const result = await processOrderApprovalNotification(prisma, {
        ...BASE_DATA,
        action: 'rejected',
        reason: 'Pricing not approved by vendor',
      });

      expect(result.recipientId).toBe(BASE_DATA.repId);
      expect(result.notificationType).toBe('order_rejected');
    });
  });

  describe('buildApprovalRequiredNotification', () => {
    test('FR-013: builds email for manager', () => {
      const result = buildApprovalRequiredNotification(
        'John Doe',
        'ORD-20260226-0001',
        6200,
        'manager@test.com',
        'Jane Manager',
      );

      expect(result.to).toBe('manager@test.com');
      expect(result.subject).toContain('ORD-20260226-0001');
      expect(result.body).toContain('$6200.00');
      expect(result.body).toContain('$5,000');
    });
  });

  describe('buildApprovalDecisionNotification', () => {
    test('FR-013: builds approval email for rep', () => {
      const result = buildApprovalDecisionNotification(
        'approved',
        'Jane Manager',
        'ORD-20260226-0001',
        6200,
        'rep@test.com',
      );

      expect(result.to).toBe('rep@test.com');
      expect(result.subject).toContain('approved');
    });

    test('FR-013: builds rejection email with reason', () => {
      const result = buildApprovalDecisionNotification(
        'rejected',
        'Jane Manager',
        'ORD-20260226-0001',
        6200,
        'rep@test.com',
        'Pricing not approved',
      );

      expect(result.to).toBe('rep@test.com');
      expect(result.subject).toContain('rejected');
      expect(result.body).toContain('Pricing not approved');
    });
  });
});
