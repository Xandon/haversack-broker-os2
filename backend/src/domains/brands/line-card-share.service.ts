import type { PrismaClient } from '@prisma/client';
import { generateLineCard } from './line-card.service';
import { BrandError } from './brand.service';

export interface ShareLineCardResult {
  recipientEmail: string;
  recipientName: string;
  brandName: string;
  filename: string;
}

export async function shareLineCard(
  prisma: PrismaClient,
  tenantId: string,
  brandId: string,
  accountId: string,
): Promise<ShareLineCardResult> {
  // Get account with primary contact
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId, deletedAt: null },
    include: {
      contacts: {
        where: { isPrimary: true, deletedAt: null },
        take: 1,
      },
    },
  });

  if (!account) {
    throw new BrandError('Account not found', 'BRAND_ACCOUNT_NOT_FOUND');
  }

  const primaryContact = account.contacts[0];
  if (!primaryContact || !primaryContact.email) {
    throw new BrandError(
      'Account has no primary contact with an email address',
      'BRAND_NO_PRIMARY_CONTACT',
    );
  }

  // Generate the line card PDF
  const { filename } = await generateLineCard(prisma, tenantId, brandId);

  // Get brand name for the result
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, tenantId },
  });

  return {
    recipientEmail: primaryContact.email,
    recipientName: `${primaryContact.firstName} ${primaryContact.lastName}`,
    brandName: brand?.name ?? 'Unknown Brand',
    filename,
  };
}
