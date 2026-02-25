/**
 * Fastify error handler plugin.
 * Returns structured JSON: { error, message, code, requestId }
 * Handles ZodError specially for validation errors.
 * No stack traces in production (checks NODE_ENV).
 */
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  requestId: string;
  details?: unknown;
}

const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

function formatZodError(err: ZodError): { message: string; details: unknown } {
  const issues = err.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    message: `Validation failed: ${issues.map((i) => `${i.path} - ${i.message}`).join('; ')}`,
    details: issues,
  };
}

async function errorHandlerPluginHandler(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler(
    (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void => {
      const requestId = request.requestId ?? 'unknown';

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const { message, details } = formatZodError(error);
        logger.warn({ requestId, err: error, operation: 'validation' }, message);

        const response: ErrorResponse = {
          error: 'VALIDATION_ERROR',
          message,
          code: 'VALIDATION_ERROR',
          requestId,
          details,
        };

        void reply.status(400).send(response);
        return;
      }

      // Handle Fastify errors (has statusCode)
      const statusCode = (error as FastifyError).statusCode ?? 500;
      const isServerError = statusCode >= 500;

      if (isServerError) {
        logger.error(
          { requestId, err: error, operation: 'server-error' },
          `Server error: ${error.message}`,
        );
      } else {
        logger.warn(
          { requestId, err: error, operation: 'client-error' },
          `Client error: ${error.message}`,
        );
      }

      const response: ErrorResponse = {
        error: isServerError ? 'INTERNAL_SERVER_ERROR' : (error as FastifyError).code ?? 'ERROR',
        message: isServerError && IS_PRODUCTION ? 'An internal server error occurred' : error.message,
        code: (error as FastifyError).code ?? (isServerError ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
        requestId,
      };

      // Include stack trace only in development
      if (!IS_PRODUCTION && error.stack) {
        (response as ErrorResponse & { stack?: string }).stack = error.stack;
      }

      void reply.status(statusCode).send(response);
    },
  );
}

export const errorHandlerPlugin = fp(errorHandlerPluginHandler, {
  name: 'error-handler',
  fastify: '4.x',
});
