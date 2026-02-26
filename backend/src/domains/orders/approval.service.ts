/**
 * Order approval service.
 * Handles manager approval/rejection of orders >= $5,000 (FR-017).
 * Includes audit trail and notification integration.
 */
import type { PrismaClient, Order } from '@prisma/client';

import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
import { logger } from '../../shared/utils/logger.js';

/** Approval threshold in dollars */
const APPROVAL_THRESHOLD = 5000;

/**
 * Check if an order requires approval based on total (FR-017).
 */
export function requiresApproval(total: number): boolean {
  return total >= APPROVAL_THRESHOLD;
}

/**
 * Approve an order (FR-017).
 * Only orders in 'pending_approval' status can be approved.
 * Sets status to 'approved', records approver and timestamp.
 */
export async function approveOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  approverId: string,
  approverEmail: string,
  notes?: string,
): Promise<Order> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
      parent_order_id: null,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== 'pending_approval') {
    throw new Error(
      `Cannot approve order in status '${order.status}'. Order must be in 'pending_approval' status.`,
    );
  }

  const approved = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'approved',
      approved_by_id: approverId,
      approved_at: new Date(),
      notes: notes ? `${order.notes ? order.notes + '\n' : ''}Approval note: ${notes}` : order.notes,
    },
  });

  // Also update sub-orders
  await prisma.order.updateMany({
    where: {
      parent_order_id: orderId,
      tenant_id: tenantId,
    },
    data: {
      status: 'approved',
      approved_by_id: approverId,
      approved_at: new Date(),
    },
  });

  // Fire-and-forget audit trail
  void createAuditEntry(prisma, {
    tenantId,
    actorId: approverId,
    actorEmail: approverEmail,
    entityType: 'Order',
    entityId: orderId,
    action: 'update',
    changeSummary: {
      status: { old: 'pending_approval', new: 'approved' },
      approved_by_id: { old: null, new: approverId },
    },
  });

  logger.info(
    {
      operation: 'approve-order',
      tenantId,
      orderId,
      orderNumber: order.order_number,
      approverId,
      total: order.total.toString(),
    },
    `Order ${order.order_number} approved by ${approverEmail}`,
  );

  return approved;
}

/**
 * Reject an order with a reason (FR-017).
 * Only orders in 'pending_approval' status can be rejected.
 * Records rejection reason and logs to audit trail.
 */
export async function rejectOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  rejecterId: string,
  rejecterEmail: string,
  reason: string,
): Promise<Order> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
      parent_order_id: null,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== 'pending_approval') {
    throw new Error(
      `Cannot reject order in status '${order.status}'. Order must be in 'pending_approval' status.`,
    );
  }

  const rejected = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'rejected',
      rejection_reason: reason,
    },
  });

  // Also reject sub-orders
  await prisma.order.updateMany({
    where: {
      parent_order_id: orderId,
      tenant_id: tenantId,
    },
    data: {
      status: 'rejected',
      rejection_reason: reason,
    },
  });

  // Fire-and-forget audit trail
  void createAuditEntry(prisma, {
    tenantId,
    actorId: rejecterId,
    actorEmail: rejecterEmail,
    entityType: 'Order',
    entityId: orderId,
    action: 'update',
    changeSummary: {
      status: { old: 'pending_approval', new: 'rejected' },
      rejection_reason: { old: null, new: reason },
    },
  });

  logger.info(
    {
      operation: 'reject-order',
      tenantId,
      orderId,
      orderNumber: order.order_number,
      rejecterId,
      reason,
    },
    `Order ${order.order_number} rejected: ${reason}`,
  );

  return rejected;
}

/**
 * Confirm an order (transition to 'confirmed').
 * Only approved or non-approval-required orders can be confirmed.
 * Records confirmation timestamp.
 */
export async function confirmOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  actorId: string,
  actorEmail: string,
): Promise<Order> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
      parent_order_id: null,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  const allowedStatuses = ['approved', 'pending'];
  if (!allowedStatuses.includes(order.status)) {
    throw new Error(
      `Cannot confirm order in status '${order.status}'. Order must be in 'approved' or 'pending' status.`,
    );
  }

  const now = new Date();

  const confirmed = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'confirmed',
      confirmed_at: now,
    },
  });

  // Also confirm sub-orders
  await prisma.order.updateMany({
    where: {
      parent_order_id: orderId,
      tenant_id: tenantId,
    },
    data: {
      status: 'confirmed',
      confirmed_at: now,
    },
  });

  // Fire-and-forget audit trail
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Order',
    entityId: orderId,
    action: 'update',
    changeSummary: {
      status: { old: order.status, new: 'confirmed' },
      confirmed_at: { old: null, new: now.toISOString() },
    },
  });

  logger.info(
    {
      operation: 'confirm-order',
      tenantId,
      orderId,
      orderNumber: order.order_number,
      actorId,
    },
    `Order ${order.order_number} confirmed`,
  );

  return confirmed;
}
