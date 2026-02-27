# Tasks: Pipeline & Opportunities

**Feature:** Pipeline & Opportunities (Feature 6)
**Task Range:** T116-T137
**Batches:** 3 (Batch 16, 17, 18)
**Starting Global Batch:** 16

## Batch 16: Schema, Shared Schemas & Opportunity CRUD

**Branch:** `feature/batch-batch-16-opportunity-schema`
**Tasks:** T116-T123 (8 tasks)
**Focus:** Foundation — Prisma models, Zod schemas, core CRUD service

### T116: Add PipelineStage enum and Opportunity/OpportunityBrand models to Prisma schema
- **Parent:** US-1 (Opportunity CRUD)
- **Refs:** FR-016a, FR-016c
- **Files:** `prisma/schema.prisma` (MOD) — add PipelineStage enum, Opportunity model, OpportunityBrand model, relations on Account/Brand/User
- **Deps:** None
- **Priority:** P1

### T117: Create stage-defaults constant
- **Parent:** US-2 (Pipeline Stage Transitions)
- **Refs:** FR-016b
- **Files:** `backend/src/domains/opportunities/stage-defaults.ts` (NEW)
- **Deps:** T116
- **Priority:** P1

### T118: Create shared Zod schemas for opportunity domain
- **Parent:** US-1 (Opportunity CRUD), US-2 (Stage Transitions), US-3 (Pipeline View)
- **Refs:** FR-016a, FR-016b, FR-016d, FR-017d, FR-017e
- **Files:** `packages/shared/src/schemas/opportunity.schema.ts` (NEW), `packages/shared/src/index.ts` (MOD), `packages/shared/src/constants/index.ts` (MOD)
- **Deps:** T116
- **Priority:** P1

### T119: Implement opportunity CRUD service (create, getById, update, list, softDelete)
- **Parent:** US-1 (Opportunity CRUD)
- **Refs:** FR-016a, FR-016b, FR-016c
- **Files:** `backend/src/domains/opportunities/opportunity.service.ts` (NEW)
- **Deps:** T116, T117, T118
- **Priority:** P1

### T120: Write failing tests for opportunity CRUD service
- **Parent:** US-1 (Opportunity CRUD)
- **Refs:** FR-016a, FR-016b, FR-016c
- **Files:** `backend/src/domains/opportunities/opportunity.service.test.ts` (NEW)
- **Deps:** T118, T119
- **Priority:** P1

### T121: Implement stage transition logic in opportunity service
- **Parent:** US-2 (Pipeline Stage Transitions)
- **Refs:** FR-016b, FR-016d, FR-016e, FR-016f
- **Files:** `backend/src/domains/opportunities/opportunity.service.ts` (MOD)
- **Deps:** T119
- **Priority:** P1

### T122: Write failing tests for stage transition logic
- **Parent:** US-2 (Pipeline Stage Transitions)
- **Refs:** FR-016b, FR-016d, FR-016e, FR-016f
- **Files:** `backend/src/domains/opportunities/opportunity.service.test.ts` (MOD)
- **Deps:** T120, T121
- **Priority:** P1

### T123: Add opportunity mock to test helpers and create barrel exports
- **Parent:** US-1 (Opportunity CRUD)
- **Refs:** N/A (infrastructure)
- **Files:** `backend/src/shared/test-helpers/db.ts` (MOD), `backend/src/domains/opportunities/index.ts` (NEW)
- **Deps:** T116
- **Priority:** P1

---

## Batch 17: Routes, Pipeline Summary & Brand Association

**Branch:** `feature/batch-batch-17-opportunity-routes`
**Tasks:** T124-T131 (8 tasks)
**Focus:** API routes, pipeline summary service, brand association

### T124: Implement opportunity routes (CRUD + transition)
- **Parent:** US-1 (Opportunity CRUD), US-2 (Stage Transitions)
- **Refs:** FR-016a, FR-016b, FR-016d, FR-016e
- **Files:** `backend/src/domains/opportunities/opportunity.routes.ts` (NEW), `backend/src/app.ts` (MOD)
- **Deps:** T119, T121, T118
- **Priority:** P1

### T125: Write failing tests for opportunity routes
- **Parent:** US-1 (Opportunity CRUD), US-2 (Stage Transitions)
- **Refs:** FR-016a, FR-016b, FR-016d, FR-016e
- **Files:** `backend/src/domains/opportunities/opportunity.routes.test.ts` (NEW)
- **Deps:** T123, T124
- **Priority:** P1

### T126: Implement pipeline summary service
- **Parent:** US-3 (Pipeline View & Weighted Forecast)
- **Refs:** FR-017a, FR-017b, FR-017c, FR-017d
- **Files:** `backend/src/domains/opportunities/pipeline.service.ts` (NEW)
- **Deps:** T119
- **Priority:** P1

### T127: Write failing tests for pipeline summary service
- **Parent:** US-3 (Pipeline View & Weighted Forecast)
- **Refs:** FR-017a, FR-017b, FR-017c, FR-017d
- **Files:** `backend/src/domains/opportunities/pipeline.service.test.ts` (NEW)
- **Deps:** T126
- **Priority:** P1

### T128: Add pipeline routes (summary + analytics)
- **Parent:** US-3 (Pipeline View), US-5 (Win/Loss Analytics)
- **Refs:** FR-017a, FR-017b, FR-017c, FR-017d, FR-017e
- **Files:** `backend/src/domains/opportunities/opportunity.routes.ts` (MOD)
- **Deps:** T124, T126
- **Priority:** P1

### T129: Write failing tests for pipeline routes
- **Parent:** US-3 (Pipeline View), US-5 (Win/Loss Analytics)
- **Refs:** FR-017a, FR-017b, FR-017e
- **Files:** `backend/src/domains/opportunities/opportunity.routes.test.ts` (MOD)
- **Deps:** T125, T128
- **Priority:** P1

### T130: Implement brand association in opportunity create/update
- **Parent:** US-4 (Opportunity Brands Association)
- **Refs:** FR-016c
- **Files:** `backend/src/domains/opportunities/opportunity.service.ts` (MOD)
- **Deps:** T119
- **Priority:** P2

### T131: Write tests for brand association
- **Parent:** US-4 (Opportunity Brands Association)
- **Refs:** FR-016c
- **Files:** `backend/src/domains/opportunities/opportunity.service.test.ts` (MOD), `backend/src/domains/opportunities/opportunity.routes.test.ts` (MOD)
- **Deps:** T120, T130
- **Priority:** P2

---

## Batch 18: Analytics, RBAC, Audit & Edge Cases

**Branch:** `feature/batch-batch-18-pipeline-analytics`
**Tasks:** T132-T137 (6 tasks)
**Focus:** Win/loss analytics, RBAC enforcement, audit trail, edge cases

### T132: Implement win/loss analytics service
- **Parent:** US-5 (Win/Loss Analytics)
- **Refs:** FR-017e
- **Files:** `backend/src/domains/opportunities/analytics.service.ts` (NEW)
- **Deps:** T119
- **Priority:** P2

### T133: Write failing tests for analytics service
- **Parent:** US-5 (Win/Loss Analytics)
- **Refs:** FR-017e
- **Files:** `backend/src/domains/opportunities/analytics.service.test.ts` (NEW)
- **Deps:** T132
- **Priority:** P2

### T134: Add RBAC enforcement tests for all opportunity routes
- **Parent:** US-1, US-2, US-3, US-5
- **Refs:** FR-017c
- **Files:** `backend/src/domains/opportunities/opportunity.routes.test.ts` (MOD)
- **Deps:** T125
- **Priority:** P1

### T135: Add audit trail verification tests
- **Parent:** US-1, US-2
- **Refs:** SC-004
- **Files:** `backend/src/domains/opportunities/opportunity.service.test.ts` (MOD)
- **Deps:** T120
- **Priority:** P1

### T136: Add optimistic concurrency and edge case tests
- **Parent:** US-1, US-2
- **Refs:** SC-001, SC-003
- **Files:** `backend/src/domains/opportunities/opportunity.service.test.ts` (MOD), `backend/src/domains/opportunities/opportunity.routes.test.ts` (MOD)
- **Deps:** T120, T125
- **Priority:** P1

### T137: Add tenant isolation tests
- **Parent:** US-1, US-3
- **Refs:** SC-001
- **Files:** `backend/src/domains/opportunities/opportunity.service.test.ts` (MOD)
- **Deps:** T120
- **Priority:** P1

---

## Dependency Graph

```
T116 (schema) ──┬── T117 (stage defaults)
                ├── T118 (shared schemas) ──┐
                ├── T123 (test helpers)     │
                │                           ▼
                └── T119 (CRUD service) ◄───┘
                     │
                     ├── T120 (CRUD tests)
                     ├── T121 (transition logic) ── T122 (transition tests)
                     ├── T124 (routes) ── T125 (route tests)
                     ├── T126 (pipeline service) ── T127 (pipeline tests)
                     ├── T128 (pipeline routes) ── T129 (pipeline route tests)
                     ├── T130 (brand assoc) ── T131 (brand tests)
                     ├── T132 (analytics) ── T133 (analytics tests)
                     └── T134-T137 (RBAC, audit, edge cases, tenant isolation)
```

## Summary

- **Total tasks:** 22 (T116-T137)
- **Batch 16:** 8 tasks (schema + shared schemas + CRUD + transition)
- **Batch 17:** 8 tasks (routes + pipeline + brand association)
- **Batch 18:** 6 tasks (analytics + RBAC + audit + edge cases)
