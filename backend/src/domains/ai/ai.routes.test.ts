import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../shared/test-helpers/app';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import { resetRateLimitCounters } from './ai.routes';

// Mock AI SDK modules at the top level
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          activity_summary: 'Test summary',
          talking_points: ['Point 1', 'Point 2'],
          order_trend: 'stable',
          engagement_assessment: 'Good',
        }) }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({
            subject: 'Test Subject',
            body: 'Test body',
          }) } }],
          usage: { prompt_tokens: 80, completion_tokens: 40 },
        }),
      },
    },
  })),
}));

function createMockPrisma(): Record<string, unknown> {
  const defaultAccount = {
    id: '00000000-0000-4000-a000-000000000100',
    name: 'Test Account',
    tenantId: '00000000-0000-4000-a000-000000000001',
    deletedAt: null,
  };

  const defaultContact = {
    id: '00000000-0000-4000-a000-000000000200',
    name: 'Bob Jones',
    title: 'Buyer',
    email: 'bob@test.com',
    isPrimary: true,
    accountId: '00000000-0000-4000-a000-000000000100',
    tenantId: '00000000-0000-4000-a000-000000000001',
    deletedAt: null,
  };

  return {
    account: {
      findFirst: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
        const where = args['where'] as Record<string, unknown>;
        if (where['id'] === defaultAccount.id && where['tenantId'] === defaultAccount.tenantId) {
          return defaultAccount;
        }
        return null;
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(defaultAccount),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      findFirst: vi.fn().mockImplementation(async (args: Record<string, unknown>) => {
        const where = args['where'] as Record<string, unknown>;
        if (where['id'] === defaultContact.id && where['tenantId'] === defaultContact.tenantId) {
          return defaultContact;
        }
        return null;
      }),
      findMany: vi.fn().mockResolvedValue([defaultContact]),
      create: vi.fn(),
    },
    activity: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    accountHealthScore: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    session: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    refreshToken: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    emailRecord: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    opportunity: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    commissionRule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    commissionStatement: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    commissionDispute: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    commissionExport: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    brand: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    dataImport: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    dataQualityScore: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
    ),
  };
}

const ACCOUNT_ID = '00000000-0000-4000-a000-000000000100';
const CONTACT_ID = '00000000-0000-4000-a000-000000000200';

describe('FR-030: AI routes integration', () => {
  let app: FastifyInstance;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeAll(async () => {
    // Set env vars for AI providers
    process.env['ANTHROPIC_API_KEY'] = 'test-anthropic-key';
    process.env['OPENAI_API_KEY'] = 'test-openai-key';

    prisma = createMockPrisma();
    app = await buildTestApp(prisma);
  });

  afterAll(async () => {
    await app.close();
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['OPENAI_API_KEY'];
  });

  beforeEach(() => {
    resetRateLimitCounters();
  });

  describe('POST /api/ai/meeting-brief', () => {
    it('FR-AI-010: returns 200 for rep role', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['ai_generated']).toBe(true);
      expect(data['ai_label']).toBe('AI-Generated');
      expect(data['editable']).toBe(true);
    });

    it('FR-AI-010: returns 200 for manager role', async () => {
      const token = generateTestToken('manager');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-AI-010: returns 200 for admin role', async () => {
      const token = generateTestToken('admin');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-AI-010: returns 403 for viewer role', async () => {
      const token = generateTestToken('viewer');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-AI-010: returns 403 for logistics role', async () => {
      const token = generateTestToken('logistics');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-030: returns 404 for non-existent account', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: '00000000-0000-4000-a000-000000000999' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-030: returns 400 for invalid account_id format', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-030: returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/ai/email-draft', () => {
    it('FR-030: returns 200 for valid email draft request', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/email-draft',
        headers: authHeader(token),
        payload: {
          account_id: ACCOUNT_ID,
          contact_id: CONTACT_ID,
          purpose: 'follow_up',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['ai_generated']).toBe(true);
      expect(data['ai_label']).toBe('AI-Generated');
      expect(data['editable']).toBe(true);
    });

    it('FR-AI-010: returns 403 for viewer role', async () => {
      const token = generateTestToken('viewer');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/email-draft',
        headers: authHeader(token),
        payload: {
          account_id: ACCOUNT_ID,
          contact_id: CONTACT_ID,
          purpose: 'follow_up',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-030: returns 404 for non-existent contact', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/email-draft',
        headers: authHeader(token),
        payload: {
          account_id: ACCOUNT_ID,
          contact_id: '00000000-0000-4000-a000-000000000999',
          purpose: 'follow_up',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-030: returns 400 for invalid purpose', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/email-draft',
        headers: authHeader(token),
        payload: {
          account_id: ACCOUNT_ID,
          contact_id: CONTACT_ID,
          purpose: 'invalid_purpose',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-030: accepts all valid purposes', async () => {
      const token = generateTestToken('rep');
      const purposes = ['follow_up', 'introduction', 'product_pitch', 'meeting_request', 'thank_you', 'custom'];

      for (const purpose of purposes) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/ai/email-draft',
          headers: authHeader(token),
          payload: {
            account_id: ACCOUNT_ID,
            contact_id: CONTACT_ID,
            purpose,
          },
        });

        expect(response.statusCode).toBe(200);
      }
    });

    it('FR-030: accepts optional fields', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/email-draft',
        headers: authHeader(token),
        payload: {
          account_id: ACCOUNT_ID,
          contact_id: CONTACT_ID,
          purpose: 'custom',
          context: 'Follow up on honey discussion',
          tone: 'friendly',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/ai/activity-summary', () => {
    it('FR-AI-005: returns 200 for rep role with activity summary', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      const data = body['data'] as Record<string, unknown>;
      expect(data['ai_generated']).toBe(true);
      expect(data['ai_label']).toBe('AI-Generated');
      expect(data['editable']).toBe(true);
      expect(data['account_id']).toBe(ACCOUNT_ID);
    });

    it('FR-AI-005: returns 200 with custom period_months', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID, period_months: 12 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-AI-010: returns 403 for viewer role', async () => {
      const token = generateTestToken('viewer');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-AI-010: returns 403 for logistics role', async () => {
      const token = generateTestToken('logistics');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-AI-005: returns 404 for non-existent account', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: '00000000-0000-4000-a000-000000000999' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('FR-AI-005: returns 400 for invalid account_id', async () => {
      const token = generateTestToken('rep');
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-AI-005: returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Rate limiting', () => {
    it('FR-AI-008: returns 429 after exceeding meeting-brief rate limit (10/min)', async () => {
      const token = generateTestToken('rep');

      // Send 10 requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/ai/meeting-brief',
          headers: authHeader(token),
          payload: { account_id: ACCOUNT_ID },
        });
        expect(response.statusCode).toBe(200);
      }

      // 11th request should be rate limited
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(429);
      const body = JSON.parse(response.body) as Record<string, unknown>;
      expect(body['error']).toBe('RATE_LIMIT_EXCEEDED');
      expect(body['retryAfterSeconds']).toBeGreaterThan(0);
    });

    it('FR-AI-008: returns 429 after exceeding activity-summary rate limit (10/min)', async () => {
      const token = generateTestToken('rep');

      for (let i = 0; i < 10; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/ai/activity-summary',
          headers: authHeader(token),
          payload: { account_id: ACCOUNT_ID },
        });
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(response.statusCode).toBe(429);
    });

    it('FR-AI-008: email-draft has higher rate limit (15/min)', async () => {
      const token = generateTestToken('rep');

      // Send 14 requests (should all succeed under 15/min limit)
      for (let i = 0; i < 14; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/ai/email-draft',
          headers: authHeader(token),
          payload: {
            account_id: ACCOUNT_ID,
            contact_id: CONTACT_ID,
            purpose: 'follow_up',
          },
        });
        expect(response.statusCode).toBe(200);
      }

      // 15th request should still succeed
      const fifteenthResponse = await app.inject({
        method: 'POST',
        url: '/api/ai/email-draft',
        headers: authHeader(token),
        payload: {
          account_id: ACCOUNT_ID,
          contact_id: CONTACT_ID,
          purpose: 'follow_up',
        },
      });
      expect(fifteenthResponse.statusCode).toBe(200);

      // 16th should be rate limited
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/email-draft',
        headers: authHeader(token),
        payload: {
          account_id: ACCOUNT_ID,
          contact_id: CONTACT_ID,
          purpose: 'follow_up',
        },
      });
      expect(response.statusCode).toBe(429);
    });

    it('FR-AI-008: rate limits are per-user (different users have separate limits)', async () => {
      const repToken = generateTestToken('rep', { userId: '00000000-0000-4000-a000-000000000011' });
      const managerToken = generateTestToken('manager', { userId: '00000000-0000-4000-a000-000000000012' });

      // Exhaust rep's rate limit
      for (let i = 0; i < 10; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/ai/meeting-brief',
          headers: authHeader(repToken),
          payload: { account_id: ACCOUNT_ID },
        });
      }

      // Rep should be rate limited
      const repResponse = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(repToken),
        payload: { account_id: ACCOUNT_ID },
      });
      expect(repResponse.statusCode).toBe(429);

      // Manager should still be allowed (different userId)
      const managerResponse = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(managerToken),
        payload: { account_id: ACCOUNT_ID },
      });
      expect(managerResponse.statusCode).toBe(200);
    });
  });

  describe('RBAC enforcement matrix', () => {
    const endpoints = [
      { url: '/api/ai/meeting-brief', payload: { account_id: ACCOUNT_ID } },
      { url: '/api/ai/email-draft', payload: { account_id: ACCOUNT_ID, contact_id: CONTACT_ID, purpose: 'follow_up' } },
      { url: '/api/ai/activity-summary', payload: { account_id: ACCOUNT_ID } },
    ] as const;

    const allowedRoles = ['rep', 'manager', 'admin'] as const;
    const deniedRoles = ['viewer', 'logistics'] as const;

    for (const ep of endpoints) {
      for (const role of allowedRoles) {
        it(`FR-AI-010: ${role} can access ${ep.url}`, async () => {
          const token = generateTestToken(role);
          const response = await app.inject({
            method: 'POST',
            url: ep.url,
            headers: authHeader(token),
            payload: ep.payload,
          });
          expect(response.statusCode).not.toBe(403);
        });
      }

      for (const role of deniedRoles) {
        it(`FR-AI-010: ${role} denied access to ${ep.url}`, async () => {
          const token = generateTestToken(role);
          const response = await app.inject({
            method: 'POST',
            url: ep.url,
            headers: authHeader(token),
            payload: ep.payload,
          });
          expect(response.statusCode).toBe(403);
        });
      }
    }
  });

  describe('Edge cases', () => {
    it('FR-AI-009: audit log is written on successful AI request', async () => {
      const token = generateTestToken('rep');
      const auditCreate = prisma['auditLog'] as Record<string, ReturnType<typeof vi.fn>>;

      await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID },
      });

      expect(auditCreate['create']).toHaveBeenCalled();
    });

    it('FR-030: returns 400 for missing required fields', async () => {
      const token = generateTestToken('rep');

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/meeting-brief',
        headers: authHeader(token),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-030: returns 400 for malformed request body', async () => {
      const token = generateTestToken('rep');

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID, period_months: 0 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-030: returns 400 for period_months exceeding max', async () => {
      const token = generateTestToken('rep');

      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/activity-summary',
        headers: authHeader(token),
        payload: { account_id: ACCOUNT_ID, period_months: 25 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-030: consistent error response format across all endpoints', async () => {
      const token = generateTestToken('rep');
      const invalidAccountId = '00000000-0000-4000-a000-000000000999';

      for (const url of ['/api/ai/meeting-brief', '/api/ai/activity-summary']) {
        const response = await app.inject({
          method: 'POST',
          url,
          headers: authHeader(token),
          payload: { account_id: invalidAccountId },
        });

        const body = JSON.parse(response.body) as Record<string, unknown>;
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('message');
        expect(body).toHaveProperty('code');
        expect(body).toHaveProperty('requestId');
      }
    });
  });
});
