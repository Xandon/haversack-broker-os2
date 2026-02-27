# Feature Specification: Pipeline & Opportunities

**Feature Branch**: `007-pipeline-opportunities`
**Created**: 2026-02-27
**Status**: Draft
**Input**: PRD FR-016, FR-017

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Opportunity CRUD (Priority: P1)

As a **territory representative**, I want to create, view, update, and list Opportunity records linked to my accounts, so that I can track potential sales and their progress through the pipeline.

**Why this priority**: Core data management is the foundation — without Opportunity records, pipeline views and forecasting cannot exist.

**Independent Test**: Can be fully tested by creating an Opportunity via API, retrieving it, updating fields, and listing filtered results. Delivers value as a standalone opportunity tracker.

**Acceptance Scenarios**:

1. **Given** a Rep is authenticated, **When** the Rep creates an Opportunity with name "Q3 Honey Expansion", estimated value $25,000, stage "prospect", expected close date 2026-06-30, and linked to an existing Account and Brand, **Then** the system creates the Opportunity with auto-populated probability (10% for "prospect"), returns the created record with all fields, and writes an audit trail entry.
2. **Given** an Opportunity exists, **When** the Rep retrieves it by ID, **Then** the system returns the Opportunity with account name, rep name, associated brands, and computed weighted value (estimated_value * probability / 100).
3. **Given** multiple Opportunities exist for a tenant, **When** the Rep lists Opportunities with optional filters (stage, accountId, repId, date range), **Then** the system returns paginated results scoped to the Rep's tenant with cursor-based pagination.
4. **Given** an Opportunity exists, **When** the Rep updates the estimated value or expected close date, **Then** the system updates the record, enforces optimistic concurrency via updatedAt, and writes an audit trail entry.

---

### User Story 2 - Pipeline Stage Transitions (Priority: P1)

As a **territory representative**, I want to move Opportunities between pipeline stages with automatic probability updates, so that the pipeline accurately reflects my sales progress.

**Why this priority**: Stage transitions are the core pipeline mechanic — they drive probability updates, forecast calculations, and activity logging.

**Independent Test**: Can be tested by transitioning an Opportunity through stages and verifying probability auto-population, close reason requirements, and activity timeline logging.

**Acceptance Scenarios**:

1. **Given** an Opportunity is in stage "qualified" (probability 40%), **When** the Rep transitions it to "proposal", **Then** the system updates the stage to "proposal", auto-populates probability to 60% (unless the Rep provided a custom probability), and logs a stage-change activity on the associated Account's timeline.
2. **Given** an Opportunity is in stage "negotiation", **When** the Rep transitions it to "closed_won", **Then** the system requires a close_reason, sets probability to 100%, records the close date as today, and writes an audit trail entry.
3. **Given** an Opportunity is in stage "proposal", **When** the Rep transitions it to "closed_lost", **Then** the system requires a close_reason, sets probability to 0%, records the close date, and logs the loss on the Account timeline.
4. **Given** an Opportunity is in stage "closed_won", **When** the Rep attempts to transition it to another stage, **Then** the system rejects the transition with an error "Closed opportunities cannot be reopened."

---

### User Story 3 - Pipeline View & Weighted Forecast (Priority: P1)

As a **sales manager**, I want to view a pipeline summary grouped by stage with weighted forecast totals, so that I can understand the team's revenue outlook and identify stuck opportunities.

**Why this priority**: The pipeline view with forecasting is the primary value proposition of FR-017 — it provides revenue visibility for management decision-making.

**Independent Test**: Can be tested by querying the pipeline summary endpoint and verifying stage groupings, card data, and weighted forecast calculations.

**Acceptance Scenarios**:

1. **Given** 15 open Opportunities exist across 4 stages, **When** a Manager requests the pipeline summary, **Then** the system returns Opportunities grouped by stage, each with name, account name, estimated value, probability, expected close date, and rep name. The weighted forecast total equals SUM(estimated_value * probability / 100) for all open Opportunities.
2. **Given** a Rep requests the pipeline summary, **When** the API returns results, **Then** only Opportunities assigned to that Rep are included (unless the Rep is also a Manager or Admin).
3. **Given** a Manager requests the pipeline with filters (repId, accountId, date range), **When** results load, **Then** only matching Opportunities are included and the weighted forecast reflects the filtered set.

---

### User Story 4 - Opportunity Brands Association (Priority: P2)

As a **territory representative**, I want to associate one or more Brands with an Opportunity, so that I can track which product lines are involved in each deal.

**Why this priority**: Brand association enriches Opportunity data and enables future commission calculations per brand. Lower priority because core pipeline functionality works without it.

**Independent Test**: Can be tested by creating an Opportunity with multiple brands, retrieving it, and verifying the brand associations are returned.

**Acceptance Scenarios**:

1. **Given** a Rep creates an Opportunity, **When** the Rep includes an array of brand IDs, **Then** the system creates the Opportunity with brand associations via a join table, and the retrieved Opportunity includes brand names.
2. **Given** an Opportunity has 3 associated Brands, **When** the Rep updates the Opportunity with a different set of 2 brands, **Then** the system replaces the brand associations (removes old, adds new) and the updated record reflects exactly 2 brands.

---

### User Story 5 - Win/Loss Analytics (Priority: P2)

As a **sales manager**, I want to see win/loss statistics and trends, so that I can identify patterns and coach my team on improving close rates.

**Why this priority**: Analytics provide strategic value but depend on having sufficient closed Opportunities. Lower priority than core CRUD and pipeline view.

**Independent Test**: Can be tested by creating a mix of closed-won and closed-lost Opportunities, then querying the analytics endpoint to verify win rate, average deal size, and stage conversion rates.

**Acceptance Scenarios**:

1. **Given** closed Opportunities exist, **When** a Manager requests win/loss analytics with a date range, **Then** the system returns: total won, total lost, win rate percentage, average won deal size, average sales cycle length (days from created to closed), and top close reasons.
2. **Given** a Rep requests win/loss analytics, **When** results return, **Then** only that Rep's Opportunities are included in the calculations.

---

### Edge Cases

- Opportunity with estimated value of $0: system allows it (valid for tracking purposes) but weighted value computes to $0.
- Rep tries to create Opportunity for an Account outside their tenant: system rejects with 403 due to tenant isolation.
- Simultaneous stage transitions by two users on the same Opportunity: optimistic concurrency check rejects the second update with a 409 conflict response.
- Pipeline summary with no Opportunities: system returns empty stage groups with $0 weighted forecast.
- Opportunity with custom probability override (e.g., 85% in "proposal" stage): system preserves the custom value and does not reset it unless the stage changes.
- More than 100 Opportunities per stage in pipeline view: system supports cursor-based pagination within the pipeline query parameters.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-016a**: System MUST allow a Rep to create an Opportunity linked to an Account with fields: name (required, max 255 chars), estimated_value (required, decimal >= 0), expected_close_date (required, date), stage (required, one of: prospect, qualified, proposal, negotiation, closed_won, closed_lost), and optional close_reason (required for closed stages).
- **FR-016b**: System MUST auto-populate the probability field based on the selected stage using configurable defaults: prospect=10%, qualified=40%, proposal=60%, negotiation=75%, closed_won=100%, closed_lost=0%. The Rep MAY override probability on non-closed stages.
- **FR-016c**: System MUST support associating zero or more Brands with an Opportunity via a many-to-many relationship.
- **FR-016d**: System MUST enforce that closed_reason is provided when transitioning to closed_won or closed_lost stages.
- **FR-016e**: System MUST prevent reopening closed Opportunities (transitions from closed_won or closed_lost to any other stage).
- **FR-016f**: System MUST log a stage-change audit trail entry (entityType='Opportunity', action='update') whenever an Opportunity's stage changes, including old and new stage values. This appears on the Account timeline via the existing audit trail integration.
- **FR-017a**: System MUST provide a pipeline summary API that returns open Opportunities grouped by stage, with each Opportunity including: name, account name, estimated value, probability, expected close date, and rep name.
- **FR-017b**: System MUST compute a weighted forecast total as SUM(estimated_value * probability / 100) across all open Opportunities in the result set.
- **FR-017c**: System MUST scope pipeline results by role: Reps see only their own Opportunities; Managers and Admins see all Opportunities within the tenant.
- **FR-017d**: System MUST support filtering the pipeline by repId, accountId, stage, and date range (expectedCloseDate).
- **FR-017e**: System MUST provide win/loss analytics: total won count, total lost count, win rate, average won deal size, average sales cycle (days), and top close reasons, filterable by repId and date range.

### Key Entities

- **Opportunity**: A potential sale linked to an Account and assigned to a Rep. Tracks estimated value, pipeline stage, probability, and expected close date. Progresses through stages: prospect → qualified → proposal → negotiation → closed_won/closed_lost.
- **OpportunityBrand**: Join table linking Opportunities to Brands (many-to-many). Tracks which product lines are involved in each deal.
- **Pipeline Stage Defaults**: Configuration mapping of stages to default probability percentages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opportunity CRUD operations complete in under 200ms (p95) with full tenant isolation.
- **SC-002**: Pipeline summary query returns grouped results with weighted forecast in under 200ms for up to 500 Opportunities.
- **SC-003**: Stage transitions auto-populate probability and enforce close_reason validation with 100% accuracy.
- **SC-004**: All create, update, and stage-change operations produce audit trail records within 10ms.
- **SC-005**: Win/loss analytics compute accurately across all closed Opportunities with configurable date ranges.

## Clarifications

1. **Stage transition validation — can stages be skipped?** Yes. The PRD does not mandate sequential stage progression. A Rep can move an Opportunity from "prospect" directly to "negotiation" (skipping "qualified" and "proposal"). The only restrictions are: (a) closed stages require close_reason, and (b) closed stages cannot be reopened. Rationale: Real sales processes are non-linear; forcing sequential stages would frustrate users.

2. **Probability override behavior on stage change.** When a Rep changes the stage, the probability resets to the stage default UNLESS the Rep explicitly provides a custom probability in the same request. If the Rep previously set a custom probability (e.g., 85% on "proposal") and then changes the stage to "negotiation" without providing a probability, the probability resets to 75% (negotiation default). Rationale: Stage-linked probability is the primary forecasting mechanism; custom overrides are per-stage adjustments.

3. **Who can create/update Opportunities?** Reps can create and update their own Opportunities. Managers and Admins can create Opportunities for any Rep in their tenant and update any Opportunity. Logistics and Viewer roles are read-only. Rationale: Follows the existing RBAC patterns (admin/manager for writes across tenant, rep for own data).

4. **Soft delete or hard delete for Opportunities?** Soft delete using an `isActive` field, consistent with the Account and Product patterns. A "deleted" Opportunity is excluded from pipeline views and analytics. Rationale: Preserves audit trail integrity and allows recovery.

5. **Close date field behavior.** The `closedAt` field is null for open Opportunities and auto-set to the current timestamp when transitioning to closed_won or closed_lost. It cannot be manually set. Rationale: Ensures accurate sales cycle calculations in analytics.

6. **Stage-change logging mechanism.** Stage changes are logged via the AuditLog service (writeAuditLog) with entityType='Opportunity' and action='update', capturing old/new stage values in the changeSummary. The ActivityType enum (visit, call, email, demo, sampling) is NOT modified — adding "stage_change" would be a breaking change to the Activity model. Rationale: AuditLog entries already appear on the Account timeline, providing the required visibility without schema changes.

7. **Pipeline summary scoping — what does "open" mean?** Open Opportunities are those where the stage is NOT "closed_won" and NOT "closed_lost" (i.e., stage is one of: prospect, qualified, proposal, negotiation). Rationale: Closed deals are historical and should not appear in the active pipeline forecast.

8. **OpportunityBrand join table — additional fields?** The join table contains only opportunity_id and brand_id (no additional fields like estimated revenue per brand). Revenue attribution per brand will be handled by the Commissions feature (Feature 7). Rationale: Keeps the join table simple for now; brand-level revenue splitting adds complexity that belongs in commissions.

9. **Win/loss analytics — "top close reasons" format.** Returns the top 5 close reasons ranked by frequency, each with a count and percentage of total closed Opportunities. Applies to both won and lost reasons. Rationale: Provides actionable coaching insights without unbounded data.

## Assumptions

- Pipeline stages and their default probabilities are fixed in code (not user-configurable at runtime). If configurability is needed later, the defaults can be extracted to a database table.
- The pipeline API is backend-only for this feature. The frontend kanban board with drag-and-drop will be built in a later UI feature phase.
- Stage-change logging uses the existing AuditLog service (writeAuditLog) with entityType='Opportunity' and action='update'. This avoids modifying the ActivityType enum.
- Brand association is optional — an Opportunity can exist with zero brands.
- The rep_id on an Opportunity refers to the User who owns the deal, not necessarily the logged-in user (Managers can reassign).
- The Opportunity model includes tenantId for RLS and multi-tenant isolation, consistent with all other domain entities.
