import type { PrismaClient, DataQualityScore } from '@prisma/client';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STALE_DAYS = 90;

interface QualityScoreResult {
  accountCompleteness: number;
  contactEmailValidity: number;
  productImages: number;
  duplicateAccountCount: number;
  staleAccountCount: number;
  compositeScore: number;
  calculatedAt: string;
}

interface DrillDownItem {
  id: string;
  name: string;
  issue: string;
}

interface DrillDownResult {
  metric: string;
  items: DrillDownItem[];
  total: number;
  page: number;
  limit: number;
}

export async function calculateDataQuality(
  prisma: PrismaClient,
  tenantId: string,
): Promise<DataQualityScore> {
  const accountCompleteness = await calculateAccountCompleteness(prisma, tenantId);
  const contactEmailValidity = await calculateContactEmailValidity(prisma, tenantId);
  const productImages = await calculateProductImages(prisma, tenantId);
  const duplicateAccountCount = await calculateDuplicateAccountCount(prisma, tenantId);
  const staleAccountCount = await calculateStaleAccountCount(prisma, tenantId);

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

  return score;
}

export async function getLatestQualityScore(
  prisma: PrismaClient,
  tenantId: string,
): Promise<QualityScoreResult | null> {
  const score = await prisma.dataQualityScore.findFirst({
    where: { tenantId },
    orderBy: { calculatedAt: 'desc' },
  });

  if (!score) return null;

  return {
    accountCompleteness: score.accountCompleteness,
    contactEmailValidity: score.contactEmailValidity,
    productImages: score.productImages,
    duplicateAccountCount: score.duplicateAccountCount,
    staleAccountCount: score.staleAccountCount,
    compositeScore: score.compositeScore,
    calculatedAt: score.calculatedAt.toISOString(),
  };
}

export async function getDrillDown(
  prisma: PrismaClient,
  tenantId: string,
  metric: string,
  page: number,
  limit: number,
): Promise<DrillDownResult> {
  const skip = (page - 1) * limit;

  switch (metric) {
    case 'accountCompleteness':
      return drillDownAccountCompleteness(prisma, tenantId, page, limit, skip);
    case 'contactEmailValidity':
      return drillDownContactEmailValidity(prisma, tenantId, page, limit, skip);
    case 'productImages':
      return drillDownProductImages(prisma, tenantId, page, limit, skip);
    case 'duplicateAccounts':
      return drillDownDuplicateAccounts(prisma, tenantId, page, limit, skip);
    case 'staleAccounts':
      return drillDownStaleAccounts(prisma, tenantId, page, limit, skip);
    default:
      return { metric, items: [], total: 0, page, limit };
  }
}

async function calculateAccountCompleteness(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  const accounts = await prisma.account.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, accountType: true, phone: true, email: true, address: true },
  });

  if (accounts.length === 0) return 100;

  const requiredFields = ['name', 'accountType', 'phone', 'email', 'address'] as const;
  let totalComplete = 0;

  for (const account of accounts) {
    const filledCount = requiredFields.filter(
      (f) => account[f] !== null && account[f] !== undefined && account[f] !== '',
    ).length;
    totalComplete += filledCount / requiredFields.length;
  }

  return (totalComplete / accounts.length) * 100;
}

async function calculateContactEmailValidity(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  const contacts = await prisma.contact.findMany({
    where: { account: { tenantId, deletedAt: null } },
    select: { id: true, email: true },
  });

  if (contacts.length === 0) return 100;

  const validCount = contacts.filter(
    (c) => c.email !== null && c.email !== '' && EMAIL_REGEX.test(c.email),
  ).length;

  return (validCount / contacts.length) * 100;
}

async function calculateProductImages(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  const products = await prisma.product.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, imageUrl: true },
  });

  if (products.length === 0) return 100;

  const withImages = products.filter(
    (p) => p.imageUrl !== null && p.imageUrl !== '',
  ).length;

  return (withImages / products.length) * 100;
}

async function calculateDuplicateAccountCount(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  const accounts = await prisma.account.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true },
  });

  const seen = new Map<string, boolean>();
  let dupeCount = 0;

  for (const account of accounts) {
    const normalized = account.name.toLowerCase().trim();
    if (seen.has(normalized)) {
      dupeCount++;
    } else {
      seen.set(normalized, true);
    }
  }

  return dupeCount;
}

async function calculateStaleAccountCount(
  prisma: PrismaClient,
  tenantId: string,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);

  const staleCount = await prisma.account.count({
    where: {
      tenantId,
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
  });

  return staleCount;
}

async function drillDownAccountCompleteness(
  prisma: PrismaClient,
  tenantId: string,
  page: number,
  limit: number,
  skip: number,
): Promise<DrillDownResult> {
  const accounts = await prisma.account.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, accountType: true, phone: true, email: true, address: true },
  });

  const requiredFields = ['name', 'accountType', 'phone', 'email', 'address'] as const;
  const incomplete: DrillDownItem[] = [];

  for (const account of accounts) {
    const missing = requiredFields.filter(
      (f) => account[f] === null || account[f] === undefined || account[f] === '',
    );
    if (missing.length > 0) {
      incomplete.push({
        id: account.id,
        name: account.name,
        issue: `Missing: ${missing.join(', ')}`,
      });
    }
  }

  return {
    metric: 'accountCompleteness',
    items: incomplete.slice(skip, skip + limit),
    total: incomplete.length,
    page,
    limit,
  };
}

async function drillDownContactEmailValidity(
  prisma: PrismaClient,
  tenantId: string,
  page: number,
  limit: number,
  skip: number,
): Promise<DrillDownResult> {
  const contacts = await prisma.contact.findMany({
    where: { account: { tenantId, deletedAt: null } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const invalid: DrillDownItem[] = contacts
    .filter((c) => !c.email || !EMAIL_REGEX.test(c.email))
    .map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      issue: c.email ? 'Invalid email format' : 'Missing email',
    }));

  return {
    metric: 'contactEmailValidity',
    items: invalid.slice(skip, skip + limit),
    total: invalid.length,
    page,
    limit,
  };
}

async function drillDownProductImages(
  prisma: PrismaClient,
  tenantId: string,
  page: number,
  limit: number,
  skip: number,
): Promise<DrillDownResult> {
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
    select: { id: true, name: true },
    skip,
    take: limit,
  });

  const total = await prisma.product.count({
    where: {
      tenantId,
      deletedAt: null,
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
  });

  return {
    metric: 'productImages',
    items: products.map((p) => ({
      id: p.id,
      name: p.name,
      issue: 'Missing product image',
    })),
    total,
    page,
    limit,
  };
}

async function drillDownDuplicateAccounts(
  prisma: PrismaClient,
  tenantId: string,
  page: number,
  limit: number,
  skip: number,
): Promise<DrillDownResult> {
  const accounts = await prisma.account.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const nameMap = new Map<string, Array<{ id: string; name: string }>>();
  for (const account of accounts) {
    const normalized = account.name.toLowerCase().trim();
    const existing = nameMap.get(normalized) ?? [];
    existing.push(account);
    nameMap.set(normalized, existing);
  }

  const duplicates: DrillDownItem[] = [];
  for (const [, group] of nameMap) {
    if (group.length > 1) {
      for (const account of group.slice(1)) {
        duplicates.push({
          id: account.id,
          name: account.name,
          issue: `Duplicate of "${group[0]?.name}"`,
        });
      }
    }
  }

  return {
    metric: 'duplicateAccounts',
    items: duplicates.slice(skip, skip + limit),
    total: duplicates.length,
    page,
    limit,
  };
}

async function drillDownStaleAccounts(
  prisma: PrismaClient,
  tenantId: string,
  page: number,
  limit: number,
  skip: number,
): Promise<DrillDownResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);

  const accounts = await prisma.account.findMany({
    where: {
      tenantId,
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
    select: { id: true, name: true, updatedAt: true },
    skip,
    take: limit,
    orderBy: { updatedAt: 'asc' },
  });

  const total = await prisma.account.count({
    where: {
      tenantId,
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
  });

  return {
    metric: 'staleAccounts',
    items: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      issue: `Last updated: ${a.updatedAt.toISOString().split('T')[0]}`,
    })),
    total,
    page,
    limit,
  };
}
