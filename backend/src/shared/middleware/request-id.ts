/**
 * Request ID middleware plugin for Fastify.
 * Generates a UUID request ID for each incoming request and attaches it
 * to both the request object and the X-Request-Id response header.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

async function requestIdPluginHandler(fastify: FastifyInstance): Promise<void> {
  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const incomingId = request.headers['x-request-id'];
      const requestId = typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : uuidv4();
      request.requestId = requestId;
      void reply.header('X-Request-Id', requestId);
    },
  );
}

export const requestIdPlugin = fp(requestIdPluginHandler, {
  name: 'request-id',
  fastify: '4.x',
});
