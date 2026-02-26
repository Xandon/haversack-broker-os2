import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';

async function requestIdPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request, reply) => {
    const requestId =
      (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
    request.requestId = requestId;
    void reply.header('X-Request-Id', requestId);
  });
}

export const requestIdPluginRegistration = fp(requestIdPlugin, {
  name: 'request-id',
});
