import type { CreateBrandInput, UpdateBrandInput } from '@haversack/shared';
import { PrismaClient } from '@prisma/client';

export function createBrandService(prisma: PrismaClient) {
  return {
    async list(tenantId: string, activeOnly = true) {
      return prisma.brand.findMany({
        where: { tenantId, ...(activeOnly && { isActive: true }) },
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      });
    },

    async getById(tenantId: string, id: string) {
      return prisma.brand.findFirst({
        where: { id, tenantId },
        include: {
          products: { where: { isActive: true }, orderBy: { name: 'asc' } },
          _count: { select: { products: true } },
        },
      });
    },

    async create(tenantId: string, input: CreateBrandInput) {
      return prisma.brand.create({
        data: { ...input, tenantId },
      });
    },

    async update(tenantId: string, id: string, input: UpdateBrandInput) {
      return prisma.brand.update({
        where: { id },
        data: input,
      });
    },
  };
}

export type BrandService = ReturnType<typeof createBrandService>;
