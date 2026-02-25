/**
 * Fuzzy string matching utilities for duplicate detection.
 * Implements Levenshtein distance algorithm and similarity scoring.
 * Used by the account duplicate detection service.
 */

/**
 * Normalize a string for comparison: lowercase, trim, and collapse whitespace.
 */
export function normalizeForComparison(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses dynamic programming (Wagner-Fischer algorithm) with O(min(m,n)) space.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance (number of insertions, deletions, or substitutions)
 */
export function levenshteinDistance(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);

  if (normA === normB) return 0;
  if (normA.length === 0) return normB.length;
  if (normB.length === 0) return normA.length;

  // Ensure we iterate over the shorter string in the inner loop (space optimization)
  const shorter = normA.length <= normB.length ? normA : normB;
  const longer = normA.length <= normB.length ? normB : normA;

  // Only two rows needed at a time
  let previousRow: number[] = Array.from({ length: shorter.length + 1 }, (_, i) => i);

  for (let i = 1; i <= longer.length; i++) {
    const currentRow: number[] = [i];

    for (let j = 1; j <= shorter.length; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        (currentRow[j - 1] ?? 0) + 1, // insertion
        (previousRow[j] ?? 0) + 1, // deletion
        (previousRow[j - 1] ?? 0) + cost, // substitution
      );
    }

    previousRow = currentRow;
  }

  return previousRow[shorter.length] ?? 0;
}

/**
 * Compute a 0-1 similarity score between two strings.
 * Returns 1.0 for identical strings, 0.0 for completely different strings.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score between 0 and 1
 */
export function similarityScore(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);

  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  return 1 - distance / maxLen;
}

/** A match result from fuzzy matching */
export interface FuzzyMatchResult<T> {
  item: T;
  score: number;
}

/**
 * Find items in a candidate list that fuzzy-match a query above a given threshold.
 * Results are sorted by score descending (best match first).
 *
 * @param query - The query string to match against
 * @param candidates - Array of candidate items
 * @param getText - Function to extract the text string from a candidate item
 * @param threshold - Minimum similarity score (0-1) to include in results
 * @returns Array of matching items with their scores, sorted by score descending
 */
export function fuzzyMatch<T>(
  query: string,
  candidates: T[],
  getText: (item: T) => string,
  threshold: number = 0.6,
): FuzzyMatchResult<T>[] {
  const results: FuzzyMatchResult<T>[] = [];

  for (const candidate of candidates) {
    const text = getText(candidate);
    const score = similarityScore(query, text);

    if (score >= threshold) {
      results.push({ item: candidate, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
