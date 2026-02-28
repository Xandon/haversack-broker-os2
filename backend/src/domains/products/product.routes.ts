import {
  createBrandSchema,
  createProductSchema,
  paginationSchema,
  updateBrandSchema,
  updateProductSchema,
  uuidSchema,
} from '@haversack/shared';
import { FastifyInstance } from 'fastify';

import { createBrandService } from './brand.service.js';
import { createProductService } from './product.service.js';

export async function productRoutes(fastify: FastifyInstance): Promise<void> {
  const productService = createProductService(fastify.prisma);
  const brandService = createBrandService(fastify.prisma);

  // ─── Products ────────────────────────────────────────────────────────────

  fastify.get('/api/products', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const pagination = paginationSchema.parse(request.query);
    const filters = request.query as Record<string, string>;

    const result = await productService.list(request.user.tenantId, pagination, {
      search: filters.search,
      brandId: filters.brandId,
      category: filters.category,
      availabilityStatus: filters.availabilityStatus,
      revenueModel: filters.revenueModel,
      isActive: filters.isActive === 'false' ? false : undefined,
    });

    return reply.send(result);
  });

  fastify.get(
    '/api/products/search',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { q } = request.query as { q: string };
      if (!q || q.length < 2) {
        return reply.send({ data: [] });
      }
      const results = await productService.searchForOrder(request.user.tenantId, q);
      return reply.send({ data: results });
    },
  );

  fastify.get(
    '/api/products/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);

      const product = await productService.getById(request.user.tenantId, id);
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' });
      }
      return reply.send({ data: product });
    },
  );

  fastify.post('/api/products', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const input = createProductSchema.parse(request.body);
    const product = await productService.create(request.user.tenantId, input);
    return reply.status(201).send({ data: product });
  });

  fastify.patch(
    '/api/products/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);
      const input = updateProductSchema.parse(request.body);

      const existing = await productService.getById(request.user.tenantId, id);
      if (!existing) {
        return reply.status(404).send({ error: 'Product not found' });
      }

      const product = await productService.update(request.user.tenantId, id, input);
      return reply.send({ data: product });
    },
  );

  // ─── Brands ──────────────────────────────────────────────────────────────

  fastify.get('/api/brands', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { includeInactive } = request.query as { includeInactive?: string };
    const brands = await brandService.list(request.user.tenantId, includeInactive !== 'true');
    return reply.send({ data: brands });
  });

  fastify.get('/api/brands/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    uuidSchema.parse(id);

    const brand = await brandService.getById(request.user.tenantId, id);
    if (!brand) {
      return reply.status(404).send({ error: 'Brand not found' });
    }
    return reply.send({ data: brand });
  });

  fastify.post('/api/brands', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const input = createBrandSchema.parse(request.body);
    const brand = await brandService.create(request.user.tenantId, input);
    return reply.status(201).send({ data: brand });
  });

  fastify.patch(
    '/api/brands/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      uuidSchema.parse(id);
      const input = updateBrandSchema.parse(request.body);

      const brand = await brandService.update(request.user.tenantId, id, input);
      return reply.send({ data: brand });
    },
  );
}
