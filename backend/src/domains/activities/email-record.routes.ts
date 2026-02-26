import type { FastifyInstance } from 'fastify';
import {
  createEmailRecordSchema,
  emailEngagementSchema,
  unmatchedEmailQuerySchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createEmailRecord,
  listUnmatchedEmails,
  updateEngagement,
  EmailRecordError,
} from './email-record.service';

function getAuditContext(request: {
  user?: { userId: string; email: string };
  requestId: string;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}): {
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

function handleEmailError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof EmailRecordError) {
    const statusMap: Record<string, number> = {
      EMAIL_RECORD_NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
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

export async function emailRecordRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/email-records
  app.post(
    '/api/email-records',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const body = createEmailRecordSchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;

      const record = await createEmailRecord(
        app.prisma,
        tenantId,
        userId,
        body,
        getAuditContext(request),
      );

      return reply.status(201).send({ data: record });
    },
  );

  // GET /api/email-records/unmatched
  app.get(
    '/api/email-records/unmatched',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const query = unmatchedEmailQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await listUnmatchedEmails(app.prisma, tenantId, {
        cursor: query.cursor,
        limit: query.limit,
      });

      return reply.status(200).send(result);
    },
  );

  // PUT /api/email-records/:id/engagement
  app.put(
    '/api/email-records/:id/engagement',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = emailEngagementSchema.parse(request.body);
      const tenantId = request.user!.tenantId;

      try {
        const record = await updateEngagement(
          app.prisma,
          tenantId,
          id,
          body,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: record });
      } catch (error: unknown) {
        return handleEmailError(error, request.requestId, reply);
      }
    },
  );
}
