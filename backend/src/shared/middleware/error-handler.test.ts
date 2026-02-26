import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { requestIdPluginRegistration } from '../plugins/request-id.plugin';
import { errorHandler } from './error-handler';
import { z } from 'zod';

describe('FR-F010: Error handler middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(requestIdPluginRegistration);
    app.setErrorHandler(errorHandler);

    // Route that throws Zod error
    app.post('/zod-error', async (request) => {
      const schema = z.object({ name: z.string().min(1) });
      schema.parse(request.body);
      return { ok: true };
    });

    // Route that throws generic error
    app.get('/internal-error', async () => {
      throw new Error('Something broke');
    });

    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('US6-AC5: returns 400 with field details for Zod validation error', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/zod-error',
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('BAD_REQUEST');
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.requestId).toBeDefined();
    expect(body.details).toBeDefined();
    expect(body.details[0]?.field).toBe('name');
  });

  it('FR-F012: returns 500 without stack trace for unhandled errors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/internal-error',
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('INTERNAL_SERVER_ERROR');
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('An unexpected error occurred');
    expect(body.requestId).toBeDefined();
    // No stack trace exposed
    expect(body.stack).toBeUndefined();
  });

  it('FR-F010: all error responses include requestId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/internal-error',
    });

    const body = JSON.parse(response.body);
    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe('string');
  });
});
