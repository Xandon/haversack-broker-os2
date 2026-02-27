# Research: Commissions (008)

**Reference domains:** orders, opportunities
**Date:** 2026-02-26

## Decision 1: Service Function Signature

**Decision:** All commission service functions follow `(prisma, tenantId, ..., audit)` signature pattern.
**Rationale:** Matches established order.service.ts and opportunity.service.ts patterns. Ensures tenant isolation and audit context propagation.
**Alternatives:** Middleware-injected context (rejected — explicit parameters are more testable).

## Decision 2: Commission Calculation Trigger

**Decision:** Event-driven via BullMQ job on order confirmation + monthly batch for statement generation.
**Rationale:** Orders already use BullMQ for notifications and QuickBooks export. Commission calculation follows the same async pattern. Decouples calculation from the order confirmation API response.
**Alternatives:** Synchronous calculation in order service (rejected — adds latency to order confirmation, violates single-responsibility).

## Decision 3: Data Model Storage

**Decision:** Commission rate is already captured at line item level (`OrderLineItem.commissionRate`). Commission rules stored as versioned records with effective dates. Commission entries are immutable calculation results.
**Rationale:** Line item already has `commissionRate` and `revenueModel` fields from Feature 4. Commission rules need versioning for mid-month rate changes. Immutable entries ensure audit trail integrity.
**Alternatives:** Store calculated rates inline on line items (rejected — loses rule traceability).

## Decision 4: Optimistic Concurrency

**Decision:** Use `updatedAt` timestamp for optimistic concurrency on CommissionStatement approval (via `If-Match` header).
**Rationale:** Matches opportunity.service.ts pattern. Prevents double-approval of the same statement.
**Alternatives:** Pessimistic locks (rejected — too heavy for approval flow).

## Decision 5: Zod Schema Organization

**Decision:** Create `packages/shared/src/schemas/commission.schema.ts` with: enum schemas, create/update input schemas, response schemas, list query schemas.
**Rationale:** Matches order.schema.ts pattern. Shared between frontend and backend.
**Alternatives:** Backend-only schemas (rejected — breaks shared validation pattern).

## Decision 6: QuickBooks Export Pattern

**Decision:** Follow existing `quickbooks-export.job.ts` pattern: find by status filter, generate CSV, create export records with attempt tracking.
**Rationale:** Identical pattern already proven for order exports. Commission export is structurally similar.
**Alternatives:** Direct QuickBooks API integration (rejected — PRD specifies CSV export format).

## Decision 7: Route Structure

**Decision:** All commission routes under `/api/commissions/*` prefix. Separate route groups for rules, statements, entries, disputes, and exports. Use `authenticate` + `authorize()` middleware per route.
**Rationale:** Matches established route pattern (order.routes.ts, opportunity.routes.ts). RBAC permissions already configured (`read:commissions`, `write:commissions`).
**Alternatives:** Nested under `/api/orders/:id/commissions` (rejected — commissions are a standalone domain, not a sub-resource of orders).

## Key Existing Assets to Leverage

| Asset | Location | Commission Use |
|-------|----------|---------------|
| `commissionRate` field | `OrderLineItem` model | Snapshot rate at order time |
| `revenueModel` enum | `OrderLineItem` model | Filter broker vs wholesale |
| `commissionRate` field | `Brand` model | Default base rate |
| `commissionModifier` field | `Territory` model | Territory multiplier |
| `read:commissions` permission | `ROLE_PERMISSIONS` | Already configured for rep/manager |
| `write:commissions` permission | `ROLE_PERMISSIONS` | Already configured for admin/manager |
| `writeAuditLog` function | `audit.service.ts` | Audit trail for all commission operations |
| QuickBooks export pattern | `quickbooks-export.job.ts` | Reuse pattern for commission export |
| BullMQ cron pattern | `health-score.job.ts` | Monthly statement generation |
