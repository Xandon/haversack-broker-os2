import type { PrismaClient, Prisma } from '@prisma/client';
import { ActivityError } from './activity.service';

interface TimelineItem {
  id: string;
  type: 'activity' | 'email' | 'task';
  occurredAt: string;
  data: Record<string, unknown>;
}

interface TimelineResult {
  data: TimelineItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
  counts: {
    activity: number;
    email: number;
    task: number;
  };
}

interface TimelineOptions {
  types?: string;
  activityType?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}

function parseCursor(cursor: string): { timestamp: string; type: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const [timestamp, type, id] = decoded.split('|');
    if (timestamp && type && id) {
      return { timestamp, type, id };
    }
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(timestamp: string, type: string, id: string): string {
  return Buffer.from(`${timestamp}|${type}|${id}`).toString('base64');
}

export async function getTimeline(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  options: TimelineOptions,
): Promise<TimelineResult> {
  const limit = options.limit ?? 20;

  // Verify account exists
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!account) {
    throw new ActivityError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  // Determine which sources to query
  const sourceTypes = options.types
    ? options.types.split(',').map((t) => t.trim())
    : ['activity', 'email', 'task'];

  const includeActivities = sourceTypes.includes('activity');
  const includeEmails = sourceTypes.includes('email');
  const includeTasks = sourceTypes.includes('task');

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (options.startDate) dateFilter.gte = new Date(options.startDate);
  if (options.endDate) dateFilter.lte = new Date(options.endDate);
  const hasDateFilter = options.startDate || options.endDate;

  // Parse cursor for pagination
  const cursorInfo = options.cursor ? parseCursor(options.cursor) : null;

  // Query each source in parallel — fetch limit+1 for hasMore
  const fetchLimit = limit + 1;

  const activityPromise = includeActivities
    ? (async (): Promise<{ items: TimelineItem[]; count: number }> => {
        const where: Prisma.ActivityWhereInput = {
          tenantId,
          accountId,
          deletedAt: null,
        };
        if (options.activityType) {
          where.type = options.activityType as Prisma.EnumActivityTypeFilter;
        }
        if (hasDateFilter) where.occurredAt = dateFilter;
        if (cursorInfo) {
          where.occurredAt = {
            ...dateFilter,
            lte: new Date(cursorInfo.timestamp),
          };
        }

        const [items, count] = await Promise.all([
          prisma.activity.findMany({
            where,
            orderBy: { occurredAt: 'desc' },
            take: fetchLimit,
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
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          prisma.activity.count({
            where: {
              tenantId,
              accountId,
              deletedAt: null,
              ...(options.activityType ? { type: options.activityType as Prisma.EnumActivityTypeFilter } : {}),
              ...(hasDateFilter ? { occurredAt: dateFilter } : {}),
            },
          }),
        ]);

        return {
          items: items.map((a) => ({
            id: a.id,
            type: 'activity' as const,
            occurredAt: a.occurredAt.toISOString(),
            data: {
              id: a.id,
              type: a.type,
              notes: a.notes,
              durationMinutes: a.durationMinutes,
              user: (a as Record<string, unknown>).user,
              demos: (a as Record<string, unknown>).demos,
            },
          })),
          count,
        };
      })()
    : Promise.resolve({ items: [], count: 0 });

  const emailPromise = includeEmails
    ? (async (): Promise<{ items: TimelineItem[]; count: number }> => {
        const where: Prisma.EmailRecordWhereInput = {
          tenantId,
          accountId,
        };
        if (hasDateFilter) where.sentAt = dateFilter;
        if (cursorInfo) {
          where.sentAt = {
            ...dateFilter,
            lte: new Date(cursorInfo.timestamp),
          };
        }

        const [items, count] = await Promise.all([
          prisma.emailRecord.findMany({
            where,
            orderBy: { sentAt: 'desc' },
            take: fetchLimit,
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          prisma.emailRecord.count({
            where: {
              tenantId,
              accountId,
              ...(hasDateFilter ? { sentAt: dateFilter } : {}),
            },
          }),
        ]);

        return {
          items: items.map((e) => ({
            id: e.id,
            type: 'email' as const,
            occurredAt: e.sentAt.toISOString(),
            data: {
              id: e.id,
              subject: e.subject,
              direction: e.direction,
              status: e.status,
              recipientEmail: e.recipientEmail,
              user: (e as Record<string, unknown>).user,
            },
          })),
          count,
        };
      })()
    : Promise.resolve({ items: [], count: 0 });

  const taskPromise = includeTasks
    ? (async (): Promise<{ items: TimelineItem[]; count: number }> => {
        const where: Prisma.TaskWhereInput = {
          tenantId,
          accountId,
          deletedAt: null,
        };
        if (hasDateFilter) where.createdAt = dateFilter;
        if (cursorInfo) {
          where.createdAt = {
            ...dateFilter,
            lte: new Date(cursorInfo.timestamp),
          };
        }

        const [items, count] = await Promise.all([
          prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: fetchLimit,
            include: {
              assignee: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          }),
          prisma.task.count({
            where: {
              tenantId,
              accountId,
              deletedAt: null,
              ...(hasDateFilter ? { createdAt: dateFilter } : {}),
            },
          }),
        ]);

        return {
          items: items.map((t) => ({
            id: t.id,
            type: 'task' as const,
            occurredAt: t.createdAt.toISOString(),
            data: {
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              assignee: (t as Record<string, unknown>).assignee,
            },
          })),
          count,
        };
      })()
    : Promise.resolve({ items: [], count: 0 });

  const [activityResult, emailResult, taskResult] = await Promise.all([
    activityPromise,
    emailPromise,
    taskPromise,
  ]);

  // Merge all items by occurredAt descending
  const allItems = [
    ...activityResult.items,
    ...emailResult.items,
    ...taskResult.items,
  ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  // Apply limit to merged result
  const hasMore = allItems.length > limit;
  const data = hasMore ? allItems.slice(0, limit) : allItems;
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem
    ? encodeCursor(lastItem.occurredAt, lastItem.type, lastItem.id)
    : null;

  const totalCount = activityResult.count + emailResult.count + taskResult.count;

  return {
    data,
    pagination: {
      cursor: nextCursor,
      hasMore,
      total: totalCount,
    },
    counts: {
      activity: activityResult.count,
      email: emailResult.count,
      task: taskResult.count,
    },
  };
}
