import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../services/jwt.service';
import { ERROR_CODES } from '@haversack/shared';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    void reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
      code: ERROR_CODES.AUTH_MISSING_TOKEN,
      requestId: request.requestId,
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyAccessToken(token);
    request.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
    };
  } catch (error: unknown) {
    const isExpired =
      error instanceof Error && error.message.includes('jwt expired');
    void reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: isExpired ? 'Token expired' : 'Invalid token',
      code: isExpired
        ? ERROR_CODES.AUTH_TOKEN_EXPIRED
        : ERROR_CODES.AUTH_MISSING_TOKEN,
      requestId: request.requestId,
    });
  }
}
