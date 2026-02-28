import { z } from 'zod';

// Contact search query params (backend validation)
export const contactSearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

export type ContactSearchQuery = z.infer<typeof contactSearchQuerySchema>;

// Contact search result shape (API response)
export const contactSearchResultSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  accountId: z.string().uuid(),
  accountName: z.string(),
});

export type ContactSearchResult = z.infer<typeof contactSearchResultSchema>;

// Unified global search result (frontend use)
export const globalSearchResultSchema = z.object({
  type: z.enum(['account', 'contact', 'product']),
  id: z.string(),
  name: z.string(),
  secondaryText: z.string(),
  url: z.string(),
  parentId: z.string().optional(),
  tertiaryText: z.string().optional(),
});

export type GlobalSearchResult = z.infer<typeof globalSearchResultSchema>;
