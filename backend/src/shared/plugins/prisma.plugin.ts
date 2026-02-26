import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function prismaPlugin(app: FastifyInstance): Promise<void> {
  const prisma = new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'production'
        ? ['error']
        : ['query', 'error', 'warn'],
  });

  await prisma.$connect();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}

export async function setRlsContext(
  prisma: PrismaClient,
  userId: string,
  tenantId: string,
  role: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_user_id', $1, true),
            set_config('app.current_tenant_id', $2, true),
            set_config('app.current_user_role', $3, true)`,
    userId,
    tenantId,
    role,
  );
}

export const prismaPluginRegistration = fp(prismaPlugin, {
  name: 'prisma',
});
