/**
 * Task (CrmTask) domain route handlers for Fastify.
 * POST   /api/tasks            — create task (rep, manager, admin)
 * GET    /api/tasks            — list tasks with filters (all authenticated)
 * GET    /api/tasks/:id        — get single task (all authenticated)
 * PUT    /api/tasks/:id        — update task (rep, manager, admin)
 * POST   /api/tasks/:id/complete — complete task (rep, manager, admin)
 *
 * All routes require authentication and enforce tenant isolation.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { createTaskSchema, updateTaskSchema, taskListQuerySchema } from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import {
  createTask,
  updateTask,
  listTasks,
  getTaskById,
  completeTask,
} from './task.service.js';

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/tasks
   * Create a new task. Requires rep, manager, or admin role.
   */
  app.post(
    '/api/tasks',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = createTaskSchema.parse(request.body);
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const task = await createTask(
        app.prisma,
        user.tenantId,
        body,
        user.userId,
      );

      void reply.status(201).send({ data: task });
    },
  );

  /**
   * GET /api/tasks
   * List tasks with optional filters and pagination. All authenticated roles.
   */
  app.get(
    '/api/tasks',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'logistics', 'viewer')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const query = taskListQuerySchema.parse(request.query);

      const result = await listTasks(app.prisma, user.tenantId, {
        assignedToId: query.assigned_to_id,
        status: query.status,
        page: query.page,
        pageSize: query.page_size,
      });

      void reply.status(200).send({
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      });
    },
  );

  /**
   * GET /api/tasks/:id
   * Get a single task by ID. All authenticated roles.
   */
  app.get<{ Params: { id: string } }>(
    '/api/tasks/:id',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'logistics', 'viewer')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const task = await getTaskById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!task) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Task not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: task });
    },
  );

  /**
   * PUT /api/tasks/:id
   * Update an existing task. Requires rep, manager, or admin role.
   */
  app.put<{ Params: { id: string } }>(
    '/api/tasks/:id',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const body = updateTaskSchema.parse(request.body);

      const task = await updateTask(
        app.prisma,
        user.tenantId,
        request.params.id,
        body,
        user.userId,
      );

      if (!task) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Task not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: task });
    },
  );

  /**
   * POST /api/tasks/:id/complete
   * Mark a task as completed. Requires rep, manager, or admin role.
   */
  app.post<{ Params: { id: string } }>(
    '/api/tasks/:id/complete',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const task = await completeTask(
        app.prisma,
        user.tenantId,
        request.params.id,
        user.userId,
      );

      if (!task) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Task not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: task });
    },
  );
}
