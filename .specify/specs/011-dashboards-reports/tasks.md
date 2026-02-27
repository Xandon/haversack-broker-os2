# Tasks — Feature 10: Dashboards & Reports

**Task Range:** T200-T219
**Batches:** 3 (batches 28-30)
**Global Batch Counter Start:** 28

## Batch 28: Schema, Shared Schemas & Dashboard Services
**Branch:** `feature/batch-batch-28-dashboard-schema`
**Tasks:** T200-T207 (8 tasks)
**Dependencies:** Features 1-9 complete (accounts, orders, commissions, opportunities, activities)

### T200: Add SavedReport model to Prisma schema
- **Parent:** US-4 (Saved Report Definitions) | **Refs:** FR-025
- **Files:** `prisma/schema.prisma` (MOD)
- **Workspace:** root
- **Description:** Add ReportEntityType enum and SavedReport model with fields: id, tenantId, createdById, name, description, entityType, filters (Json), columns (String[]), isShared, lastRunAt, deletedAt, createdAt, updatedAt. Add relation to User. Add indexes on (tenantId, createdById, deletedAt) and (tenantId, isShared, deletedAt). Run `npx prisma generate`.
- **Dependencies:** None

### T201: Create dashboard shared Zod schemas
- **Parent:** US-1 (Rep Dashboard), US-2 (Team Dashboard), US-5 (Date Filtering) | **Refs:** FR-023, FR-024
- **Files:** `packages/shared/src/schemas/dashboard.schema.ts` (NEW), `packages/shared/src/schemas/index.ts` (MOD)
- **Workspace:** shared
- **Description:** Create Zod schemas: dashboardDateQuerySchema (period enum + start_date/end_date), repDashboardResponseSchema, criticalAccountsResponseSchema, teamDashboardResponseSchema, revenueByMonthResponseSchema, pipelineForecastResponseSchema, territoryRevenueResponseSchema. Export from index.
- **Dependencies:** None
- **[P]** Can parallel with T200

### T202: Create report shared Zod schemas
- **Parent:** US-3 (Custom Reports), US-4 (Saved Reports) | **Refs:** FR-025
- **Files:** `packages/shared/src/schemas/report.schema.ts` (NEW), `packages/shared/src/schemas/index.ts` (MOD)
- **Workspace:** shared
- **Description:** Create Zod schemas: createReportSchema, reportListQuerySchema, executeReportSchema (inline + by reportId), exportReportSchema (with format enum csv/xlsx), reportEntityTypeSchema. Export from index.
- **Dependencies:** None
- **[P]** Can parallel with T200, T201

### T203: Implement dashboard date range utility
- **Parent:** US-5 (Date Filtering) | **Refs:** FR-023, FR-024
- **Files:** `backend/src/domains/dashboards/dashboard-date.util.ts` (NEW)
- **Workspace:** backend
- **Description:** Implement `resolveDateRange(period, startDate?, endDate?)` that converts the period enum to concrete UTC Date boundaries {start, end}. Support: current_month, last_month, current_quarter, last_quarter, ytd, trailing_12_months, custom. Return half-open intervals [start, end). Include `resolveTrailing12Months()` helper.
- **Dependencies:** T201 (uses dashboardDateQuerySchema types)

### T204: Implement rep dashboard service
- **Parent:** US-1 (Rep Dashboard) | **Refs:** FR-023, AC-023a, AC-023b
- **Files:** `backend/src/domains/dashboards/rep-dashboard.service.ts` (NEW)
- **Workspace:** backend
- **Description:** Implement `getRepDashboard(prisma, tenantId, userId, dateQuery)` aggregating: (1) revenue from confirmed orders, (2) trailing 12-month revenue, (3) current-month activity count, (4) open opportunity count + weighted pipeline value, (5) current-month + YTD commission from approved statements, (6) account health distribution (healthy/at-risk/critical counts). Implement `getCriticalAccounts(prisma, tenantId, userId)` returning accounts with health score < 40.
- **Dependencies:** T201, T203

### T205: Implement team dashboard service
- **Parent:** US-2 (Team Dashboard) | **Refs:** FR-024, AC-024a, AC-024b
- **Files:** `backend/src/domains/dashboards/team-dashboard.service.ts` (NEW)
- **Workspace:** backend
- **Description:** Implement: (1) `getTeamDashboard(prisma, tenantId, dateQuery)` — rep rankings sorted by revenue with order count, activity count, pipeline value per rep; includes inactive reps marked as such. (2) `getRevenueByMonth(prisma, tenantId, months)` — monthly revenue array for trailing N months. (3) `getPipelineForecast(prisma, tenantId)` — opportunity counts and weighted values by stage. (4) `getTerritoryRevenue(prisma, tenantId, dateQuery)` — revenue grouped by territory.
- **Dependencies:** T201, T203
- **[P]** Can parallel with T204

### T206: Implement dashboard routes
- **Parent:** US-1, US-2, US-5 | **Refs:** FR-023, FR-024
- **Files:** `backend/src/domains/dashboards/dashboard.routes.ts` (NEW), `backend/src/app.ts` (MOD)
- **Workspace:** backend
- **Description:** Register 6 GET routes: (1) `/api/dashboards/rep` — authenticate, calls getRepDashboard. (2) `/api/dashboards/rep/critical-accounts` — authenticate, calls getCriticalAccounts. (3) `/api/dashboards/team` — authenticate + authorize('manager'), calls getTeamDashboard. (4) `/api/dashboards/team/revenue-by-month` — authorize('manager'), calls getRevenueByMonth. (5) `/api/dashboards/team/pipeline-forecast` — authorize('manager'), calls getPipelineForecast. (6) `/api/dashboards/team/territory-revenue` — authorize('manager'), calls getTerritoryRevenue. Register in app.ts.
- **Dependencies:** T204, T205

### T207: Dashboard service unit tests
- **Parent:** US-1, US-2, US-5
- **Files:** `backend/src/domains/dashboards/__tests__/rep-dashboard.service.test.ts` (NEW), `backend/src/domains/dashboards/__tests__/team-dashboard.service.test.ts` (NEW), `backend/src/domains/dashboards/__tests__/dashboard-date.util.test.ts` (NEW), `backend/src/domains/dashboards/__tests__/dashboard.routes.test.ts` (NEW)
- **Workspace:** backend
- **Description:** Tests for: date range resolution (all 7 periods + custom), rep dashboard KPIs (all 7 metrics), critical accounts drill-down, team rankings, revenue by month, pipeline forecast, territory revenue, RBAC enforcement (rep can't access team endpoints, manager can), tenant isolation, empty data scenarios, deactivated rep handling.
- **Dependencies:** T203, T204, T205, T206
- **Note:** Tests are written RED first (before implementation per TDD), but listed here after implementation tasks for dependency clarity.

---

## Batch 29: Report CRUD, Execution & Column Registry
**Branch:** `feature/batch-batch-29-report-builder`
**Tasks:** T208-T214 (7 tasks)
**Dependencies:** Batch 28 merged

### T208: Implement column registry
- **Parent:** US-3 (Custom Reports) | **Refs:** FR-025
- **Files:** `backend/src/domains/reports/column-registry.ts` (NEW)
- **Workspace:** backend
- **Description:** Define column registries for 5 entity types (Account, Order, Product, Commission, Activity). Each entry: { key, label, type (string/number/currency/date/boolean), prismaField, prismaRelation? }. Include computed fields (e.g., order line item subtotal). Implement `getColumnsForEntity(entityType)`, `validateColumns(entityType, columns)`, `buildPrismaSelect(entityType, columns)`.
- **Dependencies:** None (standalone utility)

### T209: Implement saved report CRUD service
- **Parent:** US-4 (Saved Reports) | **Refs:** FR-025
- **Files:** `backend/src/domains/reports/report.service.ts` (NEW)
- **Workspace:** backend
- **Description:** Implement: (1) `createReport(prisma, tenantId, userId, input)` — validate columns against registry, persist SavedReport. (2) `getReport(prisma, tenantId, userId, reportId)` — fetch by ID, enforce owner-or-shared-or-admin access. (3) `listReports(prisma, tenantId, userId, query)` — cursor-paginated list of own + shared reports, sorted by lastRunAt desc. (4) `deleteReport(prisma, tenantId, userId, reportId)` — soft delete, owner-or-admin only. All with tenant isolation and audit logging.
- **Dependencies:** T200 (SavedReport model), T202 (Zod schemas), T208 (column registry)

### T210: Implement report executor service
- **Parent:** US-3 (Custom Reports) | **Refs:** FR-025, AC-025a
- **Files:** `backend/src/domains/reports/report-executor.service.ts` (NEW)
- **Workspace:** backend
- **Description:** Implement `executeReport(prisma, redis, tenantId, reportDef, pagination)` that: (1) checks concurrent execution limit via Redis INCR (max 3 per tenant), (2) builds dynamic Prisma query from entityType + filters + columns using column registry, (3) executes with cursor pagination (50 rows default, 10K max), (4) returns { data, pagination, columns metadata, truncated flag, total count }, (5) decrements Redis counter on completion. Support inline report definitions and saved report IDs. Update lastRunAt when executing a saved report.
- **Dependencies:** T208 (column registry), T202 (Zod schemas)
- **[P]** Can parallel with T209

### T211: Implement report export service
- **Parent:** US-3 (Custom Reports) | **Refs:** FR-025, AC-025b
- **Files:** `backend/src/domains/reports/report-export.service.ts` (NEW)
- **Workspace:** backend
- **Description:** Implement: (1) `exportToCsv(prisma, tenantId, reportDef, columns)` — stream all rows (up to 50K), generate CSV with UTF-8 BOM, proper escaping, column headers from registry. Returns Buffer. (2) `exportToXlsx(prisma, tenantId, reportDef, columns)` — ExcelJS streaming WorkbookWriter, auto-sized columns, returns Buffer. Both check concurrent execution limit via Redis. Include `generateExportFilename(entityType, format)` helper.
- **Dependencies:** T208 (column registry), T210 (shares query building logic)

### T212: Implement report routes
- **Parent:** US-3, US-4 | **Refs:** FR-025
- **Files:** `backend/src/domains/reports/report.routes.ts` (NEW), `backend/src/app.ts` (MOD)
- **Workspace:** backend
- **Description:** Register 6 routes: (1) `POST /api/reports` — create saved report. (2) `GET /api/reports` — list saved reports. (3) `GET /api/reports/:id` — get report definition. (4) `DELETE /api/reports/:id` — soft delete report. (5) `POST /api/reports/execute` — execute report (inline or by ID). (6) `POST /api/reports/export` — export to CSV/XLSX (binary stream response). All require authenticate + authorize('manager'). Register in app.ts.
- **Dependencies:** T209, T210, T211

### T213: Column registry and report CRUD tests
- **Parent:** US-3, US-4
- **Files:** `backend/src/domains/reports/__tests__/column-registry.test.ts` (NEW), `backend/src/domains/reports/__tests__/report.service.test.ts` (NEW)
- **Workspace:** backend
- **Description:** Tests for: column registry (all 5 entity types have entries, validateColumns rejects unknown columns, buildPrismaSelect generates correct structure), report CRUD (create with valid/invalid columns, get own report, get shared report, get others' private report fails, list includes own + shared, delete by owner, delete by non-owner fails, admin can delete any, soft delete is excluded from list), tenant isolation.
- **Dependencies:** T208, T209

### T214: Report executor and export tests
- **Parent:** US-3
- **Files:** `backend/src/domains/reports/__tests__/report-executor.service.test.ts` (NEW), `backend/src/domains/reports/__tests__/report-export.service.test.ts` (NEW)
- **Workspace:** backend
- **Description:** Tests for: query execution (filters applied correctly per entity type, pagination works, 10K truncation, total count), concurrent execution limiting (4th request returns 429, counter decremented on completion), CSV export (BOM present, headers correct, escaping), XLSX export (valid workbook, headers match columns), export row limit (50K), empty result handling.
- **Dependencies:** T210, T211

---

## Batch 30: Route Integration, RBAC, Audit & Polish
**Branch:** `feature/batch-batch-30-reports-rbac-polish`
**Tasks:** T215-T219 (5 tasks)
**Dependencies:** Batch 29 merged

### T215: Dashboard route integration tests
- **Parent:** US-1, US-2, US-5
- **Files:** `backend/src/domains/dashboards/__tests__/dashboard.routes.test.ts` (MOD — extend)
- **Workspace:** backend
- **Description:** Full route-level integration tests using Supertest: (1) Rep dashboard returns all KPI sections, (2) critical accounts returns correct accounts, (3) team dashboard returns rankings for all reps, (4) revenue-by-month returns correct months, (5) pipeline forecast returns stage breakdown, (6) territory revenue returns correct grouping, (7) date filtering changes results correctly. All with real Prisma test data in isolated transactions.
- **Dependencies:** T206, T207

### T216: Report route integration tests
- **Parent:** US-3, US-4
- **Files:** `backend/src/domains/reports/__tests__/report.routes.test.ts` (NEW)
- **Workspace:** backend
- **Description:** Full route-level integration tests: (1) POST /api/reports creates report, (2) GET /api/reports lists reports, (3) GET /api/reports/:id returns definition, (4) DELETE /api/reports/:id soft-deletes, (5) POST /api/reports/execute returns filtered results, (6) POST /api/reports/export returns binary CSV/XLSX, (7) execute with saved report ID works, (8) concurrent limit returns 429.
- **Dependencies:** T212, T213, T214

### T217: RBAC enforcement tests across all endpoints
- **Parent:** All user stories
- **Files:** `backend/src/domains/dashboards/__tests__/dashboard.routes.test.ts` (MOD), `backend/src/domains/reports/__tests__/report.routes.test.ts` (MOD)
- **Workspace:** backend
- **Description:** Comprehensive RBAC matrix tests: (1) Rep can access own dashboard, cannot access team dashboard (403), cannot access reports (403). (2) Manager can access own rep dashboard, team dashboard, and reports. (3) Admin can access all endpoints. (4) Viewer can access rep dashboard (own data only), cannot access team/reports. (5) Logistics can access rep dashboard, cannot access team/reports. (6) Unauthenticated returns 401.
- **Dependencies:** T215, T216

### T218: Tenant isolation and audit trail tests
- **Parent:** All user stories
- **Files:** Dashboard + report test files (MOD — extend)
- **Workspace:** backend
- **Description:** Tests for: (1) Dashboard data from tenant A not visible to tenant B user. (2) Report execution scoped to tenant. (3) Saved report from tenant A not accessible by tenant B. (4) Audit logging for report CRUD operations (create, delete). (5) Audit logging for report execution with query details.
- **Dependencies:** T215, T216

### T219: Edge case and polish tests
- **Parent:** All user stories, Edge Cases section
- **Files:** Dashboard + report test files (MOD — extend)
- **Workspace:** backend
- **Description:** Tests for edge cases: (1) Empty data — no orders, activities, etc. for the period. (2) Deactivated rep in team dashboard marked inactive. (3) Territory with no accounts shows 0 revenue. (4) Report with 0 results returns empty array. (5) Date range validation — end before start rejected. (6) Invalid entity type rejected. (7) Invalid column names rejected. (8) Custom period requires start_date + end_date. (9) Pipeline forecast excludes closed_won/closed_lost. (10) Commission metrics use only approved statements.
- **Dependencies:** T215, T216

## Summary

| Batch | Branch | Tasks | Description |
|-------|--------|-------|-------------|
| 28 | feature/batch-batch-28-dashboard-schema | T200-T207 (8) | Schema, shared schemas, dashboard services + routes + tests |
| 29 | feature/batch-batch-29-report-builder | T208-T214 (7) | Column registry, report CRUD, executor, export + tests |
| 30 | feature/batch-batch-30-reports-rbac-polish | T215-T219 (5) | Integration tests, RBAC enforcement, tenant isolation, edge cases |

**Total: 20 tasks across 3 batches**
