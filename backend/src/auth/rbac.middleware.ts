/**
 * Role-Based Access Control (RBAC) middleware for Fastify.
 * 5 roles: admin, manager, rep, logistics, viewer
 * - extractUser: preHandler hook that extracts and validates JWT from Authorization header
 * - requireRole: factory that returns a preHandler restricting access to specified roles
 */
import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { verifyAccessToken, type DecodedToken } from './jwt.service.js';

/** The five application roles */
type UserRole = 'admin' | 'manager' | 'rep' | 'logistics' | 'viewer';

declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }
}

/**
 * Extract and verify the JWT from the Authorization header.
 * Attaches the decoded token to `request.user`.
 * Returns 401 if the token is missing, malformed, or invalid.
 */
export const extractUser: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
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

  try {
    const decoded = verifyAccessToken(token);
    request.user = decoded;
  } catch {
    void reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired access token',
      code: 'INVALID_ACCESS_TOKEN',
      requestId: request.requestId ?? 'unknown',
    });
  }
};

/**
 * Middleware factory that restricts access to the specified roles.
 * Must be used after `extractUser` in the preHandler chain.
 *
 * @param roles - One or more roles allowed to access the endpoint
 * @returns A Fastify preHandler hook
 *
 * @example
 * app.get('/admin', { preHandler: [extractUser, requireRole('admin', 'manager')] }, handler)
 */
export function requireRole(...roles: UserRole[]): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
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

    if (!roles.includes(user.role as UserRole)) {
      void reply.status(403).send({
        error: 'FORBIDDEN',
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        code: 'FORBIDDEN',
        requestId: request.requestId ?? 'unknown',
      });
      return;
    }
  };
}
