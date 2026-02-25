/**
 * Fastify application bootstrap.
 * Registers all plugins, middleware, and routes in the correct order.
 * Export: buildApp function for use in server.ts and tests.
 */
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { requestIdPlugin } from './shared/middleware/request-id.js';
import { errorHandlerPlugin } from './shared/middleware/error-handler.js';
import { corsPlugin } from './shared/plugins/cors.plugin.js';
import { prismaPlugin } from './shared/plugins/prisma.plugin.js';
import { redisPlugin } from './shared/plugins/redis.plugin.js';
import { auditTrailPlugin } from './shared/middleware/audit-trail.js';
import { authRoutes } from './auth/auth.routes.js';
import { globalRateLimitConfig, rateLimitConfig } from './auth/rate-limit.middleware.js';

const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

export interface BuildAppOptions {
  /** Skip database connection (for unit tests) */
  skipDatabase?: boolean;
  /** Skip Redis connection (for unit tests) */
  skipRedis?: boolean;
}

/**
 * Build and configure the Fastify application with all plugins and routes.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: NODE_ENV === 'production' ? 'info' : 'debug',
      ...(NODE_ENV !== 'production' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
    genReqId: () => '', // Handled by request-id plugin
    requestIdHeader: false,
  });

  // --- Core middleware (order matters) ---

  // 1. Request ID generation
  await app.register(requestIdPlugin);

  // 2. Error handler
  await app.register(errorHandlerPlugin);

  // 3. CORS
  await app.register(corsPlugin);

  // 4. Global rate limiting
  await app.register(rateLimit, globalRateLimitConfig);

  // 5. Database (Prisma)
  if (!options.skipDatabase) {
    await app.register(prismaPlugin);
  }

  // 6. Redis
  if (!options.skipRedis) {
    await app.register(redisPlugin);
  }

  // 7. Audit trail (depends on prisma)
  if (!options.skipDatabase) {
    await app.register(auditTrailPlugin);
  }

  // --- Routes ---

  // Auth routes with stricter rate limiting
  await app.register(
    async (authScope): Promise<void> => {
      // Apply auth-specific rate limit within this scope
      await authScope.register(rateLimit, {
        ...rateLimitConfig,
        // Prefix used to avoid collision with global rate-limit keyPrefix
        keyGenerator: (request): string => `auth:${request.ip}`,
      });

      await authScope.register(authRoutes);
    },
  );

  // Health check endpoint
  app.get('/api/health', async (_request, reply): Promise<void> => {
    void reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'haversack-api',
    });
  });

  return app;
}
