import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTaskReminder, buildEmailPayload } from './task-reminder.job';
import type { TaskReminderJobData } from '../queues/task-reminder.queue';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const TASK_ID = '00000000-0000-4000-a000-000000000040';
const ASSIGNEE_ID = '00000000-0000-4000-a000-000000000020';
const NOTIFICATION_ID = '00000000-0000-4000-a000-000000000060';

function createMockPrisma(): Record<string, unknown> {
  return {
    task: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
    taskReminder: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
}

const sampleJobData: TaskReminderJobData = {
  taskId: TASK_ID,
  tenantId: TENANT_ID,
  reminderType: '24h',
  taskTitle: 'Follow up with buyer',
  assigneeId: ASSIGNEE_ID,
  dueDate: '2026-03-01T10:00:00.000Z',
};

describe('FR-009: Task Reminder Job', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  describe('processTaskReminder', () => {
    it('AC-009a: creates notification and marks reminder sent for active task', async () => {
      (prisma.task as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: TASK_ID,
        status: 'pending',
        tenantId: TENANT_ID,
        deletedAt: null,
      });
      (prisma.user as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: ASSIGNEE_ID,
        isActive: true,
        email: 'rep@haversack.test',
        firstName: 'Test',
        lastName: 'Rep',
      });
      (prisma.notification as Record<string, ReturnType<typeof vi.fn>>).create.mockResolvedValue({
        id: NOTIFICATION_ID,
      });
      (prisma.taskReminder as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        { id: 'r1', taskId: TASK_ID, type: '24h', sentAt: null },
      ]);
      (prisma.taskReminder as Record<string, ReturnType<typeof vi.fn>>).update.mockResolvedValue({});

      const result = await processTaskReminder(prisma as never, sampleJobData);

      expect(result.status).toBe('sent');
      expect(result.notificationId).toBe(NOTIFICATION_ID);
      expect((prisma.notification as Record<string, ReturnType<typeof vi.fn>>).create).toHaveBeenCalledTimes(1);
      expect((prisma.taskReminder as Record<string, ReturnType<typeof vi.fn>>).update).toHaveBeenCalledTimes(1);
    });

    it('skips when task is not found', async () => {
      (prisma.task as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue(null);

      const result = await processTaskReminder(prisma as never, sampleJobData);

      expect(result.status).toBe('skipped');
      expect(result.reason).toContain('not found');
    });

    it('skips when task is completed', async () => {
      (prisma.task as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: TASK_ID,
        status: 'completed',
        tenantId: TENANT_ID,
        deletedAt: null,
      });

      const result = await processTaskReminder(prisma as never, sampleJobData);

      expect(result.status).toBe('skipped');
      expect(result.reason).toContain('completed');
    });

    it('skips when task is cancelled', async () => {
      (prisma.task as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: TASK_ID,
        status: 'cancelled',
        tenantId: TENANT_ID,
        deletedAt: null,
      });

      const result = await processTaskReminder(prisma as never, sampleJobData);

      expect(result.status).toBe('skipped');
      expect(result.reason).toContain('cancelled');
    });

    it('skips when assignee is inactive', async () => {
      (prisma.task as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: TASK_ID,
        status: 'pending',
        tenantId: TENANT_ID,
        deletedAt: null,
      });
      (prisma.user as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: ASSIGNEE_ID,
        isActive: false,
      });

      const result = await processTaskReminder(prisma as never, sampleJobData);

      expect(result.status).toBe('skipped');
      expect(result.reason).toContain('inactive');
    });

    it('notification message includes task title and reminder type', async () => {
      (prisma.task as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: TASK_ID,
        status: 'in_progress',
        tenantId: TENANT_ID,
        deletedAt: null,
      });
      (prisma.user as Record<string, ReturnType<typeof vi.fn>>).findFirst.mockResolvedValue({
        id: ASSIGNEE_ID,
        isActive: true,
      });
      (prisma.notification as Record<string, ReturnType<typeof vi.fn>>).create.mockResolvedValue({
        id: NOTIFICATION_ID,
      });
      (prisma.taskReminder as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);

      await processTaskReminder(prisma as never, sampleJobData);

      const createCall = (prisma.notification as Record<string, ReturnType<typeof vi.fn>>).create.mock.calls[0]![0];
      expect(createCall.data.title).toContain('24 hours');
      expect(createCall.data.message).toContain('Follow up with buyer');
    });
  });

  describe('buildEmailPayload', () => {
    it('builds correct email subject and body for 24h reminder', () => {
      const payload = buildEmailPayload(sampleJobData, 'rep@haversack.test', 'Test Rep');

      expect(payload.subject).toContain('Follow up with buyer');
      expect(payload.subject).toContain('24 hours');
      expect(payload.body).toContain('Test Rep');
      expect(payload.body).toContain('Follow up with buyer');
    });

    it('builds correct email for 1h reminder', () => {
      const data = { ...sampleJobData, reminderType: '1h' as const };
      const payload = buildEmailPayload(data, 'rep@haversack.test', 'Test Rep');

      expect(payload.subject).toContain('1 hour');
      expect(payload.body).toContain('1 hour');
    });
  });
});
