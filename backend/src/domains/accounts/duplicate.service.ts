import type { PrismaClient } from '@prisma/client';

export interface DuplicateMatch {
  id: string;
  name: string;
  confidence: number;
  matchField: string;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: DuplicateMatch[];
}

export async function checkDuplicates(
  prisma: PrismaClient,
  tenantId: string,
  name: string,
  phone?: string,
  streetAddress?: string,
): Promise<DuplicateCheckResult> {
  const duplicates: DuplicateMatch[] = [];

  // Name matching using Levenshtein distance (threshold <= 3)
  const nameMatches = await prisma.$queryRawUnsafe<
    Array<{ id: string; name: string; distance: number }>
  >(
    `SELECT id, name, levenshtein(LOWER(name), LOWER($1)) as distance
     FROM accounts
     WHERE tenant_id = $2::uuid
       AND deleted_at IS NULL
       AND levenshtein(LOWER(name), LOWER($1)) <= 3
     ORDER BY levenshtein(LOWER(name), LOWER($1)) ASC
     LIMIT 5`,
    name,
    tenantId,
  );

  for (const match of nameMatches) {
    // Convert Levenshtein distance to confidence percentage
    // Distance 0 = 100%, 1 = 90%, 2 = 75%, 3 = 60%
    const confidenceMap: Record<number, number> = { 0: 100, 1: 90, 2: 75, 3: 60 };
    const confidence = confidenceMap[match.distance] ?? 50;

    duplicates.push({
      id: match.id,
      name: match.name,
      confidence,
      matchField: 'name',
    });
  }

  // Phone matching (exact or partial)
  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length >= 7) {
      const phoneMatches = await prisma.$queryRawUnsafe<
        Array<{ id: string; account_name: string }>
      >(
        `SELECT DISTINCT a.id, a.name as account_name
         FROM accounts a
         JOIN contacts c ON c.account_id = a.id AND c.deleted_at IS NULL
         WHERE a.tenant_id = $1::uuid
           AND a.deleted_at IS NULL
           AND REPLACE(REPLACE(REPLACE(c.phone, '-', ''), '(', ''), ')', '') LIKE $2
         LIMIT 5`,
        tenantId,
        `%${normalizedPhone}%`,
      );

      for (const match of phoneMatches) {
        // Only add if not already in duplicates from name matching
        if (!duplicates.some((d) => d.id === match.id)) {
          duplicates.push({
            id: match.id,
            name: match.account_name,
            confidence: 70,
            matchField: 'phone',
          });
        }
      }
    }
  }

  // Address matching (exact street match)
  if (streetAddress) {
    const addressMatches = await prisma.$queryRawUnsafe<
      Array<{ id: string; name: string }>
    >(
      `SELECT id, name
       FROM accounts
       WHERE tenant_id = $1::uuid
         AND deleted_at IS NULL
         AND LOWER(street_address) = LOWER($2)
       LIMIT 5`,
      tenantId,
      streetAddress,
    );

    for (const match of addressMatches) {
      if (!duplicates.some((d) => d.id === match.id)) {
        duplicates.push({
          id: match.id,
          name: match.name,
          confidence: 65,
          matchField: 'address',
        });
      }
    }
  }

  // Sort by confidence descending
  duplicates.sort((a, b) => b.confidence - a.confidence);

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}
