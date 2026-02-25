/**
 * Email tracking service.
 * Provides email record creation, contact matching, engagement event processing,
 * unmatched email listing, and manual matching.
 */
import type { PrismaClient, EmailRecord } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { logger } from '../../shared/utils/logger.js';

/** Input for creating an email record */
export interface CreateEmailRecordInput {
  account_id?: string | null;
  contact_id?: string | null;
  user_id?: string | null;
  activity_id?: string | null;
  direction: 'inbound' | 'outbound';
  subject?: string | null;
  body_preview?: string | null;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  message_id?: string | null;
  thread_id?: string | null;
}

/** Engagement event types */
export type EngagementEventType = 'opened' | 'clicked' | 'bounced';

/** Options for listing emails */
export interface EmailListOptions {
  page?: number;
  pageSize?: number;
}

/** Paginated email record result */
export interface PaginatedEmailResult {
  items: EmailRecord[];
  total: number;
  page: number;
  pageSize: number;
}

/** Manual match input */
export interface ManualMatchInput {
  account_id?: string;
  contact_id?: string;
}

/**
 * Create a new email record.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param input - Email record creation input
 * @returns The created email record
 */
export async function createEmailRecord(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateEmailRecordInput,
): Promise<EmailRecord> {
  const isMatched = Boolean(input.account_id || input.contact_id);

  const emailRecord = await prisma.emailRecord.create({
    data: {
      tenant_id: tenantId,
      account_id: input.account_id ?? null,
      contact_id: input.contact_id ?? null,
      user_id: input.user_id ?? null,
      activity_id: input.activity_id ?? null,
      direction: input.direction as EmailRecord['direction'],
      subject: input.subject ?? null,
      body_preview: input.body_preview ?? null,
      from_address: input.from_address,
      to_addresses: input.to_addresses,
      cc_addresses: input.cc_addresses ?? [],
      message_id: input.message_id ?? null,
      thread_id: input.thread_id ?? null,
      is_matched: isMatched,
    },
  });

  logger.info(
    {
      operation: 'create-email-record',
      tenantId,
      emailRecordId: emailRecord.id,
      direction: input.direction,
      isMatched,
    },
    `Email record created: ${input.direction} from ${input.from_address}`,
  );

  return emailRecord;
}

/**
 * Match an email address to a contact within the tenant.
 * Searches contacts by email address.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param emailAddress - The email address to search for
 * @returns The matching contact with account info, or null
 */
export async function matchEmailToContact(
  prisma: PrismaClient,
  tenantId: string,
  emailAddress: string,
): Promise<{ contactId: string; accountId: string } | null> {
  const contact = await prisma.contact.findFirst({
    where: {
      tenant_id: tenantId,
      email: emailAddress.toLowerCase(),
      deleted_at: null,
    },
    select: {
      id: true,
      account_id: true,
    },
  });

  if (!contact) {
    return null;
  }

  return {
    contactId: contact.id,
    accountId: contact.account_id,
  };
}

/**
 * Process an engagement event for an email record.
 * Updates the email record with open/click/bounce timestamps.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param messageId - The email message ID to update
 * @param event - The engagement event type
 * @returns The updated email record, or null if not found
 */
export async function processEngagementEvent(
  prisma: PrismaClient,
  tenantId: string,
  messageId: string,
  event: EngagementEventType,
): Promise<EmailRecord | null> {
  const emailRecord = await prisma.emailRecord.findFirst({
    where: {
      tenant_id: tenantId,
      message_id: messageId,
    },
  });

  if (!emailRecord) {
    logger.warn(
      {
        operation: 'process-engagement-event',
        tenantId,
        messageId,
        event,
      },
      `Email record not found for message_id: ${messageId}`,
    );
    return null;
  }

  const updateData: Prisma.EmailRecordUpdateInput = {};
  const now = new Date();

  switch (event) {
    case 'opened':
      updateData.engagement_status = 'opened';
      updateData.opened_at = now;
      break;
    case 'clicked':
      updateData.engagement_status = 'clicked';
      updateData.clicked_at = now;
      break;
    case 'bounced':
      updateData.engagement_status = 'bounced';
      updateData.bounced_at = now;
      break;
  }

  const updated = await prisma.emailRecord.update({
    where: { id: emailRecord.id },
    data: updateData,
  });

  logger.info(
    {
      operation: 'process-engagement-event',
      tenantId,
      emailRecordId: emailRecord.id,
      event,
    },
    `Engagement event processed: ${event} for email ${emailRecord.id}`,
  );

  return updated;
}

/**
 * List unmatched email records for a tenant with pagination.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param options - Pagination options
 * @returns Paginated unmatched email results
 */
export async function listUnmatchedEmails(
  prisma: PrismaClient,
  tenantId: string,
  options: EmailListOptions = {},
): Promise<PaginatedEmailResult> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where = {
    tenant_id: tenantId,
    is_matched: false,
  };

  const [items, total] = await Promise.all([
    prisma.emailRecord.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.emailRecord.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Manually match an email record to an account and/or contact.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param emailRecordId - The email record ID to match
 * @param input - The account and/or contact to match to
 * @returns The updated email record, or null if not found
 */
export async function manualMatchEmail(
  prisma: PrismaClient,
  tenantId: string,
  emailRecordId: string,
  input: ManualMatchInput,
): Promise<EmailRecord | null> {
  const emailRecord = await prisma.emailRecord.findFirst({
    where: {
      id: emailRecordId,
      tenant_id: tenantId,
    },
  });

  if (!emailRecord) {
    return null;
  }

  const updateData: Prisma.EmailRecordUpdateInput = {
    is_matched: true,
  };

  if (input.account_id) {
    updateData.account = { connect: { id: input.account_id } };
  }

  if (input.contact_id) {
    updateData.contact = { connect: { id: input.contact_id } };
  }

  const updated = await prisma.emailRecord.update({
    where: { id: emailRecordId },
    data: updateData,
  });

  logger.info(
    {
      operation: 'manual-match-email',
      tenantId,
      emailRecordId,
      accountId: input.account_id,
      contactId: input.contact_id,
    },
    `Email manually matched: ${emailRecordId}`,
  );

  return updated;
}
