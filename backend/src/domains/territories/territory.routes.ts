import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';

export async function territoryRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/territories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const tenantId = request.user!.tenantId;

      const territories = await app.prisma.territory.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, region: true },
        orderBy: { name: 'asc' },
      });

      return reply.status(200).send({ data: territories });
    },
  );
}
