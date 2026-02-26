import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { requestIdPluginRegistration } from '../plugins/request-id.plugin';
import { rateLimitPluginRegistration } from '../plugins/rate-limit.plugin';
import { errorHandler } from '../middleware/error-handler';
import { authRoutes } from '../../auth/auth.routes';
import { accountRoutes } from '../../domains/accounts/account.routes';
import { ERROR_CODES } from '@haversack/shared';

export async function buildTestApp(
  prisma: Record<string, unknown>,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  // Register request ID plugin
  await app.register(requestIdPluginRegistration);

  // Register rate limit (with in-memory store for tests)
  await app.register(rateLimitPluginRegistration);

  // Decorate with prisma
  app.decorate('prisma', prisma);

  // Error handler
  app.setErrorHandler(errorHandler);

  // Routes
  await app.register(authRoutes);
  await app.register(accountRoutes);

  // Health check
  app.get('/api/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: 'NOT_FOUND',
      message: 'Route not found',
      code: ERROR_CODES.ROUTE_NOT_FOUND,
      requestId: request.requestId,
    });
  });

  await app.ready();
  return app;
}
