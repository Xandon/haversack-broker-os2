import {
  EmailDirection,
  EngagementStatus,
  EmailTemplateCategory,
  PrismaClient,
} from '@prisma/client';

export interface EmailFilters {
  accountId?: string;
  contactId?: string;
  direction?: EmailDirection;
  engagementStatus?: EngagementStatus;
  isMatched?: boolean;
}

export interface EmailListResult {
  data: {
    id: string;
    direction: EmailDirection;
    subject: string | null;
    bodyPreview: string | null;
    fromAddress: string;
    toAddresses: string[];
    ccAddresses: string[];
    engagementStatus: EngagementStatus;
    openedAt: Date | null;
    clickedAt: Date | null;
    bouncedAt: Date | null;
    isMatched: boolean;
    createdAt: Date;
    account: { id: string; name: string } | null;
    contact: { id: string; firstName: string; lastName: string } | null;
  }[];
  total: number;
  page: number;
  limit: number;
}

export interface SendEmailInput {
  tenantId: string;
  userId: string;
  accountId?: string;
  contactId?: string;
  toAddresses: string[];
  ccAddresses?: string[];
  subject: string;
  bodyPreview: string;
}

export interface TemplateListResult {
  data: {
    id: string;
    name: string;
    subjectTemplate: string;
    bodyTemplate: string;
    category: EmailTemplateCategory;
    mergeFields: string[];
    isActive: boolean;
  }[];
  total: number;
}

export function createEmailService(prisma: PrismaClient) {
  return {
    async list(
      tenantId: string,
      page: number = 1,
      limit: number = 20,
      filters: EmailFilters = {},
    ): Promise<EmailListResult> {
      const where: Record<string, unknown> = { tenantId };

      if (filters.accountId) where.accountId = filters.accountId;
      if (filters.contactId) where.contactId = filters.contactId;
      if (filters.direction) where.direction = filters.direction;
      if (filters.engagementStatus) where.engagementStatus = filters.engagementStatus;
      if (filters.isMatched !== undefined) where.isMatched = filters.isMatched;

      const [data, total] = await Promise.all([
        prisma.emailRecord.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            direction: true,
            subject: true,
            bodyPreview: true,
            fromAddress: true,
            toAddresses: true,
            ccAddresses: true,
            engagementStatus: true,
            openedAt: true,
            clickedAt: true,
            bouncedAt: true,
            isMatched: true,
            createdAt: true,
            account: { select: { id: true, name: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        prisma.emailRecord.count({ where }),
      ]);

      return { data, total, page, limit };
    },

    async sendEmail(input: SendEmailInput) {
      const record = await prisma.emailRecord.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          accountId: input.accountId ?? null,
          contactId: input.contactId ?? null,
          direction: 'outbound',
          subject: input.subject,
          bodyPreview: input.bodyPreview,
          fromAddress: `user-${input.userId}@app.haversack.com`,
          toAddresses: input.toAddresses,
          ccAddresses: input.ccAddresses ?? [],
          engagementStatus: 'sent',
          isMatched: !!(input.accountId || input.contactId),
          canSpamCompliant: true,
        },
        select: {
          id: true,
          direction: true,
          subject: true,
          fromAddress: true,
          toAddresses: true,
          engagementStatus: true,
          createdAt: true,
        },
      });

      return record;
    },

    async updateEngagement(tenantId: string, emailId: string, status: EngagementStatus) {
      const data: Record<string, unknown> = {
        engagementStatus: status,
      };

      if (status === 'opened') data.openedAt = new Date();
      if (status === 'clicked') data.clickedAt = new Date();
      if (status === 'bounced') data.bouncedAt = new Date();

      return prisma.emailRecord.update({
        where: { id: emailId, tenantId },
        data,
        select: {
          id: true,
          engagementStatus: true,
          openedAt: true,
          clickedAt: true,
          bouncedAt: true,
        },
      });
    },

    async getUnmatchedEmails(tenantId: string, page: number = 1, limit: number = 20) {
      const where = { tenantId, isMatched: false };
      const [data, total] = await Promise.all([
        prisma.emailRecord.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            direction: true,
            subject: true,
            bodyPreview: true,
            fromAddress: true,
            toAddresses: true,
            engagementStatus: true,
            createdAt: true,
          },
        }),
        prisma.emailRecord.count({ where }),
      ]);

      return { data, total, page, limit };
    },

    async matchEmail(tenantId: string, emailId: string, accountId: string, contactId?: string) {
      return prisma.emailRecord.update({
        where: { id: emailId, tenantId },
        data: {
          accountId,
          contactId: contactId ?? null,
          isMatched: true,
        },
        select: {
          id: true,
          isMatched: true,
          accountId: true,
          contactId: true,
        },
      });
    },

    async listTemplates(tenantId: string): Promise<TemplateListResult> {
      const data = await prisma.emailTemplate.findMany({
        where: { tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          subjectTemplate: true,
          bodyTemplate: true,
          category: true,
          mergeFields: true,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      return { data, total: data.length };
    },
  };
}
