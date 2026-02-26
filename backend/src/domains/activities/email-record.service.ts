import type { PrismaClient, EmailRecord } from '@prisma/client';
import type { CreateEmailRecordInput, EmailEngagementInput } from '@haversack/shared';
import { writeAuditLog } from '../../shared/services/audit.service';

export class EmailRecordError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'EmailRecordError';
    this.code = code;
  }
}

interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface EmailRecordWithLinked extends EmailRecord {
  isLinked: boolean;
}

export async function createEmailRecord(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  data: CreateEmailRecordInput,
  audit: AuditContext,
): Promise<EmailRecordWithLinked> {
  // Auto-link: find contact by matching recipientEmail
  const contact = await prisma.contact.findFirst({
    where: {
      tenantId,
      email: data.recipientEmail,
    },
  });

  const contactId = contact?.id ?? null;
  const accountId = contact?.accountId ?? null;

  const record = await prisma.emailRecord.create({
    data: {
      tenantId,
      contactId,
      accountId,
      userId,
      subject: data.subject,
      bodyPreview: data.bodyPreview ?? null,
      direction: data.direction,
      status: 'sent',
      recipientEmail: data.recipientEmail,
      sentAt: new Date(data.sentAt),
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'EmailRecord',
    entityId: record.id,
    action: 'create',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { ...record, isLinked: contactId !== null };
}

export async function listUnmatchedEmails(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    cursor?: string;
    limit?: number;
  },
): Promise<{
  data: EmailRecordWithLinked[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}> {
  const limit = options.limit ?? 20;

  const where = {
    tenantId,
    contactId: null,
  };

  const cursorObj = options.cursor ? { id: options.cursor } : undefined;

  const [records, total] = await Promise.all([
    prisma.emailRecord.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: limit + 1,
      ...(cursorObj ? { cursor: cursorObj, skip: 1 } : {}),
    }),
    prisma.emailRecord.count({ where }),
  ]);

  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data: data.map((r) => ({ ...r, isLinked: false })),
    pagination: { cursor: nextCursor, hasMore, total },
  };
}

export async function updateEngagement(
  prisma: PrismaClient,
  tenantId: string,
  emailId: string,
  data: EmailEngagementInput,
  audit: AuditContext,
): Promise<EmailRecordWithLinked> {
  const existing = await prisma.emailRecord.findFirst({
    where: { id: emailId, tenantId },
  });

  if (!existing) {
    throw new EmailRecordError('Email record not found', 'EMAIL_RECORD_NOT_FOUND');
  }

  const eventFieldMap: Record<string, string> = {
    opened: 'openedAt',
    clicked: 'clickedAt',
    bounced: 'bouncedAt',
  };

  const field = eventFieldMap[data.event];
  if (!field) {
    throw new EmailRecordError('Invalid engagement event', 'VALIDATION_ERROR');
  }

  const updated = await prisma.emailRecord.update({
    where: { id: emailId },
    data: {
      [field]: new Date(data.occurredAt),
      status: data.event,
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'EmailRecord',
    entityId: emailId,
    action: 'update',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { ...updated, isLinked: updated.contactId !== null };
}
