# Phase 2 — PRD Creation & Refinement with UI-First Design

You are the lead product architect for this project. Your job is to produce a production-grade PRD that is specific enough for an AI coding agent to implement without ambiguity — with UI/UX as a first-class structural concern — and then PROVE it meets quality standards through automated testing.

**CRITICAL**: For web applications, the UI IS the product. UI/UX requirements are NOT an afterthought — they are section 3 of 10, positioned BEFORE the data model because UI specifications drive data model decisions. The fields a user sees on screen determine what entities and fields the data model must contain.

## Inputs

- Read all research materials in the `docs/` folder (research brief, client requirements, background docs)
- Read `CLAUDE.md` if it exists for project context and constraints
- Read any existing specs in `docs/specs/` for prior decisions

---

## Task — Three Stages

## STAGE 1: Build the Validation Framework FIRST

Before writing a single line of the PRD, create a test suite at `scripts/validate-prd.js` (Node.js) that will validate the finished PRD against all quality criteria. This is test-driven document creation — the tests define "done."

The validation script must:

1. **Parse** `docs/prd.md` as markdown and extract structured sections
2. **Run the following test categories**, reporting PASS/FAIL for each:

### Structural Tests

- [ ] All 10 required sections exist (Overview through Review Findings)
- [ ] Overview contains Problem Statement, Target Users, and Success Metrics subsections
- [ ] **UI/UX Requirements is section 3** (not section 7 or later)
- [ ] Out of Scope section is non-empty
- [ ] Open Questions section exists (even if empty, must be explicitly stated)

### Requirements Completeness Tests

- [ ] Every functional requirement follows the pattern `FR-XXX:` with sequential numbering
- [ ] Every FR has at least one acceptance criterion tagged `AC-XXXx:`
- [ ] Every acceptance criterion contains "Given," "When," and "Then" (case-insensitive)
- [ ] Every non-functional requirement follows the pattern `NFR-XXX:` with sequential numbering
- [ ] Every NFR contains at least one number, percentage, or named standard (e.g., "WCAG 2.1 AA", "200ms", "99.9%")

### Language Quality Tests

- [ ] No requirement contains subjective words without a measurable qualifier. Flag these words: "intuitive," "fast," "easy," "simple," "user-friendly," "seamless," "robust," "scalable," "flexible," "modern," "clean," "nice," "good," "efficient" — unless followed within 20 words by a number, percentage, or standard
- [ ] No requirement contains passive voice without a clear actor (scan for "should be done" / "will be handled" without specifying who/what)

### Traceability Tests

- [ ] Every FR-XXX is referenced by at least one US-XXX (cross-reference check)
- [ ] Every US-XXX references at least one FR-XXX
- [ ] Every entity name that appears in any FR or US also appears in the Data Model section
- [ ] No orphan user stories (US that doesn't trace back to an FR)
- [ ] No orphan requirements (FR that no US covers)

### UI/UX Depth Tests (NEW — webapp-critical)

- [ ] UI/UX section contains a "Page/Screen Inventory" subsection
- [ ] At least 1 page/screen is defined for every user story that has UI behavior
- [ ] Every page/screen lists its component hierarchy
- [ ] Every interactive component has an interaction pattern defined (click, hover, submit, navigate)
- [ ] At least one responsive breakpoint is specified (desktop, tablet, mobile)
- [ ] Loading states are defined per-component, not just per-page
- [ ] Error states are defined per-component, not just per-page
- [ ] Empty states are defined for every list/table/feed component
- [ ] Navigation flow connects all pages (no orphan pages)
- [ ] Every UI component traces to at least one FR
- [ ] Every user story includes a "Visual Acceptance Criteria" subsection

### Edge Case & Error Coverage Tests

- [ ] Every user story has an "Error/Edge Cases" subsection
- [ ] The UI/UX section includes: loading states, error states, empty states (check for these keywords)
- [ ] At least one NFR addresses security
- [ ] At least one NFR addresses performance with a specific response time target

### Conflict Detection Tests

- [ ] No two FRs contain contradictory language (scan for requirement pairs that reference the same entity/action with different expected outcomes — flag for review)
- [ ] Technical constraints section does not contain technologies/versions that conflict with stated FRs

### Page Coverage Tests (NEW — ensures UI pages are tracked as requirements)

- [ ] Every page in the Screen Inventory table has a corresponding FR (either FR-XXX or FR-PXXX)
- [ ] Every page FR has acceptance criteria for: renders correctly, loads data, handles loading state, handles error state, handles empty state
- [ ] Every component referenced in Screen Inventory's "Key Components" column is defined in the Component Hierarchy subsection
- [ ] No orphan pages (pages in Screen Inventory that have no corresponding FR)

### Metrics & Measurability Tests

- [ ] Success metrics in Overview section each contain at least one number or percentage
- [ ] Coverage ratio: count of acceptance criteria / count of functional requirements >= 1.5
- [ ] Total FR count >= 5 (sanity check)
- [ ] Total US count >= 3 (sanity check)

### Output Format

The script should output:

```
==================================================
  PRD VALIDATION REPORT
==================================================
  Structural Tests:           8/8    PASS
  Requirements Completeness:  5/5    PASS
  Language Quality:            2/2    PASS
  Traceability:                5/5    PASS
  UI/UX Depth:                11/11  PASS
  Edge Case Coverage:          4/4    PASS
  Conflict Detection:          2/2    PASS
  Metrics & Measurability:     4/4    PASS
==================================================
  TOTAL:                      41/41  ALL PASS
==================================================

  Summary:
  - Functional Requirements: [count]
  - Non-Functional Requirements: [count]
  - User Stories: [count]
  - Acceptance Criteria: [count]
  - AC/FR Ratio: [number]
  - Data Model Entities: [count]
  - Pages/Screens: [count]
  - UI Components: [count]
  - Open Questions: [count]
  - Human Decisions Needed: [count]

  WARNINGS:
  - [any non-blocking issues]

  FAILURES:
  - [any blocking issues with line numbers]
```

If any test FAILS, exit with code 1. If all pass, exit with code 0.

Install any dependencies needed (e.g., `unified`, `remark-parse`, or simply use regex-based parsing — keep it pragmatic).

**Run the test suite against an empty/nonexistent file first to confirm all tests correctly report FAIL. This validates the tests themselves.**

---

## STAGE 2: Generate the PRD Using Agent Teams

Now build the PRD. Use agent teams to parallelize the work:

### Agent 1 — Requirements Analyst

- Role: Extract and formalize every functional and non-functional requirement from the research materials
- Output: Numbered FR-xxx and NFR-xxx requirements, each with measurable acceptance criteria
- Rule: No requirement may use subjective language without a measurable definition
- Rule: Every requirement must have at least one acceptance criterion in Given/When/Then format

### Agent 2 — Technical Architect

- Role: Define the data model, technical constraints, integration points, and system boundaries
- Output: Entity definitions with field types, relationships, cardinality, validation rules, API contracts, browser/platform support matrix
- Rule: Every entity referenced in any requirement must appear in the data model
- Rule: Flag any technical constraint that conflicts with a functional requirement

### Agent 3 — User Story Writer

- Role: Translate requirements into user stories with acceptance criteria
- Output: Numbered US-xxx user stories with Given/When/Then acceptance criteria
- Rule: Every FR must map to at least one US
- Rule: Every US must define error/edge case behavior, not just the happy path
- **Rule: Every US must include a "Visual Acceptance Criteria" subsection describing what the user SEES at each step**

### Agent 4 — UI/Design Architect (NEW)

- Role: Design the complete UI structure for the application
- Output: Complete UI/UX Requirements section (section 3) containing:
  - **Page/Screen Inventory**: Every distinct view in the application
  - **Component Hierarchy**: For each page, the tree of UI components
  - **Interaction Patterns**: What happens on click, hover, submit, navigate for every interactive element
  - **Responsive Behavior**: How each page adapts at desktop (>=1024px), tablet (768-1023px), and mobile (<768px)
  - **Loading States**: Per-component loading indicators
  - **Error States**: Per-component error displays (validation errors, network errors, permission errors)
  - **Empty States**: For every list, table, feed, or collection component
  - **Navigation Flow**: How users move between pages (textual description)
  - **Accessibility**: Keyboard navigation, ARIA landmarks, focus management, color contrast requirements
- Rule: Every UI component must trace to at least one FR
- Rule: UI spec must be detailed enough to build a static mockup without any backend
- **Rule: Agent 4 runs AFTER Agents 1-3** (references their outputs) but BEFORE Agent 5

### Agent 5 — QA & Consistency Reviewer

- Role: Review combined output from Agents 1-4. Identify conflicts, gaps, ambiguities, and untestable requirements
- Output: "Review Findings" appendix with issues categorized as [CONFLICT], [GAP], [AMBIGUITY], or [UNTESTABLE]
- Rule: Every finding must reference specific requirement numbers
- Rule: Resolve all clear issues directly in the PRD. Flag items needing human input with `<!-- HUMAN DECISION NEEDED: [description] -->`

### PRD Structure (Required)

```markdown
# [Project/Feature Name] — Product Requirements Document

## 1. Overview

- Problem statement
- Target users
- Success metrics (quantifiable with specific numbers)

## 2. Functional Requirements

- FR-001: [Requirement]
  - AC-001a: Given [context], when [action], then [result]
  - AC-001b: ...

## 3. UI/UX Requirements

### 3.1 Page/Screen Inventory

| Page   | URL/Route | Purpose        | Key Components   | FR      |
| ------ | --------- | -------------- | ---------------- | ------- |
| [name] | [path]    | [what it does] | [component list] | FR-PXXX |

**IMPORTANT**: Every page in this inventory MUST have a corresponding FR (FR-PXXX series for page-level requirements). Each page FR MUST include acceptance criteria for: renders correctly, loads data via hooks, handles loading state (skeleton), handles error state (boundary), handles empty state, and navigation works (breadcrumbs, sidebar).

### 3.2 Component Hierarchy

#### [Page Name]

- Layout wrapper
  - Header (navigation, user menu)
  - Main content area
    - [Component A] — [purpose]
    - [Component B] — [purpose]
  - Footer

### 3.3 Interaction Patterns

| Component | Trigger            | Action         | Result                 |
| --------- | ------------------ | -------------- | ---------------------- |
| [name]    | click/hover/submit | [what happens] | [visual + data result] |

### 3.4 Responsive Behavior

| Page   | Desktop (>=1024px) | Tablet (768-1023px) | Mobile (<768px) |
| ------ | ------------------ | ------------------- | --------------- |
| [name] | [layout]           | [layout]            | [layout]        |

### 3.5 Component States

| Component | Default | Loading | Error  | Empty  | Disabled |
| --------- | ------- | ------- | ------ | ------ | -------- |
| [name]    | [desc]  | [desc]  | [desc] | [desc] | [desc]   |

### 3.6 Navigation Flow

[Describe how users move between pages: entry points, transitions, back navigation, deep links]

### 3.7 Accessibility Requirements

- Keyboard navigation: [requirements]
- Screen reader support: [ARIA landmarks, live regions]
- Color contrast: [WCAG level]
- Focus management: [tab order, focus trapping for modals]

## 4. Non-Functional Requirements

- NFR-001: [Requirement with measurable target]

## 5. Technical Constraints

- Required tech stack and versions
- Integration points
- Hard constraints

## 6. User Stories

- US-001: As a [role], I want to [action] so that [benefit]
  - Acceptance Criteria:
    - Given [context], when [action], then [result]
  - Visual Acceptance Criteria:
    - User sees [specific UI element/state] when [condition]
    - [Component X] displays [data] in [format]
  - Error/Edge Cases:
    - Given [edge case], when [action], then [result]
  - Traceability: FR-001, FR-003

## 7. Data Model

- Entity definitions with field types
- Relationships and cardinality
- Validation rules

## 8. Out of Scope

- What this version does NOT include

## 9. Open Questions

- Items requiring human decision

## 10. Review Findings

- Categorized findings with resolution status
```

Save to `docs/prd.md`. Archive any prior version to `docs/prd-archive/prd-[date].md`.

---

## STAGE 3: Run Validation, Fix, Repeat

After saving the PRD:

1. **Run** `node scripts/validate-prd.js`
2. **If any tests fail:**
   - Read the failure report
   - Fix the specific issues in `docs/prd.md`
   - Run validation again
   - Repeat until ALL tests pass (max 5 iterations — if still failing after 5, stop and report remaining issues)
3. **If all tests pass:**
   - Print the full validation report
   - Print a summary: total requirements, user stories, acceptance criteria, AC/FR ratio, pages/screens, UI components, open questions, and human decisions needed
   - Confirm: "PRD validated and ready for Phase 3 — Spec-Kit breakdown (`/workflow-speckit`)"

**Do not consider Stage 2 complete until Stage 3 reports all tests passing.**

---

## Bonus: Add a Git Hook

After validation passes, create a pre-commit hook that runs the PRD validator whenever `docs/prd.md` is modified:

```bash
# .git/hooks/pre-commit (append to existing or create)
if git diff --cached --name-only | grep -q "docs/prd.md"; then
  echo "PRD modified — running validation..."
  node scripts/validate-prd.js
  if [ $? -ne 0 ]; then
    echo "PRD validation FAILED. Fix issues before committing."
    exit 1
  fi
fi
```

Make executable: `chmod +x .git/hooks/pre-commit`
