import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { requestIdPluginRegistration } from './shared/plugins/request-id.plugin';
import { corsPluginRegistration } from './shared/plugins/cors.plugin';
import { helmetPluginRegistration } from './shared/plugins/helmet.plugin';
import { redisPluginRegistration } from './shared/plugins/redis.plugin';
import { rateLimitPluginRegistration } from './shared/plugins/rate-limit.plugin';
import { prismaPluginRegistration } from './shared/plugins/prisma.plugin';
import { errorHandler } from './shared/middleware/error-handler';
import { authRoutes } from './auth/auth.routes';
import { accountRoutes } from './domains/accounts/account.routes';
import { ERROR_CODES } from '@haversack/shared';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      transport:
        process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
    },
    genReqId: () => '',
  });

  // Register plugins in order
  await app.register(requestIdPluginRegistration);
  await app.register(corsPluginRegistration);
  await app.register(helmetPluginRegistration);
  await app.register(redisPluginRegistration);
  await app.register(rateLimitPluginRegistration);
  await app.register(prismaPluginRegistration);

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

  return app;
}
