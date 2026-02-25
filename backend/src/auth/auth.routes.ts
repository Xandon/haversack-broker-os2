/**
 * Authentication route handlers for Fastify.
 * POST /api/auth/login    — authenticate with email + password
 * POST /api/auth/refresh  — exchange refresh token for new pair
 * POST /api/auth/logout   — invalidate refresh token
 * All endpoints validate input with Zod and return structured JSON errors.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema, refreshSchema } from './auth.schema.js';
import { login, refreshTokens, logout } from './auth.service.js';
import { verifyAccessToken } from './jwt.service.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/login
   * Validate credentials and return access + refresh tokens.
   */
  app.post(
    '/api/auth/login',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = loginSchema.parse(request.body);

      const result = await login(
        app.prisma,
        body.tenantId,
        body.email,
        body.password,
      );

      void reply.status(200).send({
        data: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          user: result.user,
        },
      });
    },
  );

  /**
   * POST /api/auth/refresh
   * Exchange a valid refresh token for a new access + refresh pair.
   */
  app.post(
    '/api/auth/refresh',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = refreshSchema.parse(request.body);

      const tokens = await refreshTokens(app.prisma, body.refreshToken);

      void reply.status(200).send({
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    },
  );

  /**
   * POST /api/auth/logout
   * Invalidate the user's refresh token. Requires a valid access token.
   */
  app.post(
    '/api/auth/logout',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          code: 'UNAUTHORIZED',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      const token = authHeader.slice(7);
      let decoded: ReturnType<typeof verifyAccessToken>;

      try {
        decoded = verifyAccessToken(token);
      } catch {
        void reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Invalid or expired access token',
          code: 'INVALID_ACCESS_TOKEN',
          requestId: request.requestId ?? 'unknown',
        });
        return;
      }

      await logout(app.prisma, decoded.userId);

      void reply.status(200).send({
        data: { message: 'Logged out successfully' },
      });
    },
  );
}
