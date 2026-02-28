import { z } from 'zod';

// ─── Common ──────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const roleSchema = z.enum(['admin', 'manager', 'rep', 'logistics', 'viewer']);

// ─── Account ─────────────────────────────────────────────────────────────────

export const accountTypeSchema = z.enum(['store', 'restaurant', 'distributor', 'other']);

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  accountType: accountTypeSchema,
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  zipCode: z.string().min(1).max(20),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(255).optional(),
  website: z.string().url().max(500).optional(),
  territoryId: uuidSchema,
  parentAccountId: uuidSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const updateAccountSchema = createAccountSchema.partial();

// ─── Contact ─────────────────────────────────────────────────────────────────

export const createContactSchema = z.object({
  accountId: uuidSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  title: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
  optOutEmail: z.boolean().default(false),
  notes: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial().omit({ accountId: true });

// ─── Brand ───────────────────────────────────────────────────────────────────

export const revenueModelSchema = z.enum(['broker', 'wholesale']);

export const createBrandSchema = z.object({
  name: z.string().min(1).max(255),
  principalContactName: z.string().max(200).optional(),
  principalContactEmail: z.string().email().max(255).optional(),
  principalContactPhone: z.string().max(30).optional(),
  baseCommissionRate: z.number().min(8).max(15),
  defaultRevenueModel: revenueModelSchema.default('broker'),
  logoUrl: z.string().url().max(500).optional(),
  description: z.string().optional(),
});

export const updateBrandSchema = createBrandSchema.partial();

// ─── Product ─────────────────────────────────────────────────────────────────

export const availabilityStatusSchema = z.enum([
  'in_stock',
  'limited',
  'out_of_stock',
  'discontinued',
]);

export const createProductSchema = z.object({
  brandId: uuidSchema,
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  unitPrice: z.number().min(0),
  wholesalePrice: z.number().min(0).optional(),
  caseSize: z.string().max(50).optional(),
  certifications: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  dietaryAttributes: z.array(z.string()).default([]),
  availabilityStatus: availabilityStatusSchema.default('in_stock'),
  imageUrl: z.string().url().max(500).optional(),
  description: z.string().optional(),
  revenueModel: revenueModelSchema,
  promoPrice: z.number().min(0).optional(),
  promoStartDate: z.string().datetime().optional(),
  promoEndDate: z.string().datetime().optional(),
});

export const updateProductSchema = createProductSchema.partial().omit({ brandId: true });

// ─── User ────────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: roleSchema,
  territoryId: uuidSchema.optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: roleSchema.optional(),
  territoryId: uuidSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Opportunity ─────────────────────────────────────────────────────────────

export const opportunityStageSchema = z.enum([
  'prospecting',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
]);

export const STAGE_DEFAULT_PROBABILITY: Record<string, number> = {
  prospecting: 10,
  qualified: 40,
  proposal: 60,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};

export const createOpportunitySchema = z.object({
  accountId: uuidSchema,
  name: z.string().min(1).max(255),
  stage: opportunityStageSchema.default('prospecting'),
  estimatedValue: z.number().min(0),
  probability: z.number().min(0).max(100).optional(),
  closeDate: z.string().min(1),
  closeReason: z.string().optional(),
  assignedRepId: uuidSchema,
  notes: z.string().optional(),
  associatedBrandIds: z.array(uuidSchema).default([]),
});

export const updateOpportunitySchema = createOpportunitySchema
  .partial()
  .omit({ accountId: true, assignedRepId: true });

export const updateOpportunityStageSchema = z.object({
  stage: opportunityStageSchema,
  closeReason: z.string().optional(),
});

// ─── Commission ─────────────────────────────────────────────────────────────

export const commissionStatusSchema = z.enum([
  'pending',
  'pending_approval',
  'approved',
  'exported',
  'disputed',
]);

export const commissionFilterSchema = z.object({
  repId: uuidSchema.optional(),
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  status: commissionStatusSchema.optional(),
  brandId: uuidSchema.optional(),
});

// ─── Report ─────────────────────────────────────────────────────────────────

export const reportEntityTypeSchema = z.enum([
  'account',
  'order',
  'product',
  'commission',
  'activity',
]);

export const reportFilterSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export const runReportSchema = z.object({
  entityType: reportEntityTypeSchema,
  filters: z.array(reportFilterSchema).default([]),
  columns: z.array(z.string()).min(1),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const exportReportSchema = z.object({
  entityType: reportEntityTypeSchema,
  filters: z.array(reportFilterSchema).default([]),
  columns: z.array(z.string()).min(1),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  format: z.enum(['csv', 'xlsx']),
});

export const REPORT_ENTITY_COLUMNS: Record<string, { key: string; label: string }[]> = {
  account: [
    { key: 'name', label: 'Name' },
    { key: 'accountType', label: 'Type' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zipCode', label: 'Zip Code' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'healthScore', label: 'Health Score' },
    { key: 'isActive', label: 'Active' },
    { key: 'createdAt', label: 'Created' },
  ],
  order: [
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'status', label: 'Status' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'taxAmount', label: 'Tax' },
    { key: 'total', label: 'Total' },
    { key: 'approvalRequired', label: 'Approval Required' },
    { key: 'confirmedAt', label: 'Confirmed' },
    { key: 'createdAt', label: 'Created' },
  ],
  product: [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'subcategory', label: 'Subcategory' },
    { key: 'unitPrice', label: 'Unit Price' },
    { key: 'wholesalePrice', label: 'Wholesale Price' },
    { key: 'availabilityStatus', label: 'Availability' },
    { key: 'revenueModel', label: 'Revenue Model' },
    { key: 'createdAt', label: 'Created' },
  ],
  commission: [
    { key: 'period', label: 'Period' },
    { key: 'amount', label: 'Amount' },
    { key: 'rate', label: 'Rate' },
    { key: 'status', label: 'Status' },
    { key: 'approvedAt', label: 'Approved' },
    { key: 'createdAt', label: 'Created' },
  ],
  activity: [
    { key: 'activityType', label: 'Type' },
    { key: 'subject', label: 'Subject' },
    { key: 'occurredAt', label: 'Occurred At' },
    { key: 'durationMinutes', label: 'Duration (min)' },
    { key: 'createdAt', label: 'Created' },
  ],
};

export type ReportEntityType = z.infer<typeof reportEntityTypeSchema>;
export type ReportFilter = z.infer<typeof reportFilterSchema>;
export type RunReportInput = z.infer<typeof runReportSchema>;
export type ExportReportInput = z.infer<typeof exportReportSchema>;

// ─── API Response ────────────────────────────────────────────────────────────

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  statusCode: z.number(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type UpdateOpportunityStageInput = z.infer<typeof updateOpportunityStageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
