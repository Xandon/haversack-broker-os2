import type { PrismaClient, Contact } from '@prisma/client';
import type { CreateContactInput, UpdateContactInput } from '@haversack/shared';
import {
  writeAuditLog,
  detectChanges,
  writeUpdateAuditLogs,
} from '../../shared/services/audit.service';
import { AccountError } from './account.service';

interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export async function createContact(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  data: CreateContactInput,
  audit: AuditContext,
): Promise<Contact> {
  // Verify account exists and belongs to tenant
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
  });

  if (!account) {
    throw new AccountError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  // If setting as primary, unset other primary contacts
  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { accountId, tenantId, isPrimary: true, deletedAt: null },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.contact.create({
    data: {
      tenantId,
      accountId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      title: data.title ?? null,
      isPrimary: data.isPrimary ?? false,
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Contact',
    entityId: contact.id,
    action: 'create',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return contact;
}

export async function updateContact(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  contactId: string,
  data: UpdateContactInput,
  audit: AuditContext,
): Promise<Contact> {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, accountId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new AccountError('Contact not found', 'CONTACT_NOT_FOUND');
  }

  // If setting as primary, unset other primary contacts
  if (data.isPrimary === true) {
    await prisma.contact.updateMany({
      where: { accountId, tenantId, isPrimary: true, deletedAt: null, id: { not: contactId } },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
    },
  });

  const oldData: Record<string, unknown> = {
    firstName: existing.firstName,
    lastName: existing.lastName,
    email: existing.email,
    phone: existing.phone,
    title: existing.title,
    isPrimary: existing.isPrimary,
  };
  const newData: Record<string, unknown> = {
    firstName: updated.firstName,
    lastName: updated.lastName,
    email: updated.email,
    phone: updated.phone,
    title: updated.title,
    isPrimary: updated.isPrimary,
  };

  const changes = detectChanges(oldData, newData);
  if (changes.length > 0) {
    await writeUpdateAuditLogs(
      {
        prisma,
        tenantId,
        actorId: audit.actorId,
        actorEmail: audit.actorEmail,
        entityType: 'Contact',
        entityId: contactId,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        requestId: audit.requestId,
      },
      changes,
    );
  }

  return updated;
}

export async function softDeleteContact(
  prisma: PrismaClient,
  tenantId: string,
  accountId: string,
  contactId: string,
  audit: AuditContext,
): Promise<{ id: string; deletedAt: Date }> {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, accountId, tenantId, deletedAt: null },
  });

  if (!existing) {
    throw new AccountError('Contact not found', 'CONTACT_NOT_FOUND');
  }

  const deletedAt = new Date();

  await prisma.contact.update({
    where: { id: contactId },
    data: { deletedAt },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Contact',
    entityId: contactId,
    action: 'delete',
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { id: contactId, deletedAt };
}
