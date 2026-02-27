# Requirements Checklist: Commissions (008)

## Spec Quality

- [x] No implementation details in spec (no mention of specific tables, columns, or frameworks)
- [x] All requirements use "MUST" language and are testable
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Spec status is "Draft" (pre-implementation)

## User Stories

- [x] Each user story has a clear actor, action, and goal
- [x] Each user story has a priority level (P1/P2)
- [x] Each user story has an "Independent Test" section
- [x] Each user story has at least 3 acceptance scenarios with Given/When/Then
- [x] P1 stories can be implemented independently
- [x] User stories are ordered by dependency (rules -> calculation -> statements -> approval -> export)

## Functional Requirements

- [x] FR-020 is referenced by at least one user story (US-1, US-2)
- [x] FR-021 is referenced by at least one user story (US-3, US-4)
- [x] FR-022 is referenced by at least one user story (US-5)
- [x] All FRs have matching acceptance criteria from the PRD (AC-020a, AC-020b, AC-021a, AC-021b, AC-022a, AC-022b)
- [x] No orphan FRs (every FR is testable via acceptance scenarios)

## Success Criteria

- [x] SC-001 through SC-006 are measurable (contain specific numbers or conditions)
- [x] SC-001 through SC-006 are technology-agnostic
- [x] Performance criteria align with global NFRs (200ms p95, 50ms DB)

## Edge Cases

- [x] Rate change mid-month is handled (applies rate effective on order confirmation date)
- [x] Territory transfer mid-month is handled (original modifier for pre-transfer orders)
- [x] Order cancellation pre- and post-approval handled differently
- [x] Missing commission rule for brand is handled (exclusion + warning log)
- [x] Volume tier boundaries are explicitly defined (half-open intervals)
- [x] Concurrent approval is handled (optimistic concurrency)
- [x] Zero-commission entries are handled (audit trail completeness)

## Scope Boundaries

- [x] Feature is scoped to backend API + worker jobs (no frontend pages in this feature)
- [x] QuickBooks integration is CSV export only (no direct API integration)
- [x] Dispute resolution is API-only (UI will be added in frontend features)
- [x] Commission applies only to broker-model orders (wholesale excluded)

## Validation Result

**24/24 items passing** — All checklist items verified.
