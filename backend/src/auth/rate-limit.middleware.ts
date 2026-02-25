/**
 * Rate limiting configuration for auth endpoints.
 * Production: 10 requests/minute/IP on authentication routes (NFR-007).
 * Development: 60 requests/minute/IP (relaxed for hot-reload + StrictMode).
 * Uses @fastify/rate-limit plugin.
 */
import type { RateLimitPluginOptions } from '@fastify/rate-limit';

const IS_DEV = process.env['NODE_ENV'] !== 'production';

/**
 * Rate limit configuration for authentication endpoints.
 * - Production: 10 requests per minute per IP address
 * - Development: 60 requests per minute per IP address
 * - Applies to /api/auth/* routes
 */
export const rateLimitConfig: RateLimitPluginOptions = {
  max: IS_DEV ? 60 : 10,
  timeWindow: '1 minute',
  hook: 'onRequest',
  statusCode: 429,
  keyGenerator: (request): string => {
    return request.ip;
  },
  errorResponseBuilder: (_request, context): {
    error: string;
    message: string;
    code: string;
    retryAfter: number;
  } => {
    return {
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. You can make ${context.max} requests per ${context.after}. Please retry after ${context.ttl}ms.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(context.ttl / 1000),
    };
  },
};

/**
 * Global rate limit configuration (more permissive).
 * - 100 requests per minute per IP
 */
export const globalRateLimitConfig: RateLimitPluginOptions = {
  max: 100,
  timeWindow: '1 minute',
  hook: 'onRequest',
  statusCode: 429,
  keyGenerator: (request): string => {
    return request.ip;
  },
  errorResponseBuilder: (_request, context): {
    error: string;
    message: string;
    code: string;
    retryAfter: number;
  } => {
    return {
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Please retry after ${context.ttl}ms.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(context.ttl / 1000),
    };
  },
};
