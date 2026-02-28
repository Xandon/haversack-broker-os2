import { createContactSchema, updateContactSchema, uuidSchema } from '@haversack/shared';
import { FastifyInstance } from 'fastify';


import { createContactService } from './contact.service.js';

export async function contactRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createContactService(fastify.prisma);

  // List contacts for an account
  fastify.get(
    '/api/accounts/:accountId/contacts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { accountId } = request.params as { accountId: string };
      uuidSchema.parse(accountId);

      const contacts = await service.listByAccount(request.user.tenantId, accountId);
      return reply.send({ data: contacts });
    },
  );

  // Get single contact
  fastify.get(
    '/api/contacts/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const contact = await service.getById(request.user.tenantId, id);
      if (!contact) {
        return reply.status(404).send({ error: 'Contact not found' });
      }
      return reply.send({ data: contact });
    },
  );

  // Create contact
  fastify.post(
    '/api/contacts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const input = createContactSchema.parse(request.body);

      const contact = await service.create(request.user.tenantId, input);
      return reply.status(201).send({ data: contact });
    },
  );

  // Update contact
  fastify.patch(
    '/api/contacts/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);
      const input = updateContactSchema.parse(request.body);

      const contact = await service.update(request.user.tenantId, id, input);
      if (!contact) {
        return reply.status(404).send({ error: 'Contact not found' });
      }
      return reply.send({ data: contact });
    },
  );

  // Delete contact
  fastify.delete(
    '/api/contacts/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const existing = await service.getById(request.user.tenantId, id);
      if (!existing) {
        return reply.status(404).send({ error: 'Contact not found' });
      }

      await service.softDelete(request.user.tenantId, id);
      return reply.status(204).send();
    },
  );
}
