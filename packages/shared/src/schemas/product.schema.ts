import { z } from 'zod';
import { revenueModelSchema } from './order.schema';
import {
  certificationSchema,
  allergenSchema,
  dietaryAttributeSchema,
  productCategorySchema,
} from './brand.schema';

export const availabilityStatusSchema = z.enum([
  'active',
  'seasonal',
  'discontinued',
]);
export type AvailabilityStatus = z.infer<typeof availabilityStatusSchema>;

export const productSearchQuerySchema = z.object({
  q: z.string().min(2),
  brandId: z.string().uuid().optional(),
  availabilityStatus: availabilityStatusSchema.optional(),
  category: productCategorySchema.optional(),
  certification: certificationSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  brandId: z.string().uuid(),
  category: productCategorySchema.optional(),
  subcategory: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  unitPrice: z.number().positive(),
  wholesalePrice: z.number().positive().optional(),
  caseSize: z.number().int().positive().optional(),
  revenueModelDefault: revenueModelSchema,
  availabilityStatus: availabilityStatusSchema.optional().default('active'),
  imageUrl: z.string().url().max(500).optional(),
  certifications: z.array(certificationSchema).optional().default([]),
  allergens: z.array(allergenSchema).optional().default([]),
  dietaryAttributes: z.array(dietaryAttributeSchema).optional().default([]),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(100).optional(),
  brandId: z.string().uuid().optional(),
  category: productCategorySchema.nullable().optional(),
  subcategory: z.string().min(1).max(100).nullable().optional(),
  description: z.string().min(1).max(2000).nullable().optional(),
  unitPrice: z.number().positive().optional(),
  wholesalePrice: z.number().positive().nullable().optional(),
  caseSize: z.number().int().positive().nullable().optional(),
  revenueModelDefault: revenueModelSchema.optional(),
  availabilityStatus: availabilityStatusSchema.optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  certifications: z.array(certificationSchema).optional(),
  allergens: z.array(allergenSchema).optional(),
  dietaryAttributes: z.array(dietaryAttributeSchema).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productListQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  category: productCategorySchema.optional(),
  certification: certificationSchema.optional(),
  allergen: allergenSchema.optional(),
  dietaryAttribute: dietaryAttributeSchema.optional(),
  availabilityStatus: availabilityStatusSchema.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['name', 'sku', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sku: z.string(),
  brand: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  unitPrice: z.number(),
  wholesalePrice: z.number().nullable(),
  promotionalPrice: z.number().nullable(),
  promotionalPriceStart: z.string().nullable(),
  promotionalPriceEnd: z.string().nullable(),
  caseSize: z.number().int().nullable(),
  revenueModelDefault: revenueModelSchema,
  commissionRate: z.number(),
  availabilityStatus: availabilityStatusSchema,
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  certifications: z.array(z.string()),
  allergens: z.array(z.string()),
  dietaryAttributes: z.array(z.string()),
});
export type ProductResponse = z.infer<typeof productResponseSchema>;

export const productDetailResponseSchema = productResponseSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;
