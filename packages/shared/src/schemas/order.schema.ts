import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'confirmed',
  'rejected',
  'cancelled',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const revenueModelSchema = z.enum(['broker', 'wholesale']);
export type RevenueModel = z.infer<typeof revenueModelSchema>;

export const approvalDecisionSchema = z.enum(['approved', 'rejected']);
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

export const exportStatusSchema = z.enum(['queued', 'exported', 'failed']);
export type ExportStatus = z.infer<typeof exportStatusSchema>;

export const createOrderLineItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  revenueModel: revenueModelSchema,
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  discount: z.number().min(0).optional().default(0),
});
export type CreateOrderLineItemInput = z.infer<typeof createOrderLineItemSchema>;

export const createOrderSchema = z.object({
  accountId: z.string().uuid(),
  notes: z.string().max(5000).nullable().optional(),
  lineItems: z.array(createOrderLineItemSchema).min(1),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
  lineItems: z.array(createOrderLineItemSchema).min(1).optional(),
});
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const orderLineItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string(),
  brandName: z.string(),
  vendorSubOrderId: z.string().uuid().nullable(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  revenueModel: revenueModelSchema,
  commissionRate: z.number().nullable(),
  discount: z.number(),
  lineTotal: z.number(),
  promotionalPriceApplied: z.boolean(),
});
export type OrderLineItemResponse = z.infer<typeof orderLineItemResponseSchema>;

export const vendorSubOrderResponseSchema = z.object({
  id: z.string().uuid(),
  brandId: z.string().uuid(),
  brandName: z.string(),
  subtotal: z.number(),
  fulfillmentStatus: z.string(),
  lineItemCount: z.number().int(),
});
export type VendorSubOrderResponse = z.infer<typeof vendorSubOrderResponseSchema>;

export const orderApprovalResponseSchema = z.object({
  id: z.string().uuid(),
  approverId: z.string().uuid(),
  approverName: z.string(),
  decision: approvalDecisionSchema,
  reason: z.string().nullable(),
  decidedAt: z.string(),
});
export type OrderApprovalResponse = z.infer<typeof orderApprovalResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  repId: z.string().uuid(),
  repName: z.string(),
  status: orderStatusSchema,
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  notes: z.string().nullable(),
  lineItems: z.array(orderLineItemResponseSchema),
  vendorSubOrders: z.array(vendorSubOrderResponseSchema),
  approvals: z.array(orderApprovalResponseSchema),
  exportStatus: exportStatusSchema.nullable(),
  submittedAt: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;

export const orderListResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  repName: z.string(),
  status: orderStatusSchema,
  total: z.number(),
  lineItemCount: z.number().int(),
  exportStatus: exportStatusSchema.nullable(),
  submittedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

export const orderListQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  status: orderStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z
    .enum(['createdAt', 'total', 'orderNumber'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const rejectionReasonSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type RejectionReasonInput = z.infer<typeof rejectionReasonSchema>;
