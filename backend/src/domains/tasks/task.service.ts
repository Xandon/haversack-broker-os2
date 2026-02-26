import type { PrismaClient, Task, Prisma } from '@prisma/client';
import type { CreateTaskInput, UpdateTaskInput } from '@haversack/shared';
import {
  writeAuditLog,
  detectChanges,
  writeUpdateAuditLogs,
} from '../../shared/services/audit.service';

export class TaskError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TaskError';
    this.code = code;
  }
}

interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface TaskWithOverdue extends Task {
  isOverdue: boolean;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['pending', 'completed', 'cancelled'],
  completed: ['cancelled'],
  cancelled: ['pending'],
};

function computeIsOverdue(task: Task): boolean {
  if (task.status === 'completed' || task.status === 'cancelled') return false;
  return task.dueDate.getTime() < Date.now();
}

export async function createTask(
  prisma: PrismaClient,
  tenantId: string,
  creatorId: string,
  data: CreateTaskInput,
  audit: AuditContext,
): Promise<TaskWithOverdue> {
  // Verify assignee is active
  const assignee = await prisma.user.findFirst({
    where: { id: data.assigneeId, tenantId },
  });

  if (!assignee || !assignee.isActive) {
    throw new TaskError('Cannot assign task to inactive user', 'TASK_ASSIGNEE_INACTIVE');
  }

  // Verify account if provided
  if (data.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: data.accountId, tenantId, deletedAt: null },
    });
    if (!account) {
      throw new TaskError('Account not found', 'ACCOUNT_NOT_FOUND');
    }
  }

  // Verify contact if provided
  if (data.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: data.contactId, tenantId },
    });
    if (!contact) {
      throw new TaskError('Contact not found', 'CONTACT_NOT_FOUND');
    }
  }

  const task = await prisma.task.create({
    data: {
      tenantId,
      title: data.title,
      description: data.description ?? null,
      dueDate: new Date(data.dueDate),
      priority: data.priority,
      status: 'pending',
      assigneeId: data.assigneeId,
      creatorId,
      accountId: data.accountId ?? null,
      contactId: data.contactId ?? null,
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Task',
    entityId: task.id,
    action: 'create',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { ...task, isOverdue: computeIsOverdue(task) };
}

export async function getTaskById(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string,
): Promise<TaskWithOverdue> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId, deletedAt: null },
  });

  if (!task) {
    throw new TaskError('Task not found', 'TASK_NOT_FOUND');
  }

  return { ...task, isOverdue: computeIsOverdue(task) };
}

export async function updateTask(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string,
  data: UpdateTaskInput,
  audit: AuditContext,
): Promise<TaskWithOverdue> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new TaskError('Task not found', 'TASK_NOT_FOUND');
  }

  // Validate status transition
  if (data.status && data.status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(data.status)) {
      throw new TaskError(
        `Invalid status transition from ${existing.status} to ${data.status}`,
        'TASK_INVALID_TRANSITION',
      );
    }
  }

  // Validate assignee if changing
  if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: data.assigneeId, tenantId },
    });
    if (!assignee || !assignee.isActive) {
      throw new TaskError('Cannot assign task to inactive user', 'TASK_ASSIGNEE_INACTIVE');
    }
  }

  const updateData: Prisma.TaskUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.assigneeId !== undefined) updateData.assignee = { connect: { id: data.assigneeId } };
  if (data.accountId !== undefined) {
    updateData.account = data.accountId ? { connect: { id: data.accountId } } : { disconnect: true };
  }
  if (data.contactId !== undefined) {
    updateData.contact = data.contactId ? { connect: { id: data.contactId } } : { disconnect: true };
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === 'completed') {
      updateData.completedAt = new Date();
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  // Audit trail
  const oldData: Record<string, unknown> = {
    title: existing.title,
    description: existing.description,
    dueDate: existing.dueDate.toISOString(),
    priority: existing.priority,
    status: existing.status,
    assigneeId: existing.assigneeId,
    accountId: existing.accountId,
  };
  const newData: Record<string, unknown> = {
    title: updated.title,
    description: updated.description,
    dueDate: updated.dueDate.toISOString(),
    priority: updated.priority,
    status: updated.status,
    assigneeId: updated.assigneeId,
    accountId: updated.accountId,
  };

  const changes = detectChanges(oldData, newData);
  if (changes.length > 0) {
    await writeUpdateAuditLogs(
      {
        prisma,
        tenantId,
        actorId: audit.actorId,
        actorEmail: audit.actorEmail,
        entityType: 'Task',
        entityId: taskId,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        requestId: audit.requestId,
      },
      changes,
    );
  }

  return { ...updated, isOverdue: computeIsOverdue(updated) };
}

export async function softDeleteTask(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string,
  audit: AuditContext,
): Promise<{ id: string; deletedAt: Date }> {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new TaskError('Task not found', 'TASK_NOT_FOUND');
  }

  const deletedAt = new Date();
  await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Task',
    entityId: taskId,
    action: 'delete',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { id: taskId, deletedAt };
}

export async function listTasks(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    assigneeId?: string;
    status?: string;
    priority?: string;
    accountId?: string;
    overdue?: string;
    cursor?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  },
): Promise<{
  data: TaskWithOverdue[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}> {
  const limit = options.limit ?? 20;

  const where: Prisma.TaskWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (options.assigneeId) where.assigneeId = options.assigneeId;
  if (options.accountId) where.accountId = options.accountId;

  if (options.overdue === 'true') {
    where.dueDate = { lt: new Date() };
    where.status = { not: 'completed' };
  } else {
    if (options.status) where.status = options.status;
    if (options.priority) where.priority = options.priority;
  }

  const sortBy = options.sortBy ?? 'dueDate';
  const sortOrder = (options.sortOrder ?? 'asc') as 'asc' | 'desc';
  const orderBy: Prisma.TaskOrderByWithRelationInput = { [sortBy]: sortOrder };

  const cursorObj = options.cursor ? { id: options.cursor } : undefined;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursorObj ? { cursor: cursorObj, skip: 1 } : {}),
    }),
    prisma.task.count({ where }),
  ]);

  const hasMore = tasks.length > limit;
  const data = hasMore ? tasks.slice(0, limit) : tasks;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data: data.map((t) => ({ ...t, isOverdue: computeIsOverdue(t) })),
    pagination: { cursor: nextCursor, hasMore, total },
  };
}
