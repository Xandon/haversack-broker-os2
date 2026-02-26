import type { PrismaClient } from '@prisma/client';

export interface OrderProductSearchResult {
  id: string;
  name: string;
  sku: string;
  brandName: string;
  unitPrice: number;
  effectivePrice: number;
  isPromotionalPrice: boolean;
  promotionalPriceEnd: string | null;
  availabilityStatus: string;
  availabilityWarning: string | null;
  commissionRate: number;
  revenueModelDefault: string;
  caseSize: number | null;
}

export async function searchProductsForOrder(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    q: string;
    orderDate: Date;
    brandId?: string;
    limit?: number;
  },
): Promise<OrderProductSearchResult[]> {
  const limit = options.limit ?? 20;

  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
  };

  if (options.brandId) {
    where['brandId'] = options.brandId;
  }

  const products = await prisma.product.findMany({
    where: {
      ...where,
      OR: [
        { name: { contains: options.q, mode: 'insensitive' } },
        { sku: { contains: options.q, mode: 'insensitive' } },
        { brand: { name: { contains: options.q, mode: 'insensitive' } } },
      ],
    },
    include: { brand: true },
    take: limit,
    orderBy: { name: 'asc' },
  });

  return products.map((product) => {
    const brand = product.brand as Record<string, unknown>;
    const unitPrice = Number(product.unitPrice);

    // Check promo pricing
    let effectivePrice = unitPrice;
    let isPromotionalPrice = false;

    if (
      product.promotionalPrice &&
      product.promotionalPriceStart &&
      product.promotionalPriceEnd &&
      options.orderDate >= product.promotionalPriceStart &&
      options.orderDate <= product.promotionalPriceEnd
    ) {
      effectivePrice = Number(product.promotionalPrice);
      isPromotionalPrice = true;
    }

    // Availability warning
    let availabilityWarning: string | null = null;
    if (product.availabilityStatus === 'out_of_stock') {
      availabilityWarning = `${product.name} is currently out of stock — order may be delayed`;
    } else if (product.availabilityStatus === 'limited') {
      availabilityWarning = `${product.name} has limited availability`;
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      brandName: brand['name'] as string,
      unitPrice,
      effectivePrice,
      isPromotionalPrice,
      promotionalPriceEnd: product.promotionalPriceEnd
        ? product.promotionalPriceEnd.toISOString()
        : null,
      availabilityStatus: product.availabilityStatus,
      availabilityWarning,
      commissionRate: Number(brand['commissionRate']),
      revenueModelDefault: product.revenueModelDefault,
      caseSize: product.caseSize,
    };
  });
}
