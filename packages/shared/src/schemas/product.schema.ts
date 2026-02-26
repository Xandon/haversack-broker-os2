import { z } from 'zod';
import { revenueModelSchema } from './order.schema';

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
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;

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
});
export type ProductResponse = z.infer<typeof productResponseSchema>;
