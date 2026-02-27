import { z } from 'zod';

// ── Date Query ──────────────────────────────────────────────

export const dashboardPeriodSchema = z.enum([
  'current_month',
  'last_month',
  'current_quarter',
  'last_quarter',
  'ytd',
  'trailing_12_months',
  'custom',
]);
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

export const dashboardDateQuerySchema = z
  .object({
    period: dashboardPeriodSchema.default('current_month'),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.period === 'custom') {
        return data.start_date !== undefined && data.end_date !== undefined;
      }
      return true;
    },
    { message: 'start_date and end_date are required when period is custom' },
  );
export type DashboardDateQuery = z.infer<typeof dashboardDateQuerySchema>;

// ── Revenue By Month Query ──────────────────────────────────

export const revenueByMonthQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(12),
});
export type RevenueByMonthQuery = z.infer<typeof revenueByMonthQuerySchema>;

// ── Rep Dashboard Response ──────────────────────────────────

export const repDashboardResponseSchema = z.object({
  revenue: z.object({
    currentMonth: z.number(),
    trailing12Months: z.number(),
  }),
  activities: z.object({
    currentMonthCount: z.number().int(),
  }),
  opportunities: z.object({
    openCount: z.number().int(),
    weightedPipelineValue: z.number(),
  }),
  commissions: z.object({
    currentMonth: z.number(),
    ytd: z.number(),
  }),
  accountHealth: z.object({
    healthy: z.number().int(),
    atRisk: z.number().int(),
    critical: z.number().int(),
  }),
  hasData: z.boolean(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});
export type RepDashboardResponse = z.infer<typeof repDashboardResponseSchema>;

// ── Critical Accounts Response ──────────────────────────────

export const criticalAccountResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  healthScore: z.number(),
  territory: z.string(),
});
export type CriticalAccountResponse = z.infer<typeof criticalAccountResponseSchema>;

// ── Team Dashboard Response ─────────────────────────────────

export const repRankingSchema = z.object({
  repId: z.string().uuid(),
  repName: z.string(),
  isActive: z.boolean(),
  revenue: z.number(),
  orderCount: z.number().int(),
  activityCount: z.number().int(),
  pipelineValue: z.number(),
});
export type RepRanking = z.infer<typeof repRankingSchema>;

export const teamDashboardResponseSchema = z.object({
  repRankings: z.array(repRankingSchema),
  totals: z.object({
    totalRevenue: z.number(),
    totalOrders: z.number().int(),
    totalActivities: z.number().int(),
    totalPipelineValue: z.number(),
    activeRepCount: z.number().int(),
  }),
  hasData: z.boolean(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});
export type TeamDashboardResponse = z.infer<typeof teamDashboardResponseSchema>;

// ── Revenue By Month Response ───────────────────────────────

export const monthlyRevenueSchema = z.object({
  month: z.string(),
  revenue: z.number(),
});
export type MonthlyRevenue = z.infer<typeof monthlyRevenueSchema>;

// ── Pipeline Forecast Response ──────────────────────────────

export const stageForecastSchema = z.object({
  stage: z.string(),
  count: z.number().int(),
  totalValue: z.number(),
  weightedValue: z.number(),
});
export type StageForecast = z.infer<typeof stageForecastSchema>;

export const pipelineForecastResponseSchema = z.object({
  stages: z.array(stageForecastSchema),
  totalWeightedForecast: z.number(),
  totalOpenValue: z.number(),
});
export type PipelineForecastResponse = z.infer<typeof pipelineForecastResponseSchema>;

// ── Territory Revenue Response ──────────────────────────────

export const territoryRevenueSchema = z.object({
  territoryId: z.string().uuid(),
  territoryName: z.string(),
  revenue: z.number(),
  orderCount: z.number().int(),
  accountCount: z.number().int(),
});
export type TerritoryRevenue = z.infer<typeof territoryRevenueSchema>;
