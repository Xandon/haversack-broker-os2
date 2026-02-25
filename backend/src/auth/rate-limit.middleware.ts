/**
 * Rate limiting configuration for auth endpoints.
 * 10 requests/minute/IP on authentication routes (NFR-007).
 * Uses @fastify/rate-limit plugin.
 */
import type { RateLimitPluginOptions } from '@fastify/rate-limit';

/**
 * Rate limit configuration for authentication endpoints.
 * - 10 requests per minute per IP address
 * - Applies to /api/auth/* routes
 */
export const rateLimitConfig: RateLimitPluginOptions = {
  max: 10,
  timeWindow: '1 minute',
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
