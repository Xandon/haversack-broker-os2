import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

let sentryNode: typeof import('@sentry/node') | null = null;

export function getSentry(): typeof import('@sentry/node') | null {
  return sentryNode;
}

async function sentryPlugin(app: FastifyInstance): Promise<void> {
  const dsn = process.env['SENTRY_DSN'];
  if (!dsn) {
    app.log.info('Sentry DSN not configured — error reporting disabled');
    return;
  }

  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env['NODE_ENV'] ?? 'development',
      tracesSampleRate: 0.1,
    });
    sentryNode = Sentry;
    app.log.info('Sentry initialized for error reporting');
  } catch (err) {
    app.log.warn({ err }, 'Failed to initialize Sentry — continuing without error reporting');
  }
}

export const sentryPluginRegistration = fp(sentryPlugin, {
  name: 'sentry',
});
