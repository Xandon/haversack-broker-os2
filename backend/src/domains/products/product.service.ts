import type { PrismaClient, Product, Brand } from '@prisma/client';

export class ProductError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ProductError';
    this.code = code;
  }
}

export interface ProductWithBrand extends Product {
  brand: Brand;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  sku: string;
  brand: { id: string; name: string };
  unitPrice: number;
  wholesalePrice: number | null;
  promotionalPrice: number | null;
  promotionalPriceStart: string | null;
  promotionalPriceEnd: string | null;
  caseSize: number | null;
  revenueModelDefault: string;
  commissionRate: number;
  availabilityStatus: string;
}

export async function getProductById(
  prisma: PrismaClient,
  tenantId: string,
  productId: string,
): Promise<ProductWithBrand> {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, isActive: true },
    include: { brand: true },
  });

  if (!product) {
    throw new ProductError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  return product;
}

export async function searchProducts(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    q: string;
    brandId?: string;
    availabilityStatus?: string;
    limit?: number;
  },
): Promise<ProductSearchResult[]> {
  const limit = options.limit ?? 20;

  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
  };

  if (options.brandId) {
    where['brandId'] = options.brandId;
  }

  if (options.availabilityStatus) {
    where['availabilityStatus'] = options.availabilityStatus;
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

  return products.map((product) => formatProductResponse(product));
}

export function formatProductResponse(
  product: ProductWithBrand,
): ProductSearchResult {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    brand: {
      id: product.brand.id,
      name: product.brand.name,
    },
    unitPrice: Number(product.unitPrice),
    wholesalePrice: product.wholesalePrice
      ? Number(product.wholesalePrice)
      : null,
    promotionalPrice: product.promotionalPrice
      ? Number(product.promotionalPrice)
      : null,
    promotionalPriceStart: product.promotionalPriceStart
      ? product.promotionalPriceStart.toISOString()
      : null,
    promotionalPriceEnd: product.promotionalPriceEnd
      ? product.promotionalPriceEnd.toISOString()
      : null,
    caseSize: product.caseSize,
    revenueModelDefault: product.revenueModelDefault,
    commissionRate: Number(product.brand.commissionRate),
    availabilityStatus: product.availabilityStatus,
  };
}

export function getEffectivePrice(
  product: ProductWithBrand,
  orderDate: Date,
): { price: number; isPromotional: boolean } {
  if (
    product.promotionalPrice &&
    product.promotionalPriceStart &&
    product.promotionalPriceEnd &&
    orderDate >= product.promotionalPriceStart &&
    orderDate <= product.promotionalPriceEnd
  ) {
    return {
      price: Number(product.promotionalPrice),
      isPromotional: true,
    };
  }

  return {
    price: Number(product.unitPrice),
    isPromotional: false,
  };
}
