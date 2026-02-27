import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate';
import { authorize } from '../../shared/middleware/authorize';
import {
  createRule,
  getRuleById,
  listRules,
  updateRule,
  deleteRule,
  BusinessRuleError,
} from './business-rule.service';

const conditionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.object({
    logic: z.enum(['AND', 'OR']),
    conditions: z.array(
      z.union([
        z.object({
          field: z.string().min(1),
          operator: z.string().min(1),
          value: z.unknown(),
        }),
        conditionSchema,
      ]),
    ).min(1),
  }),
);

const actionSchema = z.object({
  type: z.enum(['send_notification', 'update_field', 'create_task', 'send_email']),
  config: z.record(z.unknown()),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  entityType: z.string().min(1),
  conditions: conditionSchema,
  actions: z.array(actionSchema).min(1),
  priority: z.number().int().min(1).max(1000).optional(),
});

const updateRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  conditions: conditionSchema.optional(),
  actions: z.array(actionSchema).min(1).optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

function handleRuleError(
  error: unknown,
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
): unknown {
  if (error instanceof BusinessRuleError) {
    const status = error.code === 'RULE_NOT_FOUND' ? 404 : 400;
    return reply.status(status).send({
      error: error.code,
      message: error.message,
      code: error.code,
    });
  }
  throw error;
}

export async function businessRuleRoutes(app: FastifyInstance): Promise<void> {
  // List rules
  app.get(
    '/api/business-rules',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const query = request.query as Record<string, string | undefined>;
      const result = await listRules(
        request.server.prisma,
        request.user!.tenantId,
        { status: query['status'], entityType: query['entityType'] },
      );

      return reply.send({ data: result.rules, total: result.total });
    },
  );

  // Get rule by ID
  app.get(
    '/api/business-rules/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        const rule = await getRuleById(
          request.server.prisma,
          request.user!.tenantId,
          id,
        );
        return reply.send({ data: rule });
      } catch (err) {
        return handleRuleError(err, reply);
      }
    },
  );

  // Create rule
  app.post(
    '/api/business-rules',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const parsed = createRuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join('; '),
          code: 'VALIDATION_ERROR',
        });
      }

      try {
        const rule = await createRule(
          request.server.prisma,
          request.user!.tenantId,
          request.user!.userId,
          parsed.data as Parameters<typeof createRule>[3],
          { actorId: request.user!.userId, actorEmail: request.user!.email },
        );
        return reply.status(201).send({ data: rule });
      } catch (err) {
        return handleRuleError(err, reply);
      }
    },
  );

  // Update rule
  app.put(
    '/api/business-rules/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateRuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join('; '),
          code: 'VALIDATION_ERROR',
        });
      }

      try {
        const rule = await updateRule(
          request.server.prisma,
          request.user!.tenantId,
          id,
          parsed.data as Parameters<typeof updateRule>[3],
          { actorId: request.user!.userId, actorEmail: request.user!.email },
        );
        return reply.send({ data: rule });
      } catch (err) {
        return handleRuleError(err, reply);
      }
    },
  );

  // Delete rule
  app.delete(
    '/api/business-rules/:id',
    { preHandler: [authenticate, authorize('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        await deleteRule(
          request.server.prisma,
          request.user!.tenantId,
          id,
          { actorId: request.user!.userId, actorEmail: request.user!.email },
        );
        return reply.status(204).send();
      } catch (err) {
        return handleRuleError(err, reply);
      }
    },
  );
}
