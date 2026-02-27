# Tasks: Commissions (008)

**Feature:** Commissions (FR-020, FR-021, FR-022)
**Task IDs:** T138-T159 (22 tasks)
**Batches:** 3 (batches 19-21)
**Last completed task (global):** T137

## Batch 19: Schema, Shared Schemas & Commission Rule CRUD

**Branch:** `feature/batch-batch-19-commission-schema`
**Focus:** Foundation — Prisma models, Zod schemas, commission rule service
**Tasks:** T138-T145 (8 tasks)

### T138: Add Prisma commission models and enums
- **Description:** Add CommissionRule, CommissionEntry, CommissionStatement, CommissionDispute, CommissionExport models plus CommissionStatementStatus, CommissionDisputeStatus, CommissionEntryType enums to prisma/schema.prisma. Add RLS indexes on tenant_id. Create and run migration.
- **Parent:** US-1, US-2, US-3, US-4, US-5, US-6
- **Refs:** FR-020, FR-021, FR-022
- **Files:** prisma/schema.prisma (MOD)
- **Workspace:** root
- **Dependencies:** None
- **Priority:** P1

### T139: Create shared Zod schemas for commission operations
- **Description:** Create commission.schema.ts with: CommissionStatementStatus enum, CommissionDisputeStatus enum, CommissionEntryType enum, volumeTierSchema, createCommissionRuleSchema, updateCommissionRuleSchema, commissionRuleResponseSchema, commissionEntryResponseSchema, commissionStatementResponseSchema, listCommissionStatementsSchema, createDisputeSchema, resolveDisputeSchema, triggerExportSchema, generateStatementsSchema. Export from packages/shared/src/index.ts.
- **Parent:** US-1, US-2, US-3, US-4, US-5, US-6
- **Refs:** FR-020, FR-021, FR-022
- **Files:** packages/shared/src/schemas/commission.schema.ts (NEW), packages/shared/src/index.ts (MOD)
- **Workspace:** shared
- **Dependencies:** T138
- **Priority:** P1

### T140: Add commission error codes to shared constants
- **Description:** Add 10 commission error codes to ERROR_CODES in packages/shared/src/constants/index.ts: COMMISSION_RULE_NOT_FOUND, COMMISSION_RULE_CONFLICT, COMMISSION_STATEMENT_NOT_FOUND, COMMISSION_STATEMENT_NOT_PENDING, COMMISSION_STATEMENT_HAS_DISPUTES, COMMISSION_STATEMENT_CONFLICT, COMMISSION_ENTRY_NOT_FOUND, COMMISSION_DISPUTE_NOT_FOUND, COMMISSION_DISPUTE_ALREADY_EXISTS, COMMISSION_EXPORT_ALREADY_EXISTS.
- **Parent:** US-1, US-2, US-3, US-4, US-5, US-6
- **Refs:** FR-020, FR-021, FR-022
- **Files:** packages/shared/src/constants/index.ts (MOD)
- **Workspace:** shared
- **Dependencies:** None
- **Priority:** P1

### T141: Implement CommissionRule service — create and get
- **Description:** Create commission-rule.service.ts with createCommissionRule (validates no overlapping active rule for brand+territory+date range, creates rule, writes audit log) and getCommissionRule (by ID with tenant isolation). Include CommissionRuleError class.
- **Parent:** US-1 (AC 1.1, 1.3)
- **Refs:** FR-020
- **Files:** backend/src/domains/commissions/commission-rule.service.ts (NEW)
- **Workspace:** backend
- **Dependencies:** T138, T139, T140
- **Priority:** P1

### T142: Implement CommissionRule service — update (versioning) and list
- **Description:** Add updateCommissionRule (creates new version with new effective date, expires the old rule, optimistic concurrency via If-Match, writes audit log) and listCommissionRules (filter by brandId, territoryId, activeOnly; cursor pagination) to the rule service.
- **Parent:** US-1 (AC 1.2, 1.4)
- **Refs:** FR-020
- **Files:** backend/src/domains/commissions/commission-rule.service.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T141
- **Priority:** P1

### T143: Implement CommissionRule service — getEffectiveRule
- **Description:** Add getEffectiveRule(brandId, territoryId, referenceDate) that finds the active rule for a brand on a given date. Lookup: territory-specific rule first, then default (territory_id=null). Returns null if no rule found. This is the core lookup used by the calculation engine.
- **Parent:** US-2 (AC 2.2)
- **Refs:** FR-020
- **Files:** backend/src/domains/commissions/commission-rule.service.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T141
- **Priority:** P1

### T144: Implement commission calculation engine
- **Description:** Create commission-calculation.service.ts with calculateLineItemCommission(lineItem, rule) — applies formula: lineItemTotal * (baseRate + tierBonus) * territoryModifier. Includes getVolumeTier(amount, tiers) for tier lookup (half-open intervals). Also calculateOrderCommissions(order) — iterates line items, skips wholesale, finds effective rule per brand, calculates each, creates CommissionEntry records in a transaction, writes audit log per entry.
- **Parent:** US-2 (AC 2.1, 2.3, 2.4)
- **Refs:** FR-020
- **Files:** backend/src/domains/commissions/commission-calculation.service.ts (NEW)
- **Workspace:** backend
- **Dependencies:** T138, T139, T143
- **Priority:** P1

### T145: Add commission rule route handlers
- **Description:** Create commission.routes.ts with POST /api/commissions/rules (admin), GET /api/commissions/rules (authenticated), GET /api/commissions/rules/:id (authenticated), PUT /api/commissions/rules/:id (admin). Register in backend/src/app.ts. Include Zod validation, auth/RBAC middleware, error handling, response formatting.
- **Parent:** US-1
- **Refs:** FR-020
- **Files:** backend/src/domains/commissions/commission.routes.ts (NEW), backend/src/app.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T141, T142

---

## Batch 20: Statement Generation, Approval & Dispute Resolution

**Branch:** `feature/batch-batch-20-commission-statements`
**Focus:** Monthly statements, approval workflow, dispute lifecycle
**Tasks:** T146-T153 (8 tasks)

### T146: Implement CommissionStatement service — generate
- **Description:** Create commission-statement.service.ts with generateStatements(month, year) — finds all active reps, aggregates uncommitted CommissionEntry records for the period, creates CommissionStatement per rep (including zero-amount), calculates YTD from prior months' statements, links entries to statement via statement_id update. All in transaction.
- **Parent:** US-3 (AC 3.1, 3.2, 3.3)
- **Refs:** FR-021
- **Files:** backend/src/domains/commissions/commission-statement.service.ts (NEW)
- **Workspace:** backend
- **Dependencies:** T138, T139, T144
- **Priority:** P1

### T147: Implement CommissionStatement service — get and list
- **Description:** Add getStatement(id) with entries + disputes included, and listStatements(repId?, month?, year?, status?, cursor, limit) — rep sees own statements only, manager sees team. Include in-progress partial statement support for current month.
- **Parent:** US-3 (AC 3.4), US-4 (AC 4.3)
- **Refs:** FR-021
- **Files:** backend/src/domains/commissions/commission-statement.service.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T146
- **Priority:** P1

### T148: Implement CommissionStatement service — approve and reject
- **Description:** Add approveStatement(id, approverId, ifMatch) — checks no unresolved disputes, transitions status to "approved", records approver + timestamp, writes audit log. Add rejectStatement(id, reason, actorId) — logs rejection reason in audit trail (status stays "pending" for rework). Optimistic concurrency on both.
- **Parent:** US-4 (AC 4.1, 4.2, 4.4)
- **Refs:** FR-021
- **Files:** backend/src/domains/commissions/commission-statement.service.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T147
- **Priority:** P1

### T149: Implement CommissionDispute service
- **Description:** Create commission-dispute.service.ts with fileDispute(entryId, reason, filedBy) — validates entry exists and no existing open dispute, creates dispute record, writes audit log. Add resolveDispute(disputeId, adjustedAmount?, resolutionNotes, resolvedBy) — marks resolved, if adjustedAmount provided creates adjustment entry and recalculates statement total, writes audit log.
- **Parent:** US-6 (AC 6.1, 6.2, 6.3)
- **Refs:** FR-021
- **Files:** backend/src/domains/commissions/commission-dispute.service.ts (NEW)
- **Workspace:** backend
- **Dependencies:** T138, T139, T146
- **Priority:** P2

### T150: Add statement route handlers
- **Description:** Add to commission.routes.ts: GET /api/commissions/statements (authenticated), GET /api/commissions/statements/:id (authenticated), POST /api/commissions/statements/:id/approve (manager), POST /api/commissions/statements/:id/reject (manager), POST /api/commissions/statements/generate (admin). Include Zod validation, response formatting with entry details.
- **Parent:** US-3, US-4
- **Refs:** FR-021
- **Files:** backend/src/domains/commissions/commission.routes.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T145, T146, T147, T148
- **Priority:** P1

### T151: Add dispute route handlers
- **Description:** Add to commission.routes.ts: POST /api/commissions/entries/:id/dispute (rep, manager), POST /api/commissions/disputes/:id/resolve (manager, admin). Include Zod validation and error handling.
- **Parent:** US-6
- **Refs:** FR-021
- **Files:** backend/src/domains/commissions/commission.routes.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T145, T149
- **Priority:** P2

### T152: Create commission calculation BullMQ job
- **Description:** Create commission-calculation.queue.ts (queue name, job data interface) and commission-calculation.job.ts (worker handler that calls calculateOrderCommissions). Register in worker/src/index.ts. Job is dispatched when an order is confirmed (integration point — add dispatch call to order service or as a separate concern).
- **Parent:** US-2
- **Refs:** FR-020
- **Files:** worker/src/jobs/commission-calculation.job.ts (NEW), worker/src/queues/commission-calculation.queue.ts (NEW), worker/src/index.ts (MOD)
- **Workspace:** worker
- **Dependencies:** T144
- **Priority:** P1

### T153: Create commission statement generation BullMQ cron job
- **Description:** Create commission-statement.queue.ts (queue name, cron pattern "0 2 1 * *", job data interface) and commission-statement.job.ts (worker handler that calls generateStatements for the previous month). Register in worker/src/index.ts with upsertJobScheduler.
- **Parent:** US-3
- **Refs:** FR-021
- **Files:** worker/src/jobs/commission-statement.job.ts (NEW), worker/src/queues/commission-statement.queue.ts (NEW), worker/src/index.ts (MOD)
- **Workspace:** worker
- **Dependencies:** T146, T152
- **Priority:** P1

---

## Batch 21: QuickBooks Export, RBAC, Audit & Edge Cases

**Branch:** `feature/batch-batch-21-commission-export-polish`
**Focus:** QB export, comprehensive RBAC testing, audit trail, edge cases
**Tasks:** T154-T159 (6 tasks)

### T154: Implement CommissionExport service
- **Description:** Create commission-export.service.ts with exportToQuickBooks(month, year, forceReExport, actorId) — finds approved statements for period, checks for prior export (warns if exists unless forceReExport), generates CSV with columns: Rep Name, Rep Email, Period, Order Count, Total Commission, and per-entry line detail. Creates CommissionExport record with reference ID (QB-YYYY-MM-NNN). Marks statements as "exported".
- **Parent:** US-5 (AC 5.1, 5.2, 5.3, 5.4)
- **Refs:** FR-022
- **Files:** backend/src/domains/commissions/commission-export.service.ts (NEW)
- **Workspace:** backend
- **Dependencies:** T138, T139, T148
- **Priority:** P2

### T155: Add export route handler
- **Description:** Add to commission.routes.ts: POST /api/commissions/export (admin). Include Zod validation with month, year, forceReExport fields. Return export summary with statementsIncluded, statementsSkipped, totalAmount.
- **Parent:** US-5
- **Refs:** FR-022
- **Files:** backend/src/domains/commissions/commission.routes.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T145, T154
- **Priority:** P2

### T156: RBAC enforcement tests
- **Description:** Write comprehensive RBAC tests: admin can CRUD rules and trigger exports; manager can approve/reject statements and resolve disputes; rep can view own statements and file disputes; viewer can only read; rep cannot approve own statement; rep cannot see other reps' statements; manager sees only team statements.
- **Parent:** US-1, US-2, US-3, US-4, US-5, US-6
- **Refs:** FR-020, FR-021, FR-022
- **Files:** backend/src/domains/commissions/commission.routes.test.ts (NEW)
- **Workspace:** backend
- **Dependencies:** T145, T150, T151, T155
- **Priority:** P1

### T157: Audit trail verification tests
- **Description:** Write tests verifying audit trail entries for: rule creation, rule update (versioning), commission calculation, statement generation, statement approval, statement rejection, dispute filing, dispute resolution (with amount adjustment), export creation.
- **Parent:** US-1, US-2, US-3, US-4, US-5, US-6
- **Refs:** FR-020, FR-021, FR-022
- **Files:** backend/src/domains/commissions/commission.routes.test.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T156
- **Priority:** P1

### T158: Edge case tests — rate changes, tier boundaries, cancellations
- **Description:** Write tests for: mid-month rate change (order uses rate effective on confirmation date), volume tier boundary ($10K exactly hits tier 1), wholesale line item exclusion, brand with no commission rule (exclusion + warning), zero-commission entry (0% base rate), order cancellation reversal entry, concurrent statement approval (optimistic concurrency), duplicate dispute prevention.
- **Parent:** US-2 (edge cases)
- **Refs:** FR-020
- **Files:** backend/src/domains/commissions/commission-calculation.service.test.ts (NEW)
- **Workspace:** backend
- **Dependencies:** T144, T146, T149
- **Priority:** P1

### T159: Tenant isolation tests
- **Description:** Write tests verifying tenant isolation: rules from tenant A not visible to tenant B, statements scoped to tenant, disputes scoped to tenant, exports scoped to tenant. Verify all queries include tenant_id filtering.
- **Parent:** All US
- **Refs:** FR-020, FR-021, FR-022
- **Files:** backend/src/domains/commissions/commission.routes.test.ts (MOD)
- **Workspace:** backend
- **Dependencies:** T156
- **Priority:** P1

---

## Dependency Graph

```
T138 (schema) ──┬── T139 (Zod schemas) ──┬── T141 (rule create/get) ──┬── T142 (rule update/list)
                │                         │                            ├── T143 (getEffectiveRule) ──── T144 (calculation engine)
                │                         │                            └── T145 (rule routes) ──┬── T150 (statement routes)
                │                         │                                                     ├── T151 (dispute routes)
                │                         │                                                     └── T155 (export route)
                │                         ├── T146 (statement generate) ──┬── T147 (statement get/list) ── T148 (approve/reject)
                │                         │                               └── T149 (dispute service)
                │                         └── T154 (export service)
                └── T140 (error codes)

T144 ──── T152 (calculation job) ──── T153 (statement cron job)
T145 + T150 + T151 + T155 ──── T156 (RBAC tests) ──── T157 (audit tests)
T144 + T146 + T149 ──── T158 (edge case tests)
T156 ──── T159 (tenant isolation tests)
```

## Parallel Opportunities

- [P] T138 and T140 can run in parallel (no dependencies between them)
- [P] T142 and T143 can run in parallel (both depend on T141 but not each other)
- [P] T146 and T152 can be developed in parallel after T144
- [P] T156, T157, T158, T159 can be written in parallel (test files)
