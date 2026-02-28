import {
  createAccountSchema,
  updateAccountSchema,
  paginationSchema,
  uuidSchema,
} from '@haversack/shared';
import { FastifyInstance } from 'fastify';


import { createAccountService } from './account.service.js';

export async function accountRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createAccountService(fastify.prisma);

  // List accounts with pagination and filters
  fastify.get(
    '/api/accounts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const filters = request.query as Record<string, string>;

      const result = await service.list(request.user.tenantId, pagination, {
        search: filters.search,
        accountType: filters.accountType,
        territoryId: filters.territoryId,
        assignedRepId: filters.assignedRepId,
        isActive: filters.isActive === 'false' ? false : true,
      });

      return reply.send(result);
    },
  );

  // Get single account
  fastify.get(
    '/api/accounts/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const account = await service.getById(request.user.tenantId, id);
      if (!account) {
        return reply.status(404).send({ error: 'Account not found' });
      }
      return reply.send({ data: account });
    },
  );

  // Create account
  fastify.post(
    '/api/accounts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const input = createAccountSchema.parse(request.body);

      // Check for duplicates (FR-005)
      const duplicates = await service.findDuplicates(request.user.tenantId, input.name);
      const existingDuplicates = duplicates.filter(
        (d) => d.name.toLowerCase() !== input.name.toLowerCase() || duplicates.length > 0,
      );

      const account = await service.create(request.user.tenantId, request.user.userId, input);

      return reply.status(201).send({
        data: account,
        ...(existingDuplicates.length > 0 && {
          warnings: [
            {
              type: 'potential_duplicates',
              duplicates: existingDuplicates,
            },
          ],
        }),
      });
    },
  );

  // Update account
  fastify.patch(
    '/api/accounts/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);
      const input = updateAccountSchema.parse(request.body);

      const existing = await service.getById(request.user.tenantId, id);
      if (!existing) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      const account = await service.update(request.user.tenantId, id, input);
      return reply.send({ data: account });
    },
  );

  // Soft delete account
  fastify.delete(
    '/api/accounts/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const existing = await service.getById(request.user.tenantId, id);
      if (!existing) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      await service.softDelete(request.user.tenantId, id);
      return reply.status(204).send();
    },
  );

  // Check duplicates endpoint (FR-005)
  fastify.get(
    '/api/accounts/check-duplicates',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { name } = request.query as { name: string };
      if (!name || name.length < 2) {
        return reply.send({ data: [] });
      }

      const duplicates = await service.findDuplicates(request.user.tenantId, name);
      return reply.send({ data: duplicates });
    },
  );
}
