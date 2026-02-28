import { FastifyInstance } from 'fastify';

import { createDataQualityService } from './data-quality.service';

export function dataQualityRoutes(fastify: FastifyInstance): void {
  const service = createDataQualityService(fastify.prisma);

  fastify.get('/api/data-quality/scorecard', async (request, reply) => {
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
    }

    const scorecard = await service.getScorecard(tenantId);
    return reply.send({ data: scorecard });
  });
}
