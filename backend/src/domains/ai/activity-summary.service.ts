import type { PrismaClient } from '@prisma/client';
import type { AIClient } from '../../shared/ai/ai-client';
import type { ActivitySummaryResponse } from '@haversack/shared';
import { buildActivitySummaryPrompt } from '../../shared/ai/prompts';
import { AIServiceError } from '../../shared/ai/types';

export class ActivitySummaryError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ActivitySummaryError';
    this.code = code;
  }
}

const MAX_ACTIVITIES = 50;

export async function generateActivitySummary(
  prisma: PrismaClient,
  aiClient: AIClient,
  tenantId: string,
  accountId: string,
  periodMonths: number = 6,
): Promise<ActivitySummaryResponse> {
  // Fetch account
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!account) {
    throw new ActivitySummaryError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);

  // Fetch activities
  const activities = await prisma.activity.findMany({
    where: {
      accountId,
      tenantId,
      deletedAt: null,
      createdAt: { gte: cutoffDate },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_ACTIVITIES,
  });

  // Compute breakdown
  const breakdown = {
    visits: 0,
    calls: 0,
    emails: 0,
    demos: 0,
  };
  for (const a of activities) {
    const type = a.type.toLowerCase();
    if (type === 'visit' || type === 'store_visit') breakdown.visits++;
    else if (type === 'call' || type === 'phone_call') breakdown.calls++;
    else if (type === 'email') breakdown.emails++;
    else if (type === 'demo' || type === 'product_demo') breakdown.demos++;
  }

  // Compute period label
  const startDate = cutoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const periodLabel = `${startDate} — ${endDate}`;

  // Handle empty activity case
  if (activities.length === 0) {
    return {
      account_id: accountId,
      account_name: account.name,
      ai_generated: true as const,
      ai_label: 'AI-Generated' as const,
      summary: {
        period: periodLabel,
        total_activities: 0,
        activity_breakdown: breakdown,
        narrative: 'No recorded activities in this period.',
        key_events: [],
        engagement_assessment: 'No engagement',
      },
      editable: true as const,
      generated_at: new Date().toISOString(),
    };
  }

  // Build prompt context
  const promptContext = {
    accountName: account.name,
    periodLabel,
    activities: activities.map((a) => ({
      type: a.type,
      subject: a.subject,
      notes: a.notes,
      createdAt: a.createdAt.toISOString().split('T')[0]!,
    })),
  };

  const { systemPrompt, userPrompt } = buildActivitySummaryPrompt(promptContext);

  try {
    const result = await aiClient.generate(userPrompt, {
      systemPrompt,
      maxTokens: 1024,
    });

    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    const narrative =
      (parsed['narrative'] as string) ??
      `${activities.length} activities in the past ${periodMonths} months.`;
    const keyEvents = (parsed['key_events'] as string[]) ?? [];
    const engagementAssessment =
      (parsed['engagement_assessment'] as string) ?? 'Assessment not available';

    return {
      account_id: accountId,
      account_name: account.name,
      ai_generated: true as const,
      ai_label: 'AI-Generated' as const,
      summary: {
        period: periodLabel,
        total_activities: activities.length,
        activity_breakdown: breakdown,
        narrative,
        key_events: keyEvents,
        engagement_assessment: engagementAssessment,
      },
      editable: true as const,
      generated_at: new Date().toISOString(),
    };
  } catch (error: unknown) {
    if (error instanceof AIServiceError) {
      throw error;
    }
    // JSON parse failure
    throw new AIServiceError(
      'AI service temporarily unavailable — please try again in a few minutes',
      'AI_SERVICE_UNAVAILABLE',
    );
  }
}
