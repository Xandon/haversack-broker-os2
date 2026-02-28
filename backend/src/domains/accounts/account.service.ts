import type { CreateAccountInput, UpdateAccountInput, PaginationInput } from '@haversack/shared';
import { PrismaClient, Prisma } from '@prisma/client';


export interface AccountFilters {
  search?: string;
  accountType?: string;
  territoryId?: string;
  assignedRepId?: string;
  healthScoreMin?: number;
  healthScoreMax?: number;
  isActive?: boolean;
}

export interface AccountListResult {
  data: Prisma.AccountGetPayload<{
    include: { territory: true; assignedRep: true; contacts: true };
  }>[];
  total: number;
  page: number;
  limit: number;
}

export function createAccountService(prisma: PrismaClient) {
  return {
    async list(
      tenantId: string,
      pagination: PaginationInput,
      filters: AccountFilters = {},
    ): Promise<AccountListResult> {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const where: Prisma.AccountWhereInput = {
        tenantId,
        deletedAt: null,
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.accountType && {
          accountType: filters.accountType as Prisma.EnumAccountTypeFilter,
        }),
        ...(filters.territoryId && { territoryId: filters.territoryId }),
        ...(filters.assignedRepId && { assignedRepId: filters.assignedRepId }),
        ...(filters.healthScoreMin !== undefined && {
          healthScore: { gte: filters.healthScoreMin },
        }),
        ...(filters.healthScoreMax !== undefined && {
          healthScore: {
            ...(filters.healthScoreMin !== undefined ? { gte: filters.healthScoreMin } : {}),
            lte: filters.healthScoreMax,
          },
        }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { city: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      };

      const [data, total] = await Promise.all([
        prisma.account.findMany({
          where,
          include: { territory: true, assignedRep: true, contacts: true },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        prisma.account.count({ where }),
      ]);

      return { data, total, page, limit };
    },

    async getById(tenantId: string, id: string) {
      return prisma.account.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: {
          territory: true,
          assignedRep: true,
          contacts: { where: { deletedAt: null } },
          parentAccount: true,
          childAccounts: { where: { deletedAt: null } },
        },
      });
    },

    async create(tenantId: string, assignedRepId: string, input: CreateAccountInput) {
      return prisma.account.create({
        data: {
          ...input,
          tenantId,
          assignedRepId,
        },
        include: { territory: true, assignedRep: true, contacts: true },
      });
    },

    async update(tenantId: string, id: string, input: UpdateAccountInput) {
      return prisma.account.update({
        where: { id },
        data: input,
        include: { territory: true, assignedRep: true, contacts: true },
      });
    },

    async softDelete(tenantId: string, id: string) {
      return prisma.account.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
    },

    async findDuplicates(tenantId: string, name: string) {
      return prisma.account.findMany({
        where: {
          tenantId,
          deletedAt: null,
          name: { contains: name, mode: 'insensitive' },
        },
        select: { id: true, name: true, city: true, state: true },
        take: 5,
      });
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
