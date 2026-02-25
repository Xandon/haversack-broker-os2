/**
 * Task (CrmTask) domain service.
 * Provides CRUD operations for tasks with tenant isolation,
 * audit trail integration, completion tracking, and overdue filtering.
 */
import type { PrismaClient, CrmTask } from '@prisma/client';

import type { CreateTaskInput, UpdateTaskInput } from '@haversack/shared';
import { createAuditEntry } from '../../shared/middleware/audit-trail.js';
import { logger } from '../../shared/utils/logger.js';

/** Options for listing tasks */
export interface TaskListOptions {
  assignedToId?: string;
  status?: string;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

/** Paginated result wrapper for tasks */
export interface PaginatedTaskResult {
  items: CrmTask[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Create a new task.
 * Writes an audit trail entry on creation (fire-and-forget).
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param input - Validated task creation input
 * @param createdById - ID of the user creating the task
 * @returns The created task
 */
export async function createTask(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateTaskInput,
  createdById: string,
): Promise<CrmTask> {
  const task = await prisma.crmTask.create({
    data: {
      tenant_id: tenantId,
      title: input.title,
      description: input.description ?? null,
      due_date: new Date(input.due_date),
      priority: (input.priority ?? 'medium') as CrmTask['priority'],
      assigned_to_id: input.assigned_to_id,
      created_by_id: createdById,
      account_id: input.account_id ?? null,
      contact_id: input.contact_id ?? null,
    },
  });

  // Write audit trail entry (fire-and-forget)
  void createAuditEntry(prisma, {
    tenantId,
    actorId: createdById,
    actorEmail: '',
    entityType: 'Account',
    entityId: input.account_id ?? task.id,
    action: 'create',
    newValue: JSON.stringify({
      task_id: task.id,
      title: task.title,
      assigned_to_id: task.assigned_to_id,
      due_date: task.due_date.toISOString(),
    }),
  });

  logger.info(
    {
      operation: 'create-task',
      tenantId,
      taskId: task.id,
      assignedToId: input.assigned_to_id,
      createdById,
    },
    `Task created: ${task.title}`,
  );

  return task;
}

/**
 * Update an existing task.
 * Supports status changes, reassignment, and field updates.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param taskId - The task ID to update
 * @param input - Validated partial update input
 * @param actorId - ID of the user performing the update
 * @returns The updated task, or null if not found
 */
export async function updateTask(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string,
  input: UpdateTaskInput,
  actorId: string,
): Promise<CrmTask | null> {
  const existing = await prisma.crmTask.findFirst({
    where: {
      id: taskId,
      tenant_id: tenantId,
    },
  });

  if (!existing) {
    return null;
  }

  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData['title'] = input.title;
  if (input.description !== undefined) updateData['description'] = input.description ?? null;
  if (input.due_date !== undefined) updateData['due_date'] = new Date(input.due_date);
  if (input.priority !== undefined) updateData['priority'] = input.priority;
  if (input.status !== undefined) updateData['status'] = input.status;
  if (input.assigned_to_id !== undefined) updateData['assigned_to_id'] = input.assigned_to_id;
  if (input.account_id !== undefined) updateData['account_id'] = input.account_id ?? null;
  if (input.contact_id !== undefined) updateData['contact_id'] = input.contact_id ?? null;

  const updated = await prisma.crmTask.update({
    where: { id: taskId },
    data: updateData,
  });

  // Build change summary for audit trail
  const changeSummary: Record<string, { old: unknown; new: unknown }> = {};
  for (const key of Object.keys(updateData)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    const newVal = updateData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changeSummary[key] = { old: oldVal, new: newVal };
    }
  }

  if (Object.keys(changeSummary).length > 0) {
    void createAuditEntry(prisma, {
      tenantId,
      actorId,
      actorEmail: '',
      entityType: 'Account',
      entityId: existing.account_id ?? taskId,
      action: 'update',
      changeSummary,
    });
  }

  logger.info(
    {
      operation: 'update-task',
      tenantId,
      taskId,
      actorId,
      fieldsChanged: Object.keys(changeSummary),
    },
    `Task updated: ${updated.title}`,
  );

  return updated;
}

/**
 * List tasks with optional filters and pagination.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param options - Filter and pagination options
 * @returns Paginated task results
 */
export async function listTasks(
  prisma: PrismaClient,
  tenantId: string,
  options: TaskListOptions = {},
): Promise<PaginatedTaskResult> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    tenant_id: tenantId,
  };

  if (options.assignedToId) {
    where['assigned_to_id'] = options.assignedToId;
  }

  if (options.status) {
    where['status'] = options.status;
  }

  if (options.overdue) {
    where['due_date'] = { lt: new Date() };
    where['status'] = { in: ['pending', 'in_progress'] };
  }

  const [items, total] = await Promise.all([
    prisma.crmTask.findMany({
      where,
      orderBy: { due_date: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.crmTask.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Get a single task by ID.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param taskId - The task ID to fetch
 * @returns The task, or null if not found
 */
export async function getTaskById(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string,
): Promise<CrmTask | null> {
  return prisma.crmTask.findFirst({
    where: {
      id: taskId,
      tenant_id: tenantId,
    },
  });
}

/**
 * Mark a task as completed.
 * Sets status to 'completed' and records the completed_at timestamp.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param taskId - The task ID to complete
 * @param actorId - ID of the user completing the task
 * @returns The completed task, or null if not found
 */
export async function completeTask(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string,
  actorId: string,
): Promise<CrmTask | null> {
  const existing = await prisma.crmTask.findFirst({
    where: {
      id: taskId,
      tenant_id: tenantId,
    },
  });

  if (!existing) {
    return null;
  }

  const now = new Date();

  const updated = await prisma.crmTask.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completed_at: now,
    },
  });

  // Write audit trail entry (fire-and-forget)
  void createAuditEntry(prisma, {
    tenantId,
    actorId,
    actorEmail: '',
    entityType: 'Account',
    entityId: existing.account_id ?? taskId,
    action: 'update',
    changeSummary: {
      status: { old: existing.status, new: 'completed' },
      completed_at: { old: null, new: now.toISOString() },
    },
  });

  logger.info(
    {
      operation: 'complete-task',
      tenantId,
      taskId,
      actorId,
    },
    `Task completed: ${updated.title}`,
  );

  return updated;
}
