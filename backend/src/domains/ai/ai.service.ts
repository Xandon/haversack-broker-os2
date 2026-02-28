import { PrismaClient } from '@prisma/client';

export interface AiProvider {
  generateText(prompt: string, systemPrompt: string): Promise<string>;
}

export interface MeetingBrief {
  keyContacts: { name: string; title: string; notes: string }[];
  recentActivitySummary: string;
  orderTrends: string;
  suggestedTalkingPoints: string[];
  generatedAt: string;
}

export interface ActivitySummary {
  summary: string;
  totalActivities: number;
  period: string;
  generatedAt: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  generatedAt: string;
}

function buildMeetingBriefPrompt(
  accountName: string,
  contacts: { firstName: string; lastName: string; title: string | null }[],
  activities: { activityType: string; subject: string | null; occurredAt: Date }[],
  orders: { orderNumber: string; total: number; createdAt: Date }[],
): string {
  const contactList = contacts
    .map((c) => `- ${c.firstName} ${c.lastName}${c.title ? ` (${c.title})` : ''}`)
    .join('\n');
  const activityList = activities
    .slice(0, 20)
    .map(
      (a) =>
        `- ${a.activityType}: ${a.subject ?? 'No subject'} (${a.occurredAt.toISOString().split('T')[0]})`,
    )
    .join('\n');
  const orderList = orders
    .slice(0, 10)
    .map(
      (o) =>
        `- ${o.orderNumber}: $${Number(o.total).toFixed(2)} (${o.createdAt.toISOString().split('T')[0]})`,
    )
    .join('\n');

  return `Prepare a meeting brief for account "${accountName}".

Key Contacts:
${contactList || 'None'}

Recent Activities (last 6 months):
${activityList || 'None'}

Recent Orders:
${orderList || 'None'}

Respond in valid JSON with this structure:
{
  "keyContacts": [{"name": "string", "title": "string", "notes": "string"}],
  "recentActivitySummary": "string",
  "orderTrends": "string",
  "suggestedTalkingPoints": ["string"]
}`;
}

export function createAiService(prisma: PrismaClient, provider: AiProvider) {
  return {
    async generateMeetingBrief(tenantId: string, accountId: string): Promise<MeetingBrief> {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [account, contacts, activities, orders] = await Promise.all([
        prisma.account.findFirstOrThrow({
          where: { id: accountId, tenantId, deletedAt: null },
          select: { name: true },
        }),
        prisma.contact.findMany({
          where: { accountId, tenantId, deletedAt: null },
          select: { firstName: true, lastName: true, title: true },
        }),
        prisma.activity.findMany({
          where: { accountId, tenantId, occurredAt: { gte: sixMonthsAgo } },
          select: { activityType: true, subject: true, occurredAt: true },
          orderBy: { occurredAt: 'desc' },
        }),
        prisma.order.findMany({
          where: { accountId, tenantId, createdAt: { gte: sixMonthsAgo } },
          select: { orderNumber: true, total: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const prompt = buildMeetingBriefPrompt(
        account.name,
        contacts,
        activities,
        orders.map((o) => ({ ...o, total: Number(o.total) })),
      );

      const response = await provider.generateText(
        prompt,
        'You are a sales assistant. Generate concise, actionable meeting briefs. Respond only with valid JSON.',
      );

      const parsed = JSON.parse(response) as Omit<MeetingBrief, 'generatedAt'>;

      return {
        ...parsed,
        generatedAt: new Date().toISOString(),
      };
    },

    async generateActivitySummary(
      tenantId: string,
      accountId: string,
      period: 'week' | 'month' | 'quarter' = 'month',
    ): Promise<ActivitySummary> {
      const periodStart = new Date();
      if (period === 'week') periodStart.setDate(periodStart.getDate() - 7);
      else if (period === 'month') periodStart.setMonth(periodStart.getMonth() - 1);
      else periodStart.setMonth(periodStart.getMonth() - 3);

      const [account, activities] = await Promise.all([
        prisma.account.findFirstOrThrow({
          where: { id: accountId, tenantId, deletedAt: null },
          select: { name: true },
        }),
        prisma.activity.findMany({
          where: { accountId, tenantId, occurredAt: { gte: periodStart } },
          select: { activityType: true, subject: true, occurredAt: true },
          orderBy: { occurredAt: 'desc' },
        }),
      ]);

      const activityList = activities
        .map(
          (a) =>
            `- ${a.activityType}: ${a.subject ?? 'No subject'} (${a.occurredAt.toISOString().split('T')[0]})`,
        )
        .join('\n');

      const prompt = `Summarize the following sales activities for account "${account.name}" over the past ${period}:

${activityList || 'No activities recorded.'}

Write a concise 2-3 sentence summary highlighting key engagement patterns and notable interactions.`;

      const summary = await provider.generateText(
        prompt,
        'You are a sales assistant. Provide concise activity summaries.',
      );

      return {
        summary,
        totalActivities: activities.length,
        period,
        generatedAt: new Date().toISOString(),
      };
    },

    async generateEmailDraft(
      tenantId: string,
      accountId: string,
      purpose: string,
    ): Promise<EmailDraft> {
      const [account, contacts] = await Promise.all([
        prisma.account.findFirstOrThrow({
          where: { id: accountId, tenantId, deletedAt: null },
          select: { name: true },
        }),
        prisma.contact.findMany({
          where: { accountId, tenantId, deletedAt: null, isPrimary: true },
          select: { firstName: true, lastName: true, title: true },
          take: 1,
        }),
      ]);

      const contactName = contacts[0]
        ? `${contacts[0].firstName} ${contacts[0].lastName}`
        : 'there';

      const prompt = `Draft a professional sales email for account "${account.name}".
Recipient: ${contactName}
Purpose: ${purpose}

Respond in valid JSON: {"subject": "string", "body": "string"}`;

      const response = await provider.generateText(
        prompt,
        'You are a professional sales communication assistant. Draft concise, professional emails. Respond only with valid JSON.',
      );

      const parsed = JSON.parse(response) as { subject: string; body: string };

      return {
        ...parsed,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

export type AiService = ReturnType<typeof createAiService>;
