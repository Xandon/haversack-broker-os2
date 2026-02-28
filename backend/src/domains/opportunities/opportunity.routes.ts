import {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateOpportunityStageSchema,
  paginationSchema,
  uuidSchema,
} from '@haversack/shared';
import { OpportunityStage } from '@prisma/client';
import { FastifyInstance } from 'fastify';

import { createOpportunityService } from './opportunity.service.js';

export async function opportunityRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createOpportunityService(fastify.prisma);

  // List opportunities with pagination and filters
  fastify.get(
    '/api/opportunities',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const filters = request.query as Record<string, string>;

      const result = await service.list(request.user.tenantId, pagination, {
        search: filters.search,
        stage: filters.stage as OpportunityStage | undefined,
        assignedRepId: filters.assignedRepId,
        accountId: filters.accountId,
      });

      return reply.send(result);
    },
  );

  // Get pipeline board data (grouped by stage)
  fastify.get(
    '/api/pipeline',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const filters = request.query as Record<string, string>;

      const result = await service.getPipeline(request.user.tenantId, {
        assignedRepId: filters.assignedRepId,
      });

      return reply.send(result);
    },
  );

  // Get single opportunity
  fastify.get(
    '/api/opportunities/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const opportunity = await service.getById(request.user.tenantId, id);
      if (!opportunity) {
        return reply.status(404).send({ error: 'Opportunity not found' });
      }
      return reply.send({ data: opportunity });
    },
  );

  // Create opportunity
  fastify.post(
    '/api/opportunities',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const input = createOpportunitySchema.parse(request.body);

      const opportunity = await service.create(request.user.tenantId, input);

      return reply.status(201).send({ data: opportunity });
    },
  );

  // Update opportunity
  fastify.patch(
    '/api/opportunities/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);
      const input = updateOpportunitySchema.parse(request.body);

      const opportunity = await service.update(request.user.tenantId, id, input);
      if (!opportunity) {
        return reply.status(404).send({ error: 'Opportunity not found' });
      }

      return reply.send({ data: opportunity });
    },
  );

  // Update opportunity stage (drag-and-drop)
  fastify.patch(
    '/api/opportunities/:id/stage',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);
      const { stage, closeReason } = updateOpportunityStageSchema.parse(request.body);

      try {
        const opportunity = await service.updateStage(
          request.user.tenantId,
          id,
          stage as OpportunityStage,
          closeReason,
        );
        if (!opportunity) {
          return reply.status(404).send({ error: 'Opportunity not found' });
        }

        return reply.send({ data: opportunity });
      } catch (err) {
        if (err instanceof Error && err.message.includes('Close reason is required')) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // Soft delete opportunity
  fastify.delete(
    '/api/opportunities/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const existing = await service.getById(request.user.tenantId, id);
      if (!existing) {
        return reply.status(404).send({ error: 'Opportunity not found' });
      }

      await service.softDelete(request.user.tenantId, id);
      return reply.status(204).send();
    },
  );
}
