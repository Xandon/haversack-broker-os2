import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createBrandSchema,
  updateBrandSchema,
  brandListQuerySchema,
  lineCardShareSchema,
} from '@haversack/shared';
import {
  createBrand,
  getBrandById,
  updateBrand,
  listBrands,
  formatBrandResponse,
  formatBrandWithCountsResponse,
  BrandError,
} from './brand.service';
import type { AuditContext } from './brand.service';
import { generateLineCard } from './line-card.service';
import { shareLineCard } from './line-card-share.service';

function getAuditContext(request: FastifyRequest): AuditContext {
  return {
    actorId: request.user!.userId,
    actorEmail: request.user!.email,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string) ?? undefined,
    requestId: request.requestId,
  };
}

function handleBrandError(
  error: unknown,
  requestId: string,
  reply: FastifyReply,
): unknown {
  if (error instanceof BrandError) {
    const statusMap: Record<string, number> = {
      BRAND_NOT_FOUND: 404,
      BRAND_CONFLICT: 409,
      BRAND_NAME_CONFLICT: 409,
      BRAND_NO_ACTIVE_PRODUCTS: 400,
      BRAND_ACCOUNT_NOT_FOUND: 404,
      BRAND_NO_PRIMARY_CONTACT: 400,
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

export async function brandRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/brands — create brand
  app.post(
    '/api/brands',
    { preHandler: [authenticate, authorize('admin', 'manager')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createBrandSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const brand = await createBrand(app.prisma, tenantId, body, audit);

        return reply.status(201).send({ data: formatBrandResponse(brand) });
      } catch (error) {
        return handleBrandError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/brands — list brands with product counts
  app.get(
    '/api/brands',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = brandListQuerySchema.parse(request.query);
        const tenantId = request.user!.tenantId;

        const result = await listBrands(app.prisma, tenantId, query);

        return reply.status(200).send({
          data: result.data.map(formatBrandWithCountsResponse),
          pagination: result.pagination,
        });
      } catch (error) {
        return handleBrandError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/brands/:id — get brand detail
  app.get(
    '/api/brands/:id',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const brand = await getBrandById(app.prisma, tenantId, request.params.id);

        return reply.status(200).send({ data: formatBrandResponse(brand) });
      } catch (error) {
        return handleBrandError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/brands/:id — update brand
  app.put(
    '/api/brands/:id',
    { preHandler: [authenticate, authorize('admin', 'manager')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = updateBrandSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const expectedUpdatedAt = request.headers['if-match'] as string | undefined;
        const audit = getAuditContext(request);

        const brand = await updateBrand(
          app.prisma,
          tenantId,
          request.params.id,
          body,
          expectedUpdatedAt,
          audit,
        );

        return reply.status(200).send({ data: formatBrandResponse(brand) });
      } catch (error) {
        return handleBrandError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/brands/:id/line-card — generate line card PDF
  app.get(
    '/api/brands/:id/line-card',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const tenantId = request.user!.tenantId;
        const { buffer, filename } = await generateLineCard(
          app.prisma,
          tenantId,
          request.params.id,
        );

        return reply
          .header('Content-Type', 'application/pdf')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(buffer);
      } catch (error) {
        return handleBrandError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/brands/:id/line-card/share — share line card via email
  app.post(
    '/api/brands/:id/line-card/share',
    { preHandler: [authenticate, authorize('admin', 'manager', 'rep')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = lineCardShareSchema.parse(request.body);
        const tenantId = request.user!.tenantId;

        const result = await shareLineCard(
          app.prisma,
          tenantId,
          request.params.id,
          body.accountId,
        );

        return reply.status(200).send({
          data: {
            shared: true,
            recipientEmail: result.recipientEmail,
            recipientName: result.recipientName,
            brandName: result.brandName,
            filename: result.filename,
          },
        });
      } catch (error) {
        return handleBrandError(error, request.requestId, reply);
      }
    },
  );
}
