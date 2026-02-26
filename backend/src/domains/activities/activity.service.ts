import type { PrismaClient, Activity, Prisma } from '@prisma/client';
import type { CreateActivityInput, UpdateActivityInput } from '@haversack/shared';
import {
  writeAuditLog,
  detectChanges,
  writeUpdateAuditLogs,
} from '../../shared/services/audit.service';

const EDIT_WINDOW_MINUTES = 15;

export class ActivityError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ActivityError';
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

export interface ActivityWithDemos extends Activity {
  demos: Array<{
    id: string;
    productId: string;
    quantitySampled: number | null;
    buyerFeedback: string | null;
    outcome: string | null;
  }>;
}

export async function createActivity(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  data: CreateActivityInput,
  audit: AuditContext,
): Promise<ActivityWithDemos> {
  // Verify account exists and belongs to tenant
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, tenantId, deletedAt: null },
  });

  if (!account) {
    throw new ActivityError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  // Validate occurredAt is not more than 24h in the future
  const occurredAt = new Date(data.occurredAt);
  const maxFutureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (occurredAt > maxFutureDate) {
    throw new ActivityError(
      'Activity date cannot be more than 24 hours in the future',
      'VALIDATION_ERROR',
    );
  }

  const activity = await prisma.activity.create({
    data: {
      tenantId,
      accountId: data.accountId,
      userId,
      type: data.type,
      notes: data.notes ?? null,
      occurredAt,
      durationMinutes: data.durationMinutes ?? null,
      demos:
        data.demos && data.demos.length > 0
          ? {
              create: data.demos.map((demo) => ({
                tenantId,
                productId: demo.productId,
                quantitySampled: demo.quantitySampled ?? null,
                buyerFeedback: demo.buyerFeedback ?? null,
                outcome: demo.outcome ?? null,
              })),
            }
          : undefined,
    },
    include: {
      demos: {
        select: {
          id: true,
          productId: true,
          quantitySampled: true,
          buyerFeedback: true,
          outcome: true,
        },
      },
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Activity',
    entityId: activity.id,
    action: 'create',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return activity as ActivityWithDemos;
}

export async function getActivityById(
  prisma: PrismaClient,
  tenantId: string,
  activityId: string,
): Promise<ActivityWithDemos> {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, tenantId, deletedAt: null },
    include: {
      demos: {
        select: {
          id: true,
          productId: true,
          quantitySampled: true,
          buyerFeedback: true,
          outcome: true,
        },
      },
    },
  });

  if (!activity) {
    throw new ActivityError('Activity not found', 'ACTIVITY_NOT_FOUND');
  }

  return activity as ActivityWithDemos;
}

export async function updateActivity(
  prisma: PrismaClient,
  tenantId: string,
  activityId: string,
  data: UpdateActivityInput,
  callerUserId: string,
  callerRole: string,
  expectedVersion: number | undefined,
  audit: AuditContext,
): Promise<ActivityWithDemos> {
  const existing = await prisma.activity.findFirst({
    where: { id: activityId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ActivityError('Activity not found', 'ACTIVITY_NOT_FOUND');
  }

  // Edit window check: creator can edit within 15 minutes, managers/admins always
  const isCreator = existing.userId === callerUserId;
  const isManagerOrAdmin = callerRole === 'manager' || callerRole === 'admin';
  const editWindowExpired =
    Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MINUTES * 60 * 1000;

  if (!isManagerOrAdmin && (!isCreator || editWindowExpired)) {
    throw new ActivityError(
      'Edit window expired. Only managers or admins can edit after 15 minutes.',
      'ACTIVITY_EDIT_WINDOW_EXPIRED',
    );
  }

  // Optimistic concurrency check
  if (expectedVersion !== undefined && existing.version !== expectedVersion) {
    throw new ActivityError(
      'Activity has been modified by another user',
      'ACTIVITY_CONFLICT',
    );
  }

  const updateData: Prisma.ActivityUpdateInput = {
    version: { increment: 1 },
  };
  if (data.accountId !== undefined) {
    updateData.account = { connect: { id: data.accountId } };
  }
  if (data.type !== undefined) updateData.type = data.type;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.occurredAt !== undefined) updateData.occurredAt = new Date(data.occurredAt);
  if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;

  // Handle demo updates: replace all demos if provided
  if (data.demos !== undefined) {
    // Delete existing demos and create new ones
    await prisma.demo.deleteMany({ where: { activityId } });
    if (data.demos.length > 0) {
      updateData.demos = {
        create: data.demos.map((demo) => ({
          tenantId,
          productId: demo.productId,
          quantitySampled: demo.quantitySampled ?? null,
          buyerFeedback: demo.buyerFeedback ?? null,
          outcome: demo.outcome ?? null,
        })),
      };
    }
  }

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: updateData,
    include: {
      demos: {
        select: {
          id: true,
          productId: true,
          quantitySampled: true,
          buyerFeedback: true,
          outcome: true,
        },
      },
    },
  });

  // Audit trail
  const oldData: Record<string, unknown> = {
    type: existing.type,
    notes: existing.notes,
    occurredAt: existing.occurredAt.toISOString(),
    durationMinutes: existing.durationMinutes,
    accountId: existing.accountId,
  };
  const newData: Record<string, unknown> = {
    type: updated.type,
    notes: updated.notes,
    occurredAt: updated.occurredAt.toISOString(),
    durationMinutes: updated.durationMinutes,
    accountId: updated.accountId,
  };

  const changes = detectChanges(oldData, newData);
  if (changes.length > 0) {
    await writeUpdateAuditLogs(
      {
        prisma,
        tenantId,
        actorId: audit.actorId,
        actorEmail: audit.actorEmail,
        entityType: 'Activity',
        entityId: activityId,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        requestId: audit.requestId,
      },
      changes,
    );
  }

  return updated as ActivityWithDemos;
}

export async function softDeleteActivity(
  prisma: PrismaClient,
  tenantId: string,
  activityId: string,
  audit: AuditContext,
): Promise<{ id: string; deletedAt: Date }> {
  const existing = await prisma.activity.findFirst({
    where: { id: activityId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new ActivityError('Activity not found', 'ACTIVITY_NOT_FOUND');
  }

  const deletedAt = new Date();

  await prisma.activity.update({
    where: { id: activityId },
    data: { deletedAt },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Activity',
    entityId: activityId,
    action: 'delete',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { id: activityId, deletedAt };
}

export async function listActivities(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  options: {
    type?: string;
    startDate?: string;
    endDate?: string;
    cursor?: string;
    limit?: number;
  },
): Promise<{
  data: ActivityWithDemos[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}> {
  const limit = options.limit ?? 20;

  // Verify account exists
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!account) {
    throw new ActivityError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  const where: Prisma.ActivityWhereInput = {
    tenantId,
    accountId,
    deletedAt: null,
  };

  if (options.type) {
    where.type = options.type as Prisma.EnumActivityTypeFilter;
  }
  if (options.startDate || options.endDate) {
    where.occurredAt = {};
    if (options.startDate) {
      where.occurredAt.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      where.occurredAt.lte = new Date(options.endDate);
    }
  }

  const cursorObj = options.cursor ? { id: options.cursor } : undefined;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit + 1,
      ...(cursorObj ? { cursor: cursorObj, skip: 1 } : {}),
      include: {
        demos: {
          select: {
            id: true,
            productId: true,
            quantitySampled: true,
            buyerFeedback: true,
            outcome: true,
          },
        },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  const hasMore = activities.length > limit;
  const data = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data: data as ActivityWithDemos[],
    pagination: { cursor: nextCursor, hasMore, total },
  };
}
