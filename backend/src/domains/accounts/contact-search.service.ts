import type { PrismaClient } from '@prisma/client';
import type { ContactSearchResult } from '@haversack/shared';

export interface ContactSearchOptions {
  query: string;
  limit?: number;
}

export async function searchContacts(
  prisma: PrismaClient,
  tenantId: string,
  options: ContactSearchOptions,
): Promise<ContactSearchResult[]> {
  const { query, limit = 5 } = options;
  const searchPattern = `%${query}%`;

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      account_id: string;
      account_name: string;
    }>
  >(
    `SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
            c.account_id, a.name as account_name
     FROM contacts c
     INNER JOIN accounts a ON a.id = c.account_id AND a.tenant_id = $1 AND a.deleted_at IS NULL
     WHERE c.tenant_id = $1
       AND c.deleted_at IS NULL
       AND (
         c.first_name ILIKE $2 OR
         c.last_name ILIKE $2 OR
         c.email ILIKE $2 OR
         c.phone ILIKE $2
       )
     ORDER BY
       CASE WHEN c.first_name ILIKE $2 OR c.last_name ILIKE $2 THEN 1 ELSE 2 END,
       c.first_name ASC, c.last_name ASC
     LIMIT $3`,
    tenantId,
    searchPattern,
    limit,
  );

  return results.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    accountId: row.account_id,
    accountName: row.account_name,
  }));
}
