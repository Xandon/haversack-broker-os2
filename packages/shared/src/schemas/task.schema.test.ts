import { describe, test, expect } from 'vitest';
import {
  taskPrioritySchema,
  taskStatusSchema,
  createTaskSchema,
  updateTaskSchema,
  taskResponseSchema,
  taskListQuerySchema,
} from './task.schema';

describe('FR-009: Task Zod schemas', () => {
  describe('taskPrioritySchema', () => {
    test('FR-009: accepts all valid priorities', () => {
      expect(taskPrioritySchema.parse('high')).toBe('high');
      expect(taskPrioritySchema.parse('medium')).toBe('medium');
      expect(taskPrioritySchema.parse('low')).toBe('low');
    });

    test('FR-009: rejects invalid priority', () => {
      expect(() => taskPrioritySchema.parse('urgent')).toThrow();
    });
  });

  describe('taskStatusSchema', () => {
    test('FR-009: accepts all valid statuses', () => {
      expect(taskStatusSchema.parse('pending')).toBe('pending');
      expect(taskStatusSchema.parse('in_progress')).toBe('in_progress');
      expect(taskStatusSchema.parse('completed')).toBe('completed');
      expect(taskStatusSchema.parse('cancelled')).toBe('cancelled');
    });

    test('FR-009: rejects invalid status', () => {
      expect(() => taskStatusSchema.parse('done')).toThrow();
    });
  });

  describe('createTaskSchema', () => {
    const validTask = {
      title: 'Follow up with buyer',
      description: 'Discuss pricing for next quarter',
      dueDate: '2026-03-15T10:00:00.000Z',
      priority: 'high' as const,
      assigneeId: '00000000-0000-4000-a000-000000000001',
      accountId: '00000000-0000-4000-a000-000000000002',
    };

    test('FR-009: accepts valid task with all fields', () => {
      const result = createTaskSchema.parse(validTask);
      expect(result.title).toBe('Follow up with buyer');
      expect(result.priority).toBe('high');
    });

    test('FR-009: accepts task with only required fields', () => {
      const result = createTaskSchema.parse({
        title: 'Quick task',
        dueDate: '2026-03-15T10:00:00.000Z',
        priority: 'low',
        assigneeId: '00000000-0000-4000-a000-000000000001',
      });
      expect(result.accountId).toBeUndefined();
      expect(result.contactId).toBeUndefined();
    });

    test('FR-009: trims title whitespace', () => {
      const result = createTaskSchema.parse({
        ...validTask,
        title: '  Trimmed title  ',
      });
      expect(result.title).toBe('Trimmed title');
    });

    test('FR-009: rejects blank title', () => {
      expect(() =>
        createTaskSchema.parse({ ...validTask, title: '' }),
      ).toThrow();
    });

    test('FR-009: rejects title exceeding 255 characters', () => {
      expect(() =>
        createTaskSchema.parse({ ...validTask, title: 'x'.repeat(256) }),
      ).toThrow();
    });

    test('FR-009: rejects invalid UUID for assigneeId', () => {
      expect(() =>
        createTaskSchema.parse({ ...validTask, assigneeId: 'not-a-uuid' }),
      ).toThrow();
    });

    test('FR-009: rejects invalid datetime for dueDate', () => {
      expect(() =>
        createTaskSchema.parse({ ...validTask, dueDate: 'tomorrow' }),
      ).toThrow();
    });

    test('FR-009: rejects description exceeding 10000 characters', () => {
      expect(() =>
        createTaskSchema.parse({ ...validTask, description: 'x'.repeat(10001) }),
      ).toThrow();
    });
  });

  describe('updateTaskSchema', () => {
    test('FR-009: accepts partial update', () => {
      const result = updateTaskSchema.parse({ title: 'Updated title' });
      expect(result.title).toBe('Updated title');
    });

    test('FR-009: accepts status update', () => {
      const result = updateTaskSchema.parse({ status: 'completed' });
      expect(result.status).toBe('completed');
    });

    test('FR-009: accepts null for nullable fields', () => {
      const result = updateTaskSchema.parse({
        description: null,
        accountId: null,
        contactId: null,
      });
      expect(result.description).toBeNull();
      expect(result.accountId).toBeNull();
    });

    test('FR-009: accepts empty object', () => {
      const result = updateTaskSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('taskResponseSchema', () => {
    test('FR-009: validates complete task response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        title: 'Follow up',
        description: 'Discuss pricing',
        dueDate: '2026-03-15T10:00:00.000Z',
        priority: 'high',
        status: 'pending',
        assigneeId: '00000000-0000-4000-a000-000000000003',
        creatorId: '00000000-0000-4000-a000-000000000004',
        accountId: '00000000-0000-4000-a000-000000000005',
        contactId: null,
        completedAt: null,
        isOverdue: false,
        createdAt: '2026-02-26T10:00:00.000Z',
        updatedAt: '2026-02-26T10:00:00.000Z',
      };
      const result = taskResponseSchema.parse(response);
      expect(result.isOverdue).toBe(false);
    });

    test('FR-009: validates overdue task response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        title: 'Overdue task',
        description: null,
        dueDate: '2026-01-01T10:00:00.000Z',
        priority: 'medium',
        status: 'pending',
        assigneeId: '00000000-0000-4000-a000-000000000003',
        creatorId: '00000000-0000-4000-a000-000000000004',
        accountId: null,
        contactId: null,
        completedAt: null,
        isOverdue: true,
        createdAt: '2025-12-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };
      const result = taskResponseSchema.parse(response);
      expect(result.isOverdue).toBe(true);
    });
  });

  describe('taskListQuerySchema', () => {
    test('FR-009: accepts valid query with all params', () => {
      const result = taskListQuerySchema.parse({
        assigneeId: '00000000-0000-4000-a000-000000000001',
        status: 'pending',
        priority: 'high',
        overdue: 'true',
        limit: '50',
        sortBy: 'dueDate',
        sortOrder: 'asc',
      });
      expect(result.overdue).toBe('true');
      expect(result.limit).toBe(50);
    });

    test('FR-009: provides sensible defaults', () => {
      const result = taskListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('dueDate');
      expect(result.sortOrder).toBe('asc');
    });

    test('FR-009: rejects invalid sortBy', () => {
      expect(() => taskListQuerySchema.parse({ sortBy: 'name' })).toThrow();
    });

    test('FR-009: rejects limit above 100', () => {
      expect(() => taskListQuerySchema.parse({ limit: '101' })).toThrow();
    });
  });
});
