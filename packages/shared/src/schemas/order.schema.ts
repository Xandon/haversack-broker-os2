/**
 * Zod validation schemas for Order domain API contracts.
 * Matches Prisma Order/OrderItem models with snake_case fields.
 * Used by both frontend and backend for input validation.
 */
import { z } from 'zod';

/**
 * Order status enum matching Prisma OrderStatus.
 */
export const orderStatusEnum = z.enum([
  'draft',
  'pending',
  'pending_approval',
  'approved',
  'confirmed',
  'rejected',
  'cancelled',
]);

/**
 * Revenue model enum matching Prisma RevenueModel.
 */
export const revenueModelEnum = z.enum(['broker', 'wholesale']);

/**
 * Availability status enum matching Prisma AvailabilityStatus.
 */
export const availabilityStatusEnum = z.enum([
  'in_stock',
  'limited',
  'out_of_stock',
  'discontinued',
]);

/**
 * Schema for a single order line item when creating an order.
 */
export const createOrderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be non-negative').optional(),
  revenue_model: revenueModelEnum.optional(),
  lot_number: z.string().max(100).optional(),
  batch_id: z.string().max(100).optional(),
  notes: z.string().optional(),
});

/**
 * Schema for creating a new order.
 */
export const createOrderSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  notes: z.string().optional(),
  items: z
    .array(createOrderItemSchema)
    .min(1, 'Order must have at least one item'),
});

/**
 * Schema for updating an existing order (partial update).
 */
export const updateOrderSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['pending', 'cancelled']).optional(),
});

/**
 * Schema for order list query parameters.
 */
export const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  account_id: z.string().uuid().optional(),
  rep_id: z.string().uuid().optional(),
  status: orderStatusEnum.optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  min_total: z.coerce.number().min(0).optional(),
  max_total: z.coerce.number().min(0).optional(),
  sort_by: z
    .enum(['created_at', 'total', 'order_number', 'status'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  exclude_sub_orders: z.coerce.boolean().default(true),
});

/**
 * Schema for rejecting an order.
 */
export const rejectOrderSchema = z.object({
  reason: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Rejection reason must not exceed 1000 characters'),
});

/**
 * Schema for approving an order.
 */
export const approveOrderSchema = z.object({
  notes: z.string().optional(),
});

/**
 * Schema for product search query parameters.
 */
export const productSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  brand_id: z.string().uuid().optional(),
  category: z.string().optional(),
  certification: z.string().optional(),
  availability: z
    .enum(['in_stock', 'limited', 'out_of_stock'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Schema for product list query parameters.
 */
export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  brand_id: z.string().uuid().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  certification: z.string().optional(),
  allergen: z.string().optional(),
  dietary: z.string().optional(),
  availability: availabilityStatusEnum.optional(),
  revenue_model: revenueModelEnum.optional(),
  is_active: z.coerce.boolean().default(true),
  sort_by: z.enum(['name', 'sku', 'unit_price', 'created_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

/** Big 9 allergens for food safety compliance */
export const allergenEnum = z.enum([
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soybeans',
  'Sesame',
]);

/**
 * Schema for creating a new product.
 */
export const createProductSchema = z.object({
  brand_id: z.string().uuid('Invalid brand ID'),
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must not exceed 255 characters'),
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(100, 'SKU must not exceed 100 characters'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category must not exceed 100 characters'),
  subcategory: z.string().max(100).optional(),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  wholesale_price: z.number().min(0).optional(),
  case_size: z.string().max(50).optional(),
  certifications: z.array(z.string()).optional().default([]),
  allergens: z.array(allergenEnum).optional().default([]),
  dietary_attributes: z.array(z.string()).optional().default([]),
  availability_status: availabilityStatusEnum.default('in_stock'),
  revenue_model: revenueModelEnum,
  image_url: z.string().url().optional(),
  description: z.string().optional(),
  lot_number: z.string().max(100).optional(),
  batch_id: z.string().max(100).optional(),
  origin: z.string().max(255).optional(),
  promo_price: z.number().min(0).optional(),
  promo_start_date: z.string().datetime().optional(),
  promo_end_date: z.string().datetime().optional(),
});

/**
 * Schema for updating an existing product (partial).
 */
export const updateProductSchema = createProductSchema.partial();

/** Input type for creating an order */
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Input type for a single order item */
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;

/** Input type for updating an order */
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

/** Query parameters for listing orders */
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

/** Input type for rejecting an order */
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

/** Input type for approving an order */
export type ApproveOrderInput = z.infer<typeof approveOrderSchema>;

/** Query parameters for product search */
export type ProductSearchQuery = z.infer<typeof productSearchQuerySchema>;

/** Query parameters for listing products */
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

/** Input type for creating a product */
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Input type for updating a product */
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
