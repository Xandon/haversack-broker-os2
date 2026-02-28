import { paginationSchema, uuidSchema } from '@haversack/shared';
import { CommissionStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';

import { createCommissionService } from './commission.service.js';

export async function commissionRoutes(fastify: FastifyInstance): Promise<void> {
  const service = createCommissionService(fastify.prisma);

  // List commissions with pagination and filters
  fastify.get(
    '/api/commissions',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const filters = request.query as Record<string, string>;

      const result = await service.list(request.user.tenantId, pagination, {
        repId: filters.repId,
        period: filters.period,
        status: filters.status as CommissionStatus | undefined,
        brandId: filters.brandId,
      });

      return reply.send(result);
    },
  );

  // Get commission summary for a rep
  fastify.get(
    '/api/commissions/summary',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { repId } = request.query as { repId?: string };
      const targetRepId = repId ?? request.user.userId;

      const summary = await service.getSummary(request.user.tenantId, targetRepId);
      return reply.send(summary);
    },
  );

  // Get period statement for a rep
  fastify.get(
    '/api/commissions/statement',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { repId, period } = request.query as { repId?: string; period: string };
      const targetRepId = repId ?? request.user.userId;

      if (!period) {
        return reply.status(400).send({ error: 'Period is required (YYYY-MM)' });
      }

      const statement = await service.getStatement(request.user.tenantId, targetRepId, period);
      if (!statement) {
        return reply.status(404).send({ error: 'No commission data for this period' });
      }

      return reply.send(statement);
    },
  );

  // Get single commission
  fastify.get(
    '/api/commissions/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const commission = await service.getById(request.user.tenantId, id);
      if (!commission) {
        return reply.status(404).send({ error: 'Commission not found' });
      }
      return reply.send({ data: commission });
    },
  );

  // Approve a commission
  fastify.patch(
    '/api/commissions/:id/approve',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      try {
        const commission = await service.approve(request.user.tenantId, id, request.user.userId);
        if (!commission) {
          return reply.status(404).send({ error: 'Commission not found' });
        }
        return reply.send({ data: commission });
      } catch (err) {
        if (err instanceof Error && err.message.includes('Cannot approve')) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  // Dispute a commission
  fastify.patch(
    '/api/commissions/:id/dispute',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const commission = await service.dispute(request.user.tenantId, id);
      if (!commission) {
        return reply.status(404).send({ error: 'Commission not found' });
      }
      return reply.send({ data: commission });
    },
  );

  // Approve entire statement for a rep/period
  fastify.patch(
    '/api/commissions/statement/approve',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { repId, period } = request.body as { repId: string; period: string };

      if (!repId || !period) {
        return reply.status(400).send({ error: 'repId and period are required' });
      }

      try {
        const result = await service.approveStatement(
          request.user.tenantId,
          repId,
          period,
          request.user.userId,
        );
        return reply.send(result);
      } catch (err) {
        if (err instanceof Error && err.message.includes('Cannot approve')) {
          return reply.status(400).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
