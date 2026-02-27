import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEmailDraft, EmailDraftError } from './email-draft.service';
import { AIServiceError } from '../../shared/ai/types';
import type { AIClient } from '../../shared/ai/ai-client';

function createMockPrisma(): Record<string, unknown> {
  return {
    account: {
      findFirst: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
    },
    activity: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
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
          subject: 'Following Up on Our Discussion',
          body: 'Hi Bob,\n\nGreat catching up yesterday.\n\nBest regards,\nRep',
        }),
        inputTokens: 100,
        outputTokens: 75,
        provider: 'anthropic',
        responseTimeMs: 300,
      };
    }),
  } as unknown as AIClient;
}

describe('FR-030: Email draft service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it('FR-030: generates email draft with follow_up purpose', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({
        id: 'c-1', name: 'Bob Jones', title: 'Buyer',
        email: 'bob@test.com', isPrimary: true, accountId: 'acc-1', tenantId: 'tenant-1',
      });

    const aiClient = createMockAIClient();
    const result = await generateEmailDraft(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
      'c-1',
      'follow_up',
      'Jane Smith',
    );

    expect(result.ai_generated).toBe(true);
    expect(result.ai_label).toBe('AI-Generated');
    expect(result.editable).toBe(true);
    expect(result.draft.to_email).toBe('bob@test.com');
    expect(result.draft.to_name).toBe('Bob Jones');
    expect(result.draft.subject).toBeTruthy();
    expect(result.draft.body).toBeTruthy();
    expect(result.draft.suggested_send_time).toBeTruthy();
    expect(result.generated_at).toBeDefined();
  });

  it('FR-030: generates email draft with product_pitch and product references', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({
        id: 'c-1', name: 'Bob', title: null,
        email: 'bob@test.com', isPrimary: true, accountId: 'acc-1', tenantId: 'tenant-1',
      });
    (prisma['product'] as Record<string, ReturnType<typeof vi.fn>>)['findMany']
      .mockResolvedValue([
        { id: 'p-1', name: 'Organic Honey', sku: 'HON-001', unitPrice: 8.50, certifications: ['Organic'] },
      ]);

    const aiClient = createMockAIClient();
    const result = await generateEmailDraft(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
      'c-1',
      'product_pitch',
      'Jane Smith',
      { productIds: ['p-1'] },
    );

    expect(result.ai_generated).toBe(true);
    // Verify AI was called with product context
    expect(aiClient.generate).toHaveBeenCalledOnce();
    const callArgs = (aiClient.generate as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(callArgs).toContain('Organic Honey');
  });

  it('FR-030: throws CONTACT_NO_EMAIL when contact has no email', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Test Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({
        id: 'c-1', name: 'Bob', title: null,
        email: null, isPrimary: true, accountId: 'acc-1', tenantId: 'tenant-1',
      });

    const aiClient = createMockAIClient();
    await expect(
      generateEmailDraft(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
        'c-1',
        'follow_up',
        'Jane',
      ),
    ).rejects.toThrow(EmailDraftError);

    await expect(
      generateEmailDraft(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
        'c-1',
        'follow_up',
        'Jane',
      ),
    ).rejects.toThrow('Contact does not have an email address');
  });

  it('FR-030: throws ACCOUNT_NOT_FOUND for missing account', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue(null);

    const aiClient = createMockAIClient();
    await expect(
      generateEmailDraft(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'bad-acc',
        'c-1',
        'follow_up',
        'Jane',
      ),
    ).rejects.toThrow('Account not found');
  });

  it('FR-030: throws CONTACT_NOT_FOUND for missing contact', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue(null);

    const aiClient = createMockAIClient();
    await expect(
      generateEmailDraft(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
        'bad-contact',
        'follow_up',
        'Jane',
      ),
    ).rejects.toThrow('Contact not found');
  });

  it('AC-030b: re-throws AIServiceError on provider failure', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({
        id: 'c-1', name: 'Bob', title: null,
        email: 'bob@test.com', isPrimary: true, accountId: 'acc-1', tenantId: 'tenant-1',
      });

    const aiClient = createMockAIClient(
      undefined,
      new AIServiceError('AI service temporarily unavailable', 'AI_SERVICE_UNAVAILABLE'),
    );

    await expect(
      generateEmailDraft(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
        'c-1',
        'follow_up',
        'Jane',
      ),
    ).rejects.toThrow(AIServiceError);
  });

  it('FR-030: handles malformed AI response as AI_SERVICE_UNAVAILABLE', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({
        id: 'c-1', name: 'Bob', title: null,
        email: 'bob@test.com', isPrimary: true, accountId: 'acc-1', tenantId: 'tenant-1',
      });

    const aiClient = createMockAIClient('this is invalid json');
    await expect(
      generateEmailDraft(
        prisma as unknown as import('@prisma/client').PrismaClient,
        aiClient,
        'tenant-1',
        'acc-1',
        'c-1',
        'follow_up',
        'Jane',
      ),
    ).rejects.toThrow(AIServiceError);
  });

  it('FR-AI-006: all AI labeling fields present', async () => {
    (prisma['account'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({ id: 'acc-1', name: 'Account', tenantId: 'tenant-1' });
    (prisma['contact'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst']
      .mockResolvedValue({
        id: 'c-1', name: 'Bob', title: null,
        email: 'bob@test.com', isPrimary: true, accountId: 'acc-1', tenantId: 'tenant-1',
      });

    const aiClient = createMockAIClient();
    const result = await generateEmailDraft(
      prisma as unknown as import('@prisma/client').PrismaClient,
      aiClient,
      'tenant-1',
      'acc-1',
      'c-1',
      'follow_up',
      'Jane',
    );

    expect(result.ai_generated).toBe(true);
    expect(result.ai_label).toBe('AI-Generated');
    expect(result.editable).toBe(true);
  });
});
