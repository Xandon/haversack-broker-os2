import { describe, expect, it } from 'vitest';

import { buildServer } from './server.js';

describe('Server', () => {
  it('FR-INFRA: builds without error', async () => {
    const server = await buildServer();
    expect(server).toBeDefined();
    await server.close();
  });

  it('FR-INFRA: health endpoint returns ok', async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    await server.close();
  });

  it('FR-INFRA: unauthenticated routes return without auth header', async () => {
    const server = await buildServer();
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(response.statusCode).toBe(200);
    await server.close();
  });
});
