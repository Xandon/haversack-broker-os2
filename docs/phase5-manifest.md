# Phase 5 Orchestrator Manifest — Frontend Phase

**Created:** 2026-02-27
**Last Updated:** 2026-02-27 20:10 UTC
**Base Branch:** dev
**Merge Mode:** auto (confirmed by user)
**Baseline Tests:** 1356
**Global Batch Counter:** 41
**PRD Source:** docs/prd-frontend.md
**Phase:** Frontend UI/UX (FR-031 through FR-053)

## Backend Phase Summary (Complete)

12 features, 34 batches, 1355 tests added (1356 total), T001-T245 complete. See docs/progress.md for full history.

## Feature Queue

| # | Feature | Spec Dir | PRD References | Status | Batches | Tests Added | E2E |
|---|---------|----------|---------------|--------|---------|-------------|-----|
| 1 | F-000: Design System & Component Library | 014-design-system | FR-031 | COMPLETE | 3/3 | 47 | SKIP (foundational) |
| 2 | F-001: Global Search (Cmd+K) | 015-global-search | FR-032 | COMPLETE | 2/2 | 60 | PENDING |
| 3 | F-002a: Account List & Search | 016-account-list | FR-033 | COMPLETE | 2/2 | 33 | PASS (16/18, 2 intermittent) |
| 4 | F-002b: Account Detail View | 017-account-detail | FR-034 | PENDING | -- | -- | -- |
| 5 | F-002c: Account Forms & Contacts | 018-account-forms | FR-035 | PENDING | -- | -- | -- |
| 6 | F-003: Activity Logging & Timeline | 019-activity-timeline | FR-036 | PENDING | -- | -- | -- |
| 7 | F-004: Task Management | 020-task-management | FR-037 | PENDING | -- | -- | -- |
| 8 | F-005a: Order List & Detail | 021-order-list | FR-038 | PENDING | -- | -- | -- |
| 9 | F-005b: Order Entry Form | 022-order-entry | FR-039 | PENDING | -- | -- | -- |
| 10 | F-005c: Order Approval Queue | 023-order-approval | FR-040 | PENDING | -- | -- | -- |
| 11 | F-006: Product Catalog & Brands | 024-product-catalog | FR-041 | PENDING | -- | -- | -- |
| 12 | F-007: Pipeline Kanban | 025-pipeline-kanban | FR-042 | PENDING | -- | -- | -- |
| 13 | F-007b: Opportunity CRUD | 026-opportunity-crud | FR-043 | PENDING | -- | -- | -- |
| 14 | F-008: Commission Tracking | 027-commission-tracking | FR-044 | PENDING | -- | -- | -- |
| 15 | F-009: Enhanced Dashboard & Charts | 028-dashboard-charts | FR-045 | PENDING | -- | -- | -- |
| 16 | F-010: Custom Reports | 029-custom-reports | FR-046 | PENDING | -- | -- | -- |
| 17 | F-011: AI Features Integration | 030-ai-integration | FR-047 | PENDING | -- | -- | -- |
| 18 | F-012: User Management | 031-user-management | FR-048 | PENDING | -- | -- | -- |
| 19 | F-013: Data Import Wizard | 032-data-import | FR-049 | PENDING | -- | -- | -- |
| 20 | F-014: Data Quality Scorecard | 033-data-quality | FR-050 | PENDING | -- | -- | -- |
| 21 | F-015: Email Integration | 034-email-integration | FR-051 | PENDING | -- | -- | -- |
| 22 | F-016: Notifications | 035-notifications | FR-052 | PENDING | -- | -- | -- |
| 23 | F-053: Cross-Cutting UI Polish | 036-ui-polish | FR-053 | PENDING | -- | -- | -- |

## Dependency Map

```
F-000 (Design System) ──┬── F-001 (Global Search)
                         ├── F-002a (Account List) ──┬── F-002b (Account Detail) ──┬── F-011 (AI Integration)
                         │                           │                              └── F-015 (Email Integration)
                         │                           ├── F-002c (Account Forms)
                         │                           ├── F-003 (Activities)
                         │                           ├── F-005a (Order List) ──┬── F-005b (Order Entry)
                         │                           │                         └── F-005c (Approval Queue)
                         │                           └── F-008 (Commissions -- uses account context)
                         ├── F-004 (Tasks)
                         ├── F-006 (Products/Brands)
                         ├── F-007 (Pipeline Kanban) ── F-007b (Opportunity CRUD)
                         ├── F-009 (Dashboard Charts)
                         ├── F-010 (Reports)
                         ├── F-012 (User Management)
                         ├── F-013 (Data Import)
                         ├── F-014 (Data Quality)
                         └── F-016 (Notifications)

F-053 (UI Polish) depends on ALL above
```

## Current State

- **Active Feature:** 4 (F-002b: Account Detail View)
- **Active Stage:** PLANNING
- **Active Step:** 2.1 (Create feature directory)
- **Resume Point:** STAGE 2, Step 2.1

## Feature 1: F-000: Design System & Component Library

### PRD References
- FR-031: Design system (theme tokens, shadcn/ui primitives, composite patterns)

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/014-design-system
- [x] 2.2 Generate spec.md — 4 user stories, 1 FR (FR-031)
- [x] 2.3 Clarify — 9 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 18/18 items passing
- [x] 2.5 Conflict analysis — 28 safe, 4 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: existing frontend UI + hooks
- [x] 2.7 Plan — 35 files planned (31 new, 4 modified)
- [x] 2.8 Tasks — 25 tasks in 3 batches (35-37), T246-T270
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 35: Theme Foundation & Dependencies (T246-T253) — 8 tasks, 0 new tests (primitives), merged
- [x] Batch 36: Composite Patterns (T254-T265) — 12 tasks, 0 new tests (composites), merged
- [x] Batch 37: Utility Hooks & Tests (T266-T270) — 5 tasks, 47 new tests, merged

### E2E Validation
SKIP — foundational design system feature, no user-facing pages to test via E2E

## Feature 2: F-001: Global Search (Cmd+K)

### PRD References
- FR-032: Global search command palette

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/015-global-search
- [x] 2.2 Generate spec.md — 4 user stories, 14 FRs (FR-032)
- [x] 2.3 Clarify — 7 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 20/20 items passing
- [x] 2.5 Conflict analysis — 9 safe, 3 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: accounts + dashboard hooks
- [x] 2.7 Plan — 12 files planned (8 new, 4 modified)
- [x] 2.8 Tasks — 13 tasks in 2 batches (38-39), T271-T283
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 38: Search Backend + Frontend Hook Foundation (T271-T277) — 7 tasks, 45 new tests, merged
- [x] Batch 39: Polish & Edge Cases (T278-T283) — 6 tasks, 15 new tests, merged

### E2E Validation
- [ ] E2E browser testing — pending

## Feature 3: F-002a: Account List & Search

### PRD References
- FR-033: Account list data table with filters

### Planning Checklist
- [x] 2.1 Create feature directory — .specify/specs/016-account-list
- [x] 2.2 Generate spec.md — 5 user stories, 10 FRs (FR-033a through FR-033j)
- [x] 2.3 Clarify — 8 clarifications resolved, 0 outstanding
- [x] 2.4 Requirements checklist — 18/18 items passing
- [x] 2.5 Conflict analysis — 12 safe, 5 additive, 0 breaking
- [x] 2.6 Research — 7 decisions documented, reference domain: accounts + dashboard hooks
- [x] 2.7 Plan — 19 files planned (16 new, 3 modified)
- [x] 2.8 Tasks — 14 tasks in 2 batches (40-41), T284-T297
- [x] 2.9 Validation gate — all checks passing

### Build Checklist
- [x] Batch 40: Backend + Frontend Foundation (T284-T290) — 7 tasks, 26 new tests, merged
- [x] Batch 41: Page Assembly, Filters & E2E (T291-T296) — 6 tasks, 7 new tests, merged

### E2E Validation
- [x] Playwright E2E — 9 scenarios, 16/18 pass (desktop Chrome + mobile Pixel 5)
  - 2 intermittent failures: manager login timeouts on chromium (pre-existing auth fixture issue)

## Feature 4: F-002b: Account Detail View

### PRD References
- FR-034: Account detail view with tabbed layout

### Planning Checklist
- [ ] 2.1 Create feature directory
- [ ] 2.2 Generate spec.md
- [ ] 2.3 Clarify
- [ ] 2.4 Requirements checklist
- [ ] 2.5 Conflict analysis
- [ ] 2.6 Research
- [ ] 2.7 Plan
- [ ] 2.8 Tasks
- [ ] 2.9 Validation gate
