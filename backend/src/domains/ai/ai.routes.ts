import type { FastifyInstance } from 'fastify';
import { meetingBriefRequestSchema, emailDraftRequestSchema, activitySummaryRequestSchema } from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import { AIClient } from '../../shared/ai/ai-client';
import { createProviders } from '../../shared/ai/ai-provider';
import { AIServiceError } from '../../shared/ai/types';
import { generateMeetingBrief, MeetingBriefError } from './meeting-brief.service';
import { generateEmailDraft, EmailDraftError } from './email-draft.service';
import { generateActivitySummary, ActivitySummaryError } from './activity-summary.service';
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
  if (
    error instanceof MeetingBriefError ||
    error instanceof EmailDraftError ||
    error instanceof ActivitySummaryError
  ) {
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

const RATE_LIMITS: Record<string, number> = {
  'meeting-brief': 10,
  'email-draft': 15,
  'activity-summary': 10,
};

const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();

/** @internal Exposed for testing only */
export function resetRateLimitCounters(): void {
  rateLimitCounters.clear();
}

function checkRateLimit(userId: string, endpoint: string): { allowed: boolean; retryAfterSeconds: number } {
  const limit = RATE_LIMITS[endpoint] ?? 10;
  const key = `ai:ratelimit:${userId}:${endpoint}`;
  const now = Date.now();
  const entry = rateLimitCounters.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitCounters.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/ai/meeting-brief
  app.post(
    '/api/ai/meeting-brief',
    { preHandler: [authenticate, authorize('rep', 'manager', 'admin')] },
    async (request, reply) => {
      const rateCheck = checkRateLimit(request.user!.userId, 'meeting-brief');
      if (!rateCheck.allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many AI requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          requestId: request.requestId,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
      }

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
      const rateCheck = checkRateLimit(request.user!.userId, 'email-draft');
      if (!rateCheck.allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many AI requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          requestId: request.requestId,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
      }

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

  // POST /api/ai/activity-summary
  app.post(
    '/api/ai/activity-summary',
    { preHandler: [authenticate, authorize('rep', 'manager', 'admin')] },
    async (request, reply) => {
      const rateCheck = checkRateLimit(request.user!.userId, 'activity-summary');
      if (!rateCheck.allowed) {
        return reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many AI requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          requestId: request.requestId,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        });
      }

      const startTime = Date.now();
      const body = activitySummaryRequestSchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const aiClient = getAIClient(app);

      try {
        const result = await generateActivitySummary(
          app.prisma,
          aiClient,
          tenantId,
          body.account_id,
          body.period_months,
        );

        const responseTimeMs = Date.now() - startTime;
        await logAIRequest(
          app,
          tenantId,
          request.user!.userId,
          request.user!.email,
          'ai_activity_summary',
          body.account_id,
          { requestType: 'activity_summary', periodMonths: body.period_months, responseTimeMs, success: true },
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
          'ai_activity_summary',
          body.account_id,
          {
            requestType: 'activity_summary',
            responseTimeMs,
            success: false,
            errorCode:
              error instanceof AIServiceError
                ? error.code
                : error instanceof ActivitySummaryError
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
