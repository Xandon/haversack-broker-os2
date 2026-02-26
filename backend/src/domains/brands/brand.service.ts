import type { PrismaClient, Brand } from '@prisma/client';
import type { CreateBrandInput, UpdateBrandInput, BrandListQuery } from '@haversack/shared';
import { writeAuditLog } from '../../shared/services/audit.service';

export class BrandError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'BrandError';
    this.code = code;
  }
}

export interface BrandWithCounts extends Brand {
  _count?: { products: number };
  productCount: number;
  activeProductCount: number;
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress: string;
  userAgent?: string;
  requestId: string;
}

export async function createBrand(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateBrandInput,
  audit: AuditContext,
): Promise<Brand> {
  // Check for duplicate name
  const existing = await prisma.brand.findFirst({
    where: { tenantId, name: input.name },
  });
  if (existing) {
    throw new BrandError('Brand name already exists for this tenant', 'BRAND_NAME_CONFLICT');
  }

  const brand = await prisma.brand.create({
    data: {
      tenantId,
      name: input.name,
      commissionRate: input.commissionRate,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      website: input.website ?? null,
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    entityType: 'Brand',
    entityId: brand.id,
    action: 'create',
    changeSummary: { created: { name: brand.name } },
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return brand;
}

export async function getBrandById(
  prisma: PrismaClient,
  tenantId: string,
  brandId: string,
): Promise<Brand> {
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, tenantId },
  });

  if (!brand) {
    throw new BrandError('Brand not found', 'BRAND_NOT_FOUND');
  }

  return brand;
}

export async function updateBrand(
  prisma: PrismaClient,
  tenantId: string,
  brandId: string,
  input: UpdateBrandInput,
  expectedUpdatedAt: string | undefined,
  audit: AuditContext,
): Promise<Brand> {
  const existing = await prisma.brand.findFirst({
    where: { id: brandId, tenantId },
  });

  if (!existing) {
    throw new BrandError('Brand not found', 'BRAND_NOT_FOUND');
  }

  // Optimistic concurrency check
  if (expectedUpdatedAt) {
    const existingTimestamp = existing.updatedAt.toISOString();
    if (existingTimestamp !== expectedUpdatedAt) {
      throw new BrandError('Brand has been modified by another user', 'BRAND_CONFLICT');
    }
  }

  // Check name uniqueness if changing name
  if (input.name && input.name !== existing.name) {
    const nameConflict = await prisma.brand.findFirst({
      where: { tenantId, name: input.name, id: { not: brandId } },
    });
    if (nameConflict) {
      throw new BrandError('Brand name already exists for this tenant', 'BRAND_NAME_CONFLICT');
    }
  }

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data['name'] = input.name;
  if (input.commissionRate !== undefined) data['commissionRate'] = input.commissionRate;
  if (input.description !== undefined) data['description'] = input.description;
  if (input.logoUrl !== undefined) data['logoUrl'] = input.logoUrl;
  if (input.contactName !== undefined) data['contactName'] = input.contactName;
  if (input.contactEmail !== undefined) data['contactEmail'] = input.contactEmail;
  if (input.contactPhone !== undefined) data['contactPhone'] = input.contactPhone;
  if (input.website !== undefined) data['website'] = input.website;
  if (input.isActive !== undefined) data['isActive'] = input.isActive;

  const updated = await prisma.brand.update({
    where: { id: brandId },
    data,
  });

  await writeAuditLog({
    prisma,
    tenantId,
    entityType: 'Brand',
    entityId: brandId,
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

export async function listBrands(
  prisma: PrismaClient,
  tenantId: string,
  query: BrandListQuery,
): Promise<{ data: BrandWithCounts[]; pagination: { cursor: string | null; hasMore: boolean } }> {
  const limit = query.limit ?? 20;

  const where: Record<string, unknown> = { tenantId };

  if (query.isActive !== undefined) {
    where['isActive'] = query.isActive;
  }

  if (query.cursor) {
    where['id'] = { lt: query.cursor };
  }

  const brands = await prisma.brand.findMany({
    where,
    include: {
      _count: { select: { products: true } },
    },
    take: limit + 1,
    orderBy: { [query.sortBy ?? 'name']: query.sortOrder ?? 'asc' },
  });

  const hasMore = brands.length > limit;
  const brandsSlice = hasMore ? brands.slice(0, limit) : brands;

  // Get active product counts for each brand
  const brandIds = brandsSlice.map((b) => b.id);
  const activeCounts = await prisma.product.groupBy({
    by: ['brandId'],
    where: {
      tenantId,
      brandId: { in: brandIds },
      isActive: true,
      availabilityStatus: { not: 'discontinued' },
    },
    _count: { id: true },
  });

  const activeCountMap = new Map<string, number>();
  for (const ac of activeCounts) {
    activeCountMap.set(ac.brandId, ac._count.id);
  }

  const data: BrandWithCounts[] = brandsSlice.map((brand) => ({
    ...brand,
    productCount: brand._count?.products ?? 0,
    activeProductCount: activeCountMap.get(brand.id) ?? 0,
  }));

  const cursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : null;

  return { data, pagination: { cursor, hasMore } };
}

export function formatBrandResponse(brand: Brand): Record<string, unknown> {
  return {
    id: brand.id,
    name: brand.name,
    commissionRate: Number(brand.commissionRate),
    description: brand.description,
    logoUrl: brand.logoUrl,
    contactName: brand.contactName,
    contactEmail: brand.contactEmail,
    contactPhone: brand.contactPhone,
    website: brand.website,
    isActive: brand.isActive,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}

export function formatBrandWithCountsResponse(brand: BrandWithCounts): Record<string, unknown> {
  return {
    ...formatBrandResponse(brand),
    productCount: brand.productCount,
    activeProductCount: brand.activeProductCount,
  };
}
