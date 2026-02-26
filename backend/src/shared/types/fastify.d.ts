import type { UserRoleValue } from '@haversack/shared';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    user?: {
      userId: string;
      email: string;
      role: UserRoleValue;
      tenantId: string;
    };
  }
}
