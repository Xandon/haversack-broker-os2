/**
 * AI feature routes.
 * Provides endpoints for reorder suggestions with AI provider abstraction.
 * Implements FR-018, FR-035, FR-036.
 */
import type { FastifyInstance } from 'fastify';

import { extractUser, requireRole } from '../../auth/rbac.middleware.js';
import { reorderSuggestionRequestSchema, submitReorderSchema } from './ai.schema.js';
import { generateReorderSuggestion, submitReorderAsOrder } from './ai.service.js';

/**
 * Register AI routes on the Fastify instance.
 */
export async function aiRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/ai/reorder-suggestions
   * Generate AI-powered reorder suggestions for an account (FR-018).
   */
  app.post(
    '/api/ai/reorder-suggestions',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;
      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const body = reorderSuggestionRequestSchema.parse(request.body);

      try {
        const suggestion = await generateReorderSuggestion(
          app.prisma,
          user.tenantId,
          body.account_id,
        );

        void reply.status(200).send({ data: suggestion });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        // FR-036: AI unavailable → 503
        if (
          message.includes('AI service temporarily unavailable') ||
          message.includes('AI service returned invalid response')
        ) {
          void reply.status(503).send({
            error: 'AI_SERVICE_UNAVAILABLE',
            message: 'AI service temporarily unavailable — please try again in a few minutes',
            code: 'AI_UNAVAILABLE',
            requestId: request.requestId ?? 'unknown',
          });
          return;
        }

        // Account not found → 404
        if (message.includes('Account not found')) {
          void reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Account not found',
            code: 'NOT_FOUND',
            requestId: request.requestId ?? 'unknown',
          });
          return;
        }

        throw err;
      }
    },
  );

  /**
   * POST /api/ai/reorder-suggestions/submit
   * Submit a modified reorder suggestion as a new order (FR-018).
   */
  app.post(
    '/api/ai/reorder-suggestions/submit',
    {
      preHandler: [extractUser, requireRole('rep', 'manager', 'admin')],
    },
    async (request, reply): Promise<void> => {
      const user = request.user;
      if (!user) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const body = submitReorderSchema.parse(request.body);

      try {
        const result = await submitReorderAsOrder(
          app.prisma,
          user.tenantId,
          body,
          user.userId,
          user.email,
        );

        void reply.status(201).send({ data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        if (message.includes('Product not found')) {
          void reply.status(400).send({
            error: 'VALIDATION_ERROR',
            message,
            code: 'PRODUCT_NOT_FOUND',
            requestId: request.requestId ?? 'unknown',
          });
          return;
        }

        throw err;
      }
    },
  );
}
