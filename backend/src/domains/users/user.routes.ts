/**
 * User management route handlers for Fastify.
 * POST   /api/v1/admin/users              — create user (admin only)
 * GET    /api/v1/admin/users              — list users (admin only)
 * GET    /api/v1/admin/users/:id          — get user detail (admin only)
 * PATCH  /api/v1/admin/users/:id          — update user (admin only)
 * POST   /api/v1/admin/users/:id/deactivate   — deactivate user (admin only)
 * POST   /api/v1/admin/users/:id/reactivate   — reactivate user (admin only)
 *
 * All routes require Admin role (FR-029).
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  deactivateUserSchema,
} from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,
} from './user.service.js';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/admin/users
   * Create a new user account (FR-029).
   */
  app.post(
    '/api/v1/admin/users',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const body = createUserSchema.parse(request.body);

      const result = await createUser(
        app.prisma,
        user.tenantId,
        body,
        user.userId,
        user.email,
      );

      void reply.status(201).send({
        data: {
          id: result.id,
          email: result.email,
          first_name: result.first_name,
          last_name: result.last_name,
          role: result.role,
          territory_id: result.territory_id,
          territory: result.territory ?? null,
          is_active: result.is_active,
          created_at: result.created_at,
        },
      });
    },
  );

  /**
   * GET /api/v1/admin/users
   * List all users with filters (FR-029).
   */
  app.get(
    '/api/v1/admin/users',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const query = userListQuerySchema.parse(request.query);

      const result = await listUsers(app.prisma, user.tenantId, {
        role: query.role,
        isActive: query.is_active,
        search: query.search,
        sortBy: query.sort_by,
        sortOrder: query.sort_order,
        page: query.page,
        pageSize: query.per_page,
      });

      void reply.status(200).send({
        data: result.items.map((u) => ({
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          territory: u.territory ?? null,
          is_active: u.is_active,
          last_login_at: u.last_login_at,
          created_at: u.created_at,
        })),
        pagination: {
          page: result.page,
          per_page: result.pageSize,
          total_count: result.total,
        },
      });
    },
  );

  /**
   * GET /api/v1/admin/users/:id
   * Get user detail (FR-029).
   */
  app.get<{ Params: { id: string } }>(
    '/api/v1/admin/users/:id',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const result = await getUserById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!result) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'User not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: result });
    },
  );

  /**
   * PATCH /api/v1/admin/users/:id
   * Update a user (role, territory, etc.) (FR-029).
   */
  app.patch<{ Params: { id: string } }>(
    '/api/v1/admin/users/:id',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const body = updateUserSchema.parse(request.body);

      const result = await updateUser(
        app.prisma,
        user.tenantId,
        request.params.id,
        body,
        user.userId,
        user.email,
      );

      if (!result) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'User not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: result });
    },
  );

  /**
   * POST /api/v1/admin/users/:id/deactivate
   * Deactivate a user and invalidate sessions (FR-030).
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/users/:id/deactivate',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const body = deactivateUserSchema.parse(request.body ?? {});

      const result = await deactivateUser(
        app.prisma,
        user.tenantId,
        request.params.id,
        user.userId,
        user.email,
        body.reason,
      );

      if (!result) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'User not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({
        data: {
          id: result.id,
          is_active: result.is_active,
          deactivated_at: result.updated_at,
        },
        message: 'User deactivated. All sessions invalidated.',
      });
    },
  );

  /**
   * POST /api/v1/admin/users/:id/reactivate
   * Reactivate a previously deactivated user (FR-029).
   */
  app.post<{ Params: { id: string } }>(
    '/api/v1/admin/users/:id/reactivate',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const result = await reactivateUser(
        app.prisma,
        user.tenantId,
        request.params.id,
        user.userId,
        user.email,
      );

      if (!result) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'User not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({
        data: {
          id: result.id,
          is_active: result.is_active,
          reactivated_at: result.updated_at,
        },
      });
    },
  );
}
