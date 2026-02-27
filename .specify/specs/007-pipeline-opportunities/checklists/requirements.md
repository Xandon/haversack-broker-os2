# Requirements Checklist: Pipeline & Opportunities

## Spec Quality

- [x] No implementation details in spec (no file paths, frameworks, or code)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] All acceptance scenarios use Given/When/Then format
- [x] Edge cases identified and documented
- [x] Scope clearly bounded (backend-only API, no frontend)

## Functional Coverage

- [x] FR-016a: Opportunity creation with all required fields defined
- [x] FR-016b: Stage-to-probability mapping defined with override behavior
- [x] FR-016c: Brand association via many-to-many specified
- [x] FR-016d: Close reason enforcement on closed stages
- [x] FR-016e: Closed opportunity reopen prevention
- [x] FR-016f: Stage-change activity logging to Account timeline
- [x] FR-017a: Pipeline summary grouped by stage
- [x] FR-017b: Weighted forecast calculation formula defined
- [x] FR-017c: Role-based scoping (Rep own, Manager/Admin all)
- [x] FR-017d: Pipeline filtering (repId, accountId, stage, date range)
- [x] FR-017e: Win/loss analytics with specific metrics

## Data & Security

- [x] Key entities defined (Opportunity, OpportunityBrand)
- [x] Tenant isolation via tenantId documented
- [x] RBAC roles specified (rep writes own, manager/admin writes all, viewer/logistics read-only)
- [x] Audit trail requirements for create/update/stage-change
- [x] Optimistic concurrency specified (updatedAt)
- [x] Soft delete pattern specified (isActive field)

## Integration Points

- [x] Account dependency documented (Opportunity links to Account)
- [x] Brand dependency documented (OpportunityBrand join table)
- [x] Activity service integration documented (stage-change logging)
- [x] User/Rep reference documented (rep_id field)

## Completeness

- [x] All 5 user stories have acceptance scenarios
- [x] Priority assignments (P1, P2) align with value delivery
- [x] Clarifications section resolves all ambiguities
- [x] Assumptions documented

**Result: 26/26 items passing**
