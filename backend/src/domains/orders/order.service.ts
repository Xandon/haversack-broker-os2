/**
 * Order domain service.
 * Provides CRUD operations for orders with line item management,
 * revenue model defaulting, vendor splitting, and approval workflow.
 * Supports FR-013 through FR-017.
 */
import type { PrismaClient, Order, OrderItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import type { CreateOrderInput } from '@haversack/shared';
import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
import { logger } from '../../shared/utils/logger.js';
import { getProductsByIds, getEffectivePrice } from '../products/product.service.js';
import { splitOrderByVendor } from './vendor-split.service.js';

/** Order with items and sub-orders */
export interface OrderWithDetails extends Order {
  order_items: OrderItem[];
  sub_orders: (Order & { order_items: OrderItem[]; vendor_brand?: { id: string; name: string } | null })[];
  account?: { id: string; name: string };
  rep?: { id: string; first_name: string; last_name: string };
  approved_by_user?: { id: string; first_name: string; last_name: string } | null;
}

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Order list filters */
export interface OrderListFilters {
  accountId?: string;
  repId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  excludeSubOrders?: boolean;
  page?: number;
  pageSize?: number;
}

/** Approval threshold in dollars (FR-017) */
const APPROVAL_THRESHOLD = 5000;

/**
 * Generate a human-readable order number.
 * Format: ORD-YYYY-XXXXXX (zero-padded sequence).
 */
async function generateOrderNumber(
  prisma: PrismaClient,
  tenantId: string,
  suffix?: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({
    where: { tenant_id: tenantId },
  });
  const seq = String(count + 1).padStart(6, '0');
  return suffix ? `ORD-${year}-${seq}-${suffix}` : `ORD-${year}-${seq}`;
}

/**
 * Create a new order with line items (FR-013).
 * Applies promotional pricing (FR-016), checks approval threshold (FR-017),
 * and creates vendor sub-orders when items span multiple brands (FR-014).
 */
export async function createOrder(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateOrderInput,
  actorId: string,
  actorEmail: string,
): Promise<OrderWithDetails> {
  // Fetch all referenced products for pricing and brand info
  const productIds = input.items.map((item) => item.product_id);
  const products = await getProductsByIds(prisma, tenantId, productIds);

  // Validate all products exist
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of input.items) {
    if (!productMap.has(item.product_id)) {
      throw new Error(`Product not found: ${item.product_id}`);
    }
  }

  // Build line items with effective pricing
  const lineItems: {
    product_id: string;
    brand_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    revenue_model: string;
    promo_applied: boolean;
    commission_rate: number | null;
    lot_number: string | null;
    batch_id: string | null;
    notes: string | null;
  }[] = [];

  for (const item of input.items) {
    const product = productMap.get(item.product_id)!;
    const { price, promoApplied } = getEffectivePrice(product);
    const unitPrice = item.unit_price ?? price;
    const lineTotal = unitPrice * item.quantity;
    const revenueModel = item.revenue_model ?? product.revenue_model;

    // Get commission rate from brand for broker items
    const commissionRate =
      revenueModel === 'broker' && product.brand
        ? Number(product.brand_id ? (await prisma.brand.findUnique({ where: { id: product.brand_id }, select: { base_commission_rate: true } }))?.base_commission_rate ?? 0 : 0)
        : null;

    lineItems.push({
      product_id: item.product_id,
      brand_id: product.brand_id,
      quantity: item.quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      revenue_model: revenueModel,
      promo_applied: promoApplied && item.unit_price === undefined,
      commission_rate: commissionRate,
      lot_number: item.lot_number ?? product.lot_number ?? null,
      batch_id: item.batch_id ?? product.batch_id ?? null,
      notes: item.notes ?? null,
    });
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
  const total = subtotal; // No tax calculation in initial implementation
  const approvalRequired = total >= APPROVAL_THRESHOLD;

  // Determine initial status based on approval requirement (FR-017)
  const status = approvalRequired ? 'pending_approval' : 'pending';

  // Create the order in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const orderNumber = await generateOrderNumber(tx as unknown as PrismaClient, tenantId);

    const order = await tx.order.create({
      data: {
        tenant_id: tenantId,
        order_number: orderNumber,
        account_id: input.account_id,
        rep_id: actorId,
        status,
        subtotal: new Decimal(subtotal.toFixed(2)),
        tax_amount: new Decimal('0.00'),
        total: new Decimal(total.toFixed(2)),
        approval_required: approvalRequired,
        notes: input.notes ?? null,
        fsma_lot_numbers: lineItems
          .filter((li) => li.lot_number)
          .map((li) => ({ lot_number: li.lot_number, batch_id: li.batch_id })),
      },
    });

    // Create line items
    const orderItems = await Promise.all(
      lineItems.map((item) =>
        tx.orderItem.create({
          data: {
            tenant_id: tenantId,
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: new Decimal(item.unit_price.toFixed(2)),
            line_total: new Decimal(item.line_total.toFixed(2)),
            revenue_model: item.revenue_model as 'broker' | 'wholesale',
            commission_rate: item.commission_rate !== null ? new Decimal(item.commission_rate.toFixed(2)) : null,
            promo_applied: item.promo_applied,
            lot_number: item.lot_number,
            batch_id: item.batch_id,
            notes: item.notes,
          },
        }),
      ),
    );

    // Check if multi-vendor split is needed (FR-014)
    const uniqueBrands = new Set(lineItems.map((li) => li.brand_id));
    let subOrders: (Order & { order_items: OrderItem[]; vendor_brand?: { id: string; name: string } | null })[] = [];

    if (uniqueBrands.size > 1) {
      subOrders = await splitOrderByVendor(
        tx as unknown as PrismaClient,
        tenantId,
        order,
        orderItems,
        lineItems,
      );
    }

    return { order, orderItems, subOrders };
  });

  // Fire-and-forget audit trail
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Order',
    entityId: result.order.id,
    action: 'create',
    newValue: JSON.stringify({
      order_number: result.order.order_number,
      total: total.toFixed(2),
      item_count: lineItems.length,
      approval_required: approvalRequired,
    }),
  });

  logger.info(
    {
      operation: 'create-order',
      tenantId,
      orderId: result.order.id,
      orderNumber: result.order.order_number,
      total,
      itemCount: lineItems.length,
      approvalRequired,
      vendorSubOrders: result.subOrders.length,
      actorId,
    },
    `Order created: ${result.order.order_number}`,
  );

  return {
    ...result.order,
    order_items: result.orderItems,
    sub_orders: result.subOrders,
  };
}

/**
 * Get an order by ID with all details.
 */
export async function getOrderById(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
    },
    include: {
      order_items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
        },
      },
      sub_orders: {
        include: {
          order_items: true,
          vendor_brand: {
            select: { id: true, name: true },
          },
        },
      },
      account: {
        select: { id: true, name: true },
      },
      rep: {
        select: { id: true, first_name: true, last_name: true },
      },
      approved_by: {
        select: { id: true, first_name: true, last_name: true },
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    approved_by_user: order.approved_by,
  } as OrderWithDetails;
}

/**
 * List orders with filters and pagination.
 */
export async function listOrders(
  prisma: PrismaClient,
  tenantId: string,
  filters: OrderListFilters = {},
): Promise<PaginatedResult<Order>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    tenant_id: tenantId,
  };

  if (filters.excludeSubOrders !== false) {
    where['parent_order_id'] = null;
  }
  if (filters.accountId) where['account_id'] = filters.accountId;
  if (filters.repId) where['rep_id'] = filters.repId;
  if (filters.status) where['status'] = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, unknown> = {};
    if (filters.dateFrom) dateFilter['gte'] = new Date(filters.dateFrom);
    if (filters.dateTo) dateFilter['lte'] = new Date(filters.dateTo);
    where['created_at'] = dateFilter;
  }
  if (filters.minTotal !== undefined || filters.maxTotal !== undefined) {
    const totalFilter: Record<string, unknown> = {};
    if (filters.minTotal !== undefined) totalFilter['gte'] = new Decimal(filters.minTotal);
    if (filters.maxTotal !== undefined) totalFilter['lte'] = new Decimal(filters.maxTotal);
    where['total'] = totalFilter;
  }

  const sortBy = filters.sortBy ?? 'created_at';
  const sortOrder = filters.sortOrder ?? 'desc';

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        rep: { select: { id: true, first_name: true, last_name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * List orders pending approval (FR-017).
 * Only returns orders with status 'pending_approval'.
 */
export async function listPendingApproval(
  prisma: PrismaClient,
  tenantId: string,
  filters: { repId?: string; page?: number; pageSize?: number } = {},
): Promise<PaginatedResult<Order>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    status: 'pending_approval',
    approval_required: true,
    parent_order_id: null,
  };

  if (filters.repId) where['rep_id'] = filters.repId;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        account: { select: { id: true, name: true } },
        rep: { select: { id: true, first_name: true, last_name: true } },
        order_items: { select: { id: true } },
      },
      skip,
      take: pageSize,
      orderBy: { created_at: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Update an order (notes, limited status transitions).
 */
export async function updateOrder(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
  input: { notes?: string; status?: string },
  actorId: string,
  actorEmail: string,
): Promise<Order | null> {
  const existing = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
      parent_order_id: null,
    },
  });

  if (!existing) return null;

  // Validate status transition
  if (input.status) {
    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['cancelled'],
      pending_approval: ['cancelled'],
    };
    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new Error(
        `Invalid status transition: ${existing.status} -> ${input.status}`,
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (input.notes !== undefined) updateData['notes'] = input.notes;
  if (input.status !== undefined) updateData['status'] = input.status;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
  });

  // Audit trail
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Order',
    entityId: orderId,
    action: 'update',
    changeSummary: { status: { old: existing.status, new: input.status } },
  });

  logger.info(
    {
      operation: 'update-order',
      tenantId,
      orderId,
      actorId,
    },
    `Order updated: ${updated.order_number}`,
  );

  return updated;
}
