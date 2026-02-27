import type { PrismaClient } from '@prisma/client';
import type { AIClient } from '../../shared/ai/ai-client';
import type { MeetingBriefResponse } from '@haversack/shared';
import { buildMeetingBriefPrompt } from '../../shared/ai/prompts';
import { AIServiceError } from '../../shared/ai/types';

export class MeetingBriefError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'MeetingBriefError';
    this.code = code;
  }
}

const MAX_ACTIVITIES = 50;
const DATA_WINDOW_MONTHS = 12;

export async function generateMeetingBrief(
  prisma: PrismaClient,
  aiClient: AIClient,
  tenantId: string,
  accountId: string,
): Promise<MeetingBriefResponse> {
  // Fetch account
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!account) {
    throw new MeetingBriefError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - DATA_WINDOW_MONTHS);

  // Fetch data in parallel
  const [contacts, activities, orders, healthScore] = await Promise.all([
    prisma.contact.findMany({
      where: { accountId, tenantId, deletedAt: null },
      orderBy: { isPrimary: 'desc' },
      take: 5,
    }),
    prisma.activity.findMany({
      where: {
        accountId,
        tenantId,
        deletedAt: null,
        createdAt: { gte: cutoffDate },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_ACTIVITIES,
    }),
    prisma.order.findMany({
      where: {
        accountId,
        tenantId,
        createdAt: { gte: cutoffDate },
        status: { in: ['confirmed', 'pending_approval'] },
      },
      include: {
        lineItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.accountHealthScore.findFirst({
      where: { accountId, tenantId },
      orderBy: { calculatedAt: 'desc' },
    }),
  ]);

  // Determine health trend
  let healthTrend: 'improving' | 'declining' | 'stable' | 'unknown' = 'unknown';
  if (healthScore) {
    const previousScore = await prisma.accountHealthScore.findFirst({
      where: {
        accountId,
        tenantId,
        calculatedAt: { lt: healthScore.calculatedAt },
      },
      orderBy: { calculatedAt: 'desc' },
    });
    if (previousScore) {
      const current = Number(healthScore.overallScore);
      const previous = Number(previousScore.overallScore);
      if (current > previous + 5) healthTrend = 'improving';
      else if (current < previous - 5) healthTrend = 'declining';
      else healthTrend = 'stable';
    }
  }

  // Format order trends from data
  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number((o as Record<string, unknown>)['total'] ?? 0),
    0,
  );
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Compute order trend direction
  let trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data' =
    'insufficient_data';
  if (orders.length >= 3) {
    const mid = Math.floor(orders.length / 2);
    const recentAvg =
      orders.slice(0, mid).reduce((s, o) => s + Number((o as Record<string, unknown>)['total'] ?? 0), 0) / mid;
    const olderAvg =
      orders.slice(mid).reduce((s, o) => s + Number((o as Record<string, unknown>)['total'] ?? 0), 0) /
      (orders.length - mid);
    if (recentAvg > olderAvg * 1.1) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';
    else trend = 'stable';
  }

  // Compute top products
  const productCounts = new Map<string, { name: string; count: number; totalQty: number }>();
  for (const order of orders) {
    const lineItems = (order as Record<string, unknown>)['lineItems'] as Array<Record<string, unknown>>;
    for (const li of lineItems) {
      const product = li['product'] as Record<string, unknown>;
      const productId = li['productId'] as string;
      const existing = productCounts.get(productId);
      const qty = li['quantity'] as number;
      if (existing) {
        existing.count += 1;
        existing.totalQty += qty;
      } else {
        productCounts.set(productId, {
          name: product['name'] as string,
          count: 1,
          totalQty: qty,
        });
      }
    }
  }
  const topProducts = Array.from(productCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      order_count: p.count,
      total_qty: p.totalQty,
    }));

  // Build prompt context
  const promptContext = {
    accountName: account.name,
    contacts: contacts.map((c) => ({
      name: c.name,
      title: (c as Record<string, unknown>)['title'] as string | null,
      email: c.email,
      isPrimary: c.isPrimary,
    })),
    activities: activities.map((a) => ({
      type: a.type,
      subject: a.subject,
      notes: a.notes,
      createdAt: a.createdAt.toISOString().split('T')[0]!,
    })),
    orders: orders.map((o) => {
      const lineItems = (o as Record<string, unknown>)['lineItems'] as Array<Record<string, unknown>>;
      return {
        total: Number((o as Record<string, unknown>)['total'] ?? 0),
        status: o.status,
        createdAt: o.createdAt.toISOString().split('T')[0]!,
        lineItems: lineItems.map((li) => ({
          productName: ((li['product'] as Record<string, unknown>)['name'] as string) ?? '',
          quantity: li['quantity'] as number,
          unitPrice: Number(li['unitPrice'] ?? 0),
        })),
      };
    }),
    healthScore: healthScore ? Number(healthScore.overallScore) : null,
    healthTrend,
  };

  const { systemPrompt, userPrompt } = buildMeetingBriefPrompt(promptContext);

  // Call AI
  let aiActivitySummary = '';
  let aiTalkingPoints: string[] = [];

  if (activities.length === 0 && orders.length === 0) {
    aiActivitySummary =
      'Limited recent activity — consider reaching out to re-engage this account.';
    aiTalkingPoints = [
      'Re-engage the account with a check-in call',
      'Discuss any upcoming seasonal needs',
      'Review product catalog for new offerings',
    ];
  } else {
    try {
      const result = await aiClient.generate(userPrompt, {
        systemPrompt,
        maxTokens: 1024,
      });

      // Parse AI response JSON
      const parsed = JSON.parse(result.content) as Record<string, unknown>;
      aiActivitySummary =
        (parsed['activity_summary'] as string) ?? 'Activity summary not available.';
      aiTalkingPoints = (parsed['talking_points'] as string[]) ?? [];
      // Also use AI-determined trend if available
      const aiTrend = parsed['order_trend'] as string | undefined;
      if (
        aiTrend &&
        ['increasing', 'decreasing', 'stable', 'insufficient_data'].includes(aiTrend)
      ) {
        trend = aiTrend as typeof trend;
      }
    } catch (error: unknown) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      // JSON parse failure — use data-driven fallback
      aiActivitySummary = `${activities.length} activities and ${orders.length} orders in the past 12 months.`;
      aiTalkingPoints = ['Review recent order history', 'Discuss upcoming needs'];
    }
  }

  // Build key contacts with last interaction
  const keyContacts = contacts.map((c) => {
    const contactActivities = activities.filter((a) => {
      const notes = a.notes ?? '';
      return notes.toLowerCase().includes(c.name.toLowerCase());
    });
    const lastActivity = contactActivities[0];
    return {
      name: c.name,
      title: (c as Record<string, unknown>)['title'] as string | null,
      last_interaction: lastActivity
        ? lastActivity.createdAt.toISOString().split('T')[0]!
        : null,
      interaction_type: lastActivity ? lastActivity.type : null,
    };
  });

  return {
    account_id: accountId,
    account_name: account.name,
    ai_generated: true as const,
    ai_label: 'AI-Generated' as const,
    brief: {
      key_contacts: keyContacts,
      activity_summary: aiActivitySummary,
      order_trends: {
        total_orders_12m: orders.length,
        total_revenue_12m: Math.round(totalRevenue * 100) / 100,
        average_order_value: Math.round(avgOrderValue * 100) / 100,
        trend,
        top_products: topProducts,
      },
      talking_points: aiTalkingPoints,
      health_score: healthScore ? Number(healthScore.overallScore) : null,
      health_trend: healthTrend,
    },
    editable: true as const,
    generated_at: new Date().toISOString(),
  };
}
