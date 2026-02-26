import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

import {
  createTask,
  getTaskById,
  updateTask,
  softDeleteTask,
  listTasks,
} from './task.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const CREATOR_ID = '00000000-0000-4000-a000-000000000010';
const ASSIGNEE_ID = '00000000-0000-4000-a000-000000000020';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000030';
const TASK_ID = '00000000-0000-4000-a000-000000000040';

const auditCtx = {
  actorId: CREATOR_ID,
  actorEmail: 'rep@haversack.test',
};

function createMockPrisma(): Record<string, unknown> {
  return {
    user: { findFirst: vi.fn() },
    account: { findFirst: vi.fn() },
    contact: { findFirst: vi.fn() },
    task: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
}

function mockTaskRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TASK_ID,
    tenantId: TENANT_ID,
    title: 'Follow up with buyer',
    description: 'Discuss Q2 order',
    dueDate: new Date('2026-03-01T10:00:00Z'),
    priority: 'medium',
    status: 'pending',
    assigneeId: ASSIGNEE_ID,
    creatorId: CREATOR_ID,
    accountId: ACCOUNT_ID,
    contactId: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('FR-009: Task Service', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  describe('createTask', () => {
    it('creates task with valid data', async () => {
      const user = (mockPrisma.user as Record<string, ReturnType<typeof vi.fn>>);
      user.findFirst.mockResolvedValue({ id: ASSIGNEE_ID, isActive: true });
      const account = (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>);
      account.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.create.mockResolvedValue(mockTaskRecord());

      const result = await createTask(mockPrisma as never, TENANT_ID, CREATOR_ID, {
        title: 'Follow up with buyer',
        description: 'Discuss Q2 order',
        dueDate: '2026-03-01T10:00:00.000Z',
        priority: 'medium',
        assigneeId: ASSIGNEE_ID,
        accountId: ACCOUNT_ID,
      }, auditCtx);

      expect(result.id).toBe(TASK_ID);
      expect(task.create).toHaveBeenCalledTimes(1);
    });

    it('throws for inactive assignee', async () => {
      const user = (mockPrisma.user as Record<string, ReturnType<typeof vi.fn>>);
      user.findFirst.mockResolvedValue({ id: ASSIGNEE_ID, isActive: false });

      await expect(
        createTask(mockPrisma as never, TENANT_ID, CREATOR_ID, {
          title: 'Test',
          dueDate: '2026-03-01T10:00:00.000Z',
          priority: 'medium',
          assigneeId: ASSIGNEE_ID,
        }, auditCtx),
      ).rejects.toThrow('Cannot assign task to inactive user');
    });

    it('throws for non-existent assignee', async () => {
      const user = (mockPrisma.user as Record<string, ReturnType<typeof vi.fn>>);
      user.findFirst.mockResolvedValue(null);

      await expect(
        createTask(mockPrisma as never, TENANT_ID, CREATOR_ID, {
          title: 'Test',
          dueDate: '2026-03-01T10:00:00.000Z',
          priority: 'medium',
          assigneeId: ASSIGNEE_ID,
        }, auditCtx),
      ).rejects.toThrow('Cannot assign task to inactive user');
    });

    it('throws for non-existent account', async () => {
      const user = (mockPrisma.user as Record<string, ReturnType<typeof vi.fn>>);
      user.findFirst.mockResolvedValue({ id: ASSIGNEE_ID, isActive: true });
      const account = (mockPrisma.account as Record<string, ReturnType<typeof vi.fn>>);
      account.findFirst.mockResolvedValue(null);

      await expect(
        createTask(mockPrisma as never, TENANT_ID, CREATOR_ID, {
          title: 'Test',
          dueDate: '2026-03-01T10:00:00.000Z',
          priority: 'medium',
          assigneeId: ASSIGNEE_ID,
          accountId: ACCOUNT_ID,
        }, auditCtx),
      ).rejects.toThrow('Account not found');
    });
  });

  describe('getTaskById', () => {
    it('returns task with computed isOverdue', async () => {
      const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(mockTaskRecord({ dueDate: pastDue, status: 'pending' }));

      const result = await getTaskById(mockPrisma as never, TENANT_ID, TASK_ID);

      expect(result.id).toBe(TASK_ID);
      expect(result.isOverdue).toBe(true);
    });

    it('isOverdue is false for completed tasks even if past due', async () => {
      const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(mockTaskRecord({ dueDate: pastDue, status: 'completed' }));

      const result = await getTaskById(mockPrisma as never, TENANT_ID, TASK_ID);

      expect(result.isOverdue).toBe(false);
    });

    it('throws for non-existent task', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(null);

      await expect(
        getTaskById(mockPrisma as never, TENANT_ID, TASK_ID),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('updateTask', () => {
    it('updates task fields', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(mockTaskRecord());
      task.update.mockResolvedValue(mockTaskRecord({ title: 'Updated', status: 'in_progress' }));

      const result = await updateTask(mockPrisma as never, TENANT_ID, TASK_ID, {
        title: 'Updated',
        status: 'in_progress',
      }, auditCtx);

      expect(result.title).toBe('Updated');
    });

    it('sets completedAt when status changes to completed', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(mockTaskRecord({ status: 'in_progress' }));
      task.update.mockResolvedValue(mockTaskRecord({ status: 'completed', completedAt: new Date() }));

      await updateTask(mockPrisma as never, TENANT_ID, TASK_ID, {
        status: 'completed',
      }, auditCtx);

      const updateCall = task.update.mock.calls[0]![0];
      expect(updateCall.data.completedAt).toBeDefined();
    });

    it('throws for non-existent task', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(null);

      await expect(
        updateTask(mockPrisma as never, TENANT_ID, TASK_ID, { title: 'X' }, auditCtx),
      ).rejects.toThrow('Task not found');
    });

    it('rejects invalid status transition from completed to pending', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(mockTaskRecord({ status: 'completed' }));

      await expect(
        updateTask(mockPrisma as never, TENANT_ID, TASK_ID, { status: 'pending' }, auditCtx),
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('softDeleteTask', () => {
    it('soft-deletes task', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(mockTaskRecord());
      task.update.mockResolvedValue({ ...mockTaskRecord(), deletedAt: new Date() });

      const result = await softDeleteTask(mockPrisma as never, TENANT_ID, TASK_ID, auditCtx);

      expect(result.id).toBe(TASK_ID);
      expect(result.deletedAt).toBeDefined();
    });

    it('throws for non-existent task', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findFirst.mockResolvedValue(null);

      await expect(
        softDeleteTask(mockPrisma as never, TENANT_ID, TASK_ID, auditCtx),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('listTasks', () => {
    it('returns paginated tasks', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findMany.mockResolvedValue([mockTaskRecord()]);
      task.count.mockResolvedValue(1);

      const result = await listTasks(mockPrisma as never, TENANT_ID, {});

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('filters by assignee', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findMany.mockResolvedValue([]);
      task.count.mockResolvedValue(0);

      await listTasks(mockPrisma as never, TENANT_ID, { assigneeId: ASSIGNEE_ID });

      const whereArg = task.findMany.mock.calls[0]![0].where;
      expect(whereArg.assigneeId).toBe(ASSIGNEE_ID);
    });

    it('filters by overdue status', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findMany.mockResolvedValue([]);
      task.count.mockResolvedValue(0);

      await listTasks(mockPrisma as never, TENANT_ID, { overdue: 'true' });

      const whereArg = task.findMany.mock.calls[0]![0].where;
      expect(whereArg.dueDate).toBeDefined();
      expect(whereArg.status).toEqual({ not: 'completed' });
    });

    it('filters by status and priority', async () => {
      const task = (mockPrisma.task as Record<string, ReturnType<typeof vi.fn>>);
      task.findMany.mockResolvedValue([]);
      task.count.mockResolvedValue(0);

      await listTasks(mockPrisma as never, TENANT_ID, { status: 'pending', priority: 'high' });

      const whereArg = task.findMany.mock.calls[0]![0].where;
      expect(whereArg.status).toBe('pending');
      expect(whereArg.priority).toBe('high');
    });
  });
});
