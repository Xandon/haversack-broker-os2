/**
 * Vendor auto-split service.
 * When an order contains items from multiple brands (vendors),
 * creates per-vendor sub-orders linked to the parent order (FR-014).
 */
import type { PrismaClient, Order, OrderItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { logger } from '../../shared/utils/logger.js';

/** Line item with brand info for splitting */
interface LineItemWithBrand {
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
}

/**
 * Split an order into per-vendor sub-orders (FR-014).
 * Groups line items by brand_id and creates a sub-order for each vendor.
 * Each sub-order references the parent_order_id and vendor_brand_id.
 *
 * @returns Array of created sub-orders with their items
 */
export async function splitOrderByVendor(
  prisma: PrismaClient,
  tenantId: string,
  parentOrder: Order,
  _orderItems: OrderItem[],
  lineItems: LineItemWithBrand[],
): Promise<(Order & { order_items: OrderItem[]; vendor_brand?: { id: string; name: string } | null })[]> {
  // Group line items by brand
  const brandGroups = new Map<string, LineItemWithBrand[]>();
  for (const item of lineItems) {
    const group = brandGroups.get(item.brand_id) ?? [];
    group.push(item);
    brandGroups.set(item.brand_id, group);
  }

  // If only one brand, no split needed
  if (brandGroups.size <= 1) {
    return [];
  }

  const subOrders: (Order & { order_items: OrderItem[]; vendor_brand?: { id: string; name: string } | null })[] = [];
  const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let suffixIndex = 0;

  for (const [brandId, items] of brandGroups.entries()) {
    const suffix = suffixLetters[suffixIndex] ?? String(suffixIndex);
    const subOrderNumber = `${parentOrder.order_number}-${suffix}`;
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

    // Create the sub-order
    const subOrder = await prisma.order.create({
      data: {
        tenant_id: tenantId,
        order_number: subOrderNumber,
        account_id: parentOrder.account_id,
        rep_id: parentOrder.rep_id,
        status: parentOrder.status,
        parent_order_id: parentOrder.id,
        vendor_brand_id: brandId,
        subtotal: new Decimal(subtotal.toFixed(2)),
        tax_amount: new Decimal('0.00'),
        total: new Decimal(subtotal.toFixed(2)),
        approval_required: parentOrder.approval_required,
        notes: parentOrder.notes,
        fsma_lot_numbers: items
          .filter((li) => li.lot_number)
          .map((li) => ({
            lot_number: li.lot_number,
            batch_id: li.batch_id,
          })),
      },
    });

    // Create line items for this sub-order
    const subOrderItems = await Promise.all(
      items.map((item) =>
        prisma.orderItem.create({
          data: {
            tenant_id: tenantId,
            order_id: subOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: new Decimal(item.unit_price.toFixed(2)),
            line_total: new Decimal(item.line_total.toFixed(2)),
            revenue_model: item.revenue_model as 'broker' | 'wholesale',
            commission_rate:
              item.commission_rate !== null
                ? new Decimal(item.commission_rate.toFixed(2))
                : null,
            promo_applied: item.promo_applied,
            lot_number: item.lot_number,
            batch_id: item.batch_id,
            notes: item.notes,
          },
        }),
      ),
    );

    // Fetch brand name for the response
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true, name: true },
    });

    subOrders.push({
      ...subOrder,
      order_items: subOrderItems,
      vendor_brand: brand,
    });

    suffixIndex++;
  }

  logger.info(
    {
      operation: 'split-order-by-vendor',
      tenantId,
      parentOrderId: parentOrder.id,
      parentOrderNumber: parentOrder.order_number,
      vendorCount: brandGroups.size,
    },
    `Order ${parentOrder.order_number} split into ${brandGroups.size} vendor sub-orders`,
  );

  return subOrders;
}
