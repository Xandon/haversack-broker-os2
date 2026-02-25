/**
 * Pino structured logging configuration.
 * - Production: info level, JSON format
 * - Development: debug level, pretty print
 * Includes: timestamp, level, service, operation, userId, tenantId, duration
 */
import pino from 'pino';
import type { Logger } from 'pino';

const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? (NODE_ENV === 'production' ? 'info' : 'debug');

export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  tenantId?: string;
  duration?: number;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Create a Pino logger instance with the given service name and optional base context.
 */
export function createLogger(service: string, baseContext?: LogContext): Logger {
  const isProduction = NODE_ENV === 'production';

  return pino({
    name: service,
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(baseContext ? { base: { ...baseContext, service } } : { base: { service } }),
    formatters: {
      level(label: string): { level: string } {
        return { level: label };
      },
    },
    ...(!isProduction && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }),
  });
}

/**
 * Default logger instance for the backend service.
 */
export const logger: Logger = createLogger('haversack-backend');
