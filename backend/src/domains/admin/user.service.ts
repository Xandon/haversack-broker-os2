import type { PrismaClient, User, UserRole } from '@prisma/client';
import type { CreateUserInput, UpdateUserInput } from '@haversack/shared';
import { ADMIN_ERROR_CODES } from '@haversack/shared';
import { hashPassword } from '../../shared/services/password.service';
import { writeAuditLog } from '../../shared/services/audit.service';

export class AdminError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
  }
}

interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

interface UserWithTerritories extends User {
  territories: Array<{
    territory: {
      id: string;
      name: string;
    };
  }>;
}

function formatUserResponse(user: UserWithTerritories): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    territories: user.territories.map((ut) => ({
      id: ut.territory.id,
      name: ut.territory.name,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function createUser(
  prisma: PrismaClient,
  tenantId: string,
  data: CreateUserInput,
  audit: AuditContext,
): Promise<Record<string, unknown>> {
  // Check for duplicate email within tenant
  const existing = await prisma.user.findFirst({
    where: { tenantId, email: data.email, deletedAt: null },
  });
  if (existing) {
    throw new AdminError(
      'A user with this email already exists',
      ADMIN_ERROR_CODES.USER_EMAIL_DUPLICATE,
    );
  }

  const passwordHash = await hashPassword(data.temporaryPassword);

  const user = await prisma.user.create({
    data: {
      tenantId,
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as UserRole,
      isActive: true,
      territories: {
        create: data.territoryIds.map((tid) => ({
          tenantId,
          territoryId: tid,
        })),
      },
    },
    include: {
      territories: {
        include: { territory: { select: { id: true, name: true } } },
      },
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    action: 'create',
    entityType: 'User',
    entityId: user.id,
    newData: { email: data.email, role: data.role, firstName: data.firstName, lastName: data.lastName },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return formatUserResponse(user as UserWithTerritories);
}

export async function getUserById(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    include: {
      territories: {
        include: { territory: { select: { id: true, name: true } } },
      },
    },
  });

  if (!user) {
    throw new AdminError('User not found', ADMIN_ERROR_CODES.USER_NOT_FOUND);
  }

  return formatUserResponse(user as UserWithTerritories);
}

export async function listUsers(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    role?: string;
    isActive?: boolean;
    search?: string;
    page: number;
    limit: number;
  },
): Promise<{ data: Record<string, unknown>[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const where: Record<string, unknown> = { tenantId, deletedAt: null };

  if (options.role) {
    where['role'] = options.role;
  }
  if (options.isActive !== undefined) {
    where['isActive'] = options.isActive;
  }
  if (options.search) {
    where['OR'] = [
      { firstName: { contains: options.search, mode: 'insensitive' } },
      { lastName: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: where as never,
      include: {
        territories: {
          include: { territory: { select: { id: true, name: true } } },
        },
      },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: where as never }),
  ]);

  return {
    data: users.map((u) => formatUserResponse(u as UserWithTerritories)),
    meta: {
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function updateUser(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  data: UpdateUserInput,
  ifMatch: string | undefined,
  audit: AuditContext,
): Promise<Record<string, unknown>> {
  const existing = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    include: {
      territories: {
        include: { territory: { select: { id: true, name: true } } },
      },
    },
  });

  if (!existing) {
    throw new AdminError('User not found', ADMIN_ERROR_CODES.USER_NOT_FOUND);
  }

  // Optimistic concurrency check
  if (ifMatch && existing.updatedAt.toISOString() !== ifMatch) {
    throw new AdminError(
      'User has been modified by another request',
      ADMIN_ERROR_CODES.USER_CONFLICT,
    );
  }

  // Self-deactivation prevention
  if (data.isActive === false && userId === audit.actorId) {
    throw new AdminError(
      'Cannot deactivate your own account',
      ADMIN_ERROR_CODES.USER_SELF_DEACTIVATION,
    );
  }

  const updateData: Record<string, unknown> = {};
  if (data.firstName !== undefined) updateData['firstName'] = data.firstName;
  if (data.lastName !== undefined) updateData['lastName'] = data.lastName;
  if (data.role !== undefined) updateData['role'] = data.role;
  if (data.isActive !== undefined) updateData['isActive'] = data.isActive;

  const user = await prisma.$transaction(async (tx) => {
    // Update territory assignments if provided
    if (data.territoryIds !== undefined) {
      await tx.userTerritory.deleteMany({ where: { userId } });
      if (data.territoryIds.length > 0) {
        await tx.userTerritory.createMany({
          data: data.territoryIds.map((tid) => ({
            tenantId,
            userId,
            territoryId: tid,
          })),
        });
      }
    }

    // If deactivating, invalidate refresh tokens
    if (data.isActive === false) {
      await tx.refreshToken.deleteMany({ where: { userId } });
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: updateData as never,
      include: {
        territories: {
          include: { territory: { select: { id: true, name: true } } },
        },
      },
    });

    return updated;
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    action: 'update',
    entityType: 'User',
    entityId: userId,
    oldData: { role: existing.role, isActive: existing.isActive },
    newData: updateData,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return formatUserResponse(user as UserWithTerritories);
}

export async function deactivateUser(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  audit: AuditContext,
): Promise<Record<string, unknown>> {
  // Self-deactivation prevention
  if (userId === audit.actorId) {
    throw new AdminError(
      'Cannot deactivate your own account',
      ADMIN_ERROR_CODES.USER_SELF_DEACTIVATION,
    );
  }

  const existing = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new AdminError('User not found', ADMIN_ERROR_CODES.USER_NOT_FOUND);
  }

  const user = await prisma.$transaction(async (tx) => {
    // Invalidate all refresh tokens
    await tx.refreshToken.deleteMany({ where: { userId } });

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: {
        territories: {
          include: { territory: { select: { id: true, name: true } } },
        },
      },
    });

    return updated;
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    action: 'delete',
    entityType: 'User',
    entityId: userId,
    oldData: { isActive: existing.isActive },
    newData: { isActive: false, deletedAt: user.deletedAt?.toISOString() },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return formatUserResponse(user as UserWithTerritories);
}
