import type { FastifyInstance } from 'fastify';
import {
  createTaskSchema,
  updateTaskSchema,
  taskListQuerySchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createTask,
  getTaskById,
  updateTask,
  softDeleteTask,
  listTasks,
  TaskError,
} from './task.service';

function getAuditContext(request: {
  user?: { userId: string; email: string };
  requestId: string;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}): {
  actorId: string;
  actorEmail: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
} {
  return {
    actorId: request.user!.userId,
    actorEmail: request.user!.email,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string) ?? '',
    requestId: request.requestId,
  };
}

function handleTaskError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof TaskError) {
    const statusMap: Record<string, number> = {
      TASK_NOT_FOUND: 404,
      TASK_ASSIGNEE_INACTIVE: 400,
      TASK_INVALID_TRANSITION: 400,
      ACCOUNT_NOT_FOUND: 404,
      CONTACT_NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
    };
    const status = statusMap[error.code] ?? 400;
    return reply.status(status).send({
      error: error.code,
      message: error.message,
      code: error.code,
      requestId,
    });
  }
  throw error;
}

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/tasks
  app.post(
    '/api/tasks',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const body = createTaskSchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const creatorId = request.user!.userId;

      try {
        const task = await createTask(
          app.prisma,
          tenantId,
          creatorId,
          body,
          getAuditContext(request),
        );

        return reply.status(201).send({ data: task });
      } catch (error: unknown) {
        return handleTaskError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/tasks
  app.get(
    '/api/tasks',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = taskListQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      try {
        const result = await listTasks(app.prisma, tenantId, {
          assigneeId: query.assigneeId,
          status: query.status,
          priority: query.priority,
          accountId: query.accountId,
          overdue: query.overdue,
          cursor: query.cursor,
          limit: query.limit,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        });

        return reply.status(200).send(result);
      } catch (error: unknown) {
        return handleTaskError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/tasks/:id
  app.get(
    '/api/tasks/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const task = await getTaskById(app.prisma, tenantId, id);
        return reply.status(200).send({ data: task });
      } catch (error: unknown) {
        return handleTaskError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/tasks/:id
  app.put(
    '/api/tasks/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateTaskSchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      try {
        const task = await updateTask(
          app.prisma,
          tenantId,
          id,
          body,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: task });
      } catch (error: unknown) {
        return handleTaskError(error, request.requestId, reply);
      }
    },
  );

  // DELETE /api/tasks/:id
  app.delete(
    '/api/tasks/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await softDeleteTask(
          app.prisma,
          tenantId,
          id,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        return handleTaskError(error, request.requestId, reply);
      }
    },
  );
}
