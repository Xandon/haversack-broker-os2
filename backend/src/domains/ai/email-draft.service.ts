import type { PrismaClient } from '@prisma/client';
import type { AIClient } from '../../shared/ai/ai-client';
import type { EmailDraftResponse, EmailDraftPurpose, EmailDraftTone } from '@haversack/shared';
import { buildEmailDraftPrompt } from '../../shared/ai/prompts';
import { AIServiceError } from '../../shared/ai/types';

export class EmailDraftError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'EmailDraftError';
    this.code = code;
  }
}

export interface EmailDraftOptions {
  context?: string;
  productIds?: string[];
  tone?: EmailDraftTone;
}

export async function generateEmailDraft(
  prisma: PrismaClient,
  aiClient: AIClient,
  tenantId: string,
  accountId: string,
  contactId: string,
  purpose: EmailDraftPurpose,
  senderName: string,
  options: EmailDraftOptions = {},
): Promise<EmailDraftResponse> {
  // Fetch account
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!account) {
    throw new EmailDraftError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  // Fetch contact
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, tenantId, accountId, deletedAt: null },
  });

  if (!contact) {
    throw new EmailDraftError('Contact not found', 'CONTACT_NOT_FOUND');
  }

  if (!contact.email) {
    throw new EmailDraftError(
      'Contact does not have an email address',
      'CONTACT_NO_EMAIL',
    );
  }

  // Fetch recent activities
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6);

  const recentActivities = await prisma.activity.findMany({
    where: {
      accountId,
      tenantId,
      deletedAt: null,
      createdAt: { gte: cutoffDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // Fetch products if product_ids provided
  let products: Array<{
    name: string;
    sku: string;
    unitPrice: number;
    certifications: string[];
  }> = [];

  if (options.productIds && options.productIds.length > 0) {
    const productRecords = await prisma.product.findMany({
      where: {
        id: { in: options.productIds },
        tenantId,
        isActive: true,
      },
    });

    products = productRecords.map((p) => ({
      name: p.name,
      sku: p.sku,
      unitPrice: Number(p.unitPrice),
      certifications: (p as Record<string, unknown>)['certifications'] as string[] ?? [],
    }));
  }

  const promptContext = {
    accountName: account.name,
    contactName: contact.name,
    contactTitle: (contact as Record<string, unknown>)['title'] as string | null,
    contactEmail: contact.email,
    purpose,
    additionalContext: options.context ?? null,
    tone: options.tone ?? 'professional',
    recentActivities: recentActivities.map((a) => ({
      type: a.type,
      subject: a.subject,
      createdAt: a.createdAt.toISOString().split('T')[0]!,
    })),
    products,
    senderName,
  };

  const { systemPrompt, userPrompt } = buildEmailDraftPrompt(promptContext);

  try {
    const result = await aiClient.generate(userPrompt, {
      systemPrompt,
      maxTokens: 1024,
    });

    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    const subject = (parsed['subject'] as string) ?? `Follow up — ${account.name}`;
    const body = (parsed['body'] as string) ?? '';

    // Compute a suggested send time (next business day morning)
    const now = new Date();
    const suggestedSend = new Date(now);
    suggestedSend.setDate(suggestedSend.getDate() + 1);
    suggestedSend.setHours(9, 0, 0, 0);
    // Skip weekends
    while (suggestedSend.getDay() === 0 || suggestedSend.getDay() === 6) {
      suggestedSend.setDate(suggestedSend.getDate() + 1);
    }

    return {
      ai_generated: true as const,
      ai_label: 'AI-Generated' as const,
      draft: {
        to_email: contact.email,
        to_name: contact.name,
        subject,
        body,
        suggested_send_time: suggestedSend.toISOString(),
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
