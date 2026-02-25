/**
 * Fastify plugin wrapping PrismaClient.
 * Decorates the Fastify instance with `prisma`.
 * Tenant isolation is enforced at the service layer and via PostgreSQL RLS.
 */
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

async function prismaPluginHandler(fastify: FastifyInstance): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];

  if (!databaseUrl) {
    logger.warn('DATABASE_URL not set — Prisma client will use default connection string');
  }

  const prisma = new PrismaClient();

  // Decorate the Fastify instance with the Prisma client.
  // Tenant isolation is enforced at the service/query layer via explicit tenant_id filtering
  // and at the database layer via PostgreSQL RLS policies.
  fastify.decorate('prisma', prisma);

  // Connect on startup
  await prisma.$connect();
  logger.info({ operation: 'prisma-connect' }, 'Prisma client connected to database');

  // Disconnect on shutdown
  fastify.addHook('onClose', async (): Promise<void> => {
    await prisma.$disconnect();
    logger.info({ operation: 'prisma-disconnect' }, 'Prisma client disconnected');
  });
}

export const prismaPlugin = fp(prismaPluginHandler, {
  name: 'prisma',
  fastify: '4.x',
});
