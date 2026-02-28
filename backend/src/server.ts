import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyInstance } from 'fastify';

import { accountRoutes } from './domains/accounts/account.routes.js';
import { contactRoutes } from './domains/contacts/contact.routes.js';
import { productRoutes } from './domains/products/product.routes.js';
import { userRoutes } from './domains/users/user.routes.js';
import { authPluginRegistration } from './shared/plugins/auth.js';
import { prismaPluginRegistration } from './shared/plugins/prisma.js';

export async function buildServer(): Promise<FastifyInstance> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
  const fastify = Fastify({
    logger: isTest
      ? false
      : {
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        },
  });

  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(prismaPluginRegistration);
  await fastify.register(authPluginRegistration);

  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Domain routes
  await fastify.register(accountRoutes);
  await fastify.register(contactRoutes);
  await fastify.register(productRoutes);
  await fastify.register(userRoutes);

  return fastify;
}

async function main(): Promise<void> {
  const server = await buildServer();
  const port = parseInt(process.env.PORT ?? '4000', 10);

  try {
    await server.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
