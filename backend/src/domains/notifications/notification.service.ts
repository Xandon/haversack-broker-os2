import type { PrismaClient } from '@prisma/client';

export interface NotificationListParams {
  tenantId: string;
  userId: string;
  isRead?: boolean;
  page?: number;
  perPage?: number;
}

export interface NotificationListResult {
  data: Array<{
    id: string;
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    body: string | null;
    referenceId: string | null;
    referenceType: string | null;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    perPage: number;
    totalCount: number;
  };
  unreadCount: number;
}

export async function listNotifications(
  prisma: PrismaClient,
  params: NotificationListParams,
): Promise<NotificationListResult> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;
  const skip = (page - 1) * perPage;

  const where = {
    tenantId: params.tenantId,
    userId: params.userId,
    ...(params.isRead !== undefined ? { isRead: params.isRead } : {}),
  };

  const [data, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        isRead: false,
      },
    }),
  ]);

  return {
    data,
    pagination: { page, perPage, totalCount },
    unreadCount,
  };
}

export async function markNotificationRead(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  notificationId: string,
): Promise<{ id: string; isRead: boolean; readAt: Date }> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, tenantId, userId },
  });

  if (!notification) {
    throw new NotificationError('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });

  return { id: updated.id, isRead: updated.isRead, readAt: updated.readAt! };
}

export async function markAllRead(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<{ markedCount: number }> {
  const result = await prisma.notification.updateMany({
    where: { tenantId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return { markedCount: result.count };
}

export class NotificationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
  }
}
