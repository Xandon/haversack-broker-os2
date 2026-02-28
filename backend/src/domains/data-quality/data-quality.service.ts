import { PrismaClient } from '@prisma/client';

export interface DataQualityMetric {
  key: string;
  label: string;
  value: number;
  total: number;
  percentage: number;
  weight: number;
}

export interface DataQualityScorecard {
  metrics: DataQualityMetric[];
  compositeScore: number;
  calculatedAt: string;
}

const STALE_DAYS = 90;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createDataQualityService(prisma: PrismaClient) {
  return {
    async getScorecard(tenantId: string): Promise<DataQualityScorecard> {
      const [
        accountCompleteness,
        contactEmailValidity,
        productImages,
        duplicateAccounts,
        staleAccounts,
      ] = await Promise.all([
        computeAccountCompleteness(prisma, tenantId),
        computeContactEmailValidity(prisma, tenantId),
        computeProductImages(prisma, tenantId),
        computeDuplicateAccounts(prisma, tenantId),
        computeStaleAccounts(prisma, tenantId),
      ]);

      const metrics: DataQualityMetric[] = [
        accountCompleteness,
        contactEmailValidity,
        productImages,
        duplicateAccounts,
        staleAccounts,
      ];

      const compositeScore = Math.round(
        metrics.reduce((sum, m) => sum + m.percentage * m.weight, 0) /
          metrics.reduce((sum, m) => sum + m.weight, 0),
      );

      return {
        metrics,
        compositeScore,
        calculatedAt: new Date().toISOString(),
      };
    },
  };
}

async function computeAccountCompleteness(
  prisma: PrismaClient,
  tenantId: string,
): Promise<DataQualityMetric> {
  const accounts = await prisma.account.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: {
      name: true,
      addressLine1: true,
      city: true,
      state: true,
      zipCode: true,
      phone: true,
      email: true,
    },
  });

  const total = accounts.length;
  const complete = accounts.filter(
    (a) => a.name && a.addressLine1 && a.city && a.state && a.zipCode && a.phone && a.email,
  ).length;

  return {
    key: 'account_completeness',
    label: 'Accounts with complete required fields',
    value: complete,
    total,
    percentage: total > 0 ? Math.round((complete / total) * 100) : 100,
    weight: 25,
  };
}

async function computeContactEmailValidity(
  prisma: PrismaClient,
  tenantId: string,
): Promise<DataQualityMetric> {
  const contacts = await prisma.contact.findMany({
    where: { tenantId, isActive: true },
    select: { email: true },
  });

  const total = contacts.length;
  const valid = contacts.filter((c) => c.email && EMAIL_REGEX.test(c.email)).length;

  return {
    key: 'contact_email_validity',
    label: 'Contacts with valid email format',
    value: valid,
    total,
    percentage: total > 0 ? Math.round((valid / total) * 100) : 100,
    weight: 20,
  };
}

async function computeProductImages(
  prisma: PrismaClient,
  tenantId: string,
): Promise<DataQualityMetric> {
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    select: { imageUrl: true },
  });

  const total = products.length;
  const withImage = products.filter((p) => p.imageUrl && p.imageUrl.length > 0).length;

  return {
    key: 'product_images',
    label: 'Products with images',
    value: withImage,
    total,
    percentage: total > 0 ? Math.round((withImage / total) * 100) : 100,
    weight: 15,
  };
}

async function computeDuplicateAccounts(
  prisma: PrismaClient,
  tenantId: string,
): Promise<DataQualityMetric> {
  const accounts = await prisma.account.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: { name: true },
  });

  const total = accounts.length;
  const nameMap = new Map<string, number>();
  for (const a of accounts) {
    const normalized = a.name.toLowerCase().trim();
    nameMap.set(normalized, (nameMap.get(normalized) ?? 0) + 1);
  }
  const duplicateCount = Array.from(nameMap.values())
    .filter((v) => v > 1)
    .reduce((s, v) => s + v, 0);
  const nonDuplicate = total - duplicateCount;

  return {
    key: 'duplicate_accounts',
    label: 'Accounts without duplicates',
    value: nonDuplicate,
    total,
    percentage: total > 0 ? Math.round((nonDuplicate / total) * 100) : 100,
    weight: 20,
  };
}

async function computeStaleAccounts(
  prisma: PrismaClient,
  tenantId: string,
): Promise<DataQualityMetric> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);

  const totalAccounts = await prisma.account.count({
    where: { tenantId, isActive: true, deletedAt: null },
  });

  const staleCount = await prisma.account.count({
    where: {
      tenantId,
      isActive: true,
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
  });

  const activeCount = totalAccounts - staleCount;

  return {
    key: 'stale_accounts',
    label: 'Accounts with recent activity (last 90 days)',
    value: activeCount,
    total: totalAccounts,
    percentage: totalAccounts > 0 ? Math.round((activeCount / totalAccounts) * 100) : 100,
    weight: 20,
  };
}
