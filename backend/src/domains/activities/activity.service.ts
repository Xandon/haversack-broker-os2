/**
 * Activity domain service.
 * Provides create, list, and get operations for activities with tenant isolation,
 * audit trail integration, and pagination.
 */
import type { PrismaClient, Activity, Prisma } from '@prisma/client';

import type { CreateActivityInput } from '@haversack/shared';
import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
import { logger } from '../../shared/utils/logger.js';

/** Options for listing activities */
export interface ActivityListOptions {
  activityType?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated result wrapper for activities */
export interface PaginatedActivityResult {
  items: Activity[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Create a new activity.
 * Writes an audit trail entry on creation (fire-and-forget).
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param input - Validated activity creation input
 * @param userId - ID of the user performing the action
 * @returns The created activity
 */
export async function createActivity(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateActivityInput,
  userId: string,
): Promise<Activity> {
  const activity = await prisma.activity.create({
    data: {
      tenant_id: tenantId,
      account_id: input.account_id,
      user_id: userId,
      contact_id: input.contact_id ?? null,
      activity_type: input.activity_type as Activity['activity_type'],
      subject: input.subject ?? null,
      notes: input.notes ?? null,
      occurred_at: input.occurred_at ? new Date(input.occurred_at) : new Date(),
      duration_minutes: input.duration_minutes ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  // Write audit trail entry (fire-and-forget)
  void createAuditEntry(prisma, {
    tenantId,
    actorId: userId,
    actorEmail: '', // Not available in service layer; route layer can enrich if needed
    entityType: 'Account',
    entityId: input.account_id,
    action: 'update',
    newValue: JSON.stringify({
      activity_id: activity.id,
      activity_type: activity.activity_type,
      subject: activity.subject,
    }),
  });

  logger.info(
    {
      operation: 'create-activity',
      tenantId,
      activityId: activity.id,
      accountId: input.account_id,
      activityType: input.activity_type,
      userId,
    },
    `Activity created: ${input.activity_type} for account ${input.account_id}`,
  );

  return activity;
}

/**
 * List activities for an account with pagination and optional type filter.
 * Returns results in reverse chronological order.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param accountId - The account ID to fetch activities for
 * @param options - Pagination and filter options
 * @returns Paginated activity results
 */
export async function listActivities(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  options: ActivityListOptions = {},
): Promise<PaginatedActivityResult> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    account_id: accountId,
  };

  if (options.activityType) {
    where['activity_type'] = options.activityType;
  }

  const [items, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { occurred_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.activity.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Get a single activity by ID with account information.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param activityId - The activity ID to fetch
 * @returns The activity with account info, or null if not found
 */
export async function getActivityById(
  prisma: PrismaClient,
  tenantId: string,
  activityId: string,
): Promise<(Activity & { account: { id: string; name: string } }) | null> {
  return prisma.activity.findFirst({
    where: {
      id: activityId,
      tenant_id: tenantId,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}
