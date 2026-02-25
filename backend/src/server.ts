/**
 * Server entry point.
 * Starts the Fastify server on the configured PORT (default 3001).
 */
import { buildApp } from './app.js';
import { logger } from './shared/utils/logger.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

async function start(): Promise<void> {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });

    logger.info(
      { operation: 'server-start', port: PORT, host: HOST },
      `Haversack API server listening on ${HOST}:${PORT}`,
    );
  } catch (err: unknown) {
    logger.error({ operation: 'server-start', err }, 'Failed to start server');
    process.exit(1);
  }
}

void start();
