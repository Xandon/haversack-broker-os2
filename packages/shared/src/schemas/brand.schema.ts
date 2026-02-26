import { z } from 'zod';

// Enum schemas for catalog attributes (shared across product and brand)
export const certificationSchema = z.enum([
  'organic',
  'non_gmo',
  'gluten_free',
  'kosher',
  'vegan',
]);
export type Certification = z.infer<typeof certificationSchema>;

export const allergenSchema = z.enum([
  'wheat',
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree_nuts',
  'peanuts',
  'soybeans',
  'sesame',
]);
export type Allergen = z.infer<typeof allergenSchema>;

export const dietaryAttributeSchema = z.enum([
  'vegetarian',
  'vegan',
  'keto',
  'paleo',
  'low_sodium',
  'sugar_free',
  'dairy_free',
  'whole_grain',
]);
export type DietaryAttribute = z.infer<typeof dietaryAttributeSchema>;

export const productCategorySchema = z.enum([
  'honey',
  'condiments',
  'spreads',
  'sauces',
  'snacks',
  'beverages',
  'dairy',
  'bakery',
  'produce',
  'meat',
  'seafood',
  'pantry',
  'frozen',
  'other',
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

// Brand schemas
export const createBrandSchema = z.object({
  name: z.string().min(1).max(255),
  commissionRate: z.number().min(0).max(100),
  description: z.string().min(1).max(2000).optional(),
  logoUrl: z.string().url().max(500).optional(),
  contactName: z.string().min(1).max(255).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().min(1).max(50).optional(),
  website: z.string().url().max(255).optional(),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  description: z.string().min(1).max(2000).nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
  contactName: z.string().min(1).max(255).nullable().optional(),
  contactEmail: z.string().email().max(255).nullable().optional(),
  contactPhone: z.string().min(1).max(50).nullable().optional(),
  website: z.string().url().max(255).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const brandListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['name', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;

export const brandResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  commissionRate: z.number(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  website: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BrandResponse = z.infer<typeof brandResponseSchema>;

export const brandWithCountsResponseSchema = brandResponseSchema.extend({
  productCount: z.number().int(),
  activeProductCount: z.number().int(),
});
export type BrandWithCountsResponse = z.infer<typeof brandWithCountsResponseSchema>;

export const lineCardShareSchema = z.object({
  accountId: z.string().uuid(),
});
export type LineCardShareInput = z.infer<typeof lineCardShareSchema>;
