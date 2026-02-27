# Feature Specification: Commissions

**Feature Branch**: `008-commissions`
**Created**: 2026-02-26
**Status**: Draft
**Input**: Commission rule configuration, automated calculation, and monthly statement generation (FR-020, FR-021, FR-022)

## User Scenarios & Testing

### User Story 1 - Commission Rule Configuration (Priority: P1)

As an **administrator**, I want to configure commission rules per brand with base rates, territory modifiers, and volume tiers, so that the system can calculate Rep commissions accurately based on the business's current compensation structure.

**Why this priority**: Commission rules are the foundation for all commission calculations. Without configurable rules, no commissions can be computed. This must exist before any other commission feature works.

**Independent Test**: Can be fully tested by creating, updating, and reading commission rules via the API and verifying rule data persists correctly with audit trail.

**Acceptance Scenarios**:

1. **Given** an Admin is authenticated, **When** the Admin creates a commission rule for brand "Mountain Meadow Farms" with base rate 10%, territory modifier 1.0x, and 3 volume tiers (0-$10K base, $10K-$25K base+1%, $25K+ base+2%), **Then** the system stores the rule with all parameters, records the effective date, and writes an audit trail entry.
2. **Given** a commission rule exists for brand "Pacific Preserves" at 10%, **When** the Admin updates the rate to 12% effective 2026-04-01, **Then** the system creates a new rule version with the new rate and effective date, preserving the previous rule version for historical calculations.
3. **Given** multiple commission rules exist, **When** a Rep or Manager queries the rules for a specific brand, **Then** the system returns the currently effective rule based on today's date.
4. **Given** a commission rule has volume tiers configured, **When** the Admin lists rules, **Then** each rule displays its base rate, territory modifier, volume tier thresholds, and effective date range.

---

### User Story 2 - Commission Calculation (Priority: P1)

As the **system**, when a broker-model order is confirmed, I need to calculate the Rep's commission for each line item using the applicable commission rule (base rate + territory modifier + volume tier), so that commissions are computed deterministically with a full audit trail.

**Why this priority**: Automated calculation is the core value proposition — replacing manual spreadsheet-based commission tracking. Every downstream feature (statements, approvals, exports) depends on accurate calculations.

**Independent Test**: Can be fully tested by creating confirmed broker orders and verifying that the commission engine produces the correct amounts based on configured rules, with every calculation logged.

**Acceptance Scenarios**:

1. **Given** a confirmed broker order line item of $12,000 for brand "Mountain Meadow Farms" (base rate 10%, territory modifier 1.0x, volume tier 2: +1%), **When** the commission engine processes the order, **Then** the system calculates the commission as $12,000 * 11% * 1.0x = $1,320 and records the calculation with rule applied, rate used, and resulting amount (AC-020a).
2. **Given** an Admin changed the commission rate for brand "Pacific Preserves" from 10% to 12% effective 2026-04-01, **When** orders confirmed before 2026-04-01 are processed, **Then** those orders use the 10% rate, and orders confirmed on or after 2026-04-01 use the 12% rate (AC-020b).
3. **Given** a confirmed order has 3 line items across 2 brands (2 broker, 1 wholesale), **When** the commission engine processes the order, **Then** only the 2 broker line items generate commission entries; the wholesale line item is excluded.
4. **Given** a commission calculation is performed, **When** the calculation completes, **Then** the system logs the rule ID, base rate, territory modifier, tier applied, effective rate, line item total, and computed commission amount in the audit trail.

---

### User Story 3 - Monthly Statement Generation (Priority: P1)

As the **system**, on the 1st of each month, I need to generate commission statements for each Rep aggregating all confirmed broker order commissions from the prior month, so that Reps can review their earnings and Managers can approve them.

**Why this priority**: Monthly statements are the primary way Reps verify their earnings and the gateway to the approval/export workflow. Without statements, there is no manageable view of commissions.

**Independent Test**: Can be fully tested by triggering statement generation for a given month/year and verifying the resulting statement contains the correct order breakdown, totals, and YTD figures.

**Acceptance Scenarios**:

1. **Given** it is 2026-04-01 and the March 2026 commission cycle closes, **When** the system generates statements (nightly batch), **Then** each Rep receives a commission statement listing all confirmed broker orders from March 2026 with status "Pending" and the statement is visible via the API (AC-021a).
2. **Given** a Rep has 5 confirmed broker orders in March 2026 across 3 brands, **When** the statement is generated, **Then** it shows order-by-order breakdown with order number, account name, brand, line item total, commission rate, commission amount, plus total earned and YTD total (FR-021).
3. **Given** a Rep has no confirmed broker orders in a given month, **When** the statement generation runs, **Then** the system generates a zero-amount statement for that Rep (every active Rep gets a monthly statement).
4. **Given** a mid-month request for the current month's commissions, **When** a Rep queries their current month, **Then** the system returns a partial statement labeled "In Progress" with commissions computed so far.

---

### User Story 4 - Statement Approval Workflow (Priority: P1)

As a **sales manager**, I want to review and approve monthly commission statements for my team, so that commissions can be finalized and exported for payment.

**Why this priority**: Approval is a critical business control — commissions must not be paid without Manager sign-off. This gates the export to QuickBooks.

**Independent Test**: Can be fully tested by creating pending statements and executing the approve/reject workflow via the API, verifying status transitions and audit trail entries.

**Acceptance Scenarios**:

1. **Given** a Manager is authenticated and a Rep's March 2026 statement has status "Pending", **When** the Manager approves the statement, **Then** the status changes to "Approved", the approval timestamp and approver ID are recorded in the audit trail, and the Rep receives a notification (AC-021b).
2. **Given** a statement has a disputed line item, **When** the Manager attempts to approve, **Then** the system rejects the approval with "Cannot approve statement with unresolved disputes" and lists the disputed items.
3. **Given** a Manager is reviewing statements, **When** the Manager queries pending statements, **Then** the system returns all statements for Reps in the Manager's territory with status "Pending", sorted by Rep name.
4. **Given** a Manager approves a statement, **When** the approval is recorded, **Then** the statement becomes immutable — no further edits to commission amounts are permitted.

---

### User Story 5 - QuickBooks Commission Export (Priority: P2)

As an **administrator**, I want to export approved commission statements to a QuickBooks-compatible format, so that the accounting team can process commission payments without manual data entry.

**Why this priority**: Export is the final step in the commission lifecycle but depends on statements being approved first. It is essential for business operations but not needed until the core calculation and approval flow works.

**Independent Test**: Can be fully tested by creating approved statements and triggering the export, then verifying the output file format, content accuracy, and export log.

**Acceptance Scenarios**:

1. **Given** 5 approved commission statements exist for March 2026, **When** the Admin triggers "Export to QuickBooks", **Then** the system generates a QuickBooks-compatible CSV containing all 5 statements with Rep name, period "March 2026", and total commission amounts matching the approved totals (AC-022a).
2. **Given** a commission export succeeds, **When** the Admin views the export log, **Then** each exported statement shows status "Exported", the export timestamp, and an export reference ID (AC-022b).
3. **Given** some statements are "Pending" and some are "Approved" for March 2026, **When** the Admin triggers export, **Then** only "Approved" statements are included in the export; "Pending" statements are excluded with a summary noting how many were skipped.
4. **Given** a statement has already been exported, **When** the Admin triggers export again for the same period, **Then** the system warns "These statements have already been exported" and requires explicit confirmation to re-export.

---

### User Story 6 - Commission Dispute Resolution (Priority: P2)

As a **territory representative**, I want to flag a commission line item as disputed if I believe the amount is incorrect, so that the discrepancy can be investigated before the statement is approved.

**Why this priority**: Disputes are an edge case in the normal flow but are essential for Rep trust and accuracy. They block statement approval, making them a necessary safety valve.

**Independent Test**: Can be fully tested by creating a pending statement, flagging a line item as disputed, verifying the statement cannot be approved, resolving the dispute, and then approving.

**Acceptance Scenarios**:

1. **Given** a Rep is viewing their pending commission statement, **When** the Rep flags a line item as disputed with a reason, **Then** the system adds a "Disputed" tag to the line item, records the dispute reason and timestamp, and notifies the Manager.
2. **Given** a statement has a disputed line item, **When** the Manager resolves the dispute (accepts original amount or adjusts), **Then** the dispute is marked "Resolved", the resolution is recorded in the audit trail, and the statement can now be approved.
3. **Given** a Manager adjusts a disputed commission amount, **When** the adjustment is saved, **Then** the system records both the original and adjusted amounts, the reason for adjustment, and recalculates the statement total.

---

### Edge Cases

- Commission rate changed mid-month: system applies the rate effective on the order confirmation date, not the statement generation date.
- Rep transferred between territories mid-month: commissions for orders confirmed before transfer use the original territory modifier; orders after transfer use the new territory modifier.
- Order cancelled after commission calculated: if the order is cancelled before statement approval, the commission entry is reversed with a negative entry and explanation. If cancelled after approval, a credit memo is created for the next period.
- Brand has no commission rule configured: system excludes the brand from commission calculations and logs a warning "No commission rule found for brand {name}".
- Volume tier boundary: a $10,000 order exactly hits the tier 1 ceiling — system applies tier 1 rate (tier boundaries are inclusive on the lower end, exclusive on the upper end: [0, $10K), [$10K, $25K), [$25K, +inf)).
- Concurrent statement approval: if two Managers attempt to approve the same statement simultaneously, optimistic concurrency control prevents double-approval.
- Zero-commission line item: a brand with 0% base rate still generates a commission entry (for $0) to maintain a complete audit trail.

## Clarifications

1. **Commission calculation trigger**: Commission entries are created when an order is confirmed (event-driven via BullMQ job), not during statement generation. Statement generation aggregates existing CommissionEntry records for the month. **Rationale**: Event-driven ensures commissions are visible immediately after order confirmation, not delayed until month-end.

2. **Volume tier scope**: Volume tiers are evaluated per-line-item amount, not cumulative across the month or quarter. The PRD example (AC-020a) calculates on a single $12,000 line item. **Rationale**: PRD explicitly demonstrates tier lookup against a single line item total.

3. **Commission formula**: `commission = line_item_total * (base_rate + tier_bonus) * territory_modifier`. Volume tier adds a percentage bonus to the base rate, then the combined rate is multiplied by the territory modifier. **Rationale**: Matches the PRD calculation in AC-020a ($12,000 * 11% * 1.0x = $1,320).

4. **CommissionRule scoping**: Rules are per-brand with an optional territory_id. If territory_id is null, the rule is the default for all territories. If territory_id is set, it overrides the default for that specific territory. Rule lookup: find territory-specific rule first, fall back to default. **Rationale**: Supports the 9-territory structure with brand-specific overrides without requiring N*M rule entries.

5. **Statement generation schedule**: BullMQ cron job runs on the 1st of each month at 02:00 UTC. Admin can also trigger statement generation manually for any month/year via API. **Rationale**: PRD specifies "nightly batch" on cycle close; manual trigger supports ad-hoc needs.

6. **Statement status flow**: Pending -> Approved -> Exported -> Paid. Transitions are one-way only. "Paid" is set manually by Admin after confirming payment was processed externally. **Rationale**: PRD lists all four statuses (Pending, Approved, Paid); adding Exported tracks the QuickBooks export step.

7. **YTD calculation**: Calendar year (January-December). YTD total on a March statement includes January + February + March commissions. **Rationale**: Standard business practice; PRD does not specify fiscal year.

8. **Order cancellation handling**: If cancelled before statement approval, a negative CommissionEntry (type "reversal") is created referencing the original entry. If cancelled after statement approval, a credit entry is added to the next month's statement. **Rationale**: Maintains immutability of approved statements while ensuring accurate accounting.

9. **Territory modifier source**: Stored on the CommissionRule entity, not derived from the territory. Each rule carries its own modifier. **Rationale**: Allows fine-grained control per brand-territory combination without coupling to territory metadata.

## Requirements

### Functional Requirements

- **FR-020**: System MUST calculate Rep commissions for each confirmed broker-model order line item based on configurable commission rules: base rate per brand (8-15%), territory modifier (multiplier 0.8-1.2x), and volume tier thresholds (tier 1: $0-$10K at base rate, tier 2: $10K-$25K at base +1%, tier 3: $25K+ at base +2%).
- **FR-021**: System MUST generate monthly commission statements for each Rep showing: order-by-order breakdown (order number, account, brand, line item total, commission rate, commission amount), total earned commissions, approval status (Pending, Approved, Paid), and a running year-to-date total.
- **FR-022**: System MUST export approved commission data to QuickBooks in a format compatible with QuickBooks payroll or accounts payable, including Rep name, pay period, total commission amount, and line-item detail.

### Key Entities

- **CommissionRule**: Defines commission parameters for a brand — base rate, territory modifier, volume tier thresholds. Has effective dates for versioning. One active rule per brand at a time.
- **CommissionEntry**: A single calculated commission for one order line item. Stores the rule ID, rates applied, and computed amount. Immutable once created (corrections create new entries).
- **CommissionStatement**: Monthly aggregation of commission entries for a Rep. Tracks status (Pending, Approved, Paid, Exported), total earned, YTD running total.
- **CommissionDispute**: A Rep-initiated flag on a commission entry within a statement. Blocks approval until resolved.
- **CommissionExport**: Record of a QuickBooks export event. Tracks which statements were included, export format, timestamp, and reference ID.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Commission calculations produce deterministic results — the same order + rule inputs always yield the same commission amount.
- **SC-002**: Every commission calculation is logged with the rule applied, rate used, tier matched, and resulting amount (full audit trail).
- **SC-003**: Monthly statements are generated within 60 seconds for all 9 Reps.
- **SC-004**: Statement approval/rejection completes within 200ms (API p95).
- **SC-005**: QuickBooks export generates a valid CSV file for up to 50 statements in under 5 seconds.
- **SC-006**: Commission rule effective date logic correctly applies historical rates to orders confirmed before a rate change.
