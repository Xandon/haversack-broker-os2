/**
 * Zod validation schemas for Task (CrmTask) domain API contracts.
 * Matches Prisma CrmTask model with snake_case fields.
 * Used by both frontend and backend for input validation.
 */
import { z } from 'zod';

/**
 * Task priority enum matching Prisma TaskPriority.
 */
export const taskPriorityEnum = z.enum(['high', 'medium', 'low']);

/**
 * Task status enum matching Prisma TaskStatus.
 */
export const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);

/**
 * Schema for creating a new task.
 * Required: title, due_date, assigned_to_id.
 * Optional: description, priority, account_id, contact_id.
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must not exceed 255 characters'),
  description: z.string().optional().nullable(),
  due_date: z.string().datetime({ offset: true }),
  priority: taskPriorityEnum.optional().default('medium'),
  assigned_to_id: z.string().uuid('Invalid assigned user ID'),
  account_id: z.string().uuid('Invalid account ID').optional().nullable(),
  contact_id: z.string().uuid('Invalid contact ID').optional().nullable(),
});

/**
 * Schema for updating an existing task.
 * All fields are optional (partial update).
 */
export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),
  description: z.string().optional().nullable(),
  due_date: z.string().datetime({ offset: true }).optional(),
  priority: taskPriorityEnum.optional(),
  status: taskStatusEnum.optional(),
  assigned_to_id: z.string().uuid('Invalid assigned user ID').optional(),
  account_id: z.string().uuid('Invalid account ID').optional().nullable(),
  contact_id: z.string().uuid('Invalid contact ID').optional().nullable(),
});

/**
 * Schema for task list query parameters.
 * All filters are optional.
 */
export const taskListQuerySchema = z.object({
  assigned_to_id: z.string().uuid('Invalid assigned user ID').optional(),
  status: taskStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

/** Input type for creating a task */
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Input type for updating a task */
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** Query parameters for listing tasks */
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
