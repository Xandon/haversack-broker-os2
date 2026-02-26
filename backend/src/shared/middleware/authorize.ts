import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRoleValue } from '@haversack/shared';
import { ERROR_CODES } from '@haversack/shared';

export function authorize(
  ...allowedRoles: UserRoleValue[]
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    if (!request.user) {
      void reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        code: ERROR_CODES.AUTH_MISSING_TOKEN,
        requestId: request.requestId,
      });
      return;
    }

    const userRole = request.user.role;

    // Admin bypasses all role checks
    if (userRole === 'admin') {
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      void reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
        code: ERROR_CODES.AUTH_FORBIDDEN,
        requestId: request.requestId,
      });
    }
  };
}
