import type { CreateUserInput, UpdateUserInput } from '@haversack/shared';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const BCRYPT_COST = 12;

export function createUserService(prisma: PrismaClient) {
  return {
    async list(tenantId: string, includeInactive = false) {
      return prisma.user.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(!includeInactive && { isActive: true }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          territoryId: true,
          territory: { select: { id: true, name: true } },
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      });
    },

    async getById(tenantId: string, id: string) {
      return prisma.user.findFirst({
        where: { id, tenantId, deletedAt: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          territoryId: true,
          territory: { select: { id: true, name: true } },
          avatarUrl: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    },

    async create(tenantId: string, input: CreateUserInput) {
      const passwordHash = await hash(input.password, BCRYPT_COST);

      return prisma.user.create({
        data: {
          tenantId,
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
          territoryId: input.territoryId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          territoryId: true,
          createdAt: true,
        },
      });
    },

    async update(tenantId: string, id: string, input: UpdateUserInput) {
      return prisma.user.update({
        where: { id },
        data: input,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          territoryId: true,
          updatedAt: true,
        },
      });
    },

    async deactivate(tenantId: string, id: string) {
      return prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    },

    async getByEmail(email: string) {
      return prisma.user.findFirst({
        where: { email, deletedAt: null, isActive: true },
        select: {
          id: true,
          tenantId: true,
          email: true,
          passwordHash: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });
    },

    async updateLastLogin(id: string) {
      return prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    },

    async checkEmailUnique(tenantId: string, email: string, excludeId?: string) {
      const existing = await prisma.user.findFirst({
        where: {
          tenantId,
          email,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });
      return !existing;
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
