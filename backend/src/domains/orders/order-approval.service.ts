import type { PrismaClient } from '@prisma/client';
import { writeAuditLog } from '../../shared/services/audit.service';
import { getOrderById, OrderError } from './order.service';
import type { AuditContext, OrderWithRelations } from './order.service';

export async function approveOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  approverId: string,
  audit: AuditContext,
): Promise<OrderWithRelations> {
  const existing = await getOrderById(prisma, tenantId, orderId);

  if (existing.status !== 'pending_approval') {
    throw new OrderError(
      'Only orders pending approval can be approved',
      'ORDER_NOT_PENDING_APPROVAL',
    );
  }

  const now = new Date();

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderApproval.create({
      data: {
        tenantId,
        orderId,
        approverId,
        decision: 'approved',
        decidedAt: now,
      },
    });

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'confirmed',
        confirmedAt: now,
      },
      include: {
        lineItems: {
          include: {
            product: {
              include: { brand: true },
            },
          },
        },
        vendorSubOrders: {
          include: {
            brand: true,
            lineItems: true,
          },
        },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        account: { select: { id: true, name: true } },
        rep: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Order',
    entityId: orderId,
    action: 'update',
    fieldName: 'status',
    oldValue: 'pending_approval',
    newValue: 'confirmed',
    changeSummary: { action: 'approve', approverId },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return order;
}

export async function rejectOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  approverId: string,
  reason: string,
  audit: AuditContext,
): Promise<OrderWithRelations> {
  const existing = await getOrderById(prisma, tenantId, orderId);

  if (existing.status !== 'pending_approval') {
    throw new OrderError(
      'Only orders pending approval can be rejected',
      'ORDER_NOT_PENDING_APPROVAL',
    );
  }

  if (!reason || reason.trim().length === 0) {
    throw new OrderError(
      'Rejection reason is required',
      'ORDER_REJECTION_REASON_REQUIRED',
    );
  }

  const now = new Date();

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderApproval.create({
      data: {
        tenantId,
        orderId,
        approverId,
        decision: 'rejected',
        reason: reason.trim(),
        decidedAt: now,
      },
    });

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'rejected',
      },
      include: {
        lineItems: {
          include: {
            product: {
              include: { brand: true },
            },
          },
        },
        vendorSubOrders: {
          include: {
            brand: true,
            lineItems: true,
          },
        },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        account: { select: { id: true, name: true } },
        rep: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Order',
    entityId: orderId,
    action: 'update',
    fieldName: 'status',
    oldValue: 'pending_approval',
    newValue: 'rejected',
    changeSummary: { action: 'reject', approverId, reason: reason.trim() },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return order;
}

export async function listApprovalQueue(
  prisma: PrismaClient,
  tenantId: string,
  options: { cursor?: string; limit?: number },
): Promise<{
  data: OrderWithRelations[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}> {
  const limit = options.limit ?? 20;
  const cursorObj = options.cursor ? { id: options.cursor } : undefined;

  const where = { tenantId, status: 'pending_approval' as const };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursorObj ? { cursor: cursorObj, skip: 1 } : {}),
      include: {
        lineItems: {
          include: {
            product: {
              include: { brand: true },
            },
          },
        },
        vendorSubOrders: {
          include: {
            brand: true,
            lineItems: true,
          },
        },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        account: { select: { id: true, name: true } },
        rep: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const hasMore = orders.length > limit;
  const data = hasMore ? orders.slice(0, limit) : orders;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return { data, pagination: { cursor: nextCursor, hasMore, total } };
}
