/**
 * Product domain route handlers for Fastify.
 * GET    /api/products/search  — search products (rep, manager, admin)
 * GET    /api/products         — list products with filters/pagination
 * GET    /api/products/:id     — get product by ID
 *
 * All routes require authentication and enforce tenant isolation.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  productSearchQuerySchema,
  productListQuerySchema,
} from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import {
  searchProducts,
  listProducts,
  getProductById,
} from './product.service.js';

export async function productRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/products/search
   * Search products for order entry (FR-015).
   */
  app.get(
    '/api/products/search',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const query = productSearchQuerySchema.parse(request.query);

      const result = await searchProducts(app.prisma, user.tenantId, query.q, {
        brandId: query.brand_id,
        category: query.category,
        certification: query.certification,
        availability: query.availability,
        limit: query.limit,
      });

      void reply.status(200).send({
        data: result.items.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand ?? null,
          category: p.category,
          unit_price: Number(p.unit_price),
          wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : null,
          case_size: p.case_size,
          availability_status: p.availability_status,
          certifications: p.certifications,
          revenue_model: p.revenue_model,
          promo_price: p.promo_price ? Number(p.promo_price) : null,
          promo_active: p.promo_active,
          promo_end_date: p.promo_end_date,
          image_url: p.image_url,
        })),
        total_count: result.totalCount,
      });
    },
  );

  /**
   * GET /api/products
   * List products with filters and pagination.
   */
  app.get(
    '/api/products',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'viewer')],
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const query = productListQuerySchema.parse(request.query);

      const result = await listProducts(app.prisma, user.tenantId, {
        brandId: query.brand_id,
        category: query.category,
        subcategory: query.subcategory,
        certification: query.certification,
        allergen: query.allergen,
        dietary: query.dietary,
        availability: query.availability,
        revenueModel: query.revenue_model,
        isActive: query.is_active,
        page: query.page,
        pageSize: query.per_page,
        sortBy: query.sort_by,
        sortOrder: query.sort_order,
      });

      void reply.status(200).send({
        data: result.items,
        pagination: {
          page: result.page,
          per_page: result.pageSize,
          total_count: result.total,
          total_pages: Math.ceil(result.total / result.pageSize),
        },
      });
    },
  );

  /**
   * GET /api/products/:id
   * Get a single product by ID.
   */
  app.get<{ Params: { id: string } }>(
    '/api/products/:id',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin', 'viewer')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;

      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const product = await getProductById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!product) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Product not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: product });
    },
  );
}
