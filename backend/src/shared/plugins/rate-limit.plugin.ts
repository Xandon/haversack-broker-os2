import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { AUTH_CONFIG, ERROR_CODES } from '@haversack/shared';

async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: false,
    max: AUTH_CONFIG.RATE_LIMIT_MAX,
    timeWindow: AUTH_CONFIG.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => {
      return request.ip;
    },
    errorResponseBuilder: (_request, context) => {
      return {
        error: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds`,
        code: ERROR_CODES.AUTH_RATE_LIMITED,
        requestId: _request.requestId,
      };
    },
  });
}

export const rateLimitPluginRegistration = fp(rateLimitPlugin, {
  name: 'rate-limit',
});
