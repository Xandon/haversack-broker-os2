import type { FastifyInstance } from 'fastify';
import {
  createActivitySchema,
  updateActivitySchema,
  activityListQuerySchema,
  activityMetricsQuerySchema,
  timelineQuerySchema,
} from '@haversack/shared';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createActivity,
  getActivityById,
  updateActivity,
  softDeleteActivity,
  listActivities,
  ActivityError,
} from './activity.service';
import { getActivityMetrics } from './metrics.service';
import { getTimeline } from './timeline.service';

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

function handleActivityError(
  error: unknown,
  requestId: string,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof ActivityError) {
    const statusMap: Record<string, number> = {
      ACCOUNT_NOT_FOUND: 404,
      ACTIVITY_NOT_FOUND: 404,
      ACTIVITY_EDIT_WINDOW_EXPIRED: 403,
      ACTIVITY_CONFLICT: 409,
      ACTIVITY_DEMO_REQUIRED: 400,
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

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/activities
  app.post(
    '/api/activities',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const body = createActivitySchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;

      try {
        const activity = await createActivity(
          app.prisma,
          tenantId,
          userId,
          body,
          getAuditContext(request),
        );

        return reply.status(201).send({ data: activity });
      } catch (error: unknown) {
        return handleActivityError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/activities/metrics
  app.get(
    '/api/activities/metrics',
    { preHandler: [authenticate, authorize('manager', 'admin')] },
    async (request, reply) => {
      const query = activityMetricsQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      const result = await getActivityMetrics(app.prisma, tenantId, {
        startDate: query.startDate,
        endDate: query.endDate,
        groupBy: query.groupBy,
      });

      return reply.status(200).send({ data: result });
    },
  );

  // GET /api/activities/:id
  app.get(
    '/api/activities/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const activity = await getActivityById(app.prisma, tenantId, id);
        return reply.status(200).send({ data: activity });
      } catch (error: unknown) {
        return handleActivityError(error, request.requestId, reply);
      }
    },
  );

  // PUT /api/activities/:id
  app.put(
    '/api/activities/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateActivitySchema.parse(request.body);
      const tenantId = request.user!.tenantId;
      const userId = request.user!.userId;
      const role = request.user!.role;
      const ifMatch = request.headers['if-match'] as string | undefined;
      const expectedVersion = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;

      try {
        const activity = await updateActivity(
          app.prisma,
          tenantId,
          id,
          body,
          userId,
          role,
          expectedVersion,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: activity });
      } catch (error: unknown) {
        return handleActivityError(error, request.requestId, reply);
      }
    },
  );

  // DELETE /api/activities/:id
  app.delete(
    '/api/activities/:id',
    { preHandler: [authenticate, authorize('rep', 'manager')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user!.tenantId;

      try {
        const result = await softDeleteActivity(
          app.prisma,
          tenantId,
          id,
          getAuditContext(request),
        );

        return reply.status(200).send({ data: result });
      } catch (error: unknown) {
        return handleActivityError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/accounts/:id/activities
  app.get(
    '/api/accounts/:id/activities',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = activityListQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      try {
        const result = await listActivities(app.prisma, tenantId, id, {
          type: query.type,
          startDate: query.startDate,
          endDate: query.endDate,
          cursor: query.cursor,
          limit: query.limit,
        });

        return reply.status(200).send(result);
      } catch (error: unknown) {
        return handleActivityError(error, request.requestId, reply);
      }
    },
  );

  // GET /api/accounts/:id/timeline
  app.get(
    '/api/accounts/:id/timeline',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const query = timelineQuerySchema.parse(request.query);
      const tenantId = request.user!.tenantId;

      try {
        const result = await getTimeline(app.prisma, tenantId, id, {
          types: query.types,
          activityType: query.activityType,
          startDate: query.startDate,
          endDate: query.endDate,
          cursor: query.cursor,
          limit: query.limit,
        });

        return reply.status(200).send(result);
      } catch (error: unknown) {
        return handleActivityError(error, request.requestId, reply);
      }
    },
  );
}
