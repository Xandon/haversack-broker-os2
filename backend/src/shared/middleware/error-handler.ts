import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ERROR_CODES } from '@haversack/shared';
import { getSentry } from '../plugins/sentry.plugin';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  error: FastifyError | AppError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.requestId;

  // Zod validation errors
  if (error instanceof ZodError) {
    void reply.status(400).send({
      error: 'BAD_REQUEST',
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      requestId,
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Rate limit errors (from @fastify/rate-limit)
  if ('statusCode' in error && error.statusCode === 429) {
    void reply.status(429).send({
      error: 'TOO_MANY_REQUESTS',
      message: error.message,
      code: ERROR_CODES.AUTH_RATE_LIMITED,
      requestId,
    });
    return;
  }

  // Known application errors with status codes
  if ('statusCode' in error && error.statusCode && error.statusCode < 500) {
    void reply.status(error.statusCode).send({
      error: error.statusCode === 404 ? 'NOT_FOUND' : 'BAD_REQUEST',
      message: error.message,
      code:
        ('code' in error && error.code) ||
        (error.statusCode === 404
          ? ERROR_CODES.ROUTE_NOT_FOUND
          : ERROR_CODES.VALIDATION_ERROR),
      requestId,
    });
    return;
  }

  // Unexpected errors — log full details, return generic message
  request.log.error(
    {
      err: error,
      requestId,
      stack: error.stack,
    },
    'Unhandled error',
  );

  // Report to Sentry if available
  const Sentry = getSentry();
  if (Sentry) {
    Sentry.captureException(error, {
      tags: { requestId },
      extra: { url: request.url, method: request.method },
    });
  }

  void reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    code: ERROR_CODES.INTERNAL_ERROR,
    requestId,
  });
}
