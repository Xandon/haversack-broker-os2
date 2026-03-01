import { FastifyInstance } from 'fastify';
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from 'vitest';

import { buildServer } from '../../server.js';

const mockUser = {
  id: '00000000-0000-4000-a000-000000000001',
  tenantId: '00000000-0000-4000-a000-000000000010',
  email: 'test@haversack.com',
  passwordHash: '$2b$12$LJ3m4ys4GODBShG0Q.o3v.K/4kfBcGLOBV3SghOHOaHFoMq9YLpIW', // "password123"
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  isActive: true,
};

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
}));

describe('Auth Routes', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer();
    // Override the prisma user methods used by authRoutes
    vi.spyOn(server.prisma.user, 'findFirst').mockImplementation((() => null) as never);
    vi.spyOn(server.prisma.user, 'update').mockImplementation((() => mockUser) as never);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-002: returns 401 for non-existent email', async () => {
    vi.mocked(server.prisma.user.findFirst).mockResolvedValue(null);

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@haversack.com', password: 'anything' },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Invalid email or password' });
  });

  it('FR-002: returns 401 for wrong password', async () => {
    vi.mocked(server.prisma.user.findFirst).mockResolvedValue(mockUser as never);
    const { compare } = await import('bcrypt');
    vi.mocked(compare).mockResolvedValue(false as never);

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@haversack.com', password: 'wrongpassword' },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Invalid email or password' });
  });

  it('FR-002: returns access and refresh tokens on valid login', async () => {
    vi.mocked(server.prisma.user.findFirst).mockResolvedValue(mockUser as never);
    const { compare } = await import('bcrypt');
    vi.mocked(compare).mockResolvedValue(true as never);
    vi.mocked(server.prisma.user.update).mockResolvedValue(mockUser as never);

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@haversack.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('FR-002: updates lastLoginAt on successful login', async () => {
    vi.mocked(server.prisma.user.findFirst).mockResolvedValue(mockUser as never);
    const { compare } = await import('bcrypt');
    vi.mocked(compare).mockResolvedValue(true as never);
    vi.mocked(server.prisma.user.update).mockResolvedValue(mockUser as never);

    await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@haversack.com', password: 'password123' },
    });

    expect(server.prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      }),
    );
  });

  it('FR-002: returns 400 for invalid email format', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'not-an-email', password: 'password123' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('FR-002: returns 400 for missing password', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@haversack.com' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('FR-002: JWT access token contains correct payload fields', async () => {
    vi.mocked(server.prisma.user.findFirst).mockResolvedValue(mockUser as never);
    const { compare } = await import('bcrypt');
    vi.mocked(compare).mockResolvedValue(true as never);
    vi.mocked(server.prisma.user.update).mockResolvedValue(mockUser as never);

    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@haversack.com', password: 'password123' },
    });

    const { accessToken } = JSON.parse(response.body);
    const [, payloadB64] = accessToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    expect(payload.userId).toBe(mockUser.id);
    expect(payload.tenantId).toBe(mockUser.tenantId);
    expect(payload.role).toBe(mockUser.role);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.exp).toBeDefined();
  });
});
