import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMeetingBrief, MeetingBriefError } from './meeting-brief.service';
import { AIServiceError } from '../../shared/ai/types';
import type { AIClient } from '../../shared/ai/ai-client';

function createMockPrisma(): Record<string, unknown> {
  return {
    account: {
      findFirst: vi.fn(),
    },
    contact: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    activity: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    accountHealthScore: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
}

function createMockAIClient(
  response?: string,
  error?: Error,
): AIClient {
  return {
    generate: vi.fn().mockImplementation(async () => {
      if (error) throw error;
      return {
        content: response ?? JSON.stringify({
          activity_summary: 'Test activity summary',
          talking_points: ['Point 1', 'Point 2'],
          order_trend: 'stable',
          engagement_assessment: 'Good engagement',
        }),
        inputTokens: 100,
        outputTokens: 50,
        provider: 'anthropic',
        responseTimeMs: 200,
      };
    }),
  } as unknown as AIClient;
}

describe('FR-030: Meeting brief service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it('AC-030a: generates meeting brief with all required sections', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'c-1', name: 'Bob Jones', title: 'Buyer', email: 'bob@test.com', isPrimary: true },
      ]);
    (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'a-1', type: 'visit', subject: 'Store visit', notes: 'Discussed honey', createdAt: new Date(), accountId: 'acc-1', tenantId: 'tenant-1' },
      ]);
    (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        {
          id: 'o-1', total: 500, status: 'confirmed', createdAt: new Date(),
          lineItems: [{ productId: 'p-1', quantity: 10, unitPrice: 50, product: { id: 'p-1', name: 'Honey 12oz' } }],
        },
      ]);

    const aiClient = createMockAIClient();
    const result = await generateMeetingBrief(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    expect(result.ai_generated).toBe(true);
    expect(result.ai_label).toBe('AI-Generated');
    expect(result.editable).toBe(true);
    expect(result.account_id).toBe('acc-1');
    expect(result.account_name).toBe('Test Account');
    expect(result.brief.key_contacts).toHaveLength(1);
    expect(result.brief.key_contacts[0]!.name).toBe('Bob Jones');
    expect(result.brief.order_trends.total_orders_12m).toBe(1);
    expect(result.brief.order_trends.total_revenue_12m).toBe(500);
    expect(result.brief.talking_points.length).toBeGreaterThan(0);
    expect(result.generated_at).toBeDefined();
  });

  it('FR-030: throws ACCOUNT_NOT_FOUND for missing account', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue(null);

    const aiClient = createMockAIClient();
    await expect(
      generateMeetingBrief(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'nonexistent',
      ),
    ).rejects.toThrow(MeetingBriefError);
  });

  it('FR-030: throws ACCOUNT_NOT_FOUND for soft-deleted account', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue(null); // deletedAt filter already excludes it

    const aiClient = createMockAIClient();
    await expect(
      generateMeetingBrief(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'deleted-acc',
      ),
    ).rejects.toThrow('Account not found');
  });

  it('FR-030: handles empty activity/order history gracefully', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'New Account', tenantId: 'tenant-1' });

    const aiClient = createMockAIClient();
    const result = await generateMeetingBrief(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    expect(result.brief.activity_summary).toContain('Limited recent activity');
    expect(result.brief.order_trends.total_orders_12m).toBe(0);
    expect(result.brief.order_trends.trend).toBe('insufficient_data');
    // AI client should NOT be called for empty data
    expect(aiClient.generate).not.toHaveBeenCalled();
  });

  it('AC-030b: re-throws AIServiceError on provider unavailability', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });
    (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'a-1', type: 'visit', subject: 'Visit', notes: null, createdAt: new Date() },
      ]);

    const aiClient = createMockAIClient(
      undefined,
      new AIServiceError('AI service temporarily unavailable', 'AI_SERVICE_UNAVAILABLE'),
    );

    await expect(
      generateMeetingBrief(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
      ),
    ).rejects.toThrow(AIServiceError);
  });

  it('FR-030: handles malformed AI response with data-driven fallback', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });
    (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'a-1', type: 'visit', subject: 'Visit', notes: null, createdAt: new Date() },
      ]);
    (prisma['order'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        {
          id: 'o-1', total: 100, status: 'confirmed', createdAt: new Date(),
          lineItems: [{ productId: 'p-1', quantity: 5, unitPrice: 20, product: { id: 'p-1', name: 'Product' } }],
        },
      ]);

    const aiClient = createMockAIClient('this is not JSON');
    const result = await generateMeetingBrief(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    // Should still return a response with data-driven fallback
    expect(result.ai_generated).toBe(true);
    expect(result.brief.activity_summary).toContain('1 activities');
    expect(result.brief.order_trends.total_orders_12m).toBe(1);
  });

  it('FR-AI-006: all AI labeling fields are present', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });

    const aiClient = createMockAIClient();
    const result = await generateMeetingBrief(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    expect(result.ai_generated).toBe(true);
    expect(result.ai_label).toBe('AI-Generated');
    expect(result.editable).toBe(true);
  });

  it('FR-030: includes health score and trend in brief', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    const healthScoreFindFirst = (prisma['accountHealthScore'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'];
    healthScoreFindFirst.mockResolvedValueOnce({
      overallScore: 75,
      calculatedAt: new Date(),
      accountId: 'acc-1',
      tenantId: 'tenant-1',
    });
    // Second call for previous score
    healthScoreFindFirst.mockResolvedValueOnce({
      overallScore: 65,
      calculatedAt: new Date(Date.now() - 86400000),
      accountId: 'acc-1',
      tenantId: 'tenant-1',
    });

    const aiClient = createMockAIClient();
    const result = await generateMeetingBrief(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    expect(result.brief.health_score).toBe(75);
    expect(result.brief.health_trend).toBe('improving');
  });
});
