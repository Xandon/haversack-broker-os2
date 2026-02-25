/**
 * Account domain service.
 * Provides CRUD operations for accounts with tenant isolation,
 * audit trail integration, and duplicate detection.
 */
import type { PrismaClient, Account } from '@prisma/client';

import type { CreateAccountInput, UpdateAccountInput } from '@haversack/shared';
import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
import { logger } from '../../shared/utils/logger.js';
import { findDuplicates, type DuplicateMatch } from './duplicate-detection.service.js';

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Filters for listing accounts */
export interface AccountFilters {
  territoryId?: string;
  accountType?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Result from account creation, includes any duplicate warnings */
export interface CreateAccountResult {
  account: Account;
  duplicates: DuplicateMatch[];
}

/**
 * Create a new account.
 * Checks for duplicates, creates the account, and writes an audit trail entry.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param input - Validated account creation input
 * @param actorId - ID of the user performing the action
 * @param actorEmail - Email of the user performing the action
 * @returns The created account and any duplicate matches
 */
export async function createAccount(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateAccountInput,
  actorId: string,
  actorEmail: string,
): Promise<CreateAccountResult> {
  // Check for potential duplicates before creating
  const duplicates = await findDuplicates(prisma, tenantId, {
    name: input.name,
    phone: input.phone ?? undefined,
    address_line1: input.address_line1,
    city: input.city,
    state: input.state,
    zip_code: input.zip_code,
  });

  // Create the account within a transaction
  const account = await prisma.account.create({
    data: {
      tenant_id: tenantId,
      name: input.name,
      account_type: input.account_type,
      address_line1: input.address_line1,
      address_line2: input.address_line2 ?? null,
      city: input.city,
      state: input.state,
      zip_code: input.zip_code,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      territory_id: input.territory_id,
      assigned_rep_id: input.assigned_rep_id,
      parent_account_id: input.parent_account_id ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
    },
  });

  // Write audit trail entry (fire-and-forget)
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail,
    entityType: 'Account',
    entityId: account.id,
    action: 'create',
    newValue: JSON.stringify({
      name: account.name,
      account_type: account.account_type,
      territory_id: account.territory_id,
    }),
  });

  logger.info(
    {
      operation: 'create-account',
      tenantId,
      accountId: account.id,
      actorId,
      duplicateCount: duplicates.length,
    },
    `Account created: ${account.name}`,
  );

  return { account, duplicates };
}

/**
 * Get a single account by ID with contacts relation.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param accountId - The account ID to fetch
 * @returns The account with contacts, or null if not found
 */
export async function getAccountById(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<(Account & { contacts: unknown[] }) | null> {
  return prisma.account.findFirst({
    where: {
      id: accountId,
      tenant_id: tenantId,
      deleted_at: null,
    },
    include: {
      contacts: {
        where: { deleted_at: null },
        orderBy: { is_primary: 'desc' },
      },
    },
  });
}

/**
 * List accounts with optional filters and pagination.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param filters - Optional filter criteria
 * @returns Paginated account results
 */
export async function listAccounts(
  prisma: PrismaClient,
  tenantId: string,
  filters: AccountFilters = {},
): Promise<PaginatedResult<Account>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  // Build where clause with tenant isolation
  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    deleted_at: null,
  };

  if (filters.territoryId) {
    where['territory_id'] = filters.territoryId;
  }

  if (filters.accountType) {
    where['account_type'] = filters.accountType;
  }

  if (filters.isActive !== undefined) {
    where['is_active'] = filters.isActive;
  }

  if (filters.search) {
    where['name'] = {
      contains: filters.search,
      mode: 'insensitive',
    };
  }

  const [items, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.account.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Update an existing account.
 * Writes an audit trail entry with the changed fields.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param accountId - The account ID to update
 * @param input - Validated partial update input
 * @param actorId - ID of the user performing the action
 * @param actorEmail - Email of the user performing the action
 * @returns The updated account, or null if not found
 */
export async function updateAccount(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  input: UpdateAccountInput,
  actorId: string,
  actorEmail: string,
): Promise<Account | null> {
  // Verify the account exists and belongs to this tenant
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenant_id: tenantId,
      deleted_at: null,
    },
  });

  if (!existing) {
    return null;
  }

  // Build update data from provided fields only
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData['name'] = input.name;
  if (input.account_type !== undefined) updateData['account_type'] = input.account_type;
  if (input.address_line1 !== undefined) updateData['address_line1'] = input.address_line1;
  if (input.address_line2 !== undefined) updateData['address_line2'] = input.address_line2 ?? null;
  if (input.city !== undefined) updateData['city'] = input.city;
  if (input.state !== undefined) updateData['state'] = input.state;
  if (input.zip_code !== undefined) updateData['zip_code'] = input.zip_code;
  if (input.phone !== undefined) updateData['phone'] = input.phone ?? null;
  if (input.email !== undefined) updateData['email'] = input.email ?? null;
  if (input.website !== undefined) updateData['website'] = input.website ?? null;
  if (input.territory_id !== undefined) updateData['territory_id'] = input.territory_id;
  if (input.assigned_rep_id !== undefined) updateData['assigned_rep_id'] = input.assigned_rep_id;
  if (input.parent_account_id !== undefined) {
    updateData['parent_account_id'] = input.parent_account_id ?? null;
  }
  if (input.notes !== undefined) updateData['notes'] = input.notes ?? null;
  if (input.tags !== undefined) updateData['tags'] = input.tags;

  const updated = await prisma.account.update({
    where: { id: accountId },
    data: updateData,
  });

  // Build change summary for audit trail
  const changeSummary: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(updateData)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    const newVal = updateData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changeSummary[key] = { old: oldVal, new: newVal };
    }
  }

  // Write audit trail entry (fire-and-forget)
  if (Object.keys(changeSummary).length > 0) {
    void createAuditEntry(prisma, {
      tenantId,
      actorId,
      actorEmail,
      entityType: 'Account',
      entityId: accountId,
      action: 'update',
      changeSummary,
    });
  }

  logger.info(
    {
      operation: 'update-account',
      tenantId,
      accountId,
      actorId,
      fieldsChanged: Object.keys(changeSummary),
    },
    `Account updated: ${updated.name}`,
  );

  return updated;
}

/** Territory info included in account detail */
interface TerritoryInfo {
  id: string;
  name: string;
  region: string;
}

/** Assigned rep info included in account detail */
interface AssignedRepInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/** Child account summary for detail view */
interface ChildAccountSummary {
  id: string;
  name: string;
  account_type: string;
  health_score: number | null;
  is_active: boolean;
}

/** Recent activity summary */
interface RecentActivitySummary {
  id: string;
  activity_type: string;
  subject: string | null;
  occurred_at: Date;
  user_id: string;
}

/** Full account detail including related data for the detail view */
export interface AccountDetail {
  account: Account & { contacts: unknown[] };
  territory: TerritoryInfo | null;
  assignedRep: AssignedRepInfo | null;
  childAccounts: ChildAccountSummary[];
  recentActivities: RecentActivitySummary[];
}

/**
 * Get full account detail view with enriched data:
 * - Contacts (non-deleted, primary first)
 * - Territory info
 * - Assigned rep info
 * - Child accounts (for parent-child hierarchy)
 * - Last 5 recent activities
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param accountId - The account ID to fetch
 * @returns Full account detail, or null if not found
 */
export async function getAccountDetail(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<AccountDetail | null> {
  // Fetch the account with contacts, territory, assigned rep, children, and recent activities
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenant_id: tenantId,
      deleted_at: null,
    },
    include: {
      contacts: {
        where: { deleted_at: null },
        orderBy: { is_primary: 'desc' },
      },
      territory: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
      assigned_rep: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      child_accounts: {
        where: { deleted_at: null },
        select: {
          id: true,
          name: true,
          account_type: true,
          health_score: true,
          is_active: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!account) {
    return null;
  }

  // Fetch last 5 recent activities separately for the account
  const recentActivities = await prisma.activity.findMany({
    where: {
      tenant_id: tenantId,
      account_id: accountId,
    },
    select: {
      id: true,
      activity_type: true,
      subject: true,
      occurred_at: true,
      user_id: true,
    },
    orderBy: { occurred_at: 'desc' },
    take: 5,
  });

  // Extract territory, assignedRep, and childAccounts from the included data
  const territory: TerritoryInfo | null = account.territory
    ? {
        id: account.territory.id,
        name: account.territory.name,
        region: account.territory.region,
      }
    : null;

  const assignedRep: AssignedRepInfo | null = account.assigned_rep
    ? {
        id: account.assigned_rep.id,
        first_name: account.assigned_rep.first_name,
        last_name: account.assigned_rep.last_name,
        email: account.assigned_rep.email,
      }
    : null;

  const childAccounts: ChildAccountSummary[] = account.child_accounts.map(
    (child: { id: string; name: string; account_type: string; health_score: number | null; is_active: boolean }) => ({
      id: child.id,
      name: child.name,
      account_type: child.account_type,
      health_score: child.health_score,
      is_active: child.is_active,
    }),
  );

  // Build the base account without the extra included relations for the response
  // We keep contacts on the account object as before
  const { territory: _t, assigned_rep: _ar, child_accounts: _ca, ...accountData } = account;

  return {
    account: accountData as Account & { contacts: unknown[] },
    territory,
    assignedRep,
    childAccounts,
    recentActivities,
  };
}
