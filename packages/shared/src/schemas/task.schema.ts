import { z } from 'zod';

export const taskPrioritySchema = z.enum(['high', 'medium', 'low']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  description: z.string().max(10000).optional(),
  dueDate: z.string().datetime(),
  priority: taskPrioritySchema,
  assigneeId: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(10000).nullable().optional(),
  dueDate: z.string().datetime().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  assigneeId: z.string().uuid().optional(),
  accountId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const taskResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  assigneeId: z.string().uuid(),
  creatorId: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  contactId: z.string().uuid().nullable(),
  completedAt: z.string().nullable(),
  isOverdue: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TaskResponse = z.infer<typeof taskResponseSchema>;

export const taskListQuerySchema = z.object({
  assigneeId: z.string().uuid().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  accountId: z.string().uuid().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt']).optional().default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
