/**
 * User management service.
 * Provides CRUD operations for user accounts with role assignment,
 * deactivation, and reactivation.
 * Implements FR-029 (user management) and FR-030 (session invalidation).
 */
import type { PrismaClient, User } from '@prisma/client';

import type { CreateUserInput, UpdateUserInput } from '@haversack/shared';
import { hashPassword } from '../../auth/auth.service.js';
import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
import { logger } from '../../shared/utils/logger.js';

/** User with territory details for API responses */
export interface UserWithTerritory extends User {
  territory?: { id: string; name: string } | null;
}

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** User list filters */
export interface UserListFilters {
  role?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Create a new user with hashed password (FR-029).
 * Territory is required when role is 'rep'.
 */
export async function createUser(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateUserInput,
  actorId: string,
  actorEmail: string,
): Promise<UserWithTerritory> {
  // Validate rep requires territory
  if (input.role === 'rep' && !input.territory_id) {
    throw Object.assign(
      new Error('Territory is required for rep role'),
      { statusCode: 400, code: 'TERRITORY_REQUIRED' },
    );
  }

  // Check email uniqueness within tenant
  const existing = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId,
      email: input.email.toLowerCase(),
      deleted_at: null,
    },
  });

  if (existing) {
    throw Object.assign(
      new Error('A user with this email already exists'),
      { statusCode: 409, code: 'EMAIL_ALREADY_EXISTS' },
    );
  }

  // Validate territory exists if provided
  if (input.territory_id) {
    const territory = await prisma.territory.findFirst({
      where: { id: input.territory_id, tenant_id: tenantId },
    });
    if (!territory) {
      throw Object.assign(
        new Error('Territory not found'),
        { statusCode: 404, code: 'TERRITORY_NOT_FOUND' },
      );
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      tenant_id: tenantId,
      email: input.email.toLowerCase(),
      first_name: input.first_name,
      last_name: input.last_name,
      password_hash: passwordHash,
      role: input.role,
      territory_id: input.territory_id ?? null,
      avatar_url: input.avatar_url ?? null,
      is_active: true,
    },
    include: {
      territory: {
        select: { id: true, name: true },
      },
    },
  });

  // Fire-and-forget audit trail
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'User',
    entityId: user.id,
    action: 'create',
    newValue: JSON.stringify({
      email: user.email,
      role: user.role,
      territory_id: user.territory_id,
    }),
  });

  logger.info(
    {
      operation: 'create-user',
      tenantId,
      userId: user.id,
      role: user.role,
      actorId,
    },
    `User created: ${user.email}`,
  );

  return user as UserWithTerritory;
}

/**
 * List users with filters and pagination (FR-029).
 */
export async function listUsers(
  prisma: PrismaClient,
  tenantId: string,
  filters: UserListFilters = {},
): Promise<PaginatedResult<UserWithTerritory>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    deleted_at: null,
  };

  if (filters.role) where['role'] = filters.role;
  if (filters.isActive !== undefined) where['is_active'] = filters.isActive;
  if (filters.search) {
    where['OR'] = [
      { first_name: { contains: filters.search, mode: 'insensitive' } },
      { last_name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const sortBy = filters.sortBy ?? 'last_name';
  const sortOrder = filters.sortOrder ?? 'asc';

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        territory: {
          select: { id: true, name: true },
        },
      },
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items as UserWithTerritory[],
    total,
    page,
    pageSize,
  };
}

/**
 * Get a user by ID (FR-029).
 */
export async function getUserById(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<UserWithTerritory | null> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenant_id: tenantId,
      deleted_at: null,
    },
    include: {
      territory: {
        select: { id: true, name: true },
      },
    },
  });

  return user as UserWithTerritory | null;
}

/**
 * Update a user (role change, territory reassignment) (FR-029).
 * Permission changes take effect within 60 seconds without re-authentication.
 */
export async function updateUser(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: UpdateUserInput,
  actorId: string,
  actorEmail: string,
): Promise<UserWithTerritory | null> {
  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      tenant_id: tenantId,
      deleted_at: null,
    },
  });

  if (!existing) return null;

  // Validate rep requires territory
  const newRole = input.role ?? existing.role;
  const newTerritoryId = input.territory_id !== undefined
    ? input.territory_id
    : existing.territory_id;
  if (newRole === 'rep' && !newTerritoryId) {
    throw Object.assign(
      new Error('Territory is required for rep role'),
      { statusCode: 400, code: 'TERRITORY_REQUIRED' },
    );
  }

  // Check email uniqueness if changing
  if (input.email && input.email.toLowerCase() !== existing.email) {
    const emailExists = await prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        email: input.email.toLowerCase(),
        deleted_at: null,
        id: { not: userId },
      },
    });
    if (emailExists) {
      throw Object.assign(
        new Error('A user with this email already exists'),
        { statusCode: 409, code: 'EMAIL_ALREADY_EXISTS' },
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (input.first_name !== undefined) updateData['first_name'] = input.first_name;
  if (input.last_name !== undefined) updateData['last_name'] = input.last_name;
  if (input.email !== undefined) updateData['email'] = input.email.toLowerCase();
  if (input.role !== undefined) updateData['role'] = input.role;
  if (input.territory_id !== undefined) updateData['territory_id'] = input.territory_id;
  if (input.avatar_url !== undefined) updateData['avatar_url'] = input.avatar_url;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      territory: {
        select: { id: true, name: true },
      },
    },
  });

  // When role changes, invalidate refresh token so next token refresh
  // picks up the new role (FR-029: effective within 60 seconds)
  if (input.role && input.role !== existing.role) {
    await prisma.user.update({
      where: { id: userId },
      data: { refresh_token_hash: null },
    });
  }

  // Build change summary
  const changeSummary: Record<string, { old: unknown; new: unknown }> = {};
  if (input.role && input.role !== existing.role) {
    changeSummary['role'] = { old: existing.role, new: input.role };
  }
  if (input.territory_id !== undefined && input.territory_id !== existing.territory_id) {
    changeSummary['territory_id'] = { old: existing.territory_id, new: input.territory_id };
  }

  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'User',
    entityId: userId,
    action: 'update',
    changeSummary,
  });

  logger.info(
    {
      operation: 'update-user',
      tenantId,
      userId,
      fieldsChanged: Object.keys(updateData),
      actorId,
    },
    `User updated: ${updated.email}`,
  );

  return updated as UserWithTerritory;
}

/**
 * Deactivate a user and invalidate all sessions (FR-030).
 * Sessions are invalidated within 15 seconds by clearing the refresh token hash.
 */
export async function deactivateUser(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  actorId: string,
  actorEmail: string,
  reason?: string,
): Promise<UserWithTerritory | null> {
  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      tenant_id: tenantId,
      deleted_at: null,
    },
  });

  if (!existing) return null;

  if (!existing.is_active) {
    throw Object.assign(
      new Error('User is already deactivated'),
      { statusCode: 400, code: 'ALREADY_DEACTIVATED' },
    );
  }

  // Prevent self-deactivation
  if (userId === actorId) {
    throw Object.assign(
      new Error('Cannot deactivate your own account'),
      { statusCode: 400, code: 'CANNOT_SELF_DEACTIVATE' },
    );
  }

  // Deactivate and clear refresh token in one atomic operation (FR-030)
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      is_active: false,
      refresh_token_hash: null, // Invalidate all sessions immediately
    },
    include: {
      territory: {
        select: { id: true, name: true },
      },
    },
  });

  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'User',
    entityId: userId,
    action: 'update',
    changeSummary: {
      is_active: { old: true, new: false },
      reason: { old: null, new: reason ?? 'No reason provided' },
    },
  });

  logger.info(
    {
      operation: 'deactivate-user',
      tenantId,
      userId,
      reason,
      actorId,
    },
    `User deactivated: ${updated.email}`,
  );

  return updated as UserWithTerritory;
}

/**
 * Reactivate a previously deactivated user (FR-029).
 */
export async function reactivateUser(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  actorId: string,
  actorEmail: string,
): Promise<UserWithTerritory | null> {
  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      tenant_id: tenantId,
      deleted_at: null,
    },
  });

  if (!existing) return null;

  if (existing.is_active) {
    throw Object.assign(
      new Error('User is already active'),
      { statusCode: 400, code: 'ALREADY_ACTIVE' },
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { is_active: true },
    include: {
      territory: {
        select: { id: true, name: true },
      },
    },
  });

  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'User',
    entityId: userId,
    action: 'update',
    changeSummary: {
      is_active: { old: false, new: true },
    },
  });

  logger.info(
    {
      operation: 'reactivate-user',
      tenantId,
      userId,
      actorId,
    },
    `User reactivated: ${updated.email}`,
  );

  return updated as UserWithTerritory;
}
