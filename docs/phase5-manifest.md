# Phase 5 Orchestrator Manifest

**Created:** 2026-02-26
**Last Updated:** 2026-02-27 00:00 UTC
**Base Branch:** dev
**Merge Mode:** auto
**Baseline Tests:** 1
**Global Batch Counter:** 16

## Feature Queue

| # | Feature | Spec Dir | PRD References | Status | Batches | Tests Added | E2E |
|---|---------|----------|---------------|--------|---------|-------------|-----|
| 1 | Foundation (Auth, RLS, Audit) | 002-foundation | NFR-007, NFR-008, NFR-013, NFR-014 | COMPLETE | 3/3 | 75 | SKIP (backend-only) |
| 2 | Account Management | 003-account-management | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006 | COMPLETE | 3/3 | 128 | SKIP (backend-only) |
| 3 | Activity & Task Management | 004-activity-tasks | FR-007, FR-008, FR-009, FR-010 | COMPLETE | 3/3 | 175 | SKIP (backend-only) |
| 4 | Order Entry & Approval | 005-order-entry | FR-011, FR-012, FR-013, FR-014, FR-015 | COMPLETE | 3/3 | 118 | SKIP (backend-only) |
| 5 | Product Catalog & Line Cards | 006-product-catalog | FR-018, FR-019 | COMPLETE | 3/3 | 148 | SKIP (backend-only) |
| 6 | Pipeline & Opportunities | 007-pipeline-opportunities | FR-016, FR-017 | PENDING | -- | -- | -- |
| 7 | Commissions | 008-commissions | FR-020, FR-021, FR-022 | PENDING | -- | -- | -- |
| 8 | Admin & Data Import | 009-admin-import | FR-026, FR-027 | PENDING | -- | -- | -- |
| 9 | AI Features | 010-ai-features | FR-014, FR-030 | PENDING | -- | -- | -- |
| 10 | Dashboards & Reports | 011-dashboards-reports | FR-023, FR-024, FR-025 | PENDING | -- | -- | -- |
| 11 | Business Rules Engine | 012-business-rules | FR-028 | PENDING | -- | -- | -- |
| 12 | Polish & NFRs | 013-polish-nfrs | NFR-001 through NFR-014 | PENDING | -- | -- | -- |

## Dependency Map

```
Feature 1 (Foundation) ──┬── Feature 2 (Accounts) ──┬── Feature 3 (Activities)
                         │                           ├── Feature 4 (Orders) ──── Feature 7 (Commissions) ──── Feature 10 (Dashboards)
                         │                           ├── Feature 6 (Pipeline)
                         │                           ├── Feature 9 (AI Features)
                         │                           └── Feature 11 (Business Rules)
                         ├── Feature 5 (Products)
                         └── Feature 8 (Admin)

Feature 12 (Polish) depends on ALL above
```

## Current State

- **Active Feature:** 6 (Pipeline & Opportunities)
- **Active Stage:** BUILDING
- **Active Step:** batch 16
- **Resume Point:** STAGE 3, Batch 16

## Feature 6: Pipeline & Opportunities

### PRD References
- FR-016: Pipeline stage management
- FR-017: Opportunity tracking and forecasting

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/007-pipeline-opportunities
- [x] 2.2 Generate spec.md — 5 user stories, 2 FRs (FR-016, FR-017)
- [x] 2.3 Clarify — 9 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 26/26 items passing
- [x] 2.5 Conflict analysis — 10 safe, 4 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: accounts + activities
- [x] 2.7 Plan — 19 files planned (14 new, 5 modified)
- [x] 2.8 Tasks — 22 tasks in 3 batches, starting at batch 16
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [ ] Batch 16: Schema, shared schemas, opportunity CRUD & transitions (T116-T123)
- [ ] Batch 17: Routes, pipeline summary, brand association (T124-T131)
- [ ] Batch 18: Analytics, RBAC, audit, edge cases (T132-T137)

### E2E Validation
- E2E: SKIP — Feature 6 is backend-only API (no UI pages yet)

## Feature 5: Product Catalog & Line Cards

### PRD References
- FR-018: Product catalog management
- FR-019: Brand line card PDF generation

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/006-product-catalog
- [x] 2.2 Generate spec.md — 5 user stories, 2 FRs (FR-018, FR-019)
- [x] 2.3 Clarify — 9 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 24/24 items passing
- [x] 2.5 Conflict analysis — 14 safe, 4 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: products + accounts
- [x] 2.7 Plan — 22 files planned (12 new, 10 modified)
- [x] 2.8 Tasks — 23 tasks in 3 batches, starting at batch 13
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 13: Schema, shared schemas, product + brand CRUD (T093-T101) — 85 tests, merged to dev
- [x] Batch 14: Line card PDF, email share, search integration (T102-T108) — 26 tests, merged to dev
- [x] Batch 15: RBAC, audit, concurrency, edge cases (T109-T115) — 37 tests, merged to dev

### E2E Validation
- E2E: SKIP — Feature 5 is backend-only API (no UI pages yet). E2E testing will be performed on features with user-facing pages.

### Completion Summary
- **Tests added:** 148 (85 batch 13 + 26 batch 14 + 37 batch 15)
- **Batches:** 3 (batches 13-15, all merged to dev)
- **Files created/modified:** 22 files (12 new, 10 modified)
- **Key deliverables:**
  - Prisma schema: Product model extended with 7 catalog fields, Brand model extended with 6 contact fields
  - Shared Zod schemas: brand CRUD, product CRUD, enum schemas (certification, allergen, dietary, category)
  - Product service: full CRUD, optimistic concurrency, cursor pagination, multi-filter search (hasSome)
  - Brand service: full CRUD, list with product counts (total + active), optimistic concurrency
  - 16 Fastify routes: 6 product endpoints + 6 brand endpoints + line card generate + line card share
  - Line card PDF generation: PDFKit-based, US Letter, product table, auto-filename
  - Line card email share: primary contact resolution, structured response
  - RBAC enforcement: admin/manager for writes, rep for search/share, viewer for read
  - Audit trail: create/update/delete operations logged via writeAuditLog

## Feature 4: Order Entry & Approval

### PRD References
- FR-011: Order creation with multi-vendor support
- FR-012: Real-time product search in order entry
- FR-013: Manager approval for high-value orders
- FR-014: AI-powered reorder suggestions
- FR-015: QuickBooks export

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/005-order-entry
- [x] 2.2 Generate spec.md — 5 user stories, 5 FRs
- [x] 2.3 Clarify — 9 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 24/24 items passing
- [x] 2.5 Conflict analysis — 22 safe, 6 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: accounts
- [x] 2.7 Plan — 32 files planned (26 new, 6 modified)
- [x] 2.8 Tasks — 25 tasks in 3 batches, starting at batch 10
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 10: Schema, shared types & product stubs (T068-T075) — 49 tests, merged to dev
- [x] Batch 11: Order core CRUD & approval (T076-T085) — 37 tests, merged to dev
- [x] Batch 12: AI reorder, QuickBooks export & integration (T086-T092) — 32 tests, merged to dev

### E2E Validation
- E2E: SKIP — Feature 4 is backend-only API + worker jobs (no UI pages yet). E2E testing will be performed on features with user-facing pages.

### Completion Summary
- **Tests added:** 118 (49 batch 10 + 37 batch 11 + 32 batch 12)
- **Batches:** 3 (batches 10-12, all merged to dev)
- **Files created/modified:** 32 files (26 new, 6 modified)
- **Key deliverables:**
  - Prisma models: Brand, Product, Order, OrderLineItem, VendorSubOrder, OrderApproval, QuickBooksExport with indexes
  - Shared Zod schemas for order/product CRUD + list queries + approval + rejection
  - Product service: search by name/SKU/brand with pg_trgm ILIKE, promo pricing logic
  - Product search route: GET /api/products/search with Zod validation
  - Order service: create, get, list, update, submit (vendor splitting), cancel, generateOrderNumber
  - Order approval service: approve, reject, listApprovalQueue with transaction safety
  - 10 Fastify routes: 9 order endpoints + 1 product search with auth/RBAC middleware
  - Reorder suggestion route: GET /api/accounts/:id/reorder-suggestion
  - AI reorder suggestion service: 6-order minimum, median qty, discontinued exclusion
  - Order search service: promo pricing awareness, availability warnings
  - Approval notification queue + job (in-app + email)
  - QuickBooks export queue (hourly cron) + CSV generation job
  - Worker registration for order-approval and quickbooks-export with graceful shutdown
  - Full order lifecycle integration tests

## Feature 1: Foundation (Auth, RLS, Audit)

### PRD References
- NFR-007: JWT auth (15m access, 7d refresh), rate limiting (10 req/min/IP)
- NFR-008: RBAC (5 roles: admin, manager, rep, logistics, viewer), RLS policies
- NFR-013: ACID transactions for multi-table writes
- NFR-014: Immutable audit trail, 3-year retention, <10ms write

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/002-foundation
- [x] 2.2 Generate spec.md — 6 user stories, 14 FRs
- [x] 2.3 Clarify — 7 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 16/16 items passing
- [x] 2.5 Conflict analysis — 12 safe, 0 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: N/A (first domain)
- [x] 2.7 Plan — 28 files planned (28 new, 0 modified)
- [x] 2.8 Tasks — 22 tasks in 3 batches, starting at batch 1
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 1: Schema, shared types & core services (T001-T008) — 36 tests, merged to dev
- [x] Batch 2: Plugins, middleware & auth routes (T009-T017) — 0 new tests (code only), merged to dev
- [x] Batch 3: Test helpers & integration tests (T018-T022) — 38 new tests, merged to dev

### E2E Validation
- E2E: SKIP — Feature 1 is backend-only infrastructure (no UI). E2E testing will be performed on Feature 2+ which have user-facing routes.

### Completion Summary
- **Tests added:** 75 (51 backend + 23 shared + 1 canary)
- **Batches:** 3 (all merged to dev)
- **Files created:** 28 new files
- **Key deliverables:**
  - Prisma schema with 5 entities + RLS policies + audit immutability trigger
  - Shared types (UserRole, ROLE_PERMISSIONS, Zod schemas, constants)
  - JWT service (sign/verify access + refresh tokens)
  - Password service (bcrypt hash/compare at cost 12)
  - Fastify plugins (Prisma, Redis, rate-limit, CORS, helmet, request-ID)
  - Authentication middleware (JWT verification)
  - Authorization middleware (RBAC with admin bypass)
  - Error handler (Zod→400, 429, 500 with no stack trace)
  - Audit trail service (writeAuditLog, detectChanges)
  - Auth service + routes (login, refresh, logout)
  - App bootstrap + server entry point

## Feature 2: Account Management

### PRD References
- FR-001 through FR-006

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/003-account-management
- [x] 2.2 Generate spec.md — 7 user stories, 6 FRs
- [x] 2.3 Clarify — 7 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 22/22 items passing
- [x] 2.5 Conflict analysis — 18 safe, 4 additive, 0 breaking
- [x] 2.6 Research — 7 patterns documented, reference domain: auth
- [x] 2.7 Plan — 23 files planned (18 new, 5 modified)
- [x] 2.8 Tasks — 20 tasks in 3 batches, starting at batch 4
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 4: Schema, Zod schemas, core CRUD service (T023-T029) — 60 tests, merged to dev
- [x] Batch 5: Search, duplicates, contacts, routes (T030-T038) — 42 tests, merged to dev
- [x] Batch 6: Health score job, integration (T039-T042) — 28 tests, merged to dev

### E2E Validation
- E2E: SKIP — Feature 2 is backend-only API + worker jobs (no UI pages yet). E2E testing will be performed on features with user-facing pages.

### Completion Summary
- **Tests added:** 128 (60 backend batch 4 + 42 backend batch 5 + 4 backend batch 6 + 22 worker)
- **Batches:** 3 (batches 4-6, all merged to dev)
- **Files created/modified:** 23 files (18 new, 5 modified)
- **Key deliverables:**
  - Prisma models: Account, Contact, AccountHealthScore with RLS indexes
  - Shared Zod schemas for account/contact CRUD + list query + duplicate check
  - Account service: CRUD, list with cursor pagination, optimistic concurrency, soft-delete
  - Search service: pg_trgm ILIKE full-text search across accounts/contacts/territories
  - Duplicate detection: Levenshtein distance matching with confidence scores
  - Contact service: CRUD with isPrimary enforcement
  - Account routes: 9 Fastify endpoints with auth/RBAC middleware
  - Health score job: weighted factor calculation, batch processing, history tracking
  - Health score queue: BullMQ config with daily 02:00 UTC cron
  - Health score filtering and breakdown in account detail API

## Feature 3: Activity & Task Management

### PRD References
- FR-007: Call/visit logging with structured notes
- FR-008: Task scheduling and follow-up management
- FR-009: Activity timeline (chronological history per account)
- FR-010: Activity metrics and reporting

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/004-activity-tasks
- [x] 2.2 Generate spec.md — 6 user stories, 4 FRs
- [x] 2.3 Clarify — 7 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 22/22 items passing
- [x] 2.5 Conflict analysis — 35 safe, 10 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: accounts
- [x] 2.7 Plan — 37 files planned (31 new, 6 modified)
- [x] 2.8 Tasks — 25 tasks in 3 batches, starting at batch 7
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 7: Schema, shared types & core activity service (T043-T051) — 112 tests, merged to dev
- [x] Batch 8: Timeline, tasks & email records (T052-T060) — 50 tests, merged to dev
- [x] Batch 9: Reminders, notifications & worker jobs (T061-T067) — 13 tests, merged to dev

### E2E Validation
- E2E: SKIP — Feature 3 is backend-only API + worker jobs (no UI pages yet). E2E testing will be performed on features with user-facing pages.

### Completion Summary
- **Tests added:** 175 (112 batch 7 + 50 batch 8 + 13 batch 9)
- **Batches:** 3 (batches 7-9, all merged to dev)
- **Files created/modified:** 37 files (31 new, 6 modified)
- **Key deliverables:**
  - Prisma models: Activity, Demo, Task, TaskReminder, EmailRecord, Notification with indexes
  - Shared Zod schemas for activity, task, email-record, notification CRUD + list queries
  - Activity service: CRUD with 15-min edit window, demo handling, optimistic concurrency
  - Activity metrics: per-rep/account/type aggregation with raw SQL
  - Timeline service: multi-source merge (activities + emails + tasks), cursor pagination
  - Task service: CRUD with status transitions, overdue detection, assignee validation
  - EmailRecord service: auto-linking by email match, unmatched list, engagement tracking
  - 11 Fastify routes with auth/RBAC middleware across activities, tasks, email-records
  - Task reminder queue + job processor with notification creation
  - Email notification queue + job with retry/backoff
  - Worker registration with graceful shutdown
