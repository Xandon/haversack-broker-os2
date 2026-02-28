import type { PrismaClient, Account, Prisma } from '@prisma/client';
import type { CreateAccountInput, UpdateAccountInput } from '@haversack/shared';
import {
  writeAuditLog,
  detectChanges,
  writeUpdateAuditLogs,
} from '../../shared/services/audit.service';

export class AccountError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
  }
}

export interface AccountWithRelations extends Account {
  territory: { id: string; name: string };
  parentAccount: { id: string; name: string } | null;
  childAccounts: { id: string; name: string }[];
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export async function createAccount(
  prisma: PrismaClient,
  tenantId: string,
  data: CreateAccountInput,
  audit: AuditContext,
): Promise<Account> {
  const { primaryContact, skipDuplicateCheck: _, ...accountData } = data;

  const account = await prisma.account.create({
    data: {
      tenantId,
      name: accountData.name,
      accountType: accountData.accountType,
      streetAddress: accountData.streetAddress,
      city: accountData.city,
      state: accountData.state,
      zipCode: accountData.zipCode,
      territoryId: accountData.territoryId,
      parentAccountId: accountData.parentAccountId ?? null,
      contacts: {
        create: {
          tenantId,
          firstName: primaryContact.firstName,
          lastName: primaryContact.lastName,
          email: primaryContact.email ?? null,
          phone: primaryContact.phone ?? null,
          title: primaryContact.title ?? null,
          isPrimary: true,
        },
      },
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Account',
    entityId: account.id,
    action: 'create',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return account;
}

export async function getAccountById(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<AccountWithRelations> {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenantId,
      deletedAt: null,
    },
    include: {
      territory: { select: { id: true, name: true } },
      parentAccount: { select: { id: true, name: true } },
      childAccounts: {
        where: { deletedAt: null },
        select: { id: true, name: true },
      },
      contacts: {
        where: { deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          title: true,
          isPrimary: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!account) {
    throw new AccountError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  return account as AccountWithRelations;
}

export async function updateAccount(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  data: UpdateAccountInput,
  expectedUpdatedAt: string | undefined,
  audit: AuditContext,
): Promise<Account> {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new AccountError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  // Optimistic concurrency check
  if (expectedUpdatedAt) {
    const expectedDate = new Date(expectedUpdatedAt);
    if (existing.updatedAt.getTime() !== expectedDate.getTime()) {
      throw new AccountError(
        'Account has been modified by another user',
        'ACCOUNT_CONFLICT',
      );
    }
  }

  // Validate parent-child hierarchy if parentAccountId is being set
  if (data.parentAccountId !== undefined && data.parentAccountId !== null) {
    await validateParentChild(prisma, tenantId, accountId, data.parentAccountId);
  }

  const updateData: Prisma.AccountUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.accountType !== undefined) updateData.accountType = data.accountType;
  if (data.streetAddress !== undefined) updateData.streetAddress = data.streetAddress;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
  if (data.territoryId !== undefined) {
    updateData.territory = { connect: { id: data.territoryId } };
  }
  if (data.parentAccountId !== undefined) {
    if (data.parentAccountId === null) {
      updateData.parentAccount = { disconnect: true };
    } else {
      updateData.parentAccount = { connect: { id: data.parentAccountId } };
    }
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.account.update({
    where: { id: accountId },
    data: updateData,
  });

  // Audit trail
  const oldData: Record<string, unknown> = {
    name: existing.name,
    accountType: existing.accountType,
    streetAddress: existing.streetAddress,
    city: existing.city,
    state: existing.state,
    zipCode: existing.zipCode,
    territoryId: existing.territoryId,
    parentAccountId: existing.parentAccountId,
    isActive: existing.isActive,
  };
  const newData: Record<string, unknown> = {
    name: updated.name,
    accountType: updated.accountType,
    streetAddress: updated.streetAddress,
    city: updated.city,
    state: updated.state,
    zipCode: updated.zipCode,
    territoryId: updated.territoryId,
    parentAccountId: updated.parentAccountId,
    isActive: updated.isActive,
  };

  const changes = detectChanges(oldData, newData);
  if (changes.length > 0) {
    await writeUpdateAuditLogs(
      {
        prisma,
        tenantId,
        actorId: audit.actorId,
        actorEmail: audit.actorEmail,
        entityType: 'Account',
        entityId: accountId,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        requestId: audit.requestId,
      },
      changes,
    );
  }

  return updated;
}

export async function softDeleteAccount(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  audit: AuditContext,
): Promise<{ id: string; deletedAt: Date }> {
  const existing = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new AccountError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  const deletedAt = new Date();

  await prisma.account.update({
    where: { id: accountId },
    data: { deletedAt },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Account',
    entityId: accountId,
    action: 'delete',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { id: accountId, deletedAt };
}

export async function listAccounts(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    territoryId?: string;
    accountType?: string;
    healthScoreMin?: number;
    healthScoreMax?: number;
    parentAccountId?: string;
    includeDeleted?: boolean;
    cursor?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  },
): Promise<{
  data: Account[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}> {
  const limit = options.limit ?? 20;
  const sortBy = options.sortBy ?? 'name';
  const sortOrder = (options.sortOrder ?? 'asc') as 'asc' | 'desc';

  const where: Prisma.AccountWhereInput = { tenantId };

  if (!options.includeDeleted) {
    where.deletedAt = null;
  }
  if (options.territoryId) {
    where.territoryId = options.territoryId;
  }
  if (options.accountType) {
    where.accountType = options.accountType as Prisma.EnumAccountTypeFilter;
  }
  if (options.healthScoreMin !== undefined || options.healthScoreMax !== undefined) {
    where.healthScore = {};
    if (options.healthScoreMin !== undefined) {
      where.healthScore.gte = options.healthScoreMin;
    }
    if (options.healthScoreMax !== undefined) {
      where.healthScore.lte = options.healthScoreMax;
    }
  }
  if (options.parentAccountId) {
    where.parentAccountId = options.parentAccountId;
  }

  const cursorObj = options.cursor ? { id: options.cursor } : undefined;

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      include: { territory: { select: { id: true, name: true } } },
      orderBy: { [sortBy]: sortOrder },
      take: limit + 1,
      ...(cursorObj ? { cursor: cursorObj, skip: 1 } : {}),
    }),
    prisma.account.count({ where }),
  ]);

  const hasMore = accounts.length > limit;
  const data = hasMore ? accounts.slice(0, limit) : accounts;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data,
    pagination: { cursor: nextCursor, hasMore, total },
  };
}

export async function validateParentChild(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  parentAccountId: string,
): Promise<void> {
  // Cannot be your own parent
  if (accountId === parentAccountId) {
    throw new AccountError(
      'An account cannot be its own parent',
      'ACCOUNT_CIRCULAR_HIERARCHY',
    );
  }

  // Check parent exists and is in the same tenant
  const parent = await prisma.account.findFirst({
    where: { id: parentAccountId, tenantId, deletedAt: null },
  });

  if (!parent) {
    throw new AccountError('Parent account not found', 'ACCOUNT_NOT_FOUND');
  }

  // Max depth 2: parent cannot itself have a parent (no grandchildren)
  if (parent.parentAccountId !== null) {
    throw new AccountError(
      'Parent-child hierarchies are limited to 2 levels',
      'ACCOUNT_CIRCULAR_HIERARCHY',
    );
  }

  // Check if accountId is already a parent to parentAccountId (circular)
  const wouldBeCircular = await prisma.account.findFirst({
    where: {
      id: parentAccountId,
      parentAccountId: accountId,
      tenantId,
      deletedAt: null,
    },
  });

  if (wouldBeCircular) {
    throw new AccountError(
      'Circular parent-child relationship detected',
      'ACCOUNT_CIRCULAR_HIERARCHY',
    );
  }
}
