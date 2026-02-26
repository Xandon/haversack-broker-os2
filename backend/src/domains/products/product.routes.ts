import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  productSearchQuerySchema,
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
} from '@haversack/shared';
import {
  searchProducts,
  createProduct,
  getProductById,
  updateProduct,
  softDeleteProduct,
  listProducts,
  ProductError,
} from './product.service';
import type { AuditContext } from './product.service';

function getAuditContext(request: FastifyRequest): AuditContext {
  return {
    actorId: request.user!.userId,
    actorEmail: request.user!.email,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string) ?? undefined,
    requestId: request.requestId,
  };
}

function handleProductError(
  error: unknown,
  requestId: string,
  reply: FastifyReply,
): unknown {
  if (error instanceof ProductError) {
    const statusMap: Record<string, number> = {
      PRODUCT_NOT_FOUND: 404,
      PRODUCT_CONFLICT: 409,
      PRODUCT_SKU_CONFLICT: 409,
    };
    const status = statusMap[error.code] ?? 400;
    return reply.status(status).send({
      error: error.code,
      message: error.message,
      code: error.code,
      requestId,
    });
  }
  throw error;
}

function formatDetailResponse(product: Record<string, unknown>): Record<string, unknown> {
  const brand = product['brand'] as Record<string, unknown> | undefined;
  return {
    id: product['id'],
    name: product['name'],
    sku: product['sku'],
    brand: brand ? { id: brand['id'], name: brand['name'] } : null,
    category: product['category'] ?? null,
    subcategory: product['subcategory'] ?? null,
    description: product['description'] ?? null,
    unitPrice: Number(product['unitPrice']),
    wholesalePrice: product['wholesalePrice'] ? Number(product['wholesalePrice']) : null,
    promotionalPrice: product['promotionalPrice'] ? Number(product['promotionalPrice']) : null,
    promotionalPriceStart: product['promotionalPriceStart'] instanceof Date
      ? (product['promotionalPriceStart'] as Date).toISOString()
      : product['promotionalPriceStart'] ?? null,
    promotionalPriceEnd: product['promotionalPriceEnd'] instanceof Date
      ? (product['promotionalPriceEnd'] as Date).toISOString()
      : product['promotionalPriceEnd'] ?? null,
    caseSize: product['caseSize'] ?? null,
    revenueModelDefault: product['revenueModelDefault'],
    availabilityStatus: product['availabilityStatus'],
    imageUrl: product['imageUrl'] ?? null,
    certifications: product['certifications'] ?? [],
    allergens: product['allergens'] ?? [],
    dietaryAttributes: product['dietaryAttributes'] ?? [],
    commissionRate: brand ? Number(brand['commissionRate']) : 0,
    createdAt: product['createdAt'] instanceof Date
      ? (product['createdAt'] as Date).toISOString()
      : product['createdAt'],
    updatedAt: product['updatedAt'] instanceof Date
      ? (product['updatedAt'] as Date).toISOString()
      : product['updatedAt'],
  };
}

export async function productRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/products/search — real-time product search (must be before :id)
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
        category: query.category,
        certification: query.certification,
        limit: query.limit,
      });

      return reply.status(200).send({ data: products });
    },
  );

  // POST /api/products — create product
  app.post(
    '/api/products',
    { preHandler: [authenticate, authorize('admin', 'manager')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createProductSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const product = await createProduct(app.prisma, tenantId, body, audit);

        return reply
          .status(201)
          .send({ data: formatDetailResponse(product as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleProductError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/products — list products with filters
  app.get(
    '/api/products',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = productListQuerySchema.parse(request.query);
        const tenantId = request.user!.tenantId;

        const result = await listProducts(app.prisma, tenantId, query);

        return reply.status(200).send({
          data: result.data.map((p) =>
            formatDetailResponse(p as unknown as Record<string, unknown>),
          ),
          pagination: result.pagination,
        });
      } catch (error) {
        return handleProductError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/products/:id — get product detail
  app.get(
    '/api/products/:id',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const product = await getProductById(app.prisma, tenantId, request.params.id);

        return reply
          .status(200)
          .send({ data: formatDetailResponse(product as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleProductError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/products/:id — update product
  app.put(
    '/api/products/:id',
    { preHandler: [authenticate, authorize('admin', 'manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = updateProductSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const expectedUpdatedAt = request.headers['if-match'] as string | undefined;
        const audit = getAuditContext(request);

        const product = await updateProduct(
          app.prisma,
          tenantId,
          request.params.id,
          body,
          expectedUpdatedAt,
          audit,
        );

        return reply
          .status(200)
          .send({ data: formatDetailResponse(product as unknown as Record<string, unknown>) });
      } catch (error) {
        return handleProductError(error, request.requestId, reply);
      }
    },
  );

  // DELETE /api/products/:id — soft-delete product
  app.delete(
    '/api/products/:id',
    { preHandler: [authenticate, authorize('admin', 'manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const result = await softDeleteProduct(
          app.prisma,
          tenantId,
          request.params.id,
          audit,
        );

        return reply.status(200).send({ data: result });
      } catch (error) {
        return handleProductError(error, request.requestId, reply);
      }
    },
  );
}
