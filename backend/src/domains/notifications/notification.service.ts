import { NotificationType, PrismaClient } from '@prisma/client';

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
}

export interface NotificationListResult {
  data: {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    linkUrl: string | null;
    isRead: boolean;
    readAt: Date | null;
    metadata: unknown;
    createdAt: Date;
  }[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

export function createNotificationService(prisma: PrismaClient) {
  return {
    async list(
      tenantId: string,
      userId: string,
      page: number = 1,
      limit: number = 20,
      filters: NotificationFilters = {},
    ): Promise<NotificationListResult> {
      const where: Record<string, unknown> = {
        tenantId,
        userId,
      };

      if (filters.isRead !== undefined) {
        where.isRead = filters.isRead;
      }
      if (filters.type) {
        where.type = filters.type;
      }

      const [data, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            linkUrl: true,
            isRead: true,
            readAt: true,
            metadata: true,
            createdAt: true,
          },
        }),
        prisma.notification.count({ where }),
      ]);

      return { data, total, page, limit };
    },

    async getUnreadCount(tenantId: string, userId: string): Promise<number> {
      return prisma.notification.count({
        where: { tenantId, userId, isRead: false },
      });
    },

    async markRead(
      tenantId: string,
      userId: string,
      notificationId: string,
    ): Promise<{ id: string; isRead: boolean; readAt: Date | null }> {
      return prisma.notification.update({
        where: { id: notificationId, tenantId, userId },
        data: { isRead: true, readAt: new Date() },
        select: { id: true, isRead: true, readAt: true },
      });
    },

    async markAllRead(tenantId: string, userId: string): Promise<{ count: number }> {
      const result = await prisma.notification.updateMany({
        where: { tenantId, userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return { count: result.count };
    },

    async create(input: CreateNotificationInput) {
      return prisma.notification.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          linkUrl: input.linkUrl ?? null,
          metadata: input.metadata ?? {},
        },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          linkUrl: true,
          isRead: true,
          createdAt: true,
        },
      });
    },
  };
}
