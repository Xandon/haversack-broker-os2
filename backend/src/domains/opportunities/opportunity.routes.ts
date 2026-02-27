import type { FastifyInstance } from 'fastify';
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  transitionOpportunitySchema,
  opportunityListQuerySchema,
  pipelineSummaryQuerySchema,
  winLossQuerySchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createOpportunity,
  getOpportunityById,
  updateOpportunity,
  listOpportunities,
  softDeleteOpportunity,
  transitionOpportunity,
  formatOpportunityResponse,
  OpportunityError,
} from './opportunity.service';
import { getPipelineSummary, getWinLossAnalytics } from './pipeline.service';

function getAuditContext(request: { user?: { userId: string; email: string }; requestId: string; ip: string; headers: Record<string, string | string[] | undefined> }): {
  actorId: string;
  actorEmail: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
} {
  return {
    actorId: request.user!.userId,
    actorEmail: request.user!.email,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string) ?? '',
    requestId: request.requestId,
  };
}

function handleOpportunityError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof OpportunityError) {
    const statusMap: Record<string, number> = {
      OPPORTUNITY_NOT_FOUND: 404,
      OPPORTUNITY_CONFLICT: 409,
      OPPORTUNITY_CLOSED: 400,
      OPPORTUNITY_CLOSE_REASON_REQUIRED: 400,
      ACCOUNT_NOT_FOUND: 404,
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

export async function opportunityRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/opportunities
  app.post(
    '/api/opportunities',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const body = createOpportunitySchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      try {
        const opportunity = await createOpportunity(
          app.prisma,
          tenantId,
          body,
          request.user!.userId,
          getAuditContext(request),
        );

        return reply.status(201).send({ data: formatOpportunityResponse(opportunity) });
      } catch (error: unknown) {
        return handleOpportunityError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/opportunities
  app.get(
    '/api/opportunities',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = opportunityListQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      // Rep sees only own opportunities; manager/admin sees all
      const scopedRepId = (userRole === 'rep') ? request.user!.userId : undefined;

      const result = await listOpportunities(
        app.prisma,
        tenantId,
        query,
        scopedRepId,
      );

      return reply.status(200).send({
        data: result.data.map(formatOpportunityResponse),
        pagination: result.pagination,
      });
    },
  );

  // GET /api/opportunities/:id
  app.get(
    '/api/opportunities/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const opportunity = await getOpportunityById(app.prisma, tenantId, id);
        return reply.status(200).send({ data: formatOpportunityResponse(opportunity) });
      } catch (error: unknown) {
        return handleOpportunityError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/opportunities/:id
  app.put(
    '/api/opportunities/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateOpportunitySchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const ifMatch = request.headers['if-match'] as string | undefined;

      try {
        const opportunity = await updateOpportunity(
          app.prisma,
          tenantId,
          id,
          body,
          ifMatch,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: formatOpportunityResponse(opportunity) });
      } catch (error: unknown) {
        return handleOpportunityError(error, request.requestId, reply);
      }
    },
  );

  // DELETE /api/opportunities/:id
  app.delete(
    '/api/opportunities/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await softDeleteOpportunity(
          app.prisma,
          tenantId,
          id,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        return handleOpportunityError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/opportunities/:id/transition
  app.post(
    '/api/opportunities/:id/transition',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = transitionOpportunitySchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      try {
        const opportunity = await transitionOpportunity(
          app.prisma,
          tenantId,
          id,
          body,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: formatOpportunityResponse(opportunity) });
      } catch (error: unknown) {
        return handleOpportunityError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/pipeline/summary
  app.get(
    '/api/pipeline/summary',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = pipelineSummaryQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      const scopedRepId = (userRole === 'rep') ? request.user!.userId : undefined;

      const result = await getPipelineSummary(app.prisma, tenantId, query, scopedRepId);
      return reply.status(200).send({ data: result });
    },
  );

  // GET /api/pipeline/analytics
  app.get(
    '/api/pipeline/analytics',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const query = winLossQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;
      const userRole = request.user!.role;

      const scopedRepId = (userRole === 'rep') ? request.user!.userId : undefined;

      const result = await getWinLossAnalytics(app.prisma, tenantId, query, scopedRepId);
      return reply.status(200).send({ data: result });
    },
  );
}
