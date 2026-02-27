# Tasks: Admin & Data Import

**Feature:** 009-admin-import
**Task IDs:** T160-T181
**Batches:** 22-24 (global counter continues from 21)
**Branch prefix:** `feature/batch-batch-{N}-{slug}`

## Batch 22: Schema, Shared Schemas & User Management (T160-T167)

**Branch:** `feature/batch-batch-22-admin-schema-users`
**Focus:** Prisma models, shared Zod schemas, user CRUD service + routes
**Depends on:** Foundation (complete), Accounts (complete)

### T160: Add DataImport and DataQualityScore models to Prisma schema
- **US:** US-010 (Admin data import) | **FR:** FR-027, FR-029
- **Files:** `prisma/schema.prisma` (MOD)
- **Details:** Add DataImportStatus enum, DataImportEntityType enum, DataImport model (with indexes on tenantId+status+createdAt, tenantId+entityType), DataQualityScore model (with index on tenantId+calculatedAt)
- **Depends on:** None
- **Priority:** P0

### T161: Create admin shared Zod schemas
- **US:** US-010 | **FR:** FR-026, FR-027, FR-029
- **Files:** `packages/shared/src/schemas/admin.schema.ts` (NEW), `packages/shared/src/index.ts` (MOD)
- **Details:** createUserSchema, updateUserSchema, userListQuerySchema, importUploadResponseSchema, importPreviewSchema, importConfirmSchema, importHistoryQuerySchema, dataQualityScoreSchema, qualityDrillDownQuerySchema, layoutOfTruthResponseSchema. Export all from index.ts
- **Depends on:** T160
- **Priority:** P0

### T162: Create admin shared schema tests
- **US:** US-010 | **FR:** FR-026, FR-027
- **Files:** `packages/shared/src/schemas/admin.schema.test.ts` (NEW)
- **Details:** Test all Zod schemas: valid input passes, missing required fields fail, invalid enums fail, boundary values
- **Depends on:** T161
- **Priority:** P0

### T163: Create user management service
- **US:** US-010 (User Management) | **FR:** FR-026
- **Files:** `backend/src/domains/admin/user.service.ts` (NEW)
- **Details:** createUser (hash password, territory assignment), getUserById, listUsers (pagination, role/status filter), updateUser (role change, optimistic concurrency), deactivateUser (soft-delete + invalidate refresh tokens), reactivateUser. Self-deactivation prevention. Audit logging for all mutations.
- **Depends on:** T161
- **Priority:** P0

### T164: Create user management service tests
- **US:** US-010 | **FR:** FR-026
- **Files:** `backend/src/domains/admin/user.service.test.ts` (NEW)
- **Details:** Test create (happy path, duplicate email), update (role change, optimistic concurrency), deactivate (session invalidation, self-prevention), reactivate, list (filtering, pagination), audit logging
- **Depends on:** T163
- **Priority:** P0

### T165: Create user management routes
- **US:** US-010 | **FR:** FR-026
- **Files:** `backend/src/domains/admin/user.routes.ts` (NEW), `backend/src/app.ts` (MOD)
- **Details:** POST /api/admin/users, GET /api/admin/users, GET /api/admin/users/:id, PUT /api/admin/users/:id, DELETE /api/admin/users/:id. All with authenticate + authorize('admin'). Register in app.ts.
- **Depends on:** T163
- **Priority:** P0

### T166: Create user management route tests
- **US:** US-010 | **FR:** FR-026
- **Files:** `backend/src/domains/admin/user.routes.test.ts` (NEW)
- **Details:** Integration tests: create user (201), duplicate email (409), list users with filters (200), get user (200/404), update role (200), deactivate (200), self-deactivation (400), unauthorized (401/403)
- **Depends on:** T165
- **Priority:** P0

### T167: Add admin error codes to shared constants
- **US:** US-010 | **FR:** FR-026, FR-027
- **Files:** `packages/shared/src/schemas/admin.schema.ts` (MOD)
- **Details:** Add ADMIN_ERROR_CODES constant with USER_NOT_FOUND, USER_EMAIL_DUPLICATE, USER_SELF_DEACTIVATION, USER_CONFLICT, IMPORT_NOT_FOUND, IMPORT_FILE_TOO_LARGE, IMPORT_INVALID_FORMAT, IMPORT_ALREADY_PROCESSING
- **Depends on:** T161
- **Priority:** P0
- **[P]** Parallel with T163-T166

---

## Batch 23: Data Import (T168-T175)

**Branch:** `feature/batch-batch-23-admin-import`
**Focus:** CSV/XLSX parsing, Layout of Truth validation, preview/confirm workflow, worker job
**Depends on:** Batch 22

### T168: Add @fastify/multipart, csv-parse, exceljs dependencies
- **US:** US-010 (CSV Import) | **FR:** FR-027
- **Files:** `backend/package.json` (MOD)
- **Details:** npm install @fastify/multipart csv-parse exceljs. Register multipart plugin in app.ts with fileSize limit of 50 MB.
- **Depends on:** Batch 22
- **Priority:** P0

### T169: Create Layout of Truth service
- **US:** US-010 (Layout of Truth) | **FR:** FR-027
- **Files:** `backend/src/domains/admin/layout-of-truth.service.ts` (NEW)
- **Details:** getLayoutOfTruth(entityType) — returns field definitions derived from Prisma schema metadata and Zod schema introspection. Supports: account, contact, product, order. Returns field name, type, required, validation rules, allowed values.
- **Depends on:** T168
- **Priority:** P0

### T170: Create import service — file parsing
- **US:** US-010 (CSV Import) | **FR:** FR-027
- **Files:** `backend/src/domains/admin/import.service.ts` (NEW)
- **Details:** parseUploadedFile(buffer, filename) — detects CSV vs XLSX, parses to row arrays. For XLSX, uses first sheet only + warns about additional sheets. Handles UTF-8 BOM, Latin-1 encoding detection. Returns parsed rows + warnings.
- **Depends on:** T168, T169
- **Priority:** P0

### T171: Create import service — validation & preview
- **US:** US-010 (CSV Import) | **FR:** FR-027
- **Files:** `backend/src/domains/admin/import.service.ts` (MOD)
- **Details:** validateImportData(rows, entityType, tenantId) — validates each row against Layout of Truth. For accounts, runs duplicate detection (reuses FR-005 logic). Returns preview: totalRows, validRows, errorRows, errors[], warnings[]. Creates DataImport record with status=previewed and stores parsedData.
- **Depends on:** T170
- **Priority:** P0

### T172: Create import service — execute import
- **US:** US-010 (CSV Import) | **FR:** FR-027
- **Files:** `backend/src/domains/admin/import.service.ts` (MOD)
- **Details:** executeImport(importId, tenantId, audit) — processes valid rows in batches of 500. Each batch in a database transaction. Matches existing records by identifier (id/name+territory/email/sku/order_number). Creates or updates. Updates DataImport record with final counts. Clears parsedData. Writes audit trail.
- **Depends on:** T171
- **Priority:** P0

### T173: Create import routes
- **US:** US-010 (CSV Import) | **FR:** FR-027
- **Files:** `backend/src/domains/admin/import.routes.ts` (NEW), `backend/src/app.ts` (MOD if not already done)
- **Details:** POST /api/admin/imports/upload (multipart), POST /api/admin/imports/:id/confirm, GET /api/admin/imports (history), GET /api/admin/imports/:id (detail), GET /api/admin/layout-of-truth/:entityType. All admin-only.
- **Depends on:** T170, T171, T172
- **Priority:** P0

### T174: Create import service and route tests
- **US:** US-010 | **FR:** FR-027
- **Files:** `backend/src/domains/admin/import.service.test.ts` (NEW), `backend/src/domains/admin/import.routes.test.ts` (NEW)
- **Details:** Test CSV parsing (valid, encoding issues), XLSX parsing (first sheet, multi-sheet warning), validation (required fields, enums, email format), preview accuracy, import execution (create, update, batch transactions), file size rejection (>50MB), unauthorized access (403), import history list
- **Depends on:** T173
- **Priority:** P0

### T175: Create data import worker queue and job
- **US:** US-010 (CSV Import) | **FR:** FR-027
- **Files:** `worker/src/queues/data-import.queue.ts` (NEW), `worker/src/jobs/data-import.job.ts` (NEW), `worker/src/index.ts` (MOD)
- **Details:** Queue: DATA_IMPORT_QUEUE_NAME, DataImportJobData interface. Job: processDataImport — calls executeImport, updates status to completed/failed. Register queue + worker in index.ts with 3 retries, exponential backoff (5s base).
- **Depends on:** T172
- **Priority:** P0

---

## Batch 24: Data Quality, RBAC & Polish (T176-T181)

**Branch:** `feature/batch-batch-24-admin-quality-polish`
**Focus:** Quality scorecard, worker cron job, RBAC enforcement, audit trail, edge cases
**Depends on:** Batch 23

### T176: Create data quality scorecard service
- **US:** US-010 (Data Quality Scorecard) | **FR:** FR-029
- **Files:** `backend/src/domains/admin/quality.service.ts` (NEW)
- **Details:** calculateDataQuality(prisma, tenantId) — queries: account completeness (% with all required fields), contact email validity (regex check), product images (% with non-null imageUrl), duplicate account count (reuses FR-005 logic), stale accounts (no activity 90+ days). Computes composite score (20% each). Stores DataQualityScore record. getDrillDown(prisma, tenantId, metric, page, limit) — returns filtered list of entities failing the specified metric.
- **Depends on:** Batch 23
- **Priority:** P1

### T177: Create data quality routes
- **US:** US-010 (Data Quality Scorecard) | **FR:** FR-029
- **Files:** `backend/src/domains/admin/quality.routes.ts` (NEW)
- **Details:** GET /api/admin/quality/scorecard (admin + manager), GET /api/admin/quality/drill-down?metric=X (admin + manager). Register in app.ts.
- **Depends on:** T176
- **Priority:** P1

### T178: Create data quality service and route tests
- **US:** US-010 | **FR:** FR-029
- **Files:** `backend/src/domains/admin/quality.service.test.ts` (NEW), `backend/src/domains/admin/quality.routes.test.ts` (NEW)
- **Details:** Test metric calculations (all 5 metrics), composite score computation, drill-down filtering, RBAC (admin OK, manager OK, rep 403), empty dataset handling, scorecard retrieval
- **Depends on:** T177
- **Priority:** P1

### T179: Create data quality worker queue and job
- **US:** US-010 (Data Quality Scorecard) | **FR:** FR-029
- **Files:** `worker/src/queues/data-quality-score.queue.ts` (NEW), `worker/src/jobs/data-quality-score.job.ts` (NEW), `worker/src/index.ts` (MOD)
- **Details:** Queue: DATA_QUALITY_SCORE_QUEUE_NAME, cron '0 3 * * *' (03:00 UTC daily, after health score at 02:00). Job: processDataQualityScore — calls calculateDataQuality. Register in index.ts with scheduler.
- **Depends on:** T176
- **Priority:** P1
- **[P]** Parallel with T177-T178

### T180: RBAC enforcement and audit trail verification
- **US:** US-010 | **FR:** FR-026, FR-027, FR-029
- **Files:** All route test files (MOD)
- **Details:** Verify: admin-only for user management (rep/manager/logistics/viewer get 403), admin-only for import, admin+manager for quality scorecard. Verify audit trail entries for: user create, user update, user deactivate, import upload, import confirm.
- **Depends on:** T178
- **Priority:** P0

### T181: Edge case and concurrency tests
- **US:** US-010 | **FR:** FR-026, FR-027
- **Files:** All service test files (MOD)
- **Details:** Test: concurrent role change + deactivation, import with 0 valid rows, import with all rows valid, import cancellation (status check before processing), user email uniqueness across tenants (should be unique per tenant only), optimistic concurrency conflict on user update
- **Depends on:** T180
- **Priority:** P1

## Dependency Graph

```
T160 (schema) ─┬── T161 (shared schemas) ─┬── T162 (schema tests) [P]
                │                           ├── T163 (user service) ── T164 (user tests)
                │                           ├── T165 (user routes) ── T166 (route tests)
                │                           └── T167 (error codes) [P]
                │
                ├── T168 (deps) ── T169 (LoT) ── T170 (parse) ── T171 (validate) ── T172 (execute) ── T173 (routes) ── T174 (tests)
                │                                                                                    └── T175 (worker) [P with T173]
                │
                └── T176 (quality svc) ─┬── T177 (quality routes) ── T178 (quality tests) ── T180 (RBAC) ── T181 (edge cases)
                                        └── T179 (quality worker) [P]
```
