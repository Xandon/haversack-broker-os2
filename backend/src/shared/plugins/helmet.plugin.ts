import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';

async function helmetPlugin(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
}

export const helmetPluginRegistration = fp(helmetPlugin, {
  name: 'helmet',
});
