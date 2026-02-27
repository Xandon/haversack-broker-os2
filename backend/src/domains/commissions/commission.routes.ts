import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
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
import {
  generateStatements,
  getStatement,
  listStatements,
  approveStatement,
  rejectStatement,
  formatStatementResponse,
  CommissionStatementError,
} from './commission-statement.service';
import {
  fileDispute,
  resolveDispute,
  formatDisputeResponse,
  CommissionDisputeError,
} from './commission-dispute.service';
import {
  exportStatements,
  formatExportResponse,
  CommissionExportError,
} from './commission-export.service';

const statementListQuerySchema = z.object({
  repId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  status: z.enum(['pending', 'approved', 'exported', 'paid']).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const generateStatementSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

const rejectStatementSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const fileDisputeSchema = z.object({
  reason: z.string().min(1).max(1000),
});

const resolveDisputeSchema = z.object({
  resolution: z.enum(['accepted', 'rejected']),
  adjustedAmount: z.number().min(0).optional(),
  resolutionNotes: z.string().min(1).max(1000),
});

const exportSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  forceReExport: z.boolean().default(false),
});

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
  if (
    error instanceof CommissionRuleError ||
    error instanceof CommissionStatementError ||
    error instanceof CommissionDisputeError ||
    error instanceof CommissionExportError
  ) {
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
  // ─── COMMISSION RULES ──────────────────────────────────────

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

  // ─── COMMISSION STATEMENTS ─────────────────────────────────

  // GET /api/commissions/statements — List commission statements
  app.get(
    '/api/commissions/statements',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const query = statementListQuerySchema.parse(request.query);
        const tenantId = request.user!.tenantId;

        const result = await listStatements(
          request.server.prisma,
          tenantId,
          query,
        );

        return reply.status(200).send({
          data: result.data.map(formatStatementResponse),
          pagination: result.pagination,
        });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/commissions/statements/:id — Get commission statement by ID
  app.get(
    '/api/commissions/statements/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;

        const statement = await getStatement(
          request.server.prisma,
          tenantId,
          id,
        );

        return reply.status(200).send({ data: formatStatementResponse(statement) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/commissions/statements/generate — Generate statements for a month (admin only)
  app.post(
    '/api/commissions/statements/generate',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      try {
        const body = generateStatementSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const statements = await generateStatements(
          request.server.prisma,
          tenantId,
          body.month,
          body.year,
          audit,
        );

        return reply.status(201).send({
          data: statements.map(formatStatementResponse),
          count: statements.length,
        });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/commissions/statements/:id/approve — Approve statement (manager only)
  app.post(
    '/api/commissions/statements/:id/approve',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;
        const ifMatch = request.headers['if-match'] as string | undefined;
        const audit = getAuditContext(request);

        const statement = await approveStatement(
          request.server.prisma,
          tenantId,
          id,
          request.user!.userId,
          ifMatch,
          audit,
        );

        return reply.status(200).send({ data: formatStatementResponse(statement) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/commissions/statements/:id/reject — Reject statement (manager only)
  app.post(
    '/api/commissions/statements/:id/reject',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = rejectStatementSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const statement = await rejectStatement(
          request.server.prisma,
          tenantId,
          id,
          body.reason,
          audit,
        );

        return reply.status(200).send({ data: formatStatementResponse(statement) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // ─── COMMISSION DISPUTES ───────────────────────────────────

  // POST /api/commissions/entries/:id/dispute — File dispute on an entry (rep, manager)
  app.post(
    '/api/commissions/entries/:id/dispute',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = fileDisputeSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const dispute = await fileDispute(
          request.server.prisma,
          tenantId,
          id,
          body.reason,
          request.user!.userId,
          audit,
        );

        return reply.status(201).send({ data: formatDisputeResponse(dispute) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/commissions/disputes/:id/resolve — Resolve dispute (manager, admin)
  app.post(
    '/api/commissions/disputes/:id/resolve',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = resolveDisputeSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const dispute = await resolveDispute(
          request.server.prisma,
          tenantId,
          id,
          body,
          request.user!.userId,
          audit,
        );

        return reply.status(200).send({ data: formatDisputeResponse(dispute) });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );

  // ─── COMMISSION EXPORTS ───────────────────────────────────

  // POST /api/commissions/export — Export approved statements to QuickBooks (admin only)
  app.post(
    '/api/commissions/export',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      try {
        const body = exportSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const audit = getAuditContext(request);

        const result = await exportStatements(
          request.server.prisma,
          tenantId,
          body.month,
          body.year,
          body.forceReExport,
          audit,
        );

        return reply.status(201).send({
          data: formatExportResponse(result.export),
          csv: result.csv,
          statementsIncluded: result.statementsIncluded,
          statementsSkipped: result.statementsSkipped,
          totalAmount: result.totalAmount,
        });
      } catch (error) {
        return handleCommissionError(error, request.requestId, reply);
      }
    },
  );
}
