import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createNotificationService } from './notification.service';

const notificationTypeSchema = z.enum([
  'task_reminder',
  'order_approval',
  'commission_approval',
  'system',
  'mention',
]);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  type: notificationTypeSchema.optional(),
});

export function notificationRoutes(fastify: FastifyInstance): void {
  const service = createNotificationService(fastify.prisma);

  fastify.get('/api/notifications', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    const userId = request.user?.id;
    if (!tenantId || !userId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const query = listQuerySchema.parse(request.query);
    const result = await service.list(tenantId, userId, query.page, query.limit, {
      isRead: query.isRead,
      type: query.type,
    });
    return reply.send({ data: result });
  });

  fastify.get('/api/notifications/unread-count', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    const userId = request.user?.id;
    if (!tenantId || !userId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const count = await service.getUnreadCount(tenantId, userId);
    return reply.send({ data: { count } });
  });

  fastify.patch('/api/notifications/:id/read', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    const userId = request.user?.id;
    if (!tenantId || !userId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const { id } = request.params as { id: string };
    const result = await service.markRead(tenantId, userId, id);
    return reply.send({ data: result });
  });

  fastify.patch('/api/notifications/read-all', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    const userId = request.user?.id;
    if (!tenantId || !userId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const result = await service.markAllRead(tenantId, userId);
    return reply.send({ data: result });
  });
}
