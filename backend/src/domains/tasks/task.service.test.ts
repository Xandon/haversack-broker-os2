/**
 * Task (CrmTask) service unit tests.
 * T080: Validates task CRUD, completion, overdue filtering,
 * reminder flags, and audit trail integration with mocked Prisma calls.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  createTask,
  updateTask,
  listTasks,
  getTaskById,
  completeTask,
} from './task.service.js';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    crmTask: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    auditTrail: {
      create: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_ASSIGNED_TO_ID = '770e8400-e29b-41d4-a716-446655440000';
const TEST_ACCOUNT_ID = '880e8400-e29b-41d4-a716-446655440000';
const TEST_TASK_ID = '990e8400-e29b-41d4-a716-446655440000';

const NOW = new Date('2026-02-25T12:00:00.000Z');
const TOMORROW = new Date('2026-02-26T12:00:00.000Z');

describe('Task Service', () => {
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockPrisma.auditTrail.create.mockResolvedValue({});
  });

  // ---------------------------------------------------------------------------
  // createTask Tests
  // ---------------------------------------------------------------------------

  describe('createTask', () => {
    test('FR-012: creates task with required fields', async () => {
      const createdTask = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Follow up with buyer',
        description: null,
        due_date: TOMORROW,
        priority: 'medium',
        status: 'pending',
        assigned_to_id: TEST_ASSIGNED_TO_ID,
        created_by_id: TEST_USER_ID,
        account_id: null,
        contact_id: null,
        reminder_24h_sent: false,
        reminder_1h_sent: false,
        completed_at: null,
        created_at: NOW,
        updated_at: NOW,
      };

      mockPrisma.crmTask.create.mockResolvedValue(createdTask);

      const result = await createTask(
        mockPrisma as unknown as Parameters<typeof createTask>[0],
        TEST_TENANT_ID,
        {
          title: 'Follow up with buyer',
          due_date: TOMORROW.toISOString(),
          assigned_to_id: TEST_ASSIGNED_TO_ID,
        },
        TEST_USER_ID,
      );

      expect(result).toEqual(createdTask);
      expect(result.title).toBe('Follow up with buyer');
      expect(result.status).toBe('pending');
      expect(mockPrisma.crmTask.create).toHaveBeenCalledOnce();
    });

    test('FR-012: includes tenant_id in create data', async () => {
      mockPrisma.crmTask.create.mockResolvedValue({
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Test task',
        assigned_to_id: TEST_ASSIGNED_TO_ID,
        account_id: null,
        due_date: TOMORROW,
      });

      await createTask(
        mockPrisma as unknown as Parameters<typeof createTask>[0],
        TEST_TENANT_ID,
        {
          title: 'Test task',
          due_date: TOMORROW.toISOString(),
          assigned_to_id: TEST_ASSIGNED_TO_ID,
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.crmTask.create.mock.calls[0]![0];
      expect(createCall.data.tenant_id).toBe(TEST_TENANT_ID);
    });

    test('FR-012: creates task with description and account_id', async () => {
      mockPrisma.crmTask.create.mockResolvedValue({
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Send quote',
        description: 'Send price quote',
        account_id: TEST_ACCOUNT_ID,
        assigned_to_id: TEST_ASSIGNED_TO_ID,
        due_date: TOMORROW,
      });

      await createTask(
        mockPrisma as unknown as Parameters<typeof createTask>[0],
        TEST_TENANT_ID,
        {
          title: 'Send quote',
          description: 'Send price quote',
          due_date: TOMORROW.toISOString(),
          assigned_to_id: TEST_ASSIGNED_TO_ID,
          account_id: TEST_ACCOUNT_ID,
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.crmTask.create.mock.calls[0]![0];
      expect(createCall.data.description).toBe('Send price quote');
      expect(createCall.data.account_id).toBe(TEST_ACCOUNT_ID);
    });

    test('FR-012: creates task with high priority', async () => {
      mockPrisma.crmTask.create.mockResolvedValue({
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Urgent follow-up',
        priority: 'high',
        assigned_to_id: TEST_ASSIGNED_TO_ID,
        account_id: null,
        due_date: TOMORROW,
      });

      await createTask(
        mockPrisma as unknown as Parameters<typeof createTask>[0],
        TEST_TENANT_ID,
        {
          title: 'Urgent follow-up',
          due_date: TOMORROW.toISOString(),
          priority: 'high',
          assigned_to_id: TEST_ASSIGNED_TO_ID,
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.crmTask.create.mock.calls[0]![0];
      expect(createCall.data.priority).toBe('high');
    });

    test('FR-012: defaults priority to medium when not specified', async () => {
      mockPrisma.crmTask.create.mockResolvedValue({
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Regular task',
        priority: 'medium',
        assigned_to_id: TEST_ASSIGNED_TO_ID,
        account_id: null,
        due_date: TOMORROW,
      });

      await createTask(
        mockPrisma as unknown as Parameters<typeof createTask>[0],
        TEST_TENANT_ID,
        {
          title: 'Regular task',
          due_date: TOMORROW.toISOString(),
          assigned_to_id: TEST_ASSIGNED_TO_ID,
        },
        TEST_USER_ID,
      );

      const createCall = mockPrisma.crmTask.create.mock.calls[0]![0];
      expect(createCall.data.priority).toBe('medium');
    });

    test('FR-012: writes audit trail entry on task creation', async () => {
      mockPrisma.crmTask.create.mockResolvedValue({
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Test task',
        assigned_to_id: TEST_ASSIGNED_TO_ID,
        account_id: null,
        due_date: TOMORROW,
      });

      await createTask(
        mockPrisma as unknown as Parameters<typeof createTask>[0],
        TEST_TENANT_ID,
        {
          title: 'Test task',
          due_date: TOMORROW.toISOString(),
          assigned_to_id: TEST_ASSIGNED_TO_ID,
        },
        TEST_USER_ID,
      );

      await vi.waitFor(() => {
        expect(mockPrisma.auditTrail.create).toHaveBeenCalled();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // updateTask Tests
  // ---------------------------------------------------------------------------

  describe('updateTask', () => {
    test('FR-012: updates task title', async () => {
      const existing = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Old Title',
        status: 'pending',
      };
      const updated = { ...existing, title: 'New Title' };

      mockPrisma.crmTask.findFirst.mockResolvedValue(existing);
      mockPrisma.crmTask.update.mockResolvedValue(updated);

      const result = await updateTask(
        mockPrisma as unknown as Parameters<typeof updateTask>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
        { title: 'New Title' },
        TEST_USER_ID,
      );

      expect(result).toEqual(updated);
      expect(result!.title).toBe('New Title');
    });

    test('FR-012: updates task status', async () => {
      const existing = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Task',
        status: 'pending',
      };
      const updated = { ...existing, status: 'in_progress' };

      mockPrisma.crmTask.findFirst.mockResolvedValue(existing);
      mockPrisma.crmTask.update.mockResolvedValue(updated);

      const result = await updateTask(
        mockPrisma as unknown as Parameters<typeof updateTask>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
        { status: 'in_progress' },
        TEST_USER_ID,
      );

      expect(result!.status).toBe('in_progress');
    });

    test('FR-012: returns null when task not found', async () => {
      mockPrisma.crmTask.findFirst.mockResolvedValue(null);

      const result = await updateTask(
        mockPrisma as unknown as Parameters<typeof updateTask>[0],
        TEST_TENANT_ID,
        'nonexistent-id',
        { title: 'New Title' },
        TEST_USER_ID,
      );

      expect(result).toBeNull();
      expect(mockPrisma.crmTask.update).not.toHaveBeenCalled();
    });

    test('FR-012: reassigns task to different user', async () => {
      const newAssigneeId = 'aaa08400-e29b-41d4-a716-446655440000';
      const existing = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        assigned_to_id: TEST_ASSIGNED_TO_ID,
      };

      mockPrisma.crmTask.findFirst.mockResolvedValue(existing);
      mockPrisma.crmTask.update.mockResolvedValue({
        ...existing,
        assigned_to_id: newAssigneeId,
      });

      await updateTask(
        mockPrisma as unknown as Parameters<typeof updateTask>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
        { assigned_to_id: newAssigneeId },
        TEST_USER_ID,
      );

      const updateCall = mockPrisma.crmTask.update.mock.calls[0]![0];
      expect(updateCall.data.assigned_to_id).toBe(newAssigneeId);
    });
  });

  // ---------------------------------------------------------------------------
  // listTasks Tests
  // ---------------------------------------------------------------------------

  describe('listTasks', () => {
    test('FR-012: returns paginated tasks', async () => {
      const tasks = [
        { id: '1', title: 'Task 1', due_date: TOMORROW },
        { id: '2', title: 'Task 2', due_date: NOW },
      ];

      mockPrisma.crmTask.findMany.mockResolvedValue(tasks);
      mockPrisma.crmTask.count.mockResolvedValue(30);

      const result = await listTasks(
        mockPrisma as unknown as Parameters<typeof listTasks>[0],
        TEST_TENANT_ID,
        { page: 1, pageSize: 20 },
      );

      expect(result.items).toEqual(tasks);
      expect(result.total).toBe(30);
    });

    test('FR-012: filters by assigned_to_id', async () => {
      mockPrisma.crmTask.findMany.mockResolvedValue([]);
      mockPrisma.crmTask.count.mockResolvedValue(0);

      await listTasks(
        mockPrisma as unknown as Parameters<typeof listTasks>[0],
        TEST_TENANT_ID,
        { assignedToId: TEST_ASSIGNED_TO_ID },
      );

      const findManyCall = mockPrisma.crmTask.findMany.mock.calls[0]![0];
      expect(findManyCall.where.assigned_to_id).toBe(TEST_ASSIGNED_TO_ID);
    });

    test('FR-012: filters by status', async () => {
      mockPrisma.crmTask.findMany.mockResolvedValue([]);
      mockPrisma.crmTask.count.mockResolvedValue(0);

      await listTasks(
        mockPrisma as unknown as Parameters<typeof listTasks>[0],
        TEST_TENANT_ID,
        { status: 'completed' },
      );

      const findManyCall = mockPrisma.crmTask.findMany.mock.calls[0]![0];
      expect(findManyCall.where.status).toBe('completed');
    });

    test('FR-012: filters overdue tasks', async () => {
      mockPrisma.crmTask.findMany.mockResolvedValue([]);
      mockPrisma.crmTask.count.mockResolvedValue(0);

      await listTasks(
        mockPrisma as unknown as Parameters<typeof listTasks>[0],
        TEST_TENANT_ID,
        { overdue: true },
      );

      const findManyCall = mockPrisma.crmTask.findMany.mock.calls[0]![0];
      expect(findManyCall.where.due_date).toBeDefined();
      expect(findManyCall.where.status).toEqual({ in: ['pending', 'in_progress'] });
    });

    test('FR-012: orders by due_date ascending', async () => {
      mockPrisma.crmTask.findMany.mockResolvedValue([]);
      mockPrisma.crmTask.count.mockResolvedValue(0);

      await listTasks(
        mockPrisma as unknown as Parameters<typeof listTasks>[0],
        TEST_TENANT_ID,
      );

      const findManyCall = mockPrisma.crmTask.findMany.mock.calls[0]![0];
      expect(findManyCall.orderBy).toEqual({ due_date: 'asc' });
    });

    test('FR-012: uses default pagination when not specified', async () => {
      mockPrisma.crmTask.findMany.mockResolvedValue([]);
      mockPrisma.crmTask.count.mockResolvedValue(0);

      const result = await listTasks(
        mockPrisma as unknown as Parameters<typeof listTasks>[0],
        TEST_TENANT_ID,
      );

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // getTaskById Tests
  // ---------------------------------------------------------------------------

  describe('getTaskById', () => {
    test('FR-012: returns task when found', async () => {
      const task = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Test Task',
        status: 'pending',
      };

      mockPrisma.crmTask.findFirst.mockResolvedValue(task);

      const result = await getTaskById(
        mockPrisma as unknown as Parameters<typeof getTaskById>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
      );

      expect(result).toEqual(task);
    });

    test('FR-012: returns null when task not found', async () => {
      mockPrisma.crmTask.findFirst.mockResolvedValue(null);

      const result = await getTaskById(
        mockPrisma as unknown as Parameters<typeof getTaskById>[0],
        TEST_TENANT_ID,
        'nonexistent-id',
      );

      expect(result).toBeNull();
    });

    test('FR-012: filters by tenant_id for isolation', async () => {
      mockPrisma.crmTask.findFirst.mockResolvedValue(null);

      await getTaskById(
        mockPrisma as unknown as Parameters<typeof getTaskById>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
      );

      const findFirstCall = mockPrisma.crmTask.findFirst.mock.calls[0]![0];
      expect(findFirstCall.where.tenant_id).toBe(TEST_TENANT_ID);
      expect(findFirstCall.where.id).toBe(TEST_TASK_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // completeTask Tests
  // ---------------------------------------------------------------------------

  describe('completeTask', () => {
    test('FR-012: marks task as completed with timestamp', async () => {
      const existing = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        title: 'Test Task',
        status: 'pending',
        account_id: TEST_ACCOUNT_ID,
        completed_at: null,
      };

      mockPrisma.crmTask.findFirst.mockResolvedValue(existing);
      mockPrisma.crmTask.update.mockResolvedValue({
        ...existing,
        status: 'completed',
        completed_at: NOW,
      });

      const result = await completeTask(
        mockPrisma as unknown as Parameters<typeof completeTask>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
        TEST_USER_ID,
      );

      expect(result!.status).toBe('completed');
      expect(result!.completed_at).toEqual(NOW);
    });

    test('FR-012: sets completed_at to current time', async () => {
      const existing = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        status: 'in_progress',
        account_id: null,
      };

      mockPrisma.crmTask.findFirst.mockResolvedValue(existing);
      mockPrisma.crmTask.update.mockResolvedValue({
        ...existing,
        status: 'completed',
        completed_at: NOW,
      });

      await completeTask(
        mockPrisma as unknown as Parameters<typeof completeTask>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
        TEST_USER_ID,
      );

      const updateCall = mockPrisma.crmTask.update.mock.calls[0]![0];
      expect(updateCall.data.status).toBe('completed');
      expect(updateCall.data.completed_at).toBeInstanceOf(Date);
    });

    test('FR-012: returns null when task not found', async () => {
      mockPrisma.crmTask.findFirst.mockResolvedValue(null);

      const result = await completeTask(
        mockPrisma as unknown as Parameters<typeof completeTask>[0],
        TEST_TENANT_ID,
        'nonexistent-id',
        TEST_USER_ID,
      );

      expect(result).toBeNull();
      expect(mockPrisma.crmTask.update).not.toHaveBeenCalled();
    });

    test('FR-012: writes audit trail entry on completion', async () => {
      const existing = {
        id: TEST_TASK_ID,
        tenant_id: TEST_TENANT_ID,
        status: 'pending',
        account_id: TEST_ACCOUNT_ID,
      };

      mockPrisma.crmTask.findFirst.mockResolvedValue(existing);
      mockPrisma.crmTask.update.mockResolvedValue({
        ...existing,
        status: 'completed',
        completed_at: NOW,
        title: 'Task',
      });

      await completeTask(
        mockPrisma as unknown as Parameters<typeof completeTask>[0],
        TEST_TENANT_ID,
        TEST_TASK_ID,
        TEST_USER_ID,
      );

      await vi.waitFor(() => {
        expect(mockPrisma.auditTrail.create).toHaveBeenCalled();
      });
    });
  });
});
