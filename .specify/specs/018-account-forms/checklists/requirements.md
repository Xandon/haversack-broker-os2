# Requirements Checklist: Account Forms (F-002c)

## Specification Quality

- [x] No implementation details in spec — spec describes what, not how
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] All acceptance scenarios use Given/When/Then format
- [x] Edge cases identified (5 edge cases documented)
- [x] Scope clearly bounded (2 pages, no backend changes)

## Functional Coverage

- [x] FR-035a: Account creation form with Zod validation — covered by US-1 AC-1
- [x] FR-035b: Account edit form pre-populated — covered by US-2 AC-1
- [x] FR-035c: Duplicate detection on name blur — covered by US-1 AC-2
- [x] FR-035d: Territory scoping by role — covered by US-1 AC-3
- [x] FR-035e: Navigation + success toast — covered by US-1 AC-1, US-2 AC-2
- [x] FR-035f: Inline field validation — covered by US-1 AC-4
- [x] FR-035g: Inline primary contact — covered by US-1 AC-1

## Dependency Verification

- [x] F-000 (Design System) — COMPLETE
- [x] F-002a (Account List) — COMPLETE
- [x] F-002b (Account Detail) — COMPLETE (provides Edit button and ContactsTab)
- [x] Backend APIs — All 3 endpoints exist and tested
- [x] Shared schemas — All schemas exist in `packages/shared`

## Acceptance Criteria Ratio

- FRs: 7
- ACs: 8 (across 2 user stories)
- AC/FR ratio: 1.14 (acceptable for frontend-only feature with existing backend)
