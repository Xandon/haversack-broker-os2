/**
 * Account duplicate detection service.
 * Compares new account data against existing accounts using fuzzy matching
 * on name, phone, and address fields with configurable confidence thresholds.
 *
 * Confidence weights: name 50%, phone 30%, address 20%
 * Match thresholds: name >= 0.8, phone exact match, address >= 0.7
 */
import type { PrismaClient } from '@prisma/client';

import {
  normalizeForComparison,
  similarityScore,
} from '../../shared/utils/fuzzy-match.js';

/** Minimum similarity thresholds for each field */
const NAME_THRESHOLD = 0.8;
const ADDRESS_THRESHOLD = 0.7;

/** Confidence weights for overall score calculation */
const NAME_WEIGHT = 0.5;
const PHONE_WEIGHT = 0.3;
const ADDRESS_WEIGHT = 0.2;

/** Input shape for duplicate checking (subset of CreateAccountInput) */
export interface DuplicateCheckInput {
  name: string;
  phone?: string | null;
  address_line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

/** A field that matched during duplicate detection */
export interface MatchedField {
  field: string;
  score: number;
}

/** A single duplicate match result */
export interface DuplicateMatch {
  account: {
    id: string;
    name: string;
    phone: string | null;
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
  };
  confidence: number;
  matchedFields: MatchedField[];
}

/**
 * Normalize a phone number for comparison: strip all non-digit characters.
 */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Build a combined address string for similarity comparison.
 */
function buildAddressString(
  addressLine1: string | undefined,
  city: string | undefined,
  state: string | undefined,
  zipCode: string | undefined,
): string {
  return [addressLine1, city, state, zipCode].filter(Boolean).join(' ');
}

/**
 * Find potential duplicate accounts in the database for a given input.
 * Queries existing accounts within the same tenant and compares name, phone,
 * and address using fuzzy matching.
 *
 * @param prisma - PrismaClient instance
 * @param tenantId - The tenant to search within
 * @param input - The new account data to check for duplicates
 * @returns Array of duplicate matches sorted by confidence descending
 */
export async function findDuplicates(
  prisma: PrismaClient,
  tenantId: string,
  input: DuplicateCheckInput,
): Promise<DuplicateMatch[]> {
  // Fetch all active, non-deleted accounts for this tenant
  const existingAccounts = await prisma.account.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      is_active: true,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      address_line1: true,
      city: true,
      state: true,
      zip_code: true,
    },
  });

  const inputPhone = normalizePhone(input.phone);
  const inputAddress = buildAddressString(
    input.address_line1,
    input.city,
    input.state,
    input.zip_code,
  );

  const matches: DuplicateMatch[] = [];

  for (const account of existingAccounts) {
    const matchedFields: MatchedField[] = [];
    let weightedSum = 0;
    let totalWeight = 0;

    // Name comparison (weight: 50%)
    const nameScore = similarityScore(
      normalizeForComparison(input.name),
      normalizeForComparison(account.name),
    );
    if (nameScore >= NAME_THRESHOLD) {
      matchedFields.push({ field: 'name', score: nameScore });
      weightedSum += nameScore * NAME_WEIGHT;
      totalWeight += NAME_WEIGHT;
    }

    // Phone comparison (weight: 30%) — exact match on normalized digits
    if (inputPhone && account.phone) {
      const accountPhone = normalizePhone(account.phone);
      if (accountPhone && inputPhone === accountPhone) {
        matchedFields.push({ field: 'phone', score: 1.0 });
        weightedSum += 1.0 * PHONE_WEIGHT;
        totalWeight += PHONE_WEIGHT;
      }
    }

    // Address comparison (weight: 20%)
    const accountAddress = buildAddressString(
      account.address_line1,
      account.city,
      account.state,
      account.zip_code,
    );
    if (inputAddress && accountAddress) {
      const addressScore = similarityScore(
        normalizeForComparison(inputAddress),
        normalizeForComparison(accountAddress),
      );
      if (addressScore >= ADDRESS_THRESHOLD) {
        matchedFields.push({ field: 'address', score: addressScore });
        weightedSum += addressScore * ADDRESS_WEIGHT;
        totalWeight += ADDRESS_WEIGHT;
      }
    }

    // Only include if at least one field matched
    if (matchedFields.length > 0 && totalWeight > 0) {
      const confidence = weightedSum / totalWeight;
      matches.push({
        account: {
          id: account.id,
          name: account.name,
          phone: account.phone,
          address_line1: account.address_line1,
          city: account.city,
          state: account.state,
          zip_code: account.zip_code,
        },
        confidence,
        matchedFields,
      });
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}
