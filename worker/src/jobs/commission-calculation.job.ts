import type { PrismaClient } from '@prisma/client';

export interface CommissionCalculationResult {
  orderId: string;
  entriesCreated: number;
  totalCommission: number;
  skippedLineItems: number;
}

/**
 * Process commission calculations for a confirmed order.
 *
 * Loads the order with line items and account territory,
 * then delegates to the commission calculation service to create
 * CommissionEntry records for each broker line item.
 */
export async function processCommissionCalculation(
  prisma: PrismaClient,
  tenantId: string,
  orderId: string,
): Promise<CommissionCalculationResult> {
  // Load the order with required relations for commission calculation
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
      status: 'confirmed',
    },
    include: {
      lineItems: {
        include: {
          product: { select: { brandId: true } },
        },
      },
      account: { select: { territoryId: true } },
    },
  });

  if (!order) {
    return {
      orderId,
      entriesCreated: 0,
      totalCommission: 0,
      skippedLineItems: 0,
    };
  }

  // Check if commissions have already been calculated for this order
  const existingEntries = await prisma.commissionEntry.count({
    where: { orderId, tenantId },
  });

  if (existingEntries > 0) {
    return {
      orderId,
      entriesCreated: 0,
      totalCommission: 0,
      skippedLineItems: 0,
    };
  }

  // Count broker vs wholesale line items
  const brokerLineItems = order.lineItems.filter(
    (li) => li.revenueModel === 'broker',
  );
  const skippedLineItems = order.lineItems.length - brokerLineItems.length;

  // TODO: Wire up calculateOrderCommissions from the backend commission-calculation service
  // For now, this stub returns a summary. In production, the backend service
  // handles the actual calculation with rule lookups and entry creation.

  return {
    orderId,
    entriesCreated: 0,
    totalCommission: 0,
    skippedLineItems,
  };
}
