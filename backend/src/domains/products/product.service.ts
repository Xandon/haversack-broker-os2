import type { CreateProductInput, UpdateProductInput, PaginationInput } from '@haversack/shared';
import { PrismaClient, Prisma } from '@prisma/client';

export interface ProductFilters {
  search?: string;
  brandId?: string;
  category?: string;
  availabilityStatus?: string;
  revenueModel?: string;
  isActive?: boolean;
  hasPromo?: boolean;
}

export function createProductService(prisma: PrismaClient) {
  return {
    async list(tenantId: string, pagination: PaginationInput, filters: ProductFilters = {}) {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const where: Prisma.ProductWhereInput = {
        tenantId,
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.brandId && { brandId: filters.brandId }),
        ...(filters.category && { category: filters.category }),
        ...(filters.availabilityStatus && {
          availabilityStatus: filters.availabilityStatus as Prisma.EnumAvailabilityStatusFilter,
        }),
        ...(filters.revenueModel && {
          revenueModel: filters.revenueModel as Prisma.EnumRevenueModelFilter,
        }),
        ...(filters.hasPromo && {
          promoPrice: { not: null },
          promoEndDate: { gte: new Date() },
        }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { sku: { contains: filters.search, mode: 'insensitive' } },
            { category: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      };

      const [data, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: { brand: true },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        prisma.product.count({ where }),
      ]);

      return { data, total, page, limit };
    },

    async getById(tenantId: string, id: string) {
      return prisma.product.findFirst({
        where: { id, tenantId },
        include: { brand: true },
      });
    },

    async create(tenantId: string, input: CreateProductInput) {
      return prisma.product.create({
        data: { ...input, tenantId },
        include: { brand: true },
      });
    },

    async update(tenantId: string, id: string, input: UpdateProductInput) {
      return prisma.product.update({
        where: { id },
        data: input,
        include: { brand: true },
      });
    },

    async searchForOrder(tenantId: string, query: string) {
      return prisma.product.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: { brand: { select: { id: true, name: true } } },
        take: 10,
        orderBy: { name: 'asc' },
      });
    },
  };
}

export type ProductService = ReturnType<typeof createProductService>;
