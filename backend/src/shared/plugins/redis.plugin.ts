import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

async function redisPlugin(app: FastifyInstance): Promise<void> {
  const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redis.connect().catch(() => {
    app.log.warn('Redis connection failed — running without Redis');
  });

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit().catch(() => {
      /* ignore quit errors */
    });
  });
}

export const redisPluginRegistration = fp(redisPlugin, {
  name: 'redis',
});
