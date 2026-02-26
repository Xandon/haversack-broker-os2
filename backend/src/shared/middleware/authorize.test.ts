import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { requestIdPluginRegistration } from '../plugins/request-id.plugin';
import { authenticate } from './authenticate';
import { authorize } from './authorize';
import { generateTestToken, authHeader } from '../test-helpers/auth';

describe('FR-F004: Authorize middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(requestIdPluginRegistration);

    // Route requiring rep, manager, or admin
    app.get(
      '/rep-route',
      { preHandler: [authenticate, authorize('rep', 'manager')] },
      async () => {
        return { data: 'ok' };
      },
    );

    // Route requiring admin only
    app.get(
      '/admin-route',
      { preHandler: [authenticate, authorize('admin')] },
      async () => {
        return { data: 'admin-only' };
      },
    );

    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('US3-AC1: Rep can access rep-permitted routes', async () => {
    const token = generateTestToken('rep');

    const response = await app.inject({
      method: 'GET',
      url: '/rep-route',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(200);
  });

  it('US3-AC2: Viewer cannot access write routes', async () => {
    const token = generateTestToken('viewer');

    const response = await app.inject({
      method: 'GET',
      url: '/rep-route',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.code).toBe('AUTH_FORBIDDEN');
    expect(body.error).toBe('FORBIDDEN');
  });

  it('US3-AC5: Admin bypasses all role checks', async () => {
    const token = generateTestToken('admin');

    const response = await app.inject({
      method: 'GET',
      url: '/rep-route',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(200);
  });

  it('US3-AC5: Admin can access admin-only routes', async () => {
    const token = generateTestToken('admin');

    const response = await app.inject({
      method: 'GET',
      url: '/admin-route',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(200);
  });

  it('FR-F004: Manager cannot access admin-only routes', async () => {
    const token = generateTestToken('manager');

    const response = await app.inject({
      method: 'GET',
      url: '/admin-route',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(403);
  });

  it('US3-AC6: Logistics has limited access', async () => {
    const token = generateTestToken('logistics');

    const response = await app.inject({
      method: 'GET',
      url: '/rep-route',
      headers: authHeader(token),
    });

    expect(response.statusCode).toBe(403);
  });
});
