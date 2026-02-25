/**
 * Account parent-child hierarchy service.
 * Manages account hierarchy relationships with circular reference prevention,
 * child account queries, and rollup metrics (total child count, avg health score).
 */
import type { PrismaClient, Account } from '@prisma/client';

import { logger } from '../../shared/utils/logger.js';

/** Basic account info for hierarchy display */
export interface HierarchyAccount {
  id: string;
  name: string;
  account_type: string;
  health_score: number | null;
  is_active: boolean;
}

/** Rollup metrics for a parent account */
export interface HierarchyRollupMetrics {
  totalChildCount: number;
  averageHealthScore: number | null;
}

/** Full hierarchy view for an account */
export interface AccountHierarchy {
  account: HierarchyAccount;
  parentChain: HierarchyAccount[];
  children: HierarchyAccount[];
  rollupMetrics: HierarchyRollupMetrics;
}

/**
 * Get the full hierarchy for an account: parent chain upward + direct children downward.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param accountId - The account to get hierarchy for
 * @returns The full hierarchy view, or null if the account is not found
 */
export async function getAccountHierarchy(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
): Promise<AccountHierarchy | null> {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenant_id: tenantId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      account_type: true,
      health_score: true,
      is_active: true,
      parent_account_id: true,
    },
  });

  if (!account) {
    return null;
  }

  // Build parent chain by walking up the hierarchy
  const parentChain = await buildParentChain(prisma, tenantId, account.parent_account_id);

  // Get direct children
  const children = await getChildAccounts(prisma, tenantId, accountId);

  // Calculate rollup metrics
  const rollupMetrics = calculateRollupMetrics(children);

  return {
    account: {
      id: account.id,
      name: account.name,
      account_type: account.account_type,
      health_score: account.health_score,
      is_active: account.is_active,
    },
    parentChain,
    children,
    rollupMetrics,
  };
}

/**
 * Get direct child accounts of a parent account.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param parentAccountId - The parent account ID
 * @returns Array of child accounts
 */
export async function getChildAccounts(
  prisma: PrismaClient,
  tenantId: string,
  parentAccountId: string,
): Promise<HierarchyAccount[]> {
  const children = await prisma.account.findMany({
    where: {
      tenant_id: tenantId,
      parent_account_id: parentAccountId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      account_type: true,
      health_score: true,
      is_active: true,
    },
    orderBy: { name: 'asc' },
  });

  return children;
}

/**
 * Set the parent account for a given account.
 * Validates that the assignment does not create a circular reference.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param accountId - The account to update
 * @param parentAccountId - The new parent account ID, or null to remove parent
 * @returns The updated account, or null if not found
 * @throws Error if circular reference is detected
 */
export async function setParentAccount(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  parentAccountId: string | null,
): Promise<Account | null> {
  // Verify the account exists
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      tenant_id: tenantId,
      deleted_at: null,
    },
  });

  if (!account) {
    return null;
  }

  // If setting a parent, validate it exists and check for circular references
  if (parentAccountId !== null) {
    // Cannot set self as parent
    if (parentAccountId === accountId) {
      throw new Error('An account cannot be its own parent');
    }

    // Verify parent exists in the same tenant
    const parentAccount = await prisma.account.findFirst({
      where: {
        id: parentAccountId,
        tenant_id: tenantId,
        deleted_at: null,
      },
    });

    if (!parentAccount) {
      throw new Error('Parent account not found');
    }

    // Check for circular reference: walk up from the proposed parent
    // to ensure we don't encounter the account being updated
    const isCircular = await detectCircularReference(prisma, tenantId, parentAccountId, accountId);
    if (isCircular) {
      throw new Error('Setting this parent would create a circular reference');
    }
  }

  const updated = await prisma.account.update({
    where: { id: accountId },
    data: { parent_account_id: parentAccountId },
  });

  logger.info(
    {
      operation: 'set-parent-account',
      tenantId,
      accountId,
      parentAccountId,
    },
    `Parent account set: ${accountId} -> ${parentAccountId ?? 'none'}`,
  );

  return updated;
}

/**
 * Build the parent chain by walking upward from a given parent account ID.
 * Returns an array from immediate parent to root (top-most ancestor).
 * Stops after 20 levels to prevent infinite loops from data corruption.
 */
async function buildParentChain(
  prisma: PrismaClient,
  tenantId: string,
  startParentId: string | null,
): Promise<HierarchyAccount[]> {
  const chain: HierarchyAccount[] = [];
  let currentParentId = startParentId;
  const visited = new Set<string>();
  const maxDepth = 20;

  while (currentParentId && chain.length < maxDepth) {
    // Prevent infinite loop from circular data
    if (visited.has(currentParentId)) {
      break;
    }
    visited.add(currentParentId);

    const parent = await prisma.account.findFirst({
      where: {
        id: currentParentId,
        tenant_id: tenantId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        account_type: true,
        health_score: true,
        is_active: true,
        parent_account_id: true,
      },
    });

    if (!parent) {
      break;
    }

    chain.push({
      id: parent.id,
      name: parent.name,
      account_type: parent.account_type,
      health_score: parent.health_score,
      is_active: parent.is_active,
    });

    currentParentId = parent.parent_account_id;
  }

  return chain;
}

/**
 * Detect whether setting parentAccountId as the parent of accountId
 * would create a circular reference.
 * Walks upward from parentAccountId; if we find accountId, it's circular.
 */
async function detectCircularReference(
  prisma: PrismaClient,
  tenantId: string,
  parentAccountId: string,
  accountId: string,
): Promise<boolean> {
  let currentId: string | null = parentAccountId;
  const visited = new Set<string>();
  const maxDepth = 20;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    if (currentId === accountId) {
      return true;
    }
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const account: { parent_account_id: string | null } | null = await prisma.account.findFirst({
      where: {
        id: currentId,
        tenant_id: tenantId,
        deleted_at: null,
      },
      select: { parent_account_id: true },
    });

    currentId = account?.parent_account_id ?? null;
    depth++;
  }

  return false;
}

/**
 * Calculate rollup metrics from a list of child accounts.
 */
function calculateRollupMetrics(children: HierarchyAccount[]): HierarchyRollupMetrics {
  const totalChildCount = children.length;

  const scoresWithValues = children
    .map((c) => c.health_score)
    .filter((s): s is number => s !== null);

  const averageHealthScore =
    scoresWithValues.length > 0
      ? Math.round(scoresWithValues.reduce((sum, s) => sum + s, 0) / scoresWithValues.length)
      : null;

  return { totalChildCount, averageHealthScore };
}
