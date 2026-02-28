import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createNotificationService } from './notification.service';

function makePrisma() {
  return {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as Parameters<typeof createNotificationService>[0];
}

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER = 'bbbbbbbb-0000-0000-0000-000000000001';

describe('NotificationService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ReturnType<typeof createNotificationService>;

  beforeEach(() => {
    prisma = makePrisma();
    service = createNotificationService(prisma);
  });

  describe('list', () => {
    it('FR-009: returns paginated notifications for a user', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: 'task_reminder',
          title: 'Task due soon',
          body: 'Follow up call is due in 1 hour',
          linkUrl: '/tasks/1',
          isRead: false,
          readAt: null,
          metadata: {},
          createdAt: new Date(),
        },
      ];
      (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockNotifications,
      );
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await service.list(TENANT, USER, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, userId: USER },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('FR-009: filters by isRead status', async () => {
      (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.list(TENANT, USER, 1, 20, { isRead: false });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, userId: USER, isRead: false },
        }),
      );
    });

    it('FR-009: filters by notification type', async () => {
      (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.list(TENANT, USER, 1, 20, { type: 'order_approval' });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, userId: USER, type: 'order_approval' },
        }),
      );
    });

    it('FR-009: applies pagination offset correctly', async () => {
      (prisma.notification.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(50);

      const result = await service.list(TENANT, USER, 3, 10);

      expect(result.page).toBe(3);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('FR-009: returns count of unread notifications', async () => {
      (prisma.notification.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const count = await service.getUnreadCount(TENANT, USER);

      expect(count).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT, userId: USER, isRead: false },
      });
    });
  });

  describe('markRead', () => {
    it('FR-009: marks a single notification as read', async () => {
      const notifId = 'cccccccc-0000-0000-0000-000000000001';
      const now = new Date();
      (prisma.notification.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: notifId,
        isRead: true,
        readAt: now,
      });

      const result = await service.markRead(TENANT, USER, notifId);

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBe(now);
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: notifId, tenantId: TENANT, userId: USER },
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });

  describe('markAllRead', () => {
    it('FR-009: marks all unread notifications as read', async () => {
      (prisma.notification.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

      const result = await service.markAllRead(TENANT, USER);

      expect(result.count).toBe(3);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, userId: USER, isRead: false },
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
  });

  describe('create', () => {
    it('FR-013: creates a notification with required fields', async () => {
      const created = {
        id: 'new-id',
        type: 'order_approval',
        title: 'Order requires approval',
        body: 'Order #123 totaling $6,200 needs your approval',
        linkUrl: '/orders/123',
        isRead: false,
        createdAt: new Date(),
      };
      (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await service.create({
        tenantId: TENANT,
        userId: USER,
        type: 'order_approval',
        title: 'Order requires approval',
        body: 'Order #123 totaling $6,200 needs your approval',
        linkUrl: '/orders/123',
      });

      expect(result.type).toBe('order_approval');
      expect(result.title).toBe('Order requires approval');
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            userId: USER,
            type: 'order_approval',
            title: 'Order requires approval',
          }),
        }),
      );
    });

    it('FR-009: creates a notification with defaults for optional fields', async () => {
      const created = {
        id: 'new-id',
        type: 'system',
        title: 'System update',
        body: null,
        linkUrl: null,
        isRead: false,
        createdAt: new Date(),
      };
      (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await service.create({
        tenantId: TENANT,
        userId: USER,
        type: 'system',
        title: 'System update',
      });

      expect(result.body).toBeNull();
      expect(result.linkUrl).toBeNull();
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: null,
            linkUrl: null,
            metadata: {},
          }),
        }),
      );
    });

    it('FR-009: creates a notification with custom metadata', async () => {
      const meta = { orderId: '123', amount: 6200 };
      (prisma.notification.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'new-id',
        type: 'order_approval',
        title: 'Approval needed',
        body: null,
        linkUrl: null,
        isRead: false,
        createdAt: new Date(),
      });

      await service.create({
        tenantId: TENANT,
        userId: USER,
        type: 'order_approval',
        title: 'Approval needed',
        metadata: meta,
      });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ metadata: meta }),
        }),
      );
    });
  });
});
