import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { createEmailService } from './email.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  accountId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  engagementStatus: z
    .enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed'])
    .optional(),
});

const sendEmailSchema = z.object({
  accountId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  toAddresses: z.array(z.string().email()).min(1),
  ccAddresses: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(500),
  bodyPreview: z.string().min(1),
});

const matchEmailSchema = z.object({
  accountId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
});

const engagementSchema = z.object({
  status: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed']),
});

export function emailRoutes(fastify: FastifyInstance): void {
  const service = createEmailService(fastify.prisma);

  fastify.get('/api/emails', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const query = listQuerySchema.parse(request.query);
    const result = await service.list(tenantId, query.page, query.limit, {
      accountId: query.accountId,
      contactId: query.contactId,
      direction: query.direction,
      engagementStatus: query.engagementStatus,
    });
    return reply.send({ data: result });
  });

  fastify.post('/api/emails/send', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    const userId = request.user?.id;
    if (!tenantId || !userId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const body = sendEmailSchema.parse(request.body);
    const result = await service.sendEmail({
      tenantId,
      userId,
      ...body,
    });
    return reply.status(201).send({ data: result });
  });

  fastify.get('/api/emails/unmatched', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const query = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(request.query);

    const result = await service.getUnmatchedEmails(tenantId, query.page, query.limit);
    return reply.send({ data: result });
  });

  fastify.patch('/api/emails/:id/match', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const { id } = request.params as { id: string };
    const body = matchEmailSchema.parse(request.body);
    const result = await service.matchEmail(tenantId, id, body.accountId, body.contactId);
    return reply.send({ data: result });
  });

  fastify.patch('/api/emails/:id/engagement', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const { id } = request.params as { id: string };
    const body = engagementSchema.parse(request.body);
    const result = await service.updateEngagement(tenantId, id, body.status);
    return reply.send({ data: result });
  });

  fastify.get('/api/emails/templates', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const result = await service.listTemplates(tenantId);
    return reply.send({ data: result });
  });
}
