# Research — Feature 10: Dashboards & Reports

**Reference domains:** commissions (aggregation), opportunities/pipeline (analytics), orders (multi-table queries)

## Decision 1: Dashboard Service Architecture

**Decision:** Separate service files for rep dashboard, team dashboard, and reports — not a monolithic service.
**Rationale:** Each has distinct data access patterns. Rep dashboard aggregates from a single rep's data. Team dashboard aggregates across all reps. Reports are dynamic query builders. Keeping them separate follows the single-responsibility pattern used across existing domains.
**Alternatives:** Single dashboard.service.ts (rejected — would grow too large), domain-per-dashboard (rejected — overkill for 2 dashboards).

## Decision 2: Aggregation Strategy

**Decision:** Use Prisma `aggregate()`, `groupBy()`, and in-memory rollups — no raw SQL.
**Rationale:** Existing pipeline.service.ts successfully uses Prisma queries with in-memory aggregation for pipeline summary and win/loss analytics. The data volumes are small (9 reps, ~50 brands, orders in thousands not millions). Prisma's type safety is more valuable than raw SQL performance at this scale.
**Alternatives:** Raw SQL with `$queryRaw` (rejected — CLAUDE.md discourages raw SQL, Prisma type safety preferred), materialized views (rejected — premature optimization, adds migration complexity).

## Decision 3: Date Range Filtering Pattern

**Decision:** Accept `period` enum (current_month, last_month, current_quarter, last_quarter, ytd, trailing_12_months, custom) plus optional `start_date`/`end_date` ISO strings. Convert to UTC Date range in service layer using half-open intervals `[gte, lt)`.
**Rationale:** Follows the commission-statement.service.ts pattern for period-based filtering. Half-open intervals avoid timezone boundary issues. The `period` enum provides convenience presets while `custom` allows arbitrary ranges.
**Alternatives:** Always require explicit dates (rejected — poor UX for common queries), support timezone parameter (rejected — all data stored in UTC, simplicity wins).

## Decision 4: Report Query Builder

**Decision:** Define a column registry per entity type mapping available fields to Prisma select/where clauses. Build dynamic Prisma queries from the report definition's filters and columns.
**Rationale:** Avoids raw SQL while enabling flexible column selection. The registry ensures only safe, known fields are queryable (prevents injection). Each entity type's registry maps to its Prisma model.
**Alternatives:** Raw SQL query builder (rejected — security risk, CLAUDE.md prohibits), pre-built report templates only (rejected — PRD requires custom column selection).

## Decision 5: Export Implementation

**Decision:** Use ExcelJS with streaming WorkbookWriter for XLSX, manual CSV generation with UTF-8 BOM. Stream response directly — no temp files.
**Rationale:** ExcelJS streaming handles 50K rows without memory issues. CSV is simple enough to generate manually. Streaming avoids disk I/O and temp file cleanup. UTF-8 BOM ensures Excel opens CSV with correct encoding.
**Alternatives:** Offload to worker queue (rejected — report export should be synchronous for UX, 10s timeout is adequate), use Papa Parse for CSV (rejected — unnecessary dependency for simple CSV generation).

## Decision 6: Concurrent Report Execution Limiting

**Decision:** Use Redis INCR/DECR counter per tenant with 60-second TTL. Check before execution, decrement on completion or timeout.
**Rationale:** Redis counter is atomic and fast. TTL prevents orphaned counters if a request crashes. Limit of 3 concurrent executions per tenant prevents resource exhaustion. Follows the rate-limiting patterns already in the codebase.
**Alternatives:** In-memory semaphore (rejected — doesn't work across multiple backend instances), BullMQ job queue (rejected — adds latency, reports should be synchronous).

## Decision 7: RBAC Enforcement for Dashboards

**Decision:** Rep dashboard: `authenticate` only (rep sees own data via `request.user.userId` scoping). Team dashboard: `authorize('manager')`. Reports: `authorize('manager')`. Admin bypasses role checks via existing RBAC middleware.
**Rationale:** Follows existing pattern where `authenticate` extracts user context and `authorize(role)` enforces minimum role. Rep dashboard doesn't need role check since data is self-scoped. Managers and admins can access team and report features.
**Alternatives:** Custom dashboard-specific RBAC (rejected — existing middleware is sufficient), territory-scoped manager access (rejected — PRD shows managers see all reps, not territory-limited).

## Key Patterns to Follow

### Route Registration (from app.ts)
```typescript
import { dashboardRoutes } from './domains/dashboards/dashboard.routes';
import { reportRoutes } from './domains/reports/report.routes';
await app.register(dashboardRoutes);
await app.register(reportRoutes);
```

### Service Function Signature (from commission/pipeline services)
```typescript
export async function getRepDashboard(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  query: DashboardDateQuery,
): Promise<RepDashboardResult>
```

### Zod Query Schema (from commission.schema.ts)
```typescript
export const dashboardDateQuerySchema = z.object({
  period: z.enum(['current_month', 'last_month', ...]).default('current_month'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

### Aggregation (from pipeline.service.ts)
- Use Prisma aggregate() for sums
- In-memory groupBy for small datasets
- Math.round for percentage precision (2 decimals)
- Number() conversion for Decimal fields

### Tenant Isolation (from all services)
- Every query includes `tenantId` in WHERE clause
- Rep scoping via `userId` / `repId` parameter
- Manager sees all reps within tenant
