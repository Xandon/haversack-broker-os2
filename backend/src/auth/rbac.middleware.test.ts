/**
 * RBAC middleware unit tests.
 * T037: RBAC tests — extractUser and requireRole middleware.
 */
import { describe, expect, test, vi } from 'vitest';

import { signAccessToken, type TokenPayload } from './jwt.service.js';
import { extractUser, requireRole } from './rbac.middleware.js';

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';

function createMockPayload(role: string): TokenPayload {
  return {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: TEST_TENANT_ID,
    role,
    email: `${role}@haversack.com`,
  };
}

interface MockRequest {
  headers: Record<string, string | undefined>;
  requestId: string;
  user?: unknown;
}

interface MockReply {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  statusCode: number;
  body: unknown;
}

function createMockRequest(authHeader?: string): MockRequest {
  return {
    headers: {
      authorization: authHeader,
    },
    requestId: 'test-request-id',
  };
}

function createMockReply(): MockReply {
  const reply: MockReply = {
    status: vi.fn(),
    send: vi.fn(),
    statusCode: 200,
    body: null as unknown,
  };
  reply.status.mockImplementation((code: number) => {
    reply.statusCode = code;
    return reply;
  });
  reply.send.mockImplementation((data: unknown) => {
    reply.body = data;
    return reply;
  });
  return reply;
}

/**
 * Invoke a Fastify preHandler hook with mock request/reply objects.
 * The hooks are typed as preHandlerHookHandler but our mock objects
 * are simplified versions — this helper safely bridges the types.
 */
async function invokeHook(
  hook: typeof extractUser,
  request: MockRequest,
  reply: MockReply,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (hook as any)(request, reply);
}

async function invokeRoleHook(
  hook: ReturnType<typeof requireRole>,
  request: MockRequest,
  reply: MockReply,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (hook as any)(request, reply);
}

describe('RBAC Middleware', () => {
  describe('extractUser', () => {
    test('FR-002: extracts valid JWT and attaches user to request', async () => {
      const payload = createMockPayload('admin');
      const token = signAccessToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      expect(request.user).toBeDefined();
      const user = request.user as TokenPayload;
      expect(user.userId).toBe(payload.userId);
      expect(user.tenantId).toBe(payload.tenantId);
      expect(user.role).toBe('admin');
      expect(user.email).toBe('admin@haversack.com');
    });

    test('FR-002: returns 401 for missing authorization header', async () => {
      const request = createMockRequest(undefined);
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      expect(reply.statusCode).toBe(401);
      expect(reply.body).toEqual(
        expect.objectContaining({
          error: 'UNAUTHORIZED',
          code: 'UNAUTHORIZED',
        }),
      );
    });

    test('FR-002: returns 401 for non-Bearer auth header', async () => {
      const request = createMockRequest('Basic abc123');
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      expect(reply.statusCode).toBe(401);
    });

    test('FR-002: returns 401 for invalid token', async () => {
      const request = createMockRequest('Bearer invalid.token.here');
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      expect(reply.statusCode).toBe(401);
      expect(reply.body).toEqual(
        expect.objectContaining({
          code: 'INVALID_ACCESS_TOKEN',
        }),
      );
    });

    test('FR-002: returns 401 for empty Bearer token', async () => {
      const request = createMockRequest('Bearer ');
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      expect(reply.statusCode).toBe(401);
    });
  });

  describe('requireRole', () => {
    test('FR-002: allows access for matching role', async () => {
      const payload = createMockPayload('admin');
      const token = signAccessToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      const middleware = requireRole('admin', 'manager');
      await invokeRoleHook(middleware, request, reply);

      expect(reply.statusCode).not.toBe(403);
    });

    test('FR-002: denies access for non-matching role', async () => {
      const payload = createMockPayload('viewer');
      const token = signAccessToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      const middleware = requireRole('admin', 'manager');
      await invokeRoleHook(middleware, request, reply);

      expect(reply.statusCode).toBe(403);
      expect(reply.body).toEqual(
        expect.objectContaining({
          error: 'FORBIDDEN',
          code: 'FORBIDDEN',
        }),
      );
    });

    test('FR-002: returns 401 when no user is attached', async () => {
      const request = createMockRequest(undefined);
      const reply = createMockReply();

      const middleware = requireRole('admin');
      await invokeRoleHook(middleware, request, reply);

      expect(reply.statusCode).toBe(401);
    });

    test('FR-002: works for all 5 roles', async () => {
      const roles = ['admin', 'manager', 'rep', 'logistics', 'viewer'] as const;

      for (const role of roles) {
        const payload = createMockPayload(role);
        const token = signAccessToken(payload);
        const request = createMockRequest(`Bearer ${token}`);
        const reply = createMockReply();

        await invokeHook(extractUser, request, reply);

        const middleware = requireRole(role);
        await invokeRoleHook(middleware, request, reply);

        expect(reply.statusCode).not.toBe(403);
        expect(reply.statusCode).not.toBe(401);
      }
    });

    test('FR-002: rep cannot access admin-only endpoint', async () => {
      const payload = createMockPayload('rep');
      const token = signAccessToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      const middleware = requireRole('admin');
      await invokeRoleHook(middleware, request, reply);

      expect(reply.statusCode).toBe(403);
    });

    test('FR-002: logistics can access logistics endpoint', async () => {
      const payload = createMockPayload('logistics');
      const token = signAccessToken(payload);
      const request = createMockRequest(`Bearer ${token}`);
      const reply = createMockReply();

      await invokeHook(extractUser, request, reply);

      const middleware = requireRole('logistics', 'admin');
      await invokeRoleHook(middleware, request, reply);

      expect(reply.statusCode).not.toBe(403);
    });
  });
});
