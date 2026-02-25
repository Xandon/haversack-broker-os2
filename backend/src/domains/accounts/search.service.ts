/**
 * Account search service.
 * Provides full-text search across accounts using Prisma's case-insensitive
 * `contains` filter backed by pg_trgm GIN indexes for <200ms performance.
 * Supports pagination, type/territory filtering, and relevance ranking.
 */
import type { PrismaClient, Account } from '@prisma/client';

import type { PaginatedResult } from './account.service.js';
import { logger } from '../../shared/utils/logger.js';

/** Options for account search */
export interface SearchOptions {
  accountType?: string;
  territoryId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** A search result with relevance hint */
export interface AccountSearchResult {
  account: Account;
  relevance: 'exact_name' | 'partial_name' | 'address' | 'city';
}

/** Paginated search results with relevance hints */
export interface SearchResults {
  items: AccountSearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Determine the relevance category for a search match.
 */
function determineRelevance(
  account: Account,
  query: string,
): 'exact_name' | 'partial_name' | 'address' | 'city' {
  const lowerQuery = query.toLowerCase();
  const lowerName = account.name.toLowerCase();

  if (lowerName === lowerQuery) {
    return 'exact_name';
  }
  if (lowerName.includes(lowerQuery)) {
    return 'partial_name';
  }
  if (account.city && account.city.toLowerCase().includes(lowerQuery)) {
    return 'city';
  }
  return 'address';
}

/**
 * Assign a numeric sort priority for relevance ranking.
 * Lower number = higher priority.
 */
function relevancePriority(relevance: 'exact_name' | 'partial_name' | 'address' | 'city'): number {
  switch (relevance) {
    case 'exact_name':
      return 0;
    case 'partial_name':
      return 1;
    case 'city':
      return 2;
    case 'address':
      return 3;
  }
}

/**
 * Search accounts by query string across name, address, and city fields.
 * Uses Prisma `contains` with `mode: 'insensitive'` for case-insensitive
 * matching, which is accelerated by pg_trgm GIN indexes.
 *
 * Results are ranked by relevance: exact name > partial name > city > address.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param query - Search query string
 * @param options - Optional filters and pagination
 * @returns Paginated search results with relevance hints
 */
export async function searchAccounts(
  prisma: PrismaClient,
  tenantId: string,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResults> {
  const startTime = performance.now();
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  // Build base where clause with tenant isolation
  const baseWhere: Record<string, unknown> = {
    tenant_id: tenantId,
    deleted_at: null,
  };

  if (options.accountType) {
    baseWhere['account_type'] = options.accountType;
  }

  if (options.territoryId) {
    baseWhere['territory_id'] = options.territoryId;
  }

  if (options.isActive !== undefined) {
    baseWhere['is_active'] = options.isActive;
  }

  // Search across name, address_line1, and city with OR
  const searchWhere = {
    ...baseWhere,
    OR: [
      { name: { contains: trimmedQuery, mode: 'insensitive' as const } },
      { address_line1: { contains: trimmedQuery, mode: 'insensitive' as const } },
      { city: { contains: trimmedQuery, mode: 'insensitive' as const } },
    ],
  };

  // Count total matches and fetch results
  const [total, accounts] = await Promise.all([
    prisma.account.count({ where: searchWhere }),
    prisma.account.findMany({
      where: searchWhere,
      orderBy: { name: 'asc' },
      // Fetch all results for relevance sorting, then paginate in-memory
      // For datasets under ~10k accounts per tenant, this is well within <200ms
      take: 1000,
    }),
  ]);

  // Rank by relevance
  const ranked: AccountSearchResult[] = accounts
    .map((account) => ({
      account,
      relevance: determineRelevance(account, trimmedQuery),
    }))
    .sort((a, b) => relevancePriority(a.relevance) - relevancePriority(b.relevance));

  // Apply pagination on ranked results
  const skip = (page - 1) * pageSize;
  const paginatedItems = ranked.slice(skip, skip + pageSize);

  const duration = Math.round(performance.now() - startTime);

  logger.debug(
    {
      operation: 'search-accounts',
      tenantId,
      query: trimmedQuery,
      total,
      duration,
    },
    `Account search complete: "${trimmedQuery}" => ${total} results in ${duration}ms`,
  );

  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
  };
}

/**
 * Simple search returning paginated accounts without relevance ranking.
 * Useful for quick autocomplete/typeahead scenarios.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - Tenant ID for isolation
 * @param query - Search query string
 * @param options - Optional filters and pagination
 * @returns Paginated account results
 */
export async function quickSearchAccounts(
  prisma: PrismaClient,
  tenantId: string,
  query: string,
  options: SearchOptions = {},
): Promise<PaginatedResult<Account>> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 10;
  const skip = (page - 1) * pageSize;

  const trimmedQuery = query.trim();

  if (trimmedQuery.length === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    deleted_at: null,
    name: { contains: trimmedQuery, mode: 'insensitive' },
  };

  if (options.accountType) {
    where['account_type'] = options.accountType;
  }

  if (options.territoryId) {
    where['territory_id'] = options.territoryId;
  }

  if (options.isActive !== undefined) {
    where['is_active'] = options.isActive;
  }

  const [items, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.account.count({ where }),
  ]);

  return { items, total, page, pageSize };
}
