/**
 * Activity and email tracking route handlers for Fastify.
 * POST   /api/activities                         — create activity (rep, manager, admin)
 * GET    /api/accounts/:accountId/activities      — list activities for account (all authenticated)
 * GET    /api/activities/:id                      — get single activity (all authenticated)
 * GET    /api/emails/unmatched                    — list unmatched emails (rep, manager)
 * POST   /api/emails/:id/match                   — manually match email (rep, manager)
 *
 * All routes require authentication and enforce tenant isolation.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { createActivitySchema, activityListQuerySchema } from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import { createActivity, listActivities, getActivityById } from './activity.service.js';
import { listUnmatchedEmails, manualMatchEmail } from './email-tracking.service.js';

/** Schema for manual email match request body */
const matchEmailSchema = z.object({
  account_id: z.string().uuid('Invalid account ID').optional(),
  contact_id: z.string().uuid('Invalid contact ID').optional(),
});

/** Schema for unmatched emails query */
const unmatchedEmailsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/activities
   * Create a new activity. Requires rep, manager, or admin role.
   */
  app.post(
    '/api/activities',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = createActivitySchema.parse(request.body);
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

      const activity = await createActivity(
        app.prisma,
        user.tenantId,
        body,
        user.userId,
      );

      void reply.status(201).send({ data: activity });
    },
  );

  /**
   * GET /api/accounts/:accountId/activities
   * List activities for an account with pagination. All authenticated roles.
   */
  app.get<{ Params: { accountId: string } }>(
    '/api/accounts/:accountId/activities',
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

      const query = activityListQuerySchema.parse({
        ...(request.query as Record<string, unknown>),
        account_id: request.params.accountId,
      });

      const result = await listActivities(app.prisma, user.tenantId, query.account_id, {
        activityType: query.activity_type,
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
   * GET /api/activities/:id
   * Get a single activity by ID. All authenticated roles.
   */
  app.get<{ Params: { id: string } }>(
    '/api/activities/:id',
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

      const activity = await getActivityById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!activity) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Activity not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: activity });
    },
  );

  /**
   * GET /api/emails/unmatched
   * List unmatched emails with pagination. Requires rep or manager role.
   */
  app.get(
    '/api/emails/unmatched',
    {
      preHandler: [extractUser, requireRole('rep', 'manager')],
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

      const query = unmatchedEmailsQuerySchema.parse(request.query);

      const result = await listUnmatchedEmails(app.prisma, user.tenantId, {
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
   * POST /api/emails/:id/match
   * Manually match an email to an account and/or contact. Requires rep or manager role.
   */
  app.post<{ Params: { id: string } }>(
    '/api/emails/:id/match',
    {
      preHandler: [extractUser, requireRole('rep', 'manager')],
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

      const body = matchEmailSchema.parse(request.body);

      const emailRecord = await manualMatchEmail(
        app.prisma,
        user.tenantId,
        request.params.id,
        body,
      );

      if (!emailRecord) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Email record not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: emailRecord });
    },
  );
}
