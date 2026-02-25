/**
 * Fastify plugin wrapping ioredis.
 * Decorates the Fastify instance with `redis`.
 * Handles connection lifecycle and error logging.
 */
import type { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import fp from 'fastify-plugin';
import { logger } from '../utils/logger.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

async function redisPluginHandler(fastify: FastifyInstance): Promise<void> {
  const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number | null {
      if (times > 10) {
        logger.error({ operation: 'redis-retry', times }, 'Redis max retries exceeded');
        return null;
      }
      // Exponential backoff: 100ms, 200ms, 400ms, ...
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => {
    logger.info({ operation: 'redis-connect' }, 'Redis client connected');
  });

  redis.on('error', (err: unknown) => {
    logger.error({ operation: 'redis-error', err }, 'Redis client error');
  });

  redis.on('close', () => {
    logger.info({ operation: 'redis-close' }, 'Redis connection closed');
  });

  // Connect
  await redis.connect();

  fastify.decorate('redis', redis);

  // Disconnect on shutdown
  fastify.addHook('onClose', async (): Promise<void> => {
    await redis.quit();
    logger.info({ operation: 'redis-disconnect' }, 'Redis client disconnected');
  });
}

export const redisPlugin = fp(redisPluginHandler, {
  name: 'redis',
  fastify: '4.x',
});
