/**
 * Product domain service.
 * Provides product search, listing, CRUD, and promotional pricing logic.
 * Supports FR-015 (product search within order entry) and FR-016 (promotional pricing).
 */
import type { PrismaClient, Product } from '@prisma/client';

import { logger } from '../../shared/utils/logger.js';

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Product search filters */
export interface ProductSearchFilters {
  brandId?: string;
  category?: string;
  certification?: string;
  availability?: string;
  limit?: number;
}

/** Product list filters */
export interface ProductListFilters {
  brandId?: string;
  category?: string;
  subcategory?: string;
  certification?: string;
  allergen?: string;
  dietary?: string;
  availability?: string;
  revenueModel?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Product with computed promo_active field */
export interface ProductWithPromo extends Product {
  promo_active: boolean;
  brand?: {
    id: string;
    name: string;
  };
}

/**
 * Determine if a product has an active promotion right now.
 */
export function isPromoActive(product: {
  promo_price: unknown;
  promo_start_date: Date | null;
  promo_end_date: Date | null;
}): boolean {
  if (product.promo_price === null || product.promo_price === undefined) {
    return false;
  }
  const now = new Date();
  const start = product.promo_start_date;
  const end = product.promo_end_date;

  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

/**
 * Get the effective price for a product, considering promotional pricing (FR-016).
 * Returns the promo price if active, otherwise the standard unit price.
 */
export function getEffectivePrice(product: {
  unit_price: { toNumber?: () => number } | number;
  promo_price: { toNumber?: () => number } | number | null;
  promo_start_date: Date | null;
  promo_end_date: Date | null;
}): { price: number; promoApplied: boolean } {
  const unitPrice =
    typeof product.unit_price === 'object' && product.unit_price !== null && 'toNumber' in product.unit_price
      ? product.unit_price.toNumber()
      : Number(product.unit_price);

  if (isPromoActive(product) && product.promo_price !== null && product.promo_price !== undefined) {
    const promoPrice =
      typeof product.promo_price === 'object' && product.promo_price !== null && 'toNumber' in product.promo_price
        ? product.promo_price.toNumber()
        : Number(product.promo_price);
    return { price: promoPrice, promoApplied: true };
  }

  return { price: unitPrice, promoApplied: false };
}

/**
 * Search products by name, SKU, brand, or category (FR-015).
 * Returns results within 200ms target.
 */
export async function searchProducts(
  prisma: PrismaClient,
  tenantId: string,
  query: string,
  filters: ProductSearchFilters = {},
): Promise<{ items: ProductWithPromo[]; totalCount: number }> {
  const limit = filters.limit ?? 20;

  // Build where clause with tenant isolation
  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    is_active: true,
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { sku: { contains: query, mode: 'insensitive' } },
      { category: { contains: query, mode: 'insensitive' } },
      { brand: { name: { contains: query, mode: 'insensitive' } } },
    ],
  };

  if (filters.brandId) {
    where['brand_id'] = filters.brandId;
  }
  if (filters.category) {
    where['category'] = { equals: filters.category, mode: 'insensitive' };
  }
  if (filters.certification) {
    where['certifications'] = { has: filters.certification };
  }
  if (filters.availability) {
    where['availability_status'] = filters.availability;
  }

  const [items, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: {
          select: { id: true, name: true },
        },
      },
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  // Enrich with promo_active flag
  const enriched: ProductWithPromo[] = items.map((p) => ({
    ...p,
    promo_active: isPromoActive(p),
    brand: p.brand,
  }));

  logger.info(
    {
      operation: 'search-products',
      tenantId,
      query,
      resultCount: items.length,
    },
    `Product search: "${query}" returned ${items.length} results`,
  );

  return { items: enriched, totalCount };
}

/**
 * List products with filters and pagination.
 */
export async function listProducts(
  prisma: PrismaClient,
  tenantId: string,
  filters: ProductListFilters = {},
): Promise<PaginatedResult<ProductWithPromo>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    tenant_id: tenantId,
  };

  if (filters.isActive !== undefined) {
    where['is_active'] = filters.isActive;
  } else {
    where['is_active'] = true;
  }

  if (filters.brandId) where['brand_id'] = filters.brandId;
  if (filters.category) where['category'] = { equals: filters.category, mode: 'insensitive' };
  if (filters.subcategory) where['subcategory'] = { equals: filters.subcategory, mode: 'insensitive' };
  if (filters.certification) where['certifications'] = { has: filters.certification };
  if (filters.allergen) where['allergens'] = { has: filters.allergen };
  if (filters.dietary) where['dietary_attributes'] = { has: filters.dietary };
  if (filters.availability) where['availability_status'] = filters.availability;
  if (filters.revenueModel) where['revenue_model'] = filters.revenueModel;

  const sortBy = filters.sortBy ?? 'name';
  const sortOrder = filters.sortOrder ?? 'asc';

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.product.count({ where }),
  ]);

  const enriched: ProductWithPromo[] = items.map((p) => ({
    ...p,
    promo_active: isPromoActive(p),
    brand: p.brand,
  }));

  return { items: enriched, total, page, pageSize };
}

/**
 * Get a single product by ID.
 */
export async function getProductById(
  prisma: PrismaClient,
  tenantId: string,
  productId: string,
): Promise<ProductWithPromo | null> {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      tenant_id: tenantId,
    },
    include: {
      brand: { select: { id: true, name: true } },
    },
  });

  if (!product) return null;

  return {
    ...product,
    promo_active: isPromoActive(product),
    brand: product.brand,
  };
}

/**
 * Get multiple products by IDs (used for order creation).
 */
export async function getProductsByIds(
  prisma: PrismaClient,
  tenantId: string,
  productIds: string[],
): Promise<ProductWithPromo[]> {
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      tenant_id: tenantId,
      is_active: true,
    },
    include: {
      brand: { select: { id: true, name: true } },
    },
  });

  return products.map((p) => ({
    ...p,
    promo_active: isPromoActive(p),
    brand: p.brand,
  }));
}
