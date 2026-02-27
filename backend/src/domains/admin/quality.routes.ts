import type { FastifyInstance } from 'fastify';
import { qualityDrillDownQuerySchema } from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import { getLatestQualityScore, getDrillDown, calculateDataQuality } from './quality.service';

export async function adminQualityRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/api/admin/quality/scorecard',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      const tenantId = request.user?.tenantId as string;
      const prisma = app.prisma;

      const score = await getLatestQualityScore(prisma, tenantId);

      if (!score) {
        const newScore = await calculateDataQuality(prisma, tenantId);
        return reply.status(200).send({
          data: {
            accountCompleteness: newScore.accountCompleteness,
            contactEmailValidity: newScore.contactEmailValidity,
            productImages: newScore.productImages,
            duplicateAccountCount: newScore.duplicateAccountCount,
            staleAccountCount: newScore.staleAccountCount,
            compositeScore: newScore.compositeScore,
            calculatedAt: newScore.calculatedAt.toISOString(),
          },
        });
      }

      return reply.status(200).send({ data: score });
    },
  );

  app.get(
    '/api/admin/quality/drill-down',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      const tenantId = request.user?.tenantId as string;
      const prisma = app.prisma;

      const query = qualityDrillDownQuerySchema.parse(request.query);
      const result = await getDrillDown(prisma, tenantId, query.metric, query.page, query.limit);

      return reply.status(200).send({ data: result });
    },
  );
}
