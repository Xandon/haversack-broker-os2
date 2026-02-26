import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import { productSearchQuerySchema } from '@haversack/shared';
import { searchProducts } from './product.service';

export async function productRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/products/search — real-time product search
  app.get(
    '/api/products/search',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = productSearchQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const products = await searchProducts(app.prisma, tenantId, {
        q: query.q,
        brandId: query.brandId,
        availabilityStatus: query.availabilityStatus,
        limit: query.limit,
      });

      return reply.status(200).send({ data: products });
    },
  );
}
