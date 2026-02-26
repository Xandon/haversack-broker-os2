import type { PrismaClient, Product, Brand } from '@prisma/client';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductListQuery,
} from '@haversack/shared';
import { writeAuditLog } from '../../shared/services/audit.service';

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
  category: string | null;
  subcategory: string | null;
  description: string | null;
  imageUrl: string | null;
  certifications: string[];
  allergens: string[];
  dietaryAttributes: string[];
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress: string;
  userAgent?: string;
  requestId: string;
}

export async function createProduct(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateProductInput,
  audit: AuditContext,
): Promise<ProductWithBrand> {
  // Check for duplicate SKU
  const existing = await prisma.product.findFirst({
    where: { tenantId, sku: input.sku, isActive: true },
  });
  if (existing) {
    throw new ProductError('SKU already exists for this tenant', 'PRODUCT_SKU_CONFLICT');
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      brandId: input.brandId,
      name: input.name,
      sku: input.sku,
      category: input.category ?? null,
      subcategory: input.subcategory ?? null,
      description: input.description ?? null,
      unitPrice: input.unitPrice,
      wholesalePrice: input.wholesalePrice ?? null,
      caseSize: input.caseSize ?? null,
      revenueModelDefault: input.revenueModelDefault,
      availabilityStatus: input.availabilityStatus ?? 'active',
      imageUrl: input.imageUrl ?? null,
      certifications: input.certifications ?? [],
      allergens: input.allergens ?? [],
      dietaryAttributes: input.dietaryAttributes ?? [],
    },
    include: { brand: true },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    entityType: 'Product',
    entityId: product.id,
    action: 'create',
    changeSummary: { created: { name: product.name, sku: product.sku } },
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return product;
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

export async function updateProduct(
  prisma: PrismaClient,
  tenantId: string,
  productId: string,
  input: UpdateProductInput,
  expectedUpdatedAt: string | undefined,
  audit: AuditContext,
): Promise<ProductWithBrand> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, tenantId, isActive: true },
    include: { brand: true },
  });

  if (!existing) {
    throw new ProductError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  // Optimistic concurrency check
  if (expectedUpdatedAt) {
    const existingTimestamp = existing.updatedAt.toISOString();
    if (existingTimestamp !== expectedUpdatedAt) {
      throw new ProductError('Product has been modified by another user', 'PRODUCT_CONFLICT');
    }
  }

  // Check SKU uniqueness if changing SKU
  if (input.sku && input.sku !== existing.sku) {
    const skuConflict = await prisma.product.findFirst({
      where: { tenantId, sku: input.sku, isActive: true, id: { not: productId } },
    });
    if (skuConflict) {
      throw new ProductError('SKU already exists for this tenant', 'PRODUCT_SKU_CONFLICT');
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data['name'] = input.name;
  if (input.sku !== undefined) data['sku'] = input.sku;
  if (input.brandId !== undefined) data['brandId'] = input.brandId;
  if (input.category !== undefined) data['category'] = input.category;
  if (input.subcategory !== undefined) data['subcategory'] = input.subcategory;
  if (input.description !== undefined) data['description'] = input.description;
  if (input.unitPrice !== undefined) data['unitPrice'] = input.unitPrice;
  if (input.wholesalePrice !== undefined) data['wholesalePrice'] = input.wholesalePrice;
  if (input.caseSize !== undefined) data['caseSize'] = input.caseSize;
  if (input.revenueModelDefault !== undefined) data['revenueModelDefault'] = input.revenueModelDefault;
  if (input.availabilityStatus !== undefined) data['availabilityStatus'] = input.availabilityStatus;
  if (input.imageUrl !== undefined) data['imageUrl'] = input.imageUrl;
  if (input.certifications !== undefined) data['certifications'] = input.certifications;
  if (input.allergens !== undefined) data['allergens'] = input.allergens;
  if (input.dietaryAttributes !== undefined) data['dietaryAttributes'] = input.dietaryAttributes;
  if (input.isActive !== undefined) data['isActive'] = input.isActive;

  const updated = await prisma.product.update({
    where: { id: productId },
    data,
    include: { brand: true },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    entityType: 'Product',
    entityId: productId,
    action: 'update',
    changeSummary: { updated: Object.keys(data) },
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return updated;
}

export async function softDeleteProduct(
  prisma: PrismaClient,
  tenantId: string,
  productId: string,
  audit: AuditContext,
): Promise<{ id: string; deleted: boolean }> {
  const existing = await prisma.product.findFirst({
    where: { id: productId, tenantId, isActive: true },
  });

  if (!existing) {
    throw new ProductError('Product not found', 'PRODUCT_NOT_FOUND');
  }

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    entityType: 'Product',
    entityId: productId,
    action: 'delete',
    changeSummary: { deleted: { name: existing.name, sku: existing.sku } },
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { id: productId, deleted: true };
}

export async function listProducts(
  prisma: PrismaClient,
  tenantId: string,
  query: ProductListQuery,
): Promise<{ data: ProductWithBrand[]; pagination: { cursor: string | null; hasMore: boolean } }> {
  const limit = query.limit ?? 20;

  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
  };

  if (query.brandId) where['brandId'] = query.brandId;
  if (query.category) where['category'] = query.category;
  if (query.availabilityStatus) where['availabilityStatus'] = query.availabilityStatus;

  // Array field filters using hasSome
  if (query.certification) {
    where['certifications'] = { hasSome: [query.certification] };
  }
  if (query.allergen) {
    where['allergens'] = { hasSome: [query.allergen] };
  }
  if (query.dietaryAttribute) {
    where['dietaryAttributes'] = { hasSome: [query.dietaryAttribute] };
  }

  if (query.cursor) {
    where['id'] = { lt: query.cursor };
  }

  const products = await prisma.product.findMany({
    where,
    include: { brand: true },
    take: limit + 1,
    orderBy: { [query.sortBy ?? 'name']: query.sortOrder ?? 'asc' },
  });

  const hasMore = products.length > limit;
  const data = hasMore ? products.slice(0, limit) : products;
  const cursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : null;

  return { data, pagination: { cursor, hasMore } };
}

export async function searchProducts(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    q: string;
    brandId?: string;
    availabilityStatus?: string;
    category?: string;
    certification?: string;
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

  if (options.category) {
    where['category'] = options.category;
  }

  if (options.certification) {
    where['certifications'] = { hasSome: [options.certification] };
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
    category: product.category,
    subcategory: product.subcategory,
    description: product.description,
    imageUrl: product.imageUrl,
    certifications: product.certifications,
    allergens: product.allergens,
    dietaryAttributes: product.dietaryAttributes,
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
