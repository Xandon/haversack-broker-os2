import type { FastifyInstance } from 'fastify';
import {
  createReportSchema,
  reportListQuerySchema,
  executeReportSchema,
  exportReportSchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createReport,
  getReport,
  listReports,
  deleteReport,
  ReportError,
  type AuditContext,
} from './report.service';
import { executeReport, ReportExecutionError, type ReportDefinition } from './report-executor.service';
import { exportReport } from './report-export.service';

function getAuditContext(request: {
  user?: { userId: string; email: string };
  requestId: string;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}): AuditContext {
  return {
    actorId: request.user!.userId,
    actorEmail: request.user!.email,
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string) ?? '',
    requestId: request.requestId,
  };
}

function handleReportError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof ReportError) {
    const statusMap: Record<string, number> = {
      REPORT_NOT_FOUND: 404,
      REPORT_FORBIDDEN: 403,
      REPORT_INVALID_COLUMNS: 400,
    };
    const status = statusMap[error.code] ?? 400;
    return reply.status(status).send({
      error: error.code,
      message: error.message,
      code: error.code,
      requestId,
    });
  }
  if (error instanceof ReportExecutionError) {
    const statusMap: Record<string, number> = {
      REPORT_CONCURRENCY_LIMIT: 429,
      REPORT_INVALID_ENTITY: 400,
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

async function resolveReportDefinition(
  prisma: unknown,
  tenantId: string,
  userId: string,
  userRole: string,
  body: Record<string, unknown>,
): Promise<ReportDefinition> {
  if (body['reportId']) {
    const report = await getReport(
      prisma as Parameters<typeof getReport>[0],
      tenantId,
      userId,
      userRole,
      body['reportId'] as string,
    );
    return {
      entityType: report.entityType,
      filters: report.filters,
      columns: report.columns,
    };
  }
  return {
    entityType: body['entityType'] as ReportDefinition['entityType'],
    filters: (body['filters'] ?? {}) as ReportDefinition['filters'],
    columns: body['columns'] as string[],
  };
}

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  // ── CRUD ────────────────────────────────────────────────────

  app.post(
    '/api/reports',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const body = createReportSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const userId = request.user!.userId;
        const audit = getAuditContext(request);

        const report = await createReport(
          request.server.prisma,
          tenantId,
          userId,
          body,
          audit,
        );

        return reply.status(201).send({ data: report });
      } catch (error: unknown) {
        return handleReportError(error, request.requestId, reply);
      }
    },
  );

  app.get(
    '/api/reports',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      const query = reportListQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;

      const result = await listReports(
        request.server.prisma,
        tenantId,
        userId,
        query,
      );

      return reply.status(200).send(result);
    },
  );

  app.get(
    '/api/reports/:id',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;
        const userId = request.user!.userId;
        const userRole = request.user!.role;

        const report = await getReport(
          request.server.prisma,
          tenantId,
          userId,
          userRole,
          id,
        );

        return reply.status(200).send({ data: report });
      } catch (error: unknown) {
        return handleReportError(error, request.requestId, reply);
      }
    },
  );

  app.delete(
    '/api/reports/:id',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user!.tenantId;
        const userId = request.user!.userId;
        const userRole = request.user!.role;
        const audit = getAuditContext(request);

        await deleteReport(
          request.server.prisma,
          tenantId,
          userId,
          userRole,
          id,
          audit,
        );

        return reply.status(200).send({ message: 'Report deleted' });
      } catch (error: unknown) {
        return handleReportError(error, request.requestId, reply);
      }
    },
  );

  // ── Execute & Export ────────────────────────────────────────

  app.post(
    '/api/reports/execute',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const body = executeReportSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const userId = request.user!.userId;
        const userRole = request.user!.role;

        const reportDef = await resolveReportDefinition(
          request.server.prisma,
          tenantId,
          userId,
          userRole,
          body as unknown as Record<string, unknown>,
        );

        // Update lastRunAt if it's a saved report
        if (body.reportId) {
          await request.server.prisma.savedReport.update({
            where: { id: body.reportId },
            data: { lastRunAt: new Date() },
          });
        }

        const redis = (request.server as Record<string, unknown>)['redis'] as Parameters<typeof executeReport>[1];
        const result = await executeReport(
          request.server.prisma,
          redis,
          tenantId,
          reportDef,
          { cursor: body.cursor, limit: body.limit },
        );

        return reply.status(200).send(result);
      } catch (error: unknown) {
        return handleReportError(error, request.requestId, reply);
      }
    },
  );

  app.post(
    '/api/reports/export',
    { preHandler: [authenticate, authorize('manager')] },
    async (request, reply) => {
      try {
        const body = exportReportSchema.parse(request.body);
        const tenantId = request.user!.tenantId;
        const userId = request.user!.userId;
        const userRole = request.user!.role;

        const reportDef = await resolveReportDefinition(
          request.server.prisma,
          tenantId,
          userId,
          userRole,
          body as unknown as Record<string, unknown>,
        );

        const redis = (request.server as Record<string, unknown>)['redis'] as Parameters<typeof executeReport>[1];
        const result = await exportReport(
          request.server.prisma,
          redis,
          tenantId,
          reportDef,
          body.format,
        );

        return reply
          .header('Content-Type', result.contentType)
          .header('Content-Disposition', `attachment; filename="${result.filename}"`)
          .send(result.buffer);
      } catch (error: unknown) {
        return handleReportError(error, request.requestId, reply);
      }
    },
  );
}
