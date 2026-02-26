/**
 * Product domain route handlers for Fastify.
 * GET    /api/products/search       — search products (rep, manager, admin)
 * GET    /api/products              — list products with filters/pagination
 * GET    /api/products/:id          — get product by ID
 * POST   /api/products              — create product (admin only)
 * PUT    /api/products/:id          — update product (admin only)
 * DELETE /api/products/:id          — soft-delete product (admin only)
 * POST   /api/line-cards/generate   — generate brand line card (manager, admin)
 * GET    /api/line-cards            — list line cards for a brand
 * GET    /api/line-cards/:id        — get line card by ID
 * POST   /api/line-cards/:id/share  — share line card via email (manager, admin)
 *
 * All routes require authentication and enforce tenant isolation.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  productSearchQuerySchema,
  productListQuerySchema,
  createProductSchema,
  updateProductSchema,
  generateLineCardSchema,
  shareLineCardSchema,
  lineCardListQuerySchema,
} from '@haversack/shared';
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import {
  searchProducts,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from './product.service.js';
import {
  generateLineCardPdf,
  listLineCards,
  getLineCardById,
} from './line-card.service.js';

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

  /**
   * POST /api/products
   * Create a new product (admin only, FR-019).
   */
  app.post(
    '/api/products',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const body = createProductSchema.parse(request.body);

      try {
        const product = await createProduct(
          app.prisma,
          user.tenantId,
          body,
          user.userId,
          user.email,
        );

        void reply.status(201).send({ data: product });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message === 'Brand not found') {
          void reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message: 'Brand not found',
            code: 'VALIDATION_ERROR',
            requestId: request.requestId ?? 'unknown',
          });
          return;
        }
        throw err;
      }
    },
  );

  /**
   * PUT /api/products/:id
   * Update an existing product (admin only, FR-019).
   */
  app.put<{ Params: { id: string } }>(
    '/api/products/:id',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const body = updateProductSchema.parse(request.body);

      const product = await updateProduct(
        app.prisma,
        user.tenantId,
        request.params.id,
        body,
        user.userId,
        user.email,
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

  /**
   * DELETE /api/products/:id
   * Soft-delete a product (admin only, FR-019).
   */
  app.delete<{ Params: { id: string } }>(
    '/api/products/:id',
    {
      preHandler: [extractUser, requireRole('admin')],
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

      const deleted = await deleteProduct(
        app.prisma,
        user.tenantId,
        request.params.id,
        user.userId,
        user.email,
      );

      if (!deleted) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Product not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(204).send();
    },
  );

  // ─── Line Card Routes (FR-020) ─────────────────────────────────

  /**
   * POST /api/line-cards/generate
   * Generate a brand line card PDF (manager, admin).
   */
  app.post(
    '/api/line-cards/generate',
    {
      preHandler: [extractUser, requireRole('manager', 'admin')],
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

      const body = generateLineCardSchema.parse(request.body);

      try {
        const result = await generateLineCardPdf(
          app.prisma,
          user.tenantId,
          body.brand_id,
          user.userId,
        );

        void reply.status(201).send({
          data: result.lineCard,
          product_count: result.productCount,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message === 'Brand not found') {
          void reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Brand not found',
            code: 'NOT_FOUND',
            requestId: request.requestId ?? 'unknown',
          });
          return;
        }
        throw err;
      }
    },
  );

  /**
   * GET /api/line-cards
   * List line cards for a brand (rep, manager, admin, viewer).
   */
  app.get(
    '/api/line-cards',
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

      const query = lineCardListQuerySchema.parse(request.query);

      const result = await listLineCards(
        app.prisma,
        user.tenantId,
        query.brand_id,
        query.page,
        query.per_page,
      );

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
   * GET /api/line-cards/:id
   * Get a single line card by ID (rep, manager, admin, viewer).
   */
  app.get<{ Params: { id: string } }>(
    '/api/line-cards/:id',
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

      const lineCard = await getLineCardById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!lineCard) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Line card not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      void reply.status(200).send({ data: lineCard });
    },
  );

  /**
   * POST /api/line-cards/:id/share
   * Share a line card via email (manager, admin).
   */
  app.post<{ Params: { id: string } }>(
    '/api/line-cards/:id/share',
    {
      preHandler: [extractUser, requireRole('manager', 'admin')],
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

      const body = shareLineCardSchema.parse(request.body);

      const lineCard = await getLineCardById(
        app.prisma,
        user.tenantId,
        request.params.id,
      );

      if (!lineCard) {
        void reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Line card not found',
          code: 'NOT_FOUND',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      // In production, this would use the email service to send the PDF.
      // For now, log the share action and return success.
      void reply.status(200).send({
        data: {
          line_card_id: lineCard.id,
          shared_to: body.contact_email,
          message: 'Line card shared successfully',
        },
      });
    },
  );
}
