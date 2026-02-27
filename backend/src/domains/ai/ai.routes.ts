import type { FastifyInstance } from 'fastify';
import { meetingBriefRequestSchema, emailDraftRequestSchema } from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import { AIClient } from '../../shared/ai/ai-client';
import { createProviders } from '../../shared/ai/ai-provider';
import { AIServiceError } from '../../shared/ai/types';
import { generateMeetingBrief, MeetingBriefError } from './meeting-brief.service';
import { generateEmailDraft, EmailDraftError } from './email-draft.service';
import { writeAuditLog } from '../../shared/services/audit.service';

function getAIClient(app: FastifyInstance): AIClient {
  const { primary, fallback } = createProviders();
  return new AIClient({
    primary,
    fallback,
    logger: app.log,
  });
}

function handleAIError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof AIServiceError) {
    return reply.status(503).send({
      error: 'AI_SERVICE_UNAVAILABLE',
      message: error.message,
      code: 'AI_UNAVAILABLE',
      requestId,
    });
  }
  if (error instanceof MeetingBriefError || error instanceof EmailDraftError) {
    const statusMap: Record<string, number> = {
      ACCOUNT_NOT_FOUND: 404,
      CONTACT_NOT_FOUND: 404,
      CONTACT_NO_EMAIL: 400,
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

async function logAIRequest(
  app: FastifyInstance,
  tenantId: string,
  actorId: string,
  actorEmail: string,
  action: string,
  entityId: string,
  details: Record<string, unknown>,
  requestId: string,
): Promise<void> {
  try {
    await writeAuditLog({
      prisma: app.prisma,
      tenantId,
      actorId,
      actorEmail,
      entityType: 'ai_request',
      entityId,
      action: 'create' as import('@prisma/client').AuditAction,
      newValue: JSON.stringify({ aiAction: action, ...details }),
      requestId,
    });
  } catch {
    // Audit log failures should not break AI requests
    app.log.warn({ action, entityId }, 'Failed to write AI audit log');
  }
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/ai/meeting-brief
  app.post(
    '/api/ai/meeting-brief',
    { preHandler: [authenticate, authorize('rep', 'manager', 'admin')] },
    async (request, reply) => {
      const startTime = Date.now();
      const body = meetingBriefRequestSchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const aiClient = getAIClient(app);

      try {
        const result = await generateMeetingBrief(
          app.prisma,
          aiClient,
          tenantId,
          body.account_id,
        );

        const responseTimeMs = Date.now() - startTime;
        await logAIRequest(
          app,
          tenantId,
          request.user!.userId,
          request.user!.email,
          'ai_meeting_brief',
          body.account_id,
          { requestType: 'meeting_brief', responseTimeMs, success: true },
          request.requestId,
        );

        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        const responseTimeMs = Date.now() - startTime;
        await logAIRequest(
          app,
          tenantId,
          request.user!.userId,
          request.user!.email,
          'ai_meeting_brief',
          body.account_id,
          {
            requestType: 'meeting_brief',
            responseTimeMs,
            success: false,
            errorCode:
              error instanceof AIServiceError
                ? error.code
                : error instanceof MeetingBriefError
                  ? error.code
                  : 'UNKNOWN',
          },
          request.requestId,
        );

        return handleAIError(error, request.requestId, reply);
      }
    },
  );

  // POST /api/ai/email-draft
  app.post(
    '/api/ai/email-draft',
    { preHandler: [authenticate, authorize('rep', 'manager', 'admin')] },
    async (request, reply) => {
      const startTime = Date.now();
      const body = emailDraftRequestSchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const senderName = request.user!.email.split('@')[0] ?? 'Rep';
      const aiClient = getAIClient(app);

      try {
        const result = await generateEmailDraft(
          app.prisma,
          aiClient,
          tenantId,
          body.account_id,
          body.contact_id,
          body.purpose,
          senderName,
          {
            context: body.context,
            productIds: body.product_ids,
            tone: body.tone,
          },
        );

        const responseTimeMs = Date.now() - startTime;
        await logAIRequest(
          app,
          tenantId,
          request.user!.userId,
          request.user!.email,
          'ai_email_draft',
          body.account_id,
          {
            requestType: 'email_draft',
            purpose: body.purpose,
            responseTimeMs,
            success: true,
          },
          request.requestId,
        );

        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        const responseTimeMs = Date.now() - startTime;
        await logAIRequest(
          app,
          tenantId,
          request.user!.userId,
          request.user!.email,
          'ai_email_draft',
          body.account_id,
          {
            requestType: 'email_draft',
            responseTimeMs,
            success: false,
            errorCode:
              error instanceof AIServiceError
                ? error.code
                : error instanceof EmailDraftError
                  ? error.code
                  : 'UNKNOWN',
          },
          request.requestId,
        );

        return handleAIError(error, request.requestId, reply);
      }
    },
  );
}
