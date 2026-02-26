import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';

async function corsPlugin(app: FastifyInstance): Promise<void> {
  const origin = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

  await app.register(cors, {
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });
}

export const corsPluginRegistration = fp(corsPlugin, {
  name: 'cors',
});
