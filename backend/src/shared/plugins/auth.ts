import { Role } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { sign, verify } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'change-me-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'change-me-in-production';
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export function signAccessToken(payload: JwtPayload): string {
  return sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: Pick<JwtPayload, 'userId' | 'tenantId'>): string {
  return sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): JwtPayload {
  return verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId' | 'tenantId'> {
  return verify(token, REFRESH_SECRET) as Pick<JwtPayload, 'userId' | 'tenantId'>;
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('user', null);

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        reply.status(401).send({ error: 'Missing or invalid authorization header' });
        return;
      }

      const token = authHeader.slice(7);
      try {
        request.user = verifyAccessToken(token);
      } catch {
        reply.status(401).send({ error: 'Invalid or expired token' });
      }
    },
  );

  fastify.decorate('authorize', function (...roles: Role[]) {
    return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      if (!request.user) {
        reply.status(401).send({ error: 'Not authenticated' });
        return;
      }
      if (roles.length > 0 && !roles.includes(request.user.role)) {
        reply.status(403).send({ error: 'Insufficient permissions' });
      }
    };
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (
      ...roles: Role[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const authPluginRegistration = fp(authPlugin, {
  name: 'auth',
});
