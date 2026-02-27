export interface MeetingBriefContext {
  accountName: string;
  contacts: Array<{
    name: string;
    title: string | null;
    email: string | null;
    isPrimary: boolean;
  }>;
  activities: Array<{
    type: string;
    subject: string;
    notes: string | null;
    createdAt: string;
  }>;
  orders: Array<{
    total: number;
    status: string;
    createdAt: string;
    lineItems: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  healthScore: number | null;
  healthTrend: string;
}

export interface EmailDraftContext {
  accountName: string;
  contactName: string;
  contactTitle: string | null;
  contactEmail: string;
  purpose: string;
  additionalContext: string | null;
  tone: string;
  recentActivities: Array<{
    type: string;
    subject: string;
    createdAt: string;
  }>;
  products: Array<{
    name: string;
    sku: string;
    unitPrice: number;
    certifications: string[];
  }>;
  senderName: string;
}

export interface ActivitySummaryContext {
  accountName: string;
  periodLabel: string;
  activities: Array<{
    type: string;
    subject: string;
    notes: string | null;
    createdAt: string;
  }>;
}

const MEETING_BRIEF_SYSTEM = `You are an AI assistant for Haversack Sales, a specialty food broker/wholesaler in the Pacific Northwest. Your task is to generate concise, actionable meeting preparation briefs for sales representatives.

You MUST respond with valid JSON matching this exact structure:
{
  "activity_summary": "string — 2-3 sentence summary of recent engagement",
  "talking_points": ["string array — 3-5 specific, actionable talking points"],
  "order_trend": "increasing" | "decreasing" | "stable" | "insufficient_data",
  "engagement_assessment": "string — one sentence overall assessment"
}

Be specific and reference actual data. Do not fabricate information. If data is limited, say so honestly.`;

const EMAIL_DRAFT_SYSTEM = `You are an AI assistant for Haversack Sales, a specialty food broker/wholesaler in the Pacific Northwest. Your task is to draft professional emails from sales reps to their contacts.

You MUST respond with valid JSON matching this exact structure:
{
  "subject": "string — email subject line",
  "body": "string — full email body text"
}

Write in the rep's voice. Be professional but approachable. Reference specific account data when available. Keep emails concise (150-250 words).`;

const ACTIVITY_SUMMARY_SYSTEM = `You are an AI assistant for Haversack Sales, a specialty food broker/wholesaler in the Pacific Northwest. Your task is to summarize account engagement activity.

You MUST respond with valid JSON matching this exact structure:
{
  "narrative": "string — 3-5 sentence narrative summary of engagement patterns",
  "key_events": ["string array — up to 5 most significant events with dates"],
  "engagement_assessment": "string — one sentence overall engagement level assessment"
}

Be specific and reference actual data. Identify patterns and trends. If data is limited, say so honestly.`;

export function buildMeetingBriefPrompt(context: MeetingBriefContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const contactsInfo = context.contacts
    .map(
      (c) =>
        `- ${c.name}${c.title ? ` (${c.title})` : ''}${c.isPrimary ? ' [Primary Contact]' : ''}`,
    )
    .join('\n');

  const activitiesInfo =
    context.activities.length > 0
      ? context.activities
          .slice(0, 20)
          .map((a) => `- ${a.createdAt}: ${a.type} — ${a.subject}${a.notes ? `: ${a.notes.slice(0, 100)}` : ''}`)
          .join('\n')
      : 'No recent activities recorded.';

  const ordersInfo =
    context.orders.length > 0
      ? context.orders
          .slice(0, 10)
          .map(
            (o) =>
              `- ${o.createdAt}: $${o.total.toFixed(2)} (${o.status}) — ${o.lineItems.map((li) => `${li.productName} x${li.quantity}`).join(', ')}`,
          )
          .join('\n')
      : 'No recent orders.';

  const userPrompt = `Generate a meeting preparation brief for the following account:

ACCOUNT: ${context.accountName}
HEALTH SCORE: ${context.healthScore !== null ? `${context.healthScore}/100 (${context.healthTrend})` : 'Not available'}

KEY CONTACTS:
${contactsInfo || 'No contacts on file.'}

RECENT ACTIVITIES (last 12 months):
${activitiesInfo}

RECENT ORDERS (last 12 months):
${ordersInfo}

Provide a meeting brief with an activity summary, talking points, order trend assessment, and engagement assessment.`;

  return { systemPrompt: MEETING_BRIEF_SYSTEM, userPrompt };
}

export function buildEmailDraftPrompt(context: EmailDraftContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const productsInfo =
    context.products.length > 0
      ? context.products
          .map(
            (p) =>
              `- ${p.name} (SKU: ${p.sku}, $${p.unitPrice.toFixed(2)})${p.certifications.length > 0 ? ` [${p.certifications.join(', ')}]` : ''}`,
          )
          .join('\n')
      : '';

  const recentInfo =
    context.recentActivities.length > 0
      ? context.recentActivities
          .slice(0, 5)
          .map((a) => `- ${a.createdAt}: ${a.type} — ${a.subject}`)
          .join('\n')
      : 'No recent interactions.';

  const userPrompt = `Draft an email with the following parameters:

FROM: ${context.senderName} (Haversack Sales)
TO: ${context.contactName}${context.contactTitle ? ` (${context.contactTitle})` : ''} <${context.contactEmail}>
ACCOUNT: ${context.accountName}
PURPOSE: ${context.purpose.replace(/_/g, ' ')}
TONE: ${context.tone}
${context.additionalContext ? `ADDITIONAL CONTEXT: ${context.additionalContext}` : ''}

RECENT INTERACTIONS:
${recentInfo}

${productsInfo ? `PRODUCTS TO REFERENCE:\n${productsInfo}` : ''}

Write the email subject and body.`;

  return { systemPrompt: EMAIL_DRAFT_SYSTEM, userPrompt };
}

export function buildActivitySummaryPrompt(context: ActivitySummaryContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const activitiesInfo =
    context.activities.length > 0
      ? context.activities
          .map(
            (a) =>
              `- ${a.createdAt}: ${a.type} — ${a.subject}${a.notes ? `: ${a.notes.slice(0, 100)}` : ''}`,
          )
          .join('\n')
      : 'No activities recorded in this period.';

  const userPrompt = `Summarize the engagement activity for the following account:

ACCOUNT: ${context.accountName}
PERIOD: ${context.periodLabel}
TOTAL ACTIVITIES: ${context.activities.length}

ACTIVITY LOG:
${activitiesInfo}

Provide a narrative summary, key events, and engagement assessment.`;

  return { systemPrompt: ACTIVITY_SUMMARY_SYSTEM, userPrompt };
}
