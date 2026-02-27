# Research: Pipeline & Opportunities

**Reference Domain:** Accounts (backend/src/domains/accounts/)
**Reference Activity Service:** backend/src/domains/activities/activity.service.ts

## Decision 1: Service Architecture Pattern

**Decision:** Follow the Account service pattern — single service file with domain Error class, AuditContext interface, and functions that accept (prisma, tenantId, ...).

**Rationale:** Consistent with accounts, activities, products, brands, and orders. All 5 completed features use this exact pattern.

**Alternative:** Class-based service — rejected for consistency with existing codebase.

## Decision 2: Error Handling Pattern

**Decision:** Create `OpportunityError` class with `code` field. Map error codes to HTTP status codes in the route handler via a `statusMap` object.

**Rationale:** Matches AccountError, ActivityError, BrandError patterns. Routes use `handleOpportunityError()` helper.

**Error codes:**
- `OPPORTUNITY_NOT_FOUND` → 404
- `OPPORTUNITY_CONFLICT` → 409 (optimistic concurrency)
- `OPPORTUNITY_CLOSED` → 400 (attempt to reopen closed)
- `OPPORTUNITY_CLOSE_REASON_REQUIRED` → 400
- `ACCOUNT_NOT_FOUND` → 404

## Decision 3: Shared Schema Structure

**Decision:** Create `opportunity.schema.ts` in packages/shared/src/schemas/ with:
- `pipelineStageSchema` — z.enum for the 6 stages
- `createOpportunitySchema` — name, estimatedValue, expectedCloseDate, stage, accountId, repId, brandIds[], probability?
- `updateOpportunitySchema` — all optional except explicit stage transitions
- `transitionOpportunitySchema` — stage (required), probability?, closeReason?
- `opportunityResponseSchema` — full response with computed weightedValue
- `opportunityListQuerySchema` — filters: stage, accountId, repId, dateFrom, dateTo, cursor, limit
- `pipelineSummaryQuerySchema` — repId?, accountId?, dateFrom?, dateTo?
- `winLossQuerySchema` — repId?, dateFrom, dateTo

**Rationale:** Follows the pattern in account.schema.ts and order.schema.ts. Separate transition schema because stage changes have special validation rules.

## Decision 4: Stage-Change Activity Logging

**Decision:** Use existing `createActivity()` from activity.service.ts with type "note" and structured notes text: "Opportunity '{name}' moved from {oldStage} to {newStage}".

**Rationale:** ActivityType enum has: visit, call, email, demo, sampling. Adding a new enum value ("stage_change") would require a Prisma migration altering the enum, which is a BREAKING change to the Activity model. Using "note" type keeps activity logging additive. However, ActivityType enum does not include "note" — it only has the 5 types listed.

**Revised Decision:** Since we cannot use "note" (not in enum) and don't want to alter the enum, we will log stage changes ONLY via the AuditLog service (writeAuditLog with entityType='Opportunity', action='update'). The Account timeline service already includes audit trail entries, so stage changes will appear on the Account timeline through the AuditLog.

**Alternative considered:** Extending ActivityType enum with "stage_change" — rejected as BREAKING change to existing Activity model.

## Decision 5: Pipeline Summary API Design

**Decision:** Single endpoint `GET /api/pipeline/summary` that returns:
```json
{
  "data": {
    "stages": {
      "prospect": { "opportunities": [...], "count": N, "totalValue": X },
      "qualified": { "opportunities": [...], "count": N, "totalValue": X },
      ...
    },
    "forecast": {
      "weightedTotal": 123456.78,
      "totalOpenValue": 234567.89,
      "opportunityCount": 15
    }
  }
}
```

**Rationale:** Grouping by stage is the natural pipeline view structure. Including forecast at the top level enables the frontend to display it separately from the kanban columns.

## Decision 6: RBAC Access Rules

**Decision:**
- **Create/Update/Delete Opportunities:** admin, manager, rep (rep only for own Opportunities; manager/admin for any within tenant)
- **List/Get Opportunities:** all authenticated users (including viewer, logistics)
- **Pipeline Summary:** all authenticated users (viewer, logistics see read-only)
- **Win/Loss Analytics:** admin, manager, rep (rep sees only own data)

**Rationale:** Matches the existing RBAC patterns. Reps can manage their own pipeline; managers see the full picture.

## Decision 7: OpportunityBrand Join Table

**Decision:** Simple join table with composite primary key (opportunityId + brandId). No additional fields. Managed via Prisma implicit many-to-many or explicit model.

**Rationale:** Using explicit model for consistency with Prisma patterns in the codebase. Brand-level revenue attribution belongs in the Commissions feature.

**Pattern:** On create/update, delete existing OpportunityBrand records and recreate with new set (replace strategy, same as used in order line items).
