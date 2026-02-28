import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createAiService } from './ai.service';
import type { AiProvider } from './ai.service';

function createMockPrisma() {
  return {
    account: {
      findFirstOrThrow: vi.fn().mockResolvedValue({ name: 'Portland Grocers' }),
    },
    contact: {
      findMany: vi.fn().mockResolvedValue([
        { firstName: 'Jane', lastName: 'Doe', title: 'Buyer' },
        { firstName: 'John', lastName: 'Smith', title: 'Manager' },
      ]),
    },
    activity: {
      findMany: vi.fn().mockResolvedValue([
        { activityType: 'call', subject: 'Follow-up call', occurredAt: new Date('2026-02-15') },
        { activityType: 'email', subject: 'Product catalog', occurredAt: new Date('2026-02-10') },
      ]),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([
        { orderNumber: 'ORD-001', total: 5000, createdAt: new Date('2026-02-01') },
        { orderNumber: 'ORD-002', total: 3500, createdAt: new Date('2026-01-15') },
      ]),
    },
  } as unknown as Parameters<typeof createAiService>[0];
}

function createMockProvider(): AiProvider {
  return {
    generateText: vi.fn(),
  };
}

describe('AiService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let provider: AiProvider;
  let service: ReturnType<typeof createAiService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    provider = createMockProvider();
    service = createAiService(prisma, provider);
  });

  describe('generateMeetingBrief', () => {
    it('FR-030: generates meeting brief with key contacts and activity summary', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          keyContacts: [{ name: 'Jane Doe', title: 'Buyer', notes: 'Primary contact' }],
          recentActivitySummary: 'Active engagement with 2 touchpoints.',
          orderTrends: 'Consistent monthly ordering.',
          suggestedTalkingPoints: ['Discuss Q2 promotions', 'Review new product line'],
        }),
      );

      const result = await service.generateMeetingBrief('tenant-1', 'account-1');

      expect(result.keyContacts).toHaveLength(1);
      expect(result.recentActivitySummary).toBeTruthy();
      expect(result.orderTrends).toBeTruthy();
      expect(result.suggestedTalkingPoints).toHaveLength(2);
      expect(result.generatedAt).toBeTruthy();
    });

    it('AC-030a: fetches account data including contacts, activities, and orders', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          keyContacts: [],
          recentActivitySummary: 'Summary.',
          orderTrends: 'Trends.',
          suggestedTalkingPoints: [],
        }),
      );

      await service.generateMeetingBrief('tenant-1', 'account-1');

      expect(prisma.account.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'account-1', tenantId: 'tenant-1', deletedAt: null },
        }),
      );
      expect(prisma.contact.findMany).toHaveBeenCalled();
      expect(prisma.activity.findMany).toHaveBeenCalled();
      expect(prisma.order.findMany).toHaveBeenCalled();
    });

    it('AC-030a: calls AI provider with system prompt', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          keyContacts: [],
          recentActivitySummary: '',
          orderTrends: '',
          suggestedTalkingPoints: [],
        }),
      );

      await service.generateMeetingBrief('tenant-1', 'account-1');

      expect(provider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Portland Grocers'),
        expect.stringContaining('sales assistant'),
      );
    });

    it('AC-030b: propagates provider errors', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('AI service temporarily unavailable'),
      );

      await expect(service.generateMeetingBrief('tenant-1', 'account-1')).rejects.toThrow(
        'AI service temporarily unavailable',
      );
    });
  });

  describe('generateActivitySummary', () => {
    it('FR-030: generates activity summary for given period', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
        'Active engagement with consistent follow-ups.',
      );

      const result = await service.generateActivitySummary('tenant-1', 'account-1', 'month');

      expect(result.summary).toBe('Active engagement with consistent follow-ups.');
      expect(result.totalActivities).toBe(2);
      expect(result.period).toBe('month');
      expect(result.generatedAt).toBeTruthy();
    });

    it('FR-030: defaults to month period', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue('Summary.');

      const result = await service.generateActivitySummary('tenant-1', 'account-1');

      expect(result.period).toBe('month');
    });

    it('FR-030: supports week period', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue('Weekly summary.');

      const result = await service.generateActivitySummary('tenant-1', 'account-1', 'week');

      expect(result.period).toBe('week');
    });

    it('FR-030: supports quarter period', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue('Quarterly summary.');

      const result = await service.generateActivitySummary('tenant-1', 'account-1', 'quarter');

      expect(result.period).toBe('quarter');
    });
  });

  describe('generateEmailDraft', () => {
    it('FR-030: generates email draft with subject and body', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({
          subject: 'Follow-up: Q2 Product Catalog',
          body: 'Dear Jane,\n\nThank you for your continued partnership...',
        }),
      );

      const result = await service.generateEmailDraft(
        'tenant-1',
        'account-1',
        'Follow up on Q2 product catalog',
      );

      expect(result.subject).toBe('Follow-up: Q2 Product Catalog');
      expect(result.body).toContain('Jane');
      expect(result.generatedAt).toBeTruthy();
    });

    it('FR-030: uses primary contact name in prompt', async () => {
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ subject: 'Test', body: 'Body' }),
      );

      await service.generateEmailDraft('tenant-1', 'account-1', 'Introduction');

      expect(provider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('Jane Doe'),
        expect.any(String),
      );
    });

    it('FR-030: falls back to generic greeting when no primary contact', async () => {
      (prisma.contact.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (provider.generateText as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify({ subject: 'Test', body: 'Body' }),
      );

      await service.generateEmailDraft('tenant-1', 'account-1', 'Introduction');

      expect(provider.generateText).toHaveBeenCalledWith(
        expect.stringContaining('there'),
        expect.any(String),
      );
    });
  });
});
