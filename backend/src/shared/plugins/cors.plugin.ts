/**
 * CORS plugin configuration for Fastify.
 * Allows the frontend origin and standard methods/headers.
 */
import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';

async function corsPluginHandler(fastify: FastifyInstance): Promise<void> {
  const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';

  await fastify.register(cors, {
    origin: nodeEnv === 'development' ? true : frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400, // 24 hours
  });
}

export const corsPlugin = fp(corsPluginHandler, {
  name: 'cors',
  fastify: '4.x',
});
