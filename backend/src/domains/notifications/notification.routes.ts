import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate';
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
  NotificationError,
} from './notification.service';

const listQuerySchema = z.object({
  is_read: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/notifications — list notifications for current user
  app.get(
    '/api/notifications',
    { preHandler: [authenticate] },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'AUTH_MISSING_TOKEN',
          requestId: request.requestId,
        });
      }

      const query = listQuerySchema.parse(request.query);

      const result = await listNotifications(app.prisma, {
        tenantId: request.user.tenantId,
        userId: request.user.userId,
        isRead: query.is_read,
        page: query.page,
        perPage: query.per_page,
      });

      return reply.status(200).send(result);
    },
  );

  // PATCH /api/notifications/:id/read — mark single notification as read
  app.patch(
    '/api/notifications/:id/read',
    { preHandler: [authenticate] },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'AUTH_MISSING_TOKEN',
          requestId: request.requestId,
        });
      }

      const { id } = request.params as { id: string };

      try {
        const result = await markNotificationRead(
          app.prisma,
          request.user.tenantId,
          request.user.userId,
          id,
        );
        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        if (error instanceof NotificationError) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: error.message,
            code: error.code,
            requestId: request.requestId,
          });
        }
        throw error;
      }
    },
  );

  // POST /api/notifications/read-all — mark all notifications as read
  app.post(
    '/api/notifications/read-all',
    { preHandler: [authenticate] },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'AUTH_MISSING_TOKEN',
          requestId: request.requestId,
        });
      }

      const result = await markAllRead(
        app.prisma,
        request.user.tenantId,
        request.user.userId,
      );

      return reply.status(200).send({ data: result });
    },
  );
}
