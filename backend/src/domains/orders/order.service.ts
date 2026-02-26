import type { PrismaClient, Prisma } from '@prisma/client';
import { writeAuditLog, detectChanges, writeUpdateAuditLogs } from '../../shared/services/audit.service';
import type { CreateOrderInput, UpdateOrderInput } from '@haversack/shared';

export class OrderError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'OrderError';
    this.code = code;
  }
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

const ORDER_INCLUDE = {
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
} as const;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

export async function generateOrderNumber(
  prisma: PrismaClient,
  tenantId: string,
): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ORD-${dateStr}-`;

  const lastOrder = await prisma.order.findFirst({
    where: {
      tenantId,
      orderNumber: { startsWith: prefix },
    },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let nextNum = 1;
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.orderNumber.slice(prefix.length), 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

function calculateLineTotal(
  unitPrice: number,
  quantity: number,
  discount: number,
): number {
  return Math.round((unitPrice * quantity - discount) * 100) / 100;
}

export async function createOrder(
  prisma: PrismaClient,
  tenantId: string,
  repId: string,
  data: CreateOrderInput,
  audit: AuditContext,
): Promise<OrderWithRelations> {
  const orderNumber = await generateOrderNumber(prisma, tenantId);

  const lineItemsData = data.lineItems.map((item) => {
    const lineTotal = calculateLineTotal(
      item.unitPrice,
      item.quantity,
      item.discount ?? 0,
    );
    return {
      tenantId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      revenueModel: item.revenueModel,
      commissionRate: item.commissionRate ?? null,
      discount: item.discount ?? 0,
      lineTotal,
      promotionalPriceApplied: false,
    };
  });

  const subtotal = lineItemsData.reduce((sum, li) => sum + li.lineTotal, 0);
  const total = Math.round(subtotal * 100) / 100;

  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNumber,
      accountId: data.accountId,
      repId,
      status: 'draft',
      subtotal,
      tax: 0,
      total,
      notes: data.notes ?? null,
      lineItems: {
        create: lineItemsData,
      },
    },
    include: ORDER_INCLUDE,
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Order',
    entityId: order.id,
    action: 'create',
    changeSummary: { orderNumber, accountId: data.accountId, total },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return order;
}

export async function getOrderById(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
): Promise<OrderWithRelations> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: ORDER_INCLUDE,
  });

  if (!order) {
    throw new OrderError('Order not found', 'ORDER_NOT_FOUND');
  }

  return order;
}

export async function listOrders(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    accountId?: string;
    status?: string;
    cursor?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  },
): Promise<{
  data: OrderWithRelations[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}> {
  const limit = options.limit ?? 20;
  const sortBy = options.sortBy ?? 'createdAt';
  const sortOrder = options.sortOrder ?? 'desc';

  const where: Prisma.OrderWhereInput = { tenantId };
  if (options.accountId) {
    where.accountId = options.accountId;
  }
  if (options.status) {
    where.status = options.status as Prisma.EnumOrderStatusFilter;
  }

  const cursorObj = options.cursor ? { id: options.cursor } : undefined;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit + 1,
      ...(cursorObj ? { cursor: cursorObj, skip: 1 } : {}),
      include: ORDER_INCLUDE,
    }),
    prisma.order.count({ where }),
  ]);

  const hasMore = orders.length > limit;
  const data = hasMore ? orders.slice(0, limit) : orders;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return { data, pagination: { cursor: nextCursor, hasMore, total } };
}

export async function updateDraftOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  data: UpdateOrderInput,
  expectedUpdatedAt: string | undefined,
  audit: AuditContext,
): Promise<OrderWithRelations> {
  const existing = await getOrderById(prisma, tenantId, orderId);

  if (existing.status !== 'draft') {
    throw new OrderError(
      'Only draft orders can be edited',
      'ORDER_NOT_DRAFT',
    );
  }

  if (expectedUpdatedAt) {
    const expectedDate = new Date(expectedUpdatedAt);
    if (existing.updatedAt.getTime() !== expectedDate.getTime()) {
      throw new OrderError(
        'Order has been modified by another user',
        'ORDER_CONFLICT',
      );
    }
  }

  const updateData: Prisma.OrderUpdateInput = {};

  if (data.notes !== undefined) {
    updateData.notes = data.notes;
  }

  if (data.lineItems) {
    // Replace all line items
    await prisma.orderLineItem.deleteMany({
      where: { orderId, tenantId },
    });

    const newLineItems = data.lineItems.map((item) => {
      const lineTotal = calculateLineTotal(
        item.unitPrice,
        item.quantity,
        item.discount ?? 0,
      );
      return {
        tenantId,
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        revenueModel: item.revenueModel,
        commissionRate: item.commissionRate ?? null,
        discount: item.discount ?? 0,
        lineTotal,
        promotionalPriceApplied: false,
      };
    });

    await prisma.orderLineItem.createMany({ data: newLineItems });

    const subtotal = newLineItems.reduce((sum, li) => sum + li.lineTotal, 0);
    updateData.subtotal = subtotal;
    updateData.total = Math.round(subtotal * 100) / 100;
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: ORDER_INCLUDE,
  });

  const changes = detectChanges(
    { notes: existing.notes, subtotal: Number(existing.subtotal), total: Number(existing.total) },
    { notes: order.notes, subtotal: Number(order.subtotal), total: Number(order.total) },
  );

  if (changes.length > 0) {
    await writeUpdateAuditLogs(
      {
        prisma,
        tenantId,
        actorId: audit.actorId,
        actorEmail: audit.actorEmail,
        entityType: 'Order',
        entityId: orderId,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        requestId: audit.requestId,
      },
      changes,
    );
  }

  return order;
}

export const APPROVAL_THRESHOLD = 5000;

export async function submitOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  audit: AuditContext,
): Promise<OrderWithRelations> {
  const existing = await getOrderById(prisma, tenantId, orderId);

  if (existing.status !== 'draft') {
    throw new OrderError(
      'Only draft orders can be submitted',
      'ORDER_NOT_DRAFT',
    );
  }

  if (existing.lineItems.length === 0) {
    throw new OrderError(
      'Order must have at least one line item',
      'ORDER_NO_LINE_ITEMS',
    );
  }

  const total = Number(existing.total);
  const requiresApproval = total >= APPROVAL_THRESHOLD;
  const newStatus = requiresApproval ? 'pending_approval' : 'confirmed';
  const now = new Date();

  // Create vendor sub-orders by grouping line items by brand
  const lineItemsByBrand = new Map<string, { brandId: string; items: typeof existing.lineItems }>();
  for (const li of existing.lineItems) {
    const brandId = li.product.brandId;
    const existing_group = lineItemsByBrand.get(brandId);
    if (existing_group) {
      existing_group.items.push(li);
    } else {
      lineItemsByBrand.set(brandId, { brandId, items: [li] });
    }
  }

  // Use transaction for atomicity
  const order = await prisma.$transaction(async (tx) => {
    // Create vendor sub-orders
    for (const [, group] of lineItemsByBrand) {
      const subOrderSubtotal = group.items.reduce(
        (sum, li) => sum + Number(li.lineTotal),
        0,
      );

      const subOrder = await tx.vendorSubOrder.create({
        data: {
          tenantId,
          orderId,
          brandId: group.brandId,
          subtotal: subOrderSubtotal,
          fulfillmentStatus: 'pending',
        },
      });

      // Link line items to sub-order
      await tx.orderLineItem.updateMany({
        where: {
          orderId,
          tenantId,
          productId: { in: group.items.map((li) => li.productId) },
        },
        data: { vendorSubOrderId: subOrder.id },
      });
    }

    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        submittedAt: now,
        ...(newStatus === 'confirmed' ? { confirmedAt: now } : {}),
      },
      include: ORDER_INCLUDE,
    });

    return updatedOrder;
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
    oldValue: 'draft',
    newValue: newStatus,
    changeSummary: {
      action: 'submit',
      total,
      requiresApproval,
      vendorSubOrderCount: lineItemsByBrand.size,
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return order;
}

export async function cancelOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  audit: AuditContext,
): Promise<OrderWithRelations> {
  const existing = await getOrderById(prisma, tenantId, orderId);

  if (existing.status === 'confirmed' || existing.status === 'cancelled') {
    throw new OrderError(
      'Cannot cancel a confirmed or already cancelled order',
      'ORDER_CANNOT_CANCEL',
    );
  }

  const now = new Date();
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'cancelled',
      cancelledAt: now,
    },
    include: ORDER_INCLUDE,
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
    oldValue: existing.status,
    newValue: 'cancelled',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return order;
}
