import type { PrismaClient } from '@prisma/client';

export const MIN_ORDER_HISTORY = 6;

export class ReorderError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ReorderError';
    this.code = code;
  }
}

export interface ReorderSuggestionItem {
  productId: string;
  productName: string;
  sku: string;
  brandName: string;
  suggestedQuantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReorderSuggestionResult {
  suggestions: ReorderSuggestionItem[];
  estimatedTotal: number;
  discontinuedCount: number;
  aiGenerated: boolean;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

export async function getReorderSuggestions(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<ReorderSuggestionResult> {
  // Check minimum order history
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const orderCount = await prisma.order.count({
    where: {
      tenantId,
      accountId,
      status: { in: ['confirmed', 'pending_approval'] },
      createdAt: { gte: twelveMonthsAgo },
    },
  });

  if (orderCount < MIN_ORDER_HISTORY) {
    throw new ReorderError(
      `Not enough order history for suggestions — reorder suggestions appear after ${MIN_ORDER_HISTORY} orders`,
      'INSUFFICIENT_HISTORY',
    );
  }

  // Fetch recent orders with line items
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      accountId,
      status: { in: ['confirmed', 'pending_approval'] },
      createdAt: { gte: twelveMonthsAgo },
    },
    include: {
      lineItems: {
        include: {
          product: {
            include: { brand: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Aggregate quantities per product
  const productQuantities = new Map<string, number[]>();
  const productIdSet = new Set<string>();

  for (const order of orders) {
    const lineItems = (order as Record<string, unknown>)['lineItems'] as Array<Record<string, unknown>>;
    for (const li of lineItems) {
      const productId = li['productId'] as string;
      productIdSet.add(productId);
      const existing = productQuantities.get(productId) ?? [];
      existing.push(li['quantity'] as number);
      productQuantities.set(productId, existing);
    }
  }

  // Fetch active products to exclude discontinued ones
  const activeProducts = await prisma.product.findMany({
    where: {
      tenantId,
      id: { in: Array.from(productIdSet) },
      isActive: true,
    },
    include: { brand: true },
  });

  const activeProductMap = new Map(
    activeProducts.map((p) => [p.id, p]),
  );

  let discontinuedCount = 0;
  const suggestions: ReorderSuggestionItem[] = [];

  for (const [productId, quantities] of productQuantities) {
    const product = activeProductMap.get(productId);
    if (!product) {
      discontinuedCount++;
      continue;
    }

    const medianQty = calculateMedian(quantities);
    const unitPrice = Number(product.unitPrice);
    const lineTotal = Math.round(medianQty * unitPrice * 100) / 100;

    const brand = product.brand as Record<string, unknown>;

    suggestions.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      brandName: brand['name'] as string,
      suggestedQuantity: medianQty,
      unitPrice,
      lineTotal,
    });
  }

  const estimatedTotal = Math.round(
    suggestions.reduce((sum, s) => sum + s.lineTotal, 0) * 100,
  ) / 100;

  return {
    suggestions,
    estimatedTotal,
    discontinuedCount,
    aiGenerated: true,
  };
}
