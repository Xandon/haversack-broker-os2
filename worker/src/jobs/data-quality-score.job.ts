import type { PrismaClient } from '@prisma/client';

interface QualityScoreResult {
  id: string;
  compositeScore: number;
}

export async function processDataQualityScore(
  prisma: PrismaClient,
  tenantId: string,
  _triggeredBy: string,
): Promise<QualityScoreResult> {
  // Dynamically import to avoid circular dependency with backend
  // In production, this calls calculateDataQuality from quality.service
  const accounts = await prisma.account.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, accountType: true, phone: true, email: true, address: true },
  });

  const contacts = await prisma.contact.findMany({
    where: { account: { tenantId, deletedAt: null } },
    select: { id: true, email: true },
  });

  const products = await prisma.product.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, imageUrl: true },
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const requiredFields = ['name', 'accountType', 'phone', 'email', 'address'] as const;

  // Account completeness
  let accountCompleteness = 100;
  if (accounts.length > 0) {
    let totalComplete = 0;
    for (const account of accounts) {
      const filledCount = requiredFields.filter(
        (f) => (account as Record<string, unknown>)[f] !== null &&
               (account as Record<string, unknown>)[f] !== undefined &&
               (account as Record<string, unknown>)[f] !== '',
      ).length;
      totalComplete += filledCount / requiredFields.length;
    }
    accountCompleteness = (totalComplete / accounts.length) * 100;
  }

  // Contact email validity
  let contactEmailValidity = 100;
  if (contacts.length > 0) {
    const validCount = contacts.filter(
      (c) => c.email !== null && c.email !== '' && emailRegex.test(c.email),
    ).length;
    contactEmailValidity = (validCount / contacts.length) * 100;
  }

  // Product images
  let productImages = 100;
  if (products.length > 0) {
    const withImages = products.filter(
      (p) => p.imageUrl !== null && p.imageUrl !== '',
    ).length;
    productImages = (withImages / products.length) * 100;
  }

  // Duplicate accounts
  const seen = new Map<string, boolean>();
  let duplicateAccountCount = 0;
  for (const account of accounts) {
    const normalized = account.name.toLowerCase().trim();
    if (seen.has(normalized)) {
      duplicateAccountCount++;
    } else {
      seen.set(normalized, true);
    }
  }

  // Stale accounts
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const staleAccountCount = await prisma.account.count({
    where: { tenantId, deletedAt: null, updatedAt: { lt: cutoff } },
  });

  // Composite score
  const compositeScore =
    (accountCompleteness + contactEmailValidity + productImages) / 3 * 0.6 +
    (duplicateAccountCount === 0 ? 100 : Math.max(0, 100 - duplicateAccountCount * 10)) * 0.2 +
    (staleAccountCount === 0 ? 100 : Math.max(0, 100 - staleAccountCount * 5)) * 0.2;

  const score = await prisma.dataQualityScore.create({
    data: {
      tenantId,
      accountCompleteness: Math.round(accountCompleteness * 100) / 100,
      contactEmailValidity: Math.round(contactEmailValidity * 100) / 100,
      productImages: Math.round(productImages * 100) / 100,
      duplicateAccountCount,
      staleAccountCount,
      compositeScore: Math.round(compositeScore * 100) / 100,
      calculatedAt: new Date(),
    },
  });

  return { id: score.id, compositeScore: score.compositeScore };
}
