# Phase 3 — Spec-Driven Breakdown with Spec-Kit (Vertical-Slice Architecture)

You are the lead specification architect. Your job is to transform the validated PRD at `docs/prd.md` into a complete set of spec-kit artifacts that are precise enough to drive implementation — and then PROVE at every step that the process was followed correctly and the outputs meet quality standards.

**CRITICAL**: This phase follows the Spec-Kit (github.com/github/spec-kit) methodology precisely. Spec-Kit uses a Spec-Driven Development (SDD) flow with specific artifact outputs at each stage. Do NOT deviate from this process.

**CRITICAL — VERTICAL SLICES**: Tasks MUST be organized as vertical slices, NOT horizontal layers. Each slice delivers ONE user-visible capability spanning data + logic + UI. You MUST NOT create task orderings that build all backend before any UI. For web applications, every slice must include UI work so the feature can be verified in a browser.

## Inputs

- Read `docs/prd.md` (required — must exist from Phase 2)
- Read `CLAUDE.md` if it exists
- Read any research materials in `docs/`

## Prerequisites

Ensure spec-kit is initialized. If `.specify/` does not exist:

```bash
# Install if needed
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
# Initialize for Claude Code
specify init . --ai claude --force
```

If spec-kit is already initialized, verify the `.specify/` directory contains `memory/`, `scripts/`, `templates/`, and `specs/` subdirectories. Read the templates at `.specify/templates/spec-template.md`, `.specify/templates/plan-template.md`, and `.specify/templates/tasks-template.md` to understand the exact output format required.

---

## MASTER TASK — Five Stages

```
STAGE 1: Build ALL validation tests first (TDD for specs)
STAGE 2: Generate spec-kit artifacts step-by-step with per-step validation
STAGE 3: Run full-chain validation across all artifacts
STAGE 4: Fix-and-revalidate loop until all tests pass
STAGE 5: Git hooks and artifact protection
```

---

## STAGE 1: Build the Complete Validation Framework

Before generating a single artifact, create the ENTIRE test suite. This is TDD for specifications — the tests define "done" for every step.

Create `scripts/validate-speckit.js` (Node.js). This single script must support two modes:

```bash
# Validate a single step's output
node scripts/validate-speckit.js --step constitution
node scripts/validate-speckit.js --step specify
node scripts/validate-speckit.js --step plan
node scripts/validate-speckit.js --step analyze
node scripts/validate-speckit.js --step tasks
node scripts/validate-speckit.js --step checklist

# Validate the entire artifact chain
node scripts/validate-speckit.js --all
```

The `--step` mode is used after each step in Stage 2 to gate progression. The `--all` mode is used in Stage 3 for full-chain validation.

### Test Categories by Step

#### STEP 1 Tests: Constitution (`.specify/memory/constitution.md`)

```
TEST-C01: File exists and is non-empty
TEST-C02: Contains at least 3 distinct principles or articles
TEST-C03: Every principle uses imperative language (MUST, MUST NOT, SHALL, SHALL NOT)
TEST-C04: Principles cover code quality (scan for keywords: style, lint, format, naming)
TEST-C05: Principles cover testing (scan for: test, TDD, coverage, assertion)
TEST-C06: Principles cover architecture (scan for: module, boundary, dependency, layer, separation)
TEST-C07: No two principles contradict each other (flag pairs that reference the same domain with opposing directives)
TEST-C08: If CLAUDE.md exists, its MUST/MUST NOT rules appear in constitution (cross-reference check)
```

#### STEP 2 Tests: Specification (`.specify/specs/[feature-dir]/spec.md`)

**Structural tests:**
```
TEST-S01: File exists in a correctly numbered feature directory (NNN-feature-name/)
TEST-S02: Contains required sections: Feature Overview, User Stories, Functional Requirements, Non-Functional Requirements, UI Component Specifications, Out of Scope
TEST-S03: Contains a "Review & Acceptance Checklist" section
TEST-S04: Checklist items are checked off (marked complete), not left blank
```

**User Story tests:**
```
TEST-S05: At least 3 user stories exist
TEST-S06: Every user story has a priority level (P1, P2, or P3)
TEST-S07: Every user story has a plain-language "Description" section
TEST-S08: Every user story has a "Why this priority" rationale
TEST-S09: Every user story has an "Independent Test" description
TEST-S10: Every user story has at least 1 acceptance scenario in Given/When/Then format
TEST-S11: Total acceptance scenarios >= (user story count x 1.5)
TEST-S12: Every user story has "Visual Acceptance Criteria" describing what the user sees
```

**Functional Requirements tests:**
```
TEST-S13: At least 5 functional requirements exist
TEST-S14: Every FR follows pattern: FR-XXX: System MUST/MUST NOT [action]
TEST-S15: FRs are sequentially numbered with no gaps
TEST-S16: No FR uses subjective language without measurable definition
```

**UI Component Specifications tests (NEW):**
```
TEST-S28: spec.md contains a "UI Component Specifications" section
TEST-S29: Every UI component references at least one FR
TEST-S30: Every user story with visual acceptance criteria has at least one corresponding UI component specification
TEST-S31: Every UI component specifies: name, props/data, visual states (default, loading, error, empty), interaction behavior
```

**Edge case and error coverage tests:**
```
TEST-S17: Spec contains at least 2 edge case/error scenario FRs (scan for: "error", "fail", "invalid", "boundary", "edge case", "when [X] is empty", "when [X] does not exist")
TEST-S18: At least one NFR addresses security
TEST-S19: At least one NFR addresses performance with a specific metric
```

**Clarification tests:**
```
TEST-S20: Zero unresolved [NEEDS CLARIFICATION] markers remain
TEST-S21: If a "Clarifications" section exists, every entry references a specific FR or US number
```

**Traceability tests:**
```
TEST-S22: Every FR-XXX is referenced by at least one user story's acceptance criteria or description
TEST-S23: Every user story references or covers at least one FR
TEST-S24: No orphan FRs (FRs that no user story addresses)
```

**Separation of concerns test:**
```
TEST-S25: Spec contains NO tech stack references (scan for framework names, language names, database names, library names — these belong in plan.md, not spec.md)
  EXCEPTION: references inherited from PRD technical constraints section are acceptable if quoted as constraints
```

**PRD alignment tests:**
```
TEST-S26: Every FR-XXX in docs/prd.md has a corresponding FR or US in spec.md (cross-reference: no PRD requirement was dropped)
TEST-S27: Out of Scope section exists and is non-empty
TEST-S28b: No out-of-scope item appears as an FR or user story (nothing excluded was accidentally included)
```

#### STEP 3 Tests: Plan & Supporting Artifacts

**plan.md tests:**
```
TEST-P01: File exists in same feature directory as spec.md
TEST-P02: Contains Tech Stack Summary with all required fields: Language/Version, Primary Dependencies, Storage, Testing framework, Target Platform, Project Type, UI Framework, CSS Approach, Component Testing Library
TEST-P03: No field contains placeholder text ([NEEDS CLARIFICATION], [e.g., ...], [TBD], template brackets)
TEST-P04: Contains numbered Implementation Phases organized as VERTICAL SLICES (not horizontal layers)
TEST-P05: Each phase references specific spec requirements (FR-XXX or US-XXX)
TEST-P06: Contains a Project Structure section with directory layout including frontend directories
TEST-P07: Tech stack choices do not conflict with NFRs in spec.md
```

**research.md tests:**
```
TEST-P08: File exists in feature directory
TEST-P09: Every technology/library listed in plan.md's Tech Stack Summary has a corresponding entry in research.md
TEST-P10: Research entries include version numbers (not just library names)
TEST-P11: Research entries include rationale (why this choice over alternatives)
```

**data-model.md tests:**
```
TEST-P12: File exists in feature directory
TEST-P13: Every entity referenced in any FR or user story appears in the data model (cross-reference: extract nouns from FRs, verify they appear as entities)
TEST-P14: Every entity has field definitions with types
TEST-P15: Relationships and cardinality are specified for entity pairs
TEST-P16: Validation rules are defined for fields that have constraints referenced in FRs
```

**quickstart.md tests:**
```
TEST-P17: File exists in feature directory
TEST-P18: Contains at least one validation scenario
TEST-P19: Scenarios reference specific user stories or FRs
```

**contracts/ tests:**
```
TEST-P20: If any FR or user story references an API, REST, endpoint, or webhook: contracts/ directory exists with at least one file
TEST-P21: If contracts/ exists: contract files define endpoints that map to API-related FRs
TEST-P22: If no API references exist in spec: this test is skipped (N/A)
```

**Constitutional compliance tests:**
```
TEST-P23: Plan decisions do not violate constitutional principles (cross-reference: for each MUST NOT in constitution, verify plan doesn't include the prohibited pattern)
TEST-P24: If constitution mandates TDD: plan.md mentions test-first approach or TDD in its implementation phases
```

#### STEP 4 Tests: Cross-Artifact Analysis

```
TEST-A01: Full traceability chain exists for every FR:
          FR in spec.md -> phase in plan.md -> entity in data-model.md
          (minimum 80% of FRs must have complete chain)
TEST-A02: Full traceability chain exists for every User Story:
          US in spec.md -> phase in plan.md -> future task group
TEST-A03: No entity in data-model.md is orphaned
          (every entity is referenced by at least one FR or US)
TEST-A04: Out-of-scope items from spec.md do not appear in plan.md as planned work
TEST-A05: research.md technology choices match plan.md technology choices
          (no stale or contradictory research)
TEST-A06: quickstart.md scenarios are achievable with the plan.md architecture
          (scenarios don't reference components not in the plan)
```

#### STEP 5 Tests: Tasks (`.specify/specs/[feature-dir]/tasks.md`)

**Structural tests:**
```
TEST-T01: File exists in same feature directory
TEST-T02: Tasks are grouped by User Story (section headers reference US-XXX or "User Story N")
TEST-T03: A "Foundational" or "Setup" task group exists before user story task groups
TEST-T04: Total task count >= (FR count x 1.5)
```

**Task quality tests:**
```
TEST-T05: Every task includes at least one file path
TEST-T06: Parallel tasks are marked with [P]
TEST-T07: Story ownership is marked (each task links to a US)
TEST-T08: No two tasks specify the same file path for creation (unless one is test and one is implementation)
TEST-T09: Checkpoint validation markers exist between task groups (scan for "Checkpoint:" followed by what to validate)
```

**Vertical Slice ordering tests (REPLACES old backend-first TEST-T11):**
```
TEST-T11: Tasks within each user story group are organized into named
          vertical slices. Each slice delivers ONE user-visible capability
          spanning data + logic + UI. Within a slice, data tasks precede
          logic tasks, and logic tasks precede UI tasks. But each slice
          MUST be complete (including UI) before the next slice begins.
          VALIDATION: scan task groups — if a task group contains model/schema
          tasks and API tasks but NO UI/component/page tasks, FAIL
          (unless the user story is explicitly marked as non-visual).

TEST-T12: Test tasks appear before their corresponding implementation tasks
          IF constitution mandates TDD. (If no TDD mandate, test tasks may
          appear after — just verify tests exist for each implementation task)

TEST-T18: Every vertical slice ends with a checkpoint marker:
          "Checkpoint: visual-verify [page/component name]"
          At least one visual verification checkpoint exists per user story.

TEST-T19: Every user story with visual acceptance criteria MUST contain
          at least one UI component task. No user story may consist only
          of backend tasks if the spec has UI components for that story.
```

**Dependency order tests (revised):**
```
TEST-T10: Setup/foundational tasks appear before user story tasks
TEST-T13: Within a vertical slice: data/schema tasks appear before service
          tasks that use them; service tasks appear before UI tasks that
          call them. But the ENTIRE slice (including UI) completes before
          the next slice begins.
```

**Security tests (NEW):**
```
TEST-SEC01: Every API endpoint task includes a corresponding authorization test task
TEST-SEC02: No API response task includes fields not referenced by the UI component
            that consumes it (prevent over-fetching — cross-reference UI component
            props with API response fields)
```

**Traceability tests:**
```
TEST-T14: Every task references at least one FR or US
TEST-T15: Every FR in spec.md is covered by at least one task
TEST-T16: Every US in spec.md is covered by at least one task group
TEST-T17: No task references an FR or US that doesn't exist in spec.md
```

---

## STAGE 2: Generate Spec-Kit Artifacts Step-by-Step

For each step, use the appropriate spec-kit slash command, then run validation before proceeding.

### Step 1: Constitution (`/speckit.constitution`)

Define the project's development principles — the "north star" that every spec must respect. Include:
- Code style and formatting rules
- Testing philosophy (TDD if appropriate)
- Architecture principles (component boundaries, data flow)
- **UI-first development principle**: "Features MUST be developed as vertical slices delivering visible UI alongside backend logic. Backend-only development phases are prohibited for features with user-facing components."
- Security principles (input validation, auth requirements)

**After generation:** `node scripts/validate-speckit.js --step constitution`
Do NOT proceed to Step 2 until all TEST-C tests pass.

### Step 2: Specification (`/speckit.specify`)

For each feature in the PRD, create a specification that answers "what" and "why" without dictating "how." The spec MUST include:
- Feature Overview
- User Stories (with Visual Acceptance Criteria)
- Functional Requirements
- Non-Functional Requirements
- **UI Component Specifications** (NEW — for every UI component referenced in user stories):
  - Component name
  - Props/data requirements (what data it receives)
  - Visual states: default, loading, error, empty, disabled
  - Interaction behavior (what happens on user actions)
  - Maps to: FR-XXX, US-XXX
- Out of Scope
- Review & Acceptance Checklist

**After generation:** `node scripts/validate-speckit.js --step specify`
Do NOT proceed to Step 3 until all TEST-S tests pass.

### Step 3: Analyze & Clarify (`/speckit.analyze`, `/speckit.clarify`)

Force the AI to analyze the specification for logical gaps, missing edge cases, or contradictory requirements. Resolve ambiguities with the human developer.

**After generation:** Re-run `node scripts/validate-speckit.js --step specify` to confirm clarifications didn't break existing tests.

### Step 4: Plan (`/speckit.plan`)

Develop implementation strategies for each specification. **CRITICAL**: Implementation phases MUST be organized as vertical slices, not horizontal layers.

**WRONG (backend-first layers):**
```
Phase 1: Database schema and models
Phase 2: API services and endpoints
Phase 3: Authentication middleware
Phase 4: Frontend components
Phase 5: Integration and testing
```

**RIGHT (vertical slices):**
```
Phase 0: Foundation — project setup, shared layout, routing shell, dev server
Phase 1: User Registration — signup form + validation API + user model + tests
Phase 2: Login Flow — login page + auth endpoint + session management + tests
Phase 3: Dashboard — dashboard page + data API + query logic + tests
Phase 4: [Feature] — [page] + [API] + [data] + tests
```

Each phase delivers a visible, testable capability. The plan's Tech Stack Summary MUST include UI framework, CSS approach, and component testing library.

**After generation:** `node scripts/validate-speckit.js --step plan`
Do NOT proceed to Step 5 until all TEST-P tests pass.

### Step 5: Test Definition (`/speckit.tests`)

Define how each feature will be tested before breaking into tasks. Include:
- Unit test scenarios (data model, services)
- Component test scenarios (UI components with Testing Library or equivalent)
- Integration test scenarios (API endpoints)
- E2E test scenarios (full user flows with Playwright or equivalent)
- **Visual verification scenarios** (what pages/components to screenshot and verify)

### Step 6: Tasks (`/speckit.tasks`)

Break plans and test definitions into atomic, implementable units. Each task should be completable in a single Claude session (15-30 minutes).

**CRITICAL TASK ORDERING RULES:**

1. **Foundation tasks come first**: Project setup, shared layout, routing, dev server configuration
2. **Tasks are organized into vertical slices within each user story group**: Each slice delivers data + logic + UI for one capability
3. **Within a slice**: data tasks before service tasks, service tasks before UI tasks — but the ENTIRE slice (including UI) completes before the next slice begins
4. **Every slice ends with**: `Checkpoint: visual-verify [page/component name]`
5. **No backend-only user story groups**: If a user story has visual acceptance criteria, its task group MUST include UI component tasks

**After generation:** `node scripts/validate-speckit.js --step tasks`
Do NOT proceed to Step 7 until all TEST-T tests pass.

### Step 7: Validate (`/speckit.checklist`)

Verify that all artifacts are consistent and complete.

**After generation:** `node scripts/validate-speckit.js --step checklist`

---

## STAGE 3: Run Full-Chain Validation

Run: `node scripts/validate-speckit.js --all`

This executes ALL tests across ALL steps plus the cross-artifact analysis tests (TEST-A01 through TEST-A06).

---

## STAGE 4: Fix-and-Revalidate Loop

If any tests fail:
1. Read the failure report
2. Identify the specific artifact and issue
3. Fix the artifact
4. Re-run validation for that step: `node scripts/validate-speckit.js --step [step]`
5. When the step passes, re-run: `node scripts/validate-speckit.js --all`
6. Repeat until ALL tests pass (max 5 iterations — if still failing, stop and report)

---

## STAGE 5: Git Hooks and Artifact Protection

Create a pre-commit hook that validates spec-kit artifacts when they're modified:

```bash
# Append to .git/hooks/pre-commit
SPEC_FILES=$(git diff --cached --name-only | grep -E "\.specify/")
if [ -n "$SPEC_FILES" ]; then
  echo "Spec-kit artifacts modified — running validation..."
  node scripts/validate-speckit.js --all
  if [ $? -ne 0 ]; then
    echo "Spec-kit validation FAILED. Fix issues before committing."
    exit 1
  fi
fi
```

---

## Completion

When all tests pass, print:
```
Phase 3 complete. Spec-kit artifacts generated and validated.
  Constitution: .specify/memory/constitution.md
  Specification: .specify/specs/[feature-dir]/spec.md
  Plan: .specify/specs/[feature-dir]/plan.md
  Tasks: .specify/specs/[feature-dir]/tasks.md
  Data Model: .specify/specs/[feature-dir]/data-model.md

  Tasks organized as vertical slices: YES
  Visual verification checkpoints: [count]
  UI component specifications: [count]

Ready for Phase 4 — Project Scaffolding (/workflow-scaffold)
```
