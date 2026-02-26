import type { FastifyInstance } from 'fastify';
import { loginRequestSchema, refreshRequestSchema, ERROR_CODES } from '@haversack/shared';
import { login, refresh, logout, AuthError } from './auth.service';
import { authenticate } from '../shared/middleware/authenticate';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/auth/login — rate limited
  app.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: 60_000,
        },
      },
    },
    async (request, reply) => {
      const body = loginRequestSchema.parse(request.body);

      try {
        const result = await login(app.prisma, body.email, body.password);
        return reply.status(200).send(result);
      } catch (error: unknown) {
        if (error instanceof AuthError) {
          return reply.status(401).send({
            error: 'UNAUTHORIZED',
            message: error.message,
            code: error.code,
            requestId: request.requestId,
          });
        }
        throw error;
      }
    },
  );

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', async (request, reply) => {
    const body = refreshRequestSchema.parse(request.body);

    try {
      const result = await refresh(app.prisma, body.refreshToken);
      return reply.status(200).send(result);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: error.message,
          code: error.code,
          requestId: request.requestId,
        });
      }
      throw error;
    }
  });

  // POST /api/auth/logout — requires authentication
  app.post(
    '/api/auth/logout',
    { preHandler: [authenticate] },
    async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: ERROR_CODES.AUTH_MISSING_TOKEN,
          requestId: request.requestId,
        });
      }

      await logout(app.prisma, request.user.userId);
      return reply.status(200).send({ message: 'Logged out successfully' });
    },
  );
}
