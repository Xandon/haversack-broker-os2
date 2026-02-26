/**
 * Product domain service.
 * Provides product search, listing, CRUD, and promotional pricing logic.
 * Supports FR-015 (product search within order entry), FR-016 (promotional pricing),
 * and FR-019 (product catalog management).
 */
import type { PrismaClient, Product } from '@prisma/client';

import type { CreateProductInput, UpdateProductInput } from '@haversack/shared';
import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
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
  certifications?: string[];
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
    typeof product.unit_price === 'object' && product.unit_price !== null && typeof product.unit_price.toNumber === 'function'
      ? product.unit_price.toNumber()
      : Number(product.unit_price);

  if (isPromoActive(product) && product.promo_price !== null && product.promo_price !== undefined) {
    const promoPrice =
      typeof product.promo_price === 'object' && product.promo_price !== null && typeof product.promo_price.toNumber === 'function'
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
  // Multi-certification AND filtering: when certifications array provided, use hasEvery
  if (filters.certifications && filters.certifications.length > 0) {
    where['certifications'] = { hasEvery: filters.certifications };
  } else if (filters.certification) {
    where['certifications'] = { has: filters.certification };
  }
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

/**
 * Create a new product (FR-019).
 * Validates brand exists within tenant, creates the product, and writes an audit trail entry.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param input - Validated product creation input
 * @param actorId - ID of the user performing the action
 * @param actorEmail - Email of the user performing the action
 * @returns The created product with promo enrichment
 */
export async function createProduct(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateProductInput,
  actorId: string,
  actorEmail: string,
): Promise<ProductWithPromo> {
  // Verify brand exists within tenant
  const brand = await prisma.brand.findFirst({
    where: {
      id: input.brand_id,
      tenant_id: tenantId,
    },
  });

  if (!brand) {
    throw new Error('Brand not found');
  }

  const product = await prisma.product.create({
    data: {
      tenant_id: tenantId,
      brand_id: input.brand_id,
      name: input.name,
      sku: input.sku,
      category: input.category,
      subcategory: input.subcategory ?? null,
      unit_price: input.unit_price,
      wholesale_price: input.wholesale_price ?? null,
      case_size: input.case_size ?? null,
      certifications: input.certifications ?? [],
      allergens: input.allergens ?? [],
      dietary_attributes: input.dietary_attributes ?? [],
      availability_status: input.availability_status ?? 'in_stock',
      revenue_model: input.revenue_model,
      image_url: input.image_url ?? null,
      description: input.description ?? null,
      lot_number: input.lot_number ?? null,
      batch_id: input.batch_id ?? null,
      origin: input.origin ?? null,
      promo_price: input.promo_price ?? null,
      promo_start_date: input.promo_start_date ? new Date(input.promo_start_date) : null,
      promo_end_date: input.promo_end_date ? new Date(input.promo_end_date) : null,
    },
    include: {
      brand: { select: { id: true, name: true } },
    },
  });

  // Write audit trail entry (fire-and-forget)
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Product',
    entityId: product.id,
    action: 'create',
    newValue: JSON.stringify({ name: input.name, sku: input.sku }),
  });

  logger.info(
    {
      operation: 'create-product',
      tenantId,
      productId: product.id,
      actorId,
    },
    `Product created: ${product.name} (${product.sku})`,
  );

  return {
    ...product,
    promo_active: isPromoActive(product),
    brand: product.brand,
  };
}

/**
 * Update an existing product (FR-019).
 * Updates the product fields and writes an audit trail entry.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param productId - ID of the product to update
 * @param input - Validated partial product update input
 * @param actorId - ID of the user performing the action
 * @param actorEmail - Email of the user performing the action
 * @returns The updated product with promo enrichment, or null if not found
 */
export async function updateProduct(
  prisma: PrismaClient,
  tenantId: string,
  productId: string,
  input: UpdateProductInput,
  actorId: string,
  actorEmail: string,
): Promise<ProductWithPromo | null> {
  // Verify product exists within tenant
  const existing = await prisma.product.findFirst({
    where: {
      id: productId,
      tenant_id: tenantId,
    },
  });

  if (!existing) return null;

  // Build update data from provided fields
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data['name'] = input.name;
  if (input.sku !== undefined) data['sku'] = input.sku;
  if (input.category !== undefined) data['category'] = input.category;
  if (input.subcategory !== undefined) data['subcategory'] = input.subcategory;
  if (input.unit_price !== undefined) data['unit_price'] = input.unit_price;
  if (input.wholesale_price !== undefined) data['wholesale_price'] = input.wholesale_price;
  if (input.case_size !== undefined) data['case_size'] = input.case_size;
  if (input.certifications !== undefined) data['certifications'] = input.certifications;
  if (input.allergens !== undefined) data['allergens'] = input.allergens;
  if (input.dietary_attributes !== undefined) data['dietary_attributes'] = input.dietary_attributes;
  if (input.availability_status !== undefined) data['availability_status'] = input.availability_status;
  if (input.revenue_model !== undefined) data['revenue_model'] = input.revenue_model;
  if (input.image_url !== undefined) data['image_url'] = input.image_url;
  if (input.description !== undefined) data['description'] = input.description;
  if (input.lot_number !== undefined) data['lot_number'] = input.lot_number;
  if (input.batch_id !== undefined) data['batch_id'] = input.batch_id;
  if (input.origin !== undefined) data['origin'] = input.origin;
  if (input.promo_price !== undefined) data['promo_price'] = input.promo_price;
  if (input.promo_start_date !== undefined) data['promo_start_date'] = input.promo_start_date ? new Date(input.promo_start_date) : null;
  if (input.promo_end_date !== undefined) data['promo_end_date'] = input.promo_end_date ? new Date(input.promo_end_date) : null;
  if (input.brand_id !== undefined) data['brand_id'] = input.brand_id;

  const product = await prisma.product.update({
    where: { id: productId },
    data,
    include: {
      brand: { select: { id: true, name: true } },
    },
  });

  // Write audit trail entry (fire-and-forget)
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Product',
    entityId: product.id,
    action: 'update',
    newValue: JSON.stringify(input),
  });

  logger.info(
    {
      operation: 'update-product',
      tenantId,
      productId: product.id,
      actorId,
    },
    `Product updated: ${product.name}`,
  );

  return {
    ...product,
    promo_active: isPromoActive(product),
    brand: product.brand,
  };
}

/**
 * Soft-delete a product by setting is_active to false (FR-019).
 * Writes an audit trail entry for the deletion.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param productId - ID of the product to soft-delete
 * @param actorId - ID of the user performing the action
 * @param actorEmail - Email of the user performing the action
 * @returns true if product was found and deactivated, false if not found
 */
export async function deleteProduct(
  prisma: PrismaClient,
  tenantId: string,
  productId: string,
  actorId: string,
  actorEmail: string,
): Promise<boolean> {
  const existing = await prisma.product.findFirst({
    where: {
      id: productId,
      tenant_id: tenantId,
    },
  });

  if (!existing) return false;

  await prisma.product.update({
    where: { id: productId },
    data: { is_active: false },
  });

  // Write audit trail entry (fire-and-forget)
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Product',
    entityId: productId,
    action: 'delete',
    newValue: JSON.stringify({ is_active: false }),
  });

  logger.info(
    {
      operation: 'delete-product',
      tenantId,
      productId,
      actorId,
    },
    `Product soft-deleted: ${existing.name}`,
  );

  return true;
}
