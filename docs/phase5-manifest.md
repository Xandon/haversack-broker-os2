# Phase 5 Orchestrator Manifest

**Created:** 2026-02-26
**Last Updated:** 2026-02-26 07:38 UTC
**Base Branch:** dev
**Merge Mode:** auto
**Baseline Tests:** 1
**Global Batch Counter:** 3

## Feature Queue

| # | Feature | Spec Dir | PRD References | Status | Batches | Tests Added | E2E |
|---|---------|----------|---------------|--------|---------|-------------|-----|
| 1 | Foundation (Auth, RLS, Audit) | 002-foundation | NFR-007, NFR-008, NFR-013, NFR-014 | COMPLETE | 3/3 | 75 | SKIP (backend-only) |
| 2 | Account Management | 003-account-management | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006 | PENDING | -- | -- | -- |
| 3 | Activity & Task Management | 004-activity-tasks | FR-007, FR-008, FR-009, FR-010 | PENDING | -- | -- | -- |
| 4 | Order Entry & Approval | 005-order-entry | FR-011, FR-012, FR-013, FR-014, FR-015 | PENDING | -- | -- | -- |
| 5 | Product Catalog & Line Cards | 006-product-catalog | FR-018, FR-019 | PENDING | -- | -- | -- |
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

- **Active Feature:** 2 (Account Management)
- **Active Stage:** BUILDING
- **Active Step:** batch 4
- **Resume Point:** STAGE 3, Batch 4 (start)

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
- [ ] Batch 4: Schema, Zod schemas, core CRUD service (T023-T029) — ~30 tests
- [ ] Batch 5: Search, duplicates, contacts, routes (T030-T038) — ~45 tests
- [ ] Batch 6: Health score job, integration (T039-T042) — ~20 tests

### E2E Validation
(populated after build completes)
