# Tasks: Account Management

**Feature:** 003-account-management
**Date:** 2026-02-26
**Task IDs:** T023-T042 (continuing from T022)
**Batches:** 4-6 (continuing from global batch counter 3)

## Batch 4: Schema, Shared Types & Core Account Service

**Branch:** `feature/batch-4-account-schema`
**Focus:** Foundation — Prisma models, shared Zod schemas, constants, and core account CRUD service

### US1 — Create Account (P1) + US6 — Update/Delete (P2) — Foundation

| ID | Task | Files | Status | Deps | Priority |
|----|------|-------|--------|------|----------|
| T023 | Add Account, Contact, AccountHealthScore models and AccountType enum to Prisma schema. Add `accounts` relation to Territory model. | `prisma/schema.prisma` (MOD) | [ ] | — | P1 |
| T024 | Create Prisma migration with pg_trgm extension, RLS policies for accounts/contacts/account_health_scores tables, GIN trigram indexes on name/city/phone fields, and levenshtein function. | `prisma/migrations/XXXX_account_management/` (NEW) | [ ] | T023 | P1 |
| T025 | Create account Zod schemas: createAccountSchema, updateAccountSchema, accountResponseSchema, accountListQuerySchema, accountSearchSchema. Create contact Zod schemas: createContactSchema, updateContactSchema, contactResponseSchema. | `packages/shared/src/schemas/account.schema.ts` (NEW), `packages/shared/src/schemas/contact.schema.ts` (NEW) | [ ] | — | P1 |
| T026 | Add schema tests for account and contact Zod schemas — validation of required fields, optional fields, enum values, string lengths, UUID format. | `packages/shared/src/schemas/account.schema.test.ts` (NEW), `packages/shared/src/schemas/contact.schema.test.ts` (NEW) | [ ] | T025 | P1 |
| T027 | Add account-related error codes to shared constants: ACCOUNT_NOT_FOUND, ACCOUNT_DUPLICATE_DETECTED, ACCOUNT_TERRITORY_MISMATCH, ACCOUNT_CIRCULAR_HIERARCHY, ACCOUNT_CONFLICT, CONTACT_NOT_FOUND. Export new schemas from shared index.ts. | `packages/shared/src/constants/index.ts` (MOD), `packages/shared/src/index.ts` (MOD) | [ ] | T025 | P1 |
| T028 | Create account.service.ts with: createAccount (with tenant isolation + audit), getAccountById (with contacts, territory, parent, children, health score), updateAccount (with optimistic concurrency + audit), softDeleteAccount (with audit). Create AccountError class. | `backend/src/domains/accounts/account.service.ts` (NEW), `backend/src/domains/accounts/index.ts` (NEW) | [ ] | T023, T025, T027 | P1 |
| T029 | Create account.service.test.ts — unit tests for createAccount, getAccountById, updateAccount, softDeleteAccount. Test tenant isolation, audit trail calls, optimistic concurrency (409), soft-delete exclusion. | `backend/src/domains/accounts/account.service.test.ts` (NEW) | [ ] | T028 | P1 |

**Estimated tests:** ~30 (schema validation + service unit tests)

---

## Batch 5: Search, Duplicates, Contacts & Routes

**Branch:** `feature/batch-5-account-routes`
**Focus:** Full-text search, duplicate detection, contact management, and Fastify route integration

### US3 — Search Accounts (P1)

| ID | Task | Files | Status | Deps | Priority |
|----|------|-------|--------|------|----------|
| T030 | Create account-search.service.ts with pg_trgm-based search: searchAccounts(prisma, tenantId, query, filters, pagination). Search across account name, contact name, phone, email, city, territory name. Return results ranked by relevance with cursor-based pagination. | `backend/src/domains/accounts/account-search.service.ts` (NEW) | [ ] | T023, T024 | P1 |
| T031 | Create account-search.service.test.ts — unit tests for search with various query types (name, phone, city), empty results, minimum query length validation, pagination, relevance ranking. | `backend/src/domains/accounts/account-search.service.test.ts` (NEW) | [ ] | T030 | P1 |

### US1 — Duplicate Detection (P1)

| ID | Task | Files | Status | Deps | Priority |
|----|------|-------|--------|------|----------|
| T032 | Create duplicate.service.ts with: checkDuplicates(prisma, tenantId, name, phone?, address?) using Levenshtein distance (threshold ≤3) for name matching and exact/partial matching for phone/address. Return matches with confidence scores. | `backend/src/domains/accounts/duplicate.service.ts` (NEW) | [ ] | T023, T024 | P1 |
| T033 | Create duplicate.service.test.ts — unit tests for: exact match, near-match (Levenshtein ≤3), no match (distance >3), phone matching, multi-field matching, confidence score calculation. | `backend/src/domains/accounts/duplicate.service.test.ts` (NEW) | [ ] | T032 | P1 |

### US7 — Contact Management (P2)

| ID | Task | Files | Status | Deps | Priority |
|----|------|-------|--------|------|----------|
| T034 | Create contact.service.ts with: createContact, updateContact, softDeleteContact, setPrimaryContact. Enforce is_primary uniqueness per account in service layer. Include tenant isolation and audit trail. | `backend/src/domains/accounts/contact.service.ts` (NEW) | [ ] | T023, T025, T027 | P2 |
| T035 | Create contact.service.test.ts — unit tests for CRUD, is_primary enforcement, soft-delete, audit trail integration. | `backend/src/domains/accounts/contact.service.test.ts` (NEW) | [ ] | T034 | P2 |

### US4 — Parent-Child Hierarchy (P2) + Routes

| ID | Task | Files | Status | Deps | Priority |
|----|------|-------|--------|------|----------|
| T036 | Add hierarchy validation to account.service.ts: validateParentChild (prevent circular refs, enforce max depth 2), getRollUpMetrics (aggregate order count, revenue, last activity from children). | `backend/src/domains/accounts/account.service.ts` (MOD) | [ ] | T028 | P2 |
| T037 | Create account.routes.ts with all endpoints: POST /api/accounts, GET /api/accounts, GET /api/accounts/:id, PUT /api/accounts/:id, DELETE /api/accounts/:id, GET /api/accounts/check-duplicates, POST /api/accounts/:id/contacts, PUT /api/accounts/:id/contacts/:contactId, DELETE /api/accounts/:id/contacts/:contactId. Register in app.ts. All routes use authenticate + authorize middleware. | `backend/src/domains/accounts/account.routes.ts` (NEW), `backend/src/app.ts` (MOD) | [ ] | T028, T030, T032, T034, T036 | P1 |
| T038 | Create account.routes.test.ts — integration tests using buildTestApp: test all 9 endpoints, auth checks (401/403), validation errors (400), not-found (404), duplicate detection (409), concurrency conflict (409), cross-tenant isolation (404). | `backend/src/domains/accounts/account.routes.test.ts` (NEW) | [ ] | T037 | P1 |

**Estimated tests:** ~45 (search + duplicate + contact + hierarchy + route integration)

---

## Batch 6: Health Score Job & Integration

**Branch:** `feature/batch-6-account-health`
**Focus:** Health score BullMQ job, worker integration, and comprehensive integration tests

### US5 — Health Score Calculation (P2)

| ID | Task | Files | Status | Deps | Priority |
|----|------|-------|--------|------|----------|
| T039 | Create health-score.job.ts with: calculateHealthScore(account) computing weighted factors (days since last activity 30%, order frequency 25%, order value trend 25%, contact engagement 20%). Handle new accounts (baseline 50). Update account.health_score and account.health_score_calculated_at. Write AccountHealthScore history record. | `worker/src/jobs/health-score.job.ts` (NEW) | [ ] | T023, T024 | P2 |
| T040 | Create health-score.queue.ts with BullMQ queue definition and repeatable job schedule (cron: 02:00 UTC daily). Process all active, non-deleted accounts for each tenant. | `worker/src/queues/health-score.queue.ts` (NEW) | [ ] | T039 | P2 |
| T041 | Create health-score.job.test.ts — unit tests for: factor calculation with various input scenarios, baseline score for new accounts, score decrease for inactive accounts (≥15 points after 45 days), factor breakdown JSON structure, batch processing multiple accounts. | `worker/src/jobs/health-score.job.test.ts` (NEW) | [ ] | T039 | P2 |
| T042 | Add health score filter support to account list endpoint (healthScoreMin, healthScoreMax query params). Add health score breakdown to account detail response. Update route tests to cover health score filtering and detail inclusion. | `backend/src/domains/accounts/account.routes.ts` (MOD), `backend/src/domains/accounts/account.routes.test.ts` (MOD) | [ ] | T037, T039 | P2 |

**Estimated tests:** ~20 (health score calculation + filter integration)

---

## Summary

| Batch | Branch | Tasks | Est. Tests | Focus |
|-------|--------|-------|-----------|-------|
| 4 | feature/batch-4-account-schema | T023-T029 (7 tasks) | ~30 | Schema, Zod, core CRUD service |
| 5 | feature/batch-5-account-routes | T030-T038 (9 tasks) | ~45 | Search, duplicates, contacts, routes |
| 6 | feature/batch-6-account-health | T039-T042 (4 tasks) | ~20 | Health score job, integration |

**Total:** 20 tasks, ~95 estimated tests, 3 batches

## Dependency Graph

```
T023 (Prisma models) ──┬── T024 (Migration) ──┬── T030 (Search) ── T031 (Search tests)
                        │                      ├── T032 (Duplicates) ── T033 (Dup tests)
                        │                      └── T039 (Health score) ── T040 (Queue) ── T041 (HS tests)
                        │
T025 (Zod schemas) ────┬── T026 (Schema tests)
                        ├── T027 (Constants) ──── T028 (Account service) ── T029 (Service tests)
                        │                                    │
                        └── T034 (Contact svc) ── T035 ─────┤
                                                             ├── T036 (Hierarchy)
                                                             │
                                                             └── T037 (Routes) ── T038 (Route tests)
                                                                     │
                                                                     └── T042 (Health filter)
```

## Parallel Opportunities

- T023 (Prisma models) and T025 (Zod schemas) can be developed in parallel [P]
- T030 (Search), T032 (Duplicates), T034 (Contacts), T039 (Health score) can be developed in parallel after their deps [P]
- T031, T033, T035, T041 (all test files) can be developed alongside their source files [P]
