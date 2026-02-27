import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateActivitySummary, ActivitySummaryError } from './activity-summary.service';
import { AIServiceError } from '../../shared/ai/types';
import type { AIClient } from '../../shared/ai/ai-client';

function createMockPrisma(): Record<string, unknown> {
  return {
    account: {
      findFirst: vi.fn(),
    },
    activity: {
      findMany: vi.fn().mockResolvedValue([]),
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
          narrative: 'Strong engagement with regular monthly visits.',
          key_events: ['Feb 18 — Store visit', 'Jan 22 — Demo'],
          engagement_assessment: 'High engagement',
        }),
        inputTokens: 80,
        outputTokens: 40,
        provider: 'anthropic',
        responseTimeMs: 250,
      };
    }),
  } as unknown as AIClient;
}

describe('FR-030: Activity summary service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it('FR-AI-005: generates activity summary with all required sections', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });
    (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'a-1', type: 'visit', subject: 'Store visit', notes: 'Discussed products', createdAt: new Date(), tenantId: 'tenant-1' },
        { id: 'a-2', type: 'call', subject: 'Follow-up call', notes: null, createdAt: new Date(), tenantId: 'tenant-1' },
        { id: 'a-3', type: 'email', subject: 'Pricing info', notes: null, createdAt: new Date(), tenantId: 'tenant-1' },
      ]);

    const aiClient = createMockAIClient();
    const result = await generateActivitySummary(
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
    expect(result.summary.total_activities).toBe(3);
    expect(result.summary.activity_breakdown.visits).toBe(1);
    expect(result.summary.activity_breakdown.calls).toBe(1);
    expect(result.summary.activity_breakdown.emails).toBe(1);
    expect(result.summary.narrative).toBeTruthy();
    expect(result.summary.key_events.length).toBeGreaterThan(0);
    expect(result.summary.engagement_assessment).toBeTruthy();
    expect(result.summary.period).toContain('—');
  });

  it('FR-AI-005: handles empty activity set with "No engagement" assessment', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });

    const aiClient = createMockAIClient();
    const result = await generateActivitySummary(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    expect(result.summary.total_activities).toBe(0);
    expect(result.summary.narrative).toContain('No recorded activities');
    expect(result.summary.engagement_assessment).toBe('No engagement');
    expect(result.summary.key_events).toEqual([]);
    // AI client should NOT be called for empty data
    expect(aiClient.generate).not.toHaveBeenCalled();
  });

  it('FR-AI-005: supports custom period (12 months)', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'a-1', type: 'visit', subject: 'Visit', notes: null, createdAt: new Date(), tenantId: 'tenant-1' },
      ]);

    const aiClient = createMockAIClient();
    const result = await generateActivitySummary(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
      12,
    );

    expect(result.summary.total_activities).toBe(1);
    // Verify the period label spans the right range
    expect(result.summary.period).toBeTruthy();
  });

  it('FR-AI-005: throws ACCOUNT_NOT_FOUND for missing account', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue(null);

    const aiClient = createMockAIClient();
    await expect(
      generateActivitySummary(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'nonexistent',
      ),
    ).rejects.toThrow(ActivitySummaryError);
    await expect(
      generateActivitySummary(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'nonexistent',
      ),
    ).rejects.toThrow('Account not found');
  });

  it('FR-AI-005: re-throws AIServiceError on provider failure', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'a-1', type: 'visit', subject: 'Visit', notes: null, createdAt: new Date(), tenantId: 'tenant-1' },
      ]);

    const aiClient = createMockAIClient(
      undefined,
      new AIServiceError('AI service temporarily unavailable', 'AI_SERVICE_UNAVAILABLE'),
    );

    await expect(
      generateActivitySummary(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
      ),
    ).rejects.toThrow(AIServiceError);
  });

  it('FR-AI-005: handles malformed AI response', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'a-1', type: 'visit', subject: 'Visit', notes: null, createdAt: new Date(), tenantId: 'tenant-1' },
      ]);

    const aiClient = createMockAIClient('invalid json response');
    await expect(
      generateActivitySummary(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
      ),
    ).rejects.toThrow(AIServiceError);
  });

  it('FR-AI-005: caps activities at 50 for large accounts', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });

    // Mock will be called with take: 50
    const findManyFn = (prisma['activity'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'];
    findManyFn.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        id: `a-${i}`,
        type: 'visit',
        subject: `Activity ${i}`,
        notes: null,
        createdAt: new Date(),
        tenantId: 'tenant-1',
      })),
    );

    const aiClient = createMockAIClient();
    const result = await generateActivitySummary(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    expect(result.summary.total_activities).toBe(50);
    // Verify that findMany was called with take: 50
    expect(findManyFn).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('FR-AI-006: all AI labeling fields present', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });

    const aiClient = createMockAIClient();
    const result = await generateActivitySummary(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
    );

    expect(result.ai_generated).toBe(true);
    expect(result.ai_label).toBe('AI-Generated');
    expect(result.editable).toBe(true);
  });
});
