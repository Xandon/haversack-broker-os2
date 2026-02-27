import type { FastifyInstance } from 'fastify';
import {
  createCommissionRuleSchema,
  updateCommissionRuleSchema,
  commissionRuleListQuerySchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createCommissionRule,
  getCommissionRule,
  updateCommissionRule,
  listCommissionRules,
  formatRuleResponse,
  CommissionRuleError,
} from './commission-rule.service';

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

function handleCommissionError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof CommissionRuleError) {
    const statusMap: Record<string, number> = {
      COMMISSION_RULE_NOT_FOUND: 404,
      COMMISSION_RULE_CONFLICT: 409,
      COMMISSION_STATEMENT_NOT_FOUND: 404,
      COMMISSION_STATEMENT_NOT_PENDING: 409,
      COMMISSION_STATEMENT_HAS_DISPUTES: 409,
      COMMISSION_STATEMENT_CONFLICT: 409,
      COMMISSION_ENTRY_NOT_FOUND: 404,
      COMMISSION_DISPUTE_NOT_FOUND: 404,
      COMMISSION_DISPUTE_ALREADY_EXISTS: 409,
      COMMISSION_EXPORT_ALREADY_EXISTS: 409,
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

export async function commissionRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/commissions/rules — Create commission rule (admin only)
  app.post(
    '/api/commissions/rules',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      try {
        const body = createCommissionRuleSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const rule = await createCommissionRule(
          request.server.prisma,
          tenantId,
          body,
          audit,
        );

        return reply.status(201).send({ data: formatRuleResponse(rule) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/commissions/rules — List commission rules
  app.get(
    '/api/commissions/rules',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const query = commissionRuleListQuerySchema.parse(request.query);
        const tenantId = request.user!.tenantId;

        const result = await listCommissionRules(
          request.server.prisma,
          tenantId,
          query,
        );

        return reply.status(200).send({
          data: result.data.map(formatRuleResponse),
          pagination: result.pagination,
        });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/commissions/rules/:id — Get commission rule by ID
  app.get(
    '/api/commissions/rules/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;

        const rule = await getCommissionRule(
          request.server.prisma,
          tenantId,
          id,
        );

        return reply.status(200).send({ data: formatRuleResponse(rule) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/commissions/rules/:id — Update commission rule (creates new version)
  app.put(
    '/api/commissions/rules/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateCommissionRuleSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const ifMatch = request.headers['if-match'] as string | undefined;
        const audit = getAuditContext(request);

        const rule = await updateCommissionRule(
          request.server.prisma,
          tenantId,
          id,
          body,
          ifMatch,
          audit,
        );

        return reply.status(200).send({ data: formatRuleResponse(rule) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );
}
