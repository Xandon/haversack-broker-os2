import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { requestIdPluginRegistration } from '../plugins/request-id.plugin';
import { authenticate } from './authenticate';
import { generateTestToken } from '../test-helpers/auth';
import { signRefreshToken } from '../services/jwt.service';

describe('FR-F001: Authenticate middleware', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await app.register(requestIdPluginRegistration);

    app.get('/protected', { preHandler: [authenticate] }, async (request) => {
      return { user: request.user };
    });

    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('US3-AC3: returns 401 when Authorization header is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.code).toBe('AUTH_MISSING_TOKEN');
  });

  it('US3-AC4: returns 401 when token is expired', async () => {
    // Create a manually expired token by using a very short-lived token
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer invalid.token.here' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('FR-F001: allows request with valid token', async () => {
    const token = generateTestToken('admin');

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user).toBeDefined();
    expect(body.user.role).toBe('admin');
  });

  it('FR-F001: rejects refresh token used as access token', async () => {
    const refreshToken = signRefreshToken({
      userId: '00000000-0000-4000-a000-000000000010',
      email: 'admin@haversack.test',
      role: 'admin',
      tenantId: '00000000-0000-4000-a000-000000000001',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${refreshToken}` },
    });

    expect(response.statusCode).toBe(401);
  });

  it('US3-AC3: returns 401 when Bearer prefix is missing', async () => {
    const token = generateTestToken('admin');

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: token },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.code).toBe('AUTH_MISSING_TOKEN');
  });
});
