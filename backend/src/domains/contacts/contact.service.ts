import type { CreateContactInput, UpdateContactInput } from '@haversack/shared';
import { PrismaClient } from '@prisma/client';


export function createContactService(prisma: PrismaClient) {
  return {
    async listByAccount(tenantId: string, accountId: string) {
      return prisma.contact.findMany({
        where: { tenantId, accountId, deletedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
      });
    },

    async getById(tenantId: string, id: string) {
      return prisma.contact.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { account: true },
      });
    },

    async create(tenantId: string, input: CreateContactInput) {
      // If setting as primary, unset existing primary for the account
      if (input.isPrimary) {
        await prisma.contact.updateMany({
          where: { tenantId, accountId: input.accountId, isPrimary: true, deletedAt: null },
          data: { isPrimary: false },
        });
      }

      return prisma.contact.create({
        data: { ...input, tenantId },
        include: { account: true },
      });
    },

    async update(tenantId: string, id: string, input: UpdateContactInput) {
      const existing = await prisma.contact.findFirst({
        where: { id, tenantId, deletedAt: null },
      });

      if (!existing) {
        return null;
      }

      // If setting as primary, unset existing primary for the account
      if (input.isPrimary) {
        await prisma.contact.updateMany({
          where: {
            tenantId,
            accountId: existing.accountId,
            isPrimary: true,
            deletedAt: null,
            id: { not: id },
          },
          data: { isPrimary: false },
        });
      }

      return prisma.contact.update({
        where: { id },
        data: input,
        include: { account: true },
      });
    },

    async softDelete(tenantId: string, id: string) {
      return prisma.contact.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;
