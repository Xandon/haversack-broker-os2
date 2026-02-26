---
description: Multi-feature orchestrator — discovers features from PRD, runs per-feature speckit pipeline (plan + build), tracks progress via persistent manifest across conversations.
handoffs:
  - label: Analyze Spec Consistency
    agent: speckit.analyze
    prompt: Run a cross-artifact consistency analysis before implementation
    send: true
  - label: Regenerate Tasks
    agent: speckit.tasks
    prompt: Regenerate the task breakdown
    send: true
  - label: Run E2E Tests
    agent: e2e-test
    prompt: Run comprehensive end-to-end browser testing for the current feature
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Valid arguments:
- `init` — first-time setup: discover features from PRD, create manifest, begin Feature 1
- `resume` — read manifest, continue from last checkpoint (default if manifest exists)
- `status` — show current manifest state without executing
- `skip {feature name}` — mark a feature as SKIPPED in the manifest
- `verify only` — skip to STAGE 5 (final acceptance)
- `feature NNN` — jump to a specific feature number in the queue

## Role

You are the **multi-feature development orchestrator**. Your job is to discover remaining features from the PRD, plan each one through the speckit pipeline, implement every task with TDD, and track progress via a persistent manifest that survives conversation boundaries. Each feature runs as: plan (STAGE 2) then build (STAGE 3) then transition (STAGE 4). One feature per conversation. The manifest is memory.

## Critical Rules

1. **NEVER** implement a task without a failing test first (Red-Green-Refactor)
2. **NEVER** commit code that hasn't passed all automated tests
3. **NEVER** proceed to the next batch until the current batch passes acceptance verification
4. **NEVER** merge to the integration branch without all verification layers passing
5. **ALWAYS** re-anchor context by reading the spec before starting each task
6. **ALWAYS** work in a feature branch — never commit directly to dev or main
7. When implementation reveals a spec gap, **UPDATE THE SPEC FIRST**, then update code
8. **NEVER** use /compact while a feature is in progress. If context is getting heavy, write the manifest checkpoint and tell the user to run `/phase5 resume` in a new conversation instead.

---

## STAGE 0: Initialize Run

**When:** First invocation (`/phase5 init`) or no manifest exists.

**Reads:** `docs/prd.md` (FR sections only, ~300 lines), `docs/progress.md` (~185 lines), `.specify/specs/001-haversack-unified-platform/tasks.md` (dependency section only, ~50 lines)

### Step 0.1: Pre-Flight

1. Run `bash scripts/preflight.sh` from repo root. If it fails, **STOP** and report.
2. Verify all orchestration scripts exist and are executable:
   - `scripts/preflight.sh`
   - `scripts/start-batch.sh`
   - `scripts/finish-batch.sh`
   - `scripts/merge-batch.sh`
   - `scripts/verify-regression.sh`
   If any are missing, **STOP** and report.

### Step 0.2: Discover Remaining Features

1. Read `docs/prd.md` — extract all FR-XXX groups that represent distinct features.
2. Read `docs/progress.md` — identify which batches/features are already complete.
3. Cross-reference to identify remaining features not yet built.

**Expected remaining features for Haversack (update if progress.md shows otherwise):**

| # | Feature | PRD References | Depends On |
|---|---------|---------------|------------|
| 1 | Pipeline & Opportunities | FR-016, FR-017 | Accounts (done) |
| 2 | Commissions | FR-020, FR-021, FR-022 | Orders (done) |
| 3 | Dashboards & Reports | FR-023, FR-024, FR-025 | Commissions |
| 4 | Business Rules Engine | FR-028 | Accounts (done) |
| 5 | AI Meeting Briefs | FR-030 | AI provider (done) |
| 6 | Polish & NFRs | NFR-001 through NFR-014 | All features |

### Step 0.3: Determine Base State

1. Determine the integration branch:
   - Check if `dev` branch exists: `git show-ref --verify --quiet refs/heads/dev`
   - If yes -> `BASE_BRANCH=dev`
   - If no -> default to `main`
2. Get current test count from progress.md regression history (currently 507).
3. Get current global batch counter from progress.md (currently 7).

### Step 0.4: Create Manifest

Write `docs/phase5-manifest.md` using the Manifest Format Reference at the bottom of this document.

Populate:
- Feature queue table with all remaining features
- Current state pointing to Feature 1, STAGE 2, Step 2.1
- Feature 1 planning checklist (all unchecked)
- Base branch, merge mode (default: auto), baseline tests, global batch counter

### Step 0.5: User Configuration

Ask the user ONCE (use AskUserQuestion):

1. **Merge mode**: auto-merge after verification, or push branch for PR review?
2. **Feature queue**: Any features to skip, reorder, or add?

Record answers in the manifest.

### Step 0.6: Begin Feature 1

Immediately proceed to STAGE 2 for the first feature in the queue.

---

## STAGE 1: Resume & Context

**When:** `/phase5 resume` or `/phase5` when manifest exists.

**Reads:** `docs/phase5-manifest.md` (~100 lines)

### Step 1.1: Parse Manifest

Read `docs/phase5-manifest.md`. Parse the `## Current State` section to extract:
- `Active Feature` — which feature number
- `Active Stage` — PLANNING, BUILDING, or COMPLETE
- `Active Step` — specific sub-step (e.g., 2.5, or batch number)
- `Resume Point` — exact dispatch target

### Step 1.2: Dispatch

Based on the resume point:

| Active Stage | Condition | Dispatch To |
|-------------|-----------|-------------|
| PLANNING | Step 2.X unchecked | STAGE 2, continue from Step 2.X |
| BUILDING | Batch N in progress | STAGE 3, continue from batch N |
| E2E_TESTING | E2E in progress or failed | STAGE 4, Step 4.2 (re-run e2e-test) |
| COMPLETE | More features pending | STAGE 4, transition to next |
| COMPLETE | All features done | STAGE 5, final acceptance |

If the manifest says `Status: FAILED` or `Status: REGRESSION_FAIL` or `Status: BLOCKED`, report the error state to the user and await guidance before continuing.

---

## STAGE 2: Feature Planning

**When:** A new feature is starting, or planning is incomplete (resumed mid-planning).

Phase 5 executes the speckit pipeline logic DIRECTLY for each feature — it does NOT invoke slash commands. Each sub-step reads only what it needs and updates the manifest checklist before moving on.

### Step 2.1: Create Feature Directory

**Reads:** Manifest (~10 lines for feature name/number)

1. Determine the next spec number by checking `.specify/specs/` for existing directories.
2. Generate a kebab-case short name from the feature title (e.g., `pipeline-opportunities`).
3. Run:
   ```bash
   .specify/scripts/bash/create-new-feature.sh --json --number {NNN} --short-name "{short-name}" "{feature description}"
   ```
4. Parse JSON output to get `BRANCH_NAME`, `SPEC_FILE`, `FEATURE_NUM`.
5. Record `FEATURE_DIR=.specify/specs/{NNN}-{short-name}` and `SPEC_NUM={NNN}` in the manifest.
6. Verify the directory exists under `.specify/specs/` (not a top-level `specs/`).
7. **Important:** Switch back to BASE_BRANCH after directory creation — the feature branch created by the script is a spec branch, not the build branch. The build branch is created later in STAGE 3.

**Update manifest:** `[x] 2.1 Create feature directory — {FEATURE_DIR}`

### Step 2.2: Generate spec.md

**Reads:** `docs/prd.md` (only the target FR sections, ~100 lines), `.specify/templates/spec-template.md` (~50 lines)

1. Load the spec template to understand required sections.
2. Read the relevant FR sections from the PRD for this feature.
3. Generate a complete spec.md following the template structure:
   - User stories with priorities and acceptance criteria
   - Functional requirements (reference PRD FR numbers)
   - Edge cases and error handling
   - Success criteria (measurable, technology-agnostic)
   - Assumptions
4. Write to `FEATURE_DIR/spec.md`.
5. Validate: spec contains at least one User Story, at least one FR-XXX, no implementation details.

**Update manifest:** `[x] 2.2 Generate spec.md — {N} user stories, {M} FRs`

### Step 2.3: Clarify

**Reads:** `FEATURE_DIR/spec.md` (~200 lines)

1. Perform a structured ambiguity scan across the spec using these categories:
   - Functional scope & behavior
   - Domain & data model
   - Interaction & UX flow
   - Non-functional quality attributes
   - Edge cases & failure handling
2. Resolve ALL ambiguities autonomously using PRD context and project conventions from CLAUDE.md.
   - For Haversack features, the PRD provides sufficient detail — make informed decisions.
   - Document each decision in a `## Clarifications` section with rationale.
   - Do NOT ask the user for input. This runs autonomously.
3. Remove all `[NEEDS CLARIFICATION]` markers by replacing them with concrete decisions.
4. Write the updated spec back to `FEATURE_DIR/spec.md`.

**Update manifest:** `[x] 2.3 Clarify — {N} clarifications resolved, 0 outstanding`

### Step 2.4: Requirements Checklist

**Reads:** `FEATURE_DIR/spec.md` (~200 lines), checklist template structure (~40 lines)

1. Generate `FEATURE_DIR/checklists/requirements.md` with validation items:
   - No implementation details in spec
   - Requirements are testable and unambiguous
   - Success criteria are measurable and technology-agnostic
   - All acceptance scenarios defined
   - Edge cases identified
   - Scope clearly bounded
2. Validate the spec against each checklist item.
3. If items fail, fix the spec and re-validate (max 3 iterations).

**Update manifest:** `[x] 2.4 Requirements checklist — {N}/{M} items passing`

### Step 2.5: Conflict Analysis

**Reads:** `prisma/schema.prisma` (relevant models, ~100 lines), `backend/src/app.ts` (~50 lines), relevant shared schemas in `packages/shared/src/schemas/` (~50 lines)

Analyze the spec against the existing codebase. Check:

1. **Schema conflicts** — Does this feature modify existing Prisma models? Will migrations break existing data?
2. **Route conflicts** — Do new Fastify routes collide with existing routes in `backend/src/app.ts`?
3. **Shared schema conflicts** — Do Zod schemas in `packages/shared/` need breaking changes?
4. **Component conflicts** — Do existing UI components need modification?
5. **Hook conflicts** — Do existing TanStack Query hooks need changes?

Classify each finding as:
- **SAFE** — New files only
- **ADDITIVE** — Existing files modified by adding (new fields, props, imports)
- **BREAKING** — Existing contracts/types/behavior change

**GATE RULE:**
- ALL SAFE or ADDITIVE -> Log and continue
- ANY BREAKING -> **STOP**. Output full conflict report. Await user guidance.

Write `FEATURE_DIR/conflicts.md`.

**Update manifest:** `[x] 2.5 Conflict analysis — {N} safe, {M} additive, {K} breaking`

### Step 2.6: Research

**Reads:** ONE reference domain in `backend/src/domains/` (routes + service, ~200 lines), ONE reference hook in `frontend/src/hooks/` (~100 lines), conflicts.md (~50 lines)

1. Pick the most relevant existing domain as a reference pattern (e.g., accounts for pipeline, orders for commissions).
2. Read its route file, service file, and corresponding frontend hook.
3. Document patterns to follow:
   - Route structure and Zod validation patterns
   - Service function signatures and tenant isolation patterns
   - TanStack Query hook patterns (query keys, mutations, invalidation)
   - Any conflict-related patterns from Step 2.5
4. Write `FEATURE_DIR/research.md` with Decision / Rationale / Alternatives format.

**Update manifest:** `[x] 2.6 Research — {N} patterns documented, reference domain: {name}`

### Step 2.7: Plan

**Reads:** `FEATURE_DIR/spec.md` (~200 lines), `FEATURE_DIR/research.md` (~150 lines), `.specify/templates/plan-template.md` (~100 lines)

1. Generate the implementation plan following the plan template structure:
   - File structure across all workspaces (backend, frontend, worker, shared)
   - For every file: mark as NEW or MODIFIED, specify workspace
   - For MODIFIED files: specify exact changes (added fields, new imports, route registrations)
2. Generate `FEATURE_DIR/data-model.md` with entity definitions, relationships, validation rules.
3. Generate `FEATURE_DIR/contracts/` with API endpoint contracts.
4. Generate `FEATURE_DIR/quickstart.md` with key validation scenarios.
5. Respect monorepo boundaries:
   - Backend: `backend/src/domains/{domain}/`
   - Frontend pages: `frontend/src/app/(dashboard)/{domain}/`
   - Frontend components: `frontend/src/components/{domain}/`
   - Frontend hooks: `frontend/src/hooks/use-{domain}.ts`
   - Shared schemas: `packages/shared/src/schemas/{domain}.schema.ts`
   - Worker jobs: `worker/src/jobs/`, queues: `worker/src/queues/`

**Update manifest:** `[x] 2.7 Plan — {N} files planned ({M} new, {K} modified)`

### Step 2.8: Tasks

**Reads:** `FEATURE_DIR/plan.md` (~250 lines), `FEATURE_DIR/spec.md` (~200 lines)

1. Generate `FEATURE_DIR/tasks.md` with:
   - Tasks grouped by user story
   - Each task: ID, description, files touched (NEW/MOD), workspace, dependencies
   - Parallel opportunities marked with [P]
   - Priority levels (P1, P2, P3) from spec
   - Batch grouping proposal:
     - Foundational tasks (schema, shared types) in first batch
     - Each P1 user story gets its own batch
     - P2/P3 stories grouped (max 8-10 tasks per batch)
   - Branch names: `feature/batch-{N}-{slug}` where N continues global counter
2. Task IDs continue from the last task in progress.md (currently T122, so start at T123+).
3. Include dependency chain and batch boundaries.

**Update manifest:** `[x] 2.8 Tasks — {N} tasks in {M} batches, starting at batch {K}`

### Step 2.9: Validation Gate

**Reads:** `FEATURE_DIR/tasks.md` (~200 lines), `FEATURE_DIR/spec.md` skim (~100 lines)

Verify before building:
- [ ] All spec checklist items pass
- [ ] No unresolved BREAKING conflicts
- [ ] Task dependencies form a valid DAG (no circular deps)
- [ ] Every task references its parent FR/US
- [ ] All routes include auth middleware references
- [ ] All database queries include tenant_id filtering references
- [ ] Batch boundaries don't split user stories
- [ ] Batch numbering continues global counter correctly

If any check fails, fix it. Do not proceed to STAGE 3 until all pass.

**Update manifest:**
- `[x] 2.9 Validation gate — all checks passing`
- Update `Active Stage: BUILDING`
- Update `Active Step: batch {N}` (first batch number)
- Populate the Build Checklist section for this feature

---

## STAGE 3: Feature Build (TDD Core Loop)

**When:** Planning is complete, build is in progress.

Largely preserved from the original Phase 5 Stage 5, adapted for per-feature context.

### Per-Batch Context Anchor

**Reads per batch:** `FEATURE_DIR/spec.md` (~200 lines), `FEATURE_DIR/tasks.md` (batch section only, ~50 lines), `CLAUDE.md` (patterns section, ~100 lines), manifest (~30 lines) = **~380 lines total**

**Do NOT read** during build: `docs/prd.md`, `FEATURE_DIR/plan.md` (its info is already in tasks.md), other features' specs.

### 3A. Create Feature Branch

```bash
bash scripts/start-batch.sh {batch-id} {batch-name} {BASE_BRANCH}
```
Branch naming: `feature/batch-{N}-{feature-slug}` where N is the global batch number.

### 3B. Context Anchor

Re-read before every batch:
- `FEATURE_DIR/spec.md` (relevant user stories only)
- `FEATURE_DIR/tasks.md` (this batch's tasks only)
- `CLAUDE.md` (patterns section)
- `docs/phase5-manifest.md` (current state)

### 3C. Test Architect Phase (RED)

For each task in this batch:
1. Read task + parent user story + acceptance criteria from spec.md
2. Write **FAILING** tests:
   - Unit tests for business logic (co-located `.test.ts` files)
   - Integration tests for API/DB operations
   - Component tests for UI elements with business logic
3. Run tests — confirm they **FAIL**
4. Commit: `test(batch-{N}): add failing tests for {task descriptions}`

### 3D. Implementation Phase (GREEN) — Per-Task Micro-Loop

For each task, in dependency order:

```
+-- TASK [T-XXX] -------------------------------------------+
| 1. ANCHOR: Read the task from tasks.md                     |
|    Log: "Implementing T-XXX: {description}                 |
|     Parent: US-XXX | Refs: FR-XXX, FR-YYY                 |
|     Files: {paths} | Depends on: {prior tasks}"            |
|                                                            |
| 2. VERIFY DEPS: Confirm prerequisite tasks done            |
|    and their tests pass on this branch                     |
|                                                            |
| 3. IMPLEMENT: Minimum code to make tests pass              |
|    Follow: CLAUDE.md patterns, data-model.md types,        |
|            contracts/ shapes                                |
|                                                            |
| 4. VERIFY:                                                 |
|    - Task tests -> PASS                                    |
|    - ALL tests -> no regressions                           |
|    - Linter -> clean                                       |
|                                                            |
| 5. COMMIT:                                                 |
|    "feat(batch-{N}): T-XXX {short description}"            |
|                                                            |
| 6. RECORD: Update docs/progress.md -> T-XXX done          |
|                                                            |
| 7. Mark task as [X] in FEATURE_DIR/tasks.md                |
|                                                            |
| 8. DRIFT CHECK (every 3 tasks):                            |
|    Re-read spec.md (relevant US, ~50 lines),               |
|    CLAUDE.md (~50 lines), constitution.md (~40 lines)      |
|    = ~140 lines. Run full test suite. Confirm alignment.   |
|                                                            |
| 9. SPEC GAP (if found during implementation):              |
|    a. Document the gap                                     |
|    b. Update spec.md FIRST                                 |
|    c. Update tests to match corrected spec                 |
|    d. Commit: "spec: update {FR/US} -- {reason}"           |
|    e. Then implement                                       |
+------------------------------------------------------------+
```

### 3E. Refactor Phase

After all tasks in the batch pass:
1. Review for duplication, naming, pattern violations (per CLAUDE.md)
2. Refactor while keeping ALL tests green
3. Commit: `refactor(batch-{N}): {what was improved}`

### 3F. Finish & Verify

```bash
bash scripts/finish-batch.sh {batch-id} {BASE_BRANCH}
```
Runs all verification layers (unit, integration, lint, typecheck, coverage, build).
- If it **passes**: branch is pushed to origin
- If it **fails**: fix and re-run (max 5 attempts)
- If still failing after 5: **STOP** and report with diagnostics. Update manifest: `Status: FAILED (attempt 5/5)`

### 3G. Merge or PR

If `MERGE_MODE=auto`:
```bash
bash scripts/merge-batch.sh {batch-id} {BASE_BRANCH}
```
If post-merge regression fails -> revert and report. Update manifest: `Status: REGRESSION_FAIL`

If `MERGE_MODE=pr-review`:
Report to user:
```
Batch {N} ready for review on branch feature/batch-{N}-{name}.
All {X} tests passing. {Y} acceptance scenarios verified.
Please review and merge. Then run /phase5 resume.
```
**WAIT** for user to confirm the merge before proceeding.

### 3H. Post-Merge Regression

After merge, on BASE_BRANCH:
```bash
bash scripts/verify-regression.sh
```
**Coverage must never decrease between batches.** If it does, fix before proceeding.

### 3I. Update Progress & Manifest

1. Update `docs/progress.md` with:
   - Batch status -> complete
   - Branch status -> Merged
   - Test counts, regression history row
2. Update manifest:
   - Build checklist: `[x] Batch {N} — {X} tests passing, merged`
   - Increment global batch counter
   - If more batches remain for this feature: update Active Step to next batch
   - If all batches done: update Active Stage to COMPLETE

### 3J. Next Batch or Feature Complete

- If more batches remain: return to 3A
- If all batches for this feature are done: proceed to STAGE 4

---

## STAGE 4: Feature Transition

**When:** All batches for the current feature are merged.

### Step 4.1: Regression Verification

```bash
git checkout {BASE_BRANCH}
bash scripts/verify-regression.sh
```

### Step 4.2: E2E Feature Validation

**Required:** Every completed feature MUST pass E2E browser testing before being marked complete.

1. Invoke the `e2e-test` skill with the current feature name:
   - The skill launches parallel research agents, starts the application, and tests every user journey with browser automation + database validation.
   - It covers: user journey testing, RBAC enforcement, tenant isolation, responsive viewports (320px, 375px, 768px, 1440px), and database record verification.
   - Screenshots are saved to `e2e-screenshots/{feature-slug}/`.
   - A detailed report is written to `e2e-screenshots/{feature-slug}/report.md`.

2. Wait for the skill to complete and check the exit status:
   - **E2E: PASS** -> proceed to Step 4.3
   - **E2E: FAIL** -> fix the reported issues:
     a. Read the report at `e2e-screenshots/{feature-slug}/report.md`
     b. Fix each failing acceptance criterion and high-severity issue
     c. Commit fixes: `fix(e2e): {description}`
     d. Re-run the e2e-test skill (max 3 attempts)
     e. If still failing after 3 attempts: **STOP** and report with full diagnostics. Update manifest: `Status: E2E_FAIL (attempt 3/3)`

3. Update manifest: `E2E: PASS — {N} journeys, {M} screenshots, {K} issues fixed`

### Step 4.3: Mark Feature Complete

1. Update manifest: feature status -> `COMPLETE`
2. Record final test count, batches used, and E2E results
3. Update `docs/progress.md` with feature completion summary (including E2E pass status)

### Step 4.4: Check Next Feature

Parse manifest feature queue for the next PENDING feature.

**If more features remain:**
```
======================================================
  FEATURE COMPLETE: {name}
  Tests: {baseline} -> {new total} (+{added})
  Batches: {start}-{end} merged to {BASE_BRANCH}
  E2E: PASS — {N} journeys, {M} screenshots
  Report: e2e-screenshots/{feature-slug}/report.md

  Next: {next feature name}
  Run /phase5 resume in a new conversation.
======================================================
```

Update manifest:
- Active Feature -> next feature number
- Active Stage -> PLANNING
- Active Step -> 2.1
- Resume Point -> STAGE 2, Step 2.1
- Add planning checklist for the next feature (all unchecked)

**If no more features remain:** Proceed to STAGE 5.

---

## STAGE 5: Final Acceptance

**When:** All features in the queue are COMPLETE (or SKIPPED).

### Step 5.1: Full Regression

```bash
git checkout {BASE_BRANCH}
git pull origin {BASE_BRANCH}
bash scripts/verify-regression.sh
npm run test:e2e 2>/dev/null || echo "No E2E tests configured"
```

### Step 5.2: Acceptance Report

```
======================================================
  PHASE 5 -- FINAL ACCEPTANCE REPORT
======================================================

  Branch: {BASE_BRANCH}
  Features completed: {list}
  Features skipped: {list or "None"}

  Test Pyramid:
  ----------------------
  Total:         {count} all passing
  Baseline:      {baseline count}
  Added:         {count added across all features}

  Quality Gates:
  ----------------------
  All tests pass:            {YES/NO}
  Lint clean:                {YES/NO}
  Type check clean:          {YES/NO}
  Build succeeds:            {YES/NO}

  E2E Summary:
  ----------------------
  Per-feature E2E:       {count} features tested
  Total journeys:        {count}
  Total screenshots:     {count}
  Issues fixed in E2E:   {count}

  Feature Summary:
  ----------------------
  {For each feature: name, batches, tests added, E2E status, status}

======================================================
  OVERALL STATUS: {READY FOR PRODUCTION MERGE / NEEDS ATTENTION}
======================================================
```

### Step 5.3: Merge to Main

Ask user (use AskUserQuestion):
1. Merge BASE_BRANCH into main now?
2. Create a pull request for review?
3. Hold — user will handle the merge manually?

Execute their choice.

### Step 5.4: Close Out

1. Update `docs/progress.md` with final status
2. Update manifest: all features marked, final stats recorded
3. Commit: `chore: Phase 5 complete -- all features implemented`

---

## Context Budget Reference

**The core principle:** One feature per conversation. The manifest is memory. Fresh context is guaranteed by conversation boundaries.

| Phase | ~Lines Read | ~Lines Written | Notes |
|-------|------------|---------------|-------|
| STAGE 0: Init | ~535 | ~100 (manifest) | One-time: PRD + progress + tasks |
| STAGE 2: Planning (all 9 steps) | ~1500 total | ~800 (spec, plan, tasks) | Heaviest on steps 2.6-2.8 |
| STAGE 3: Build (per batch) | ~380 per batch | ~500+ per batch (code + tests) | 2-3 batches per feature |
| Drift check | ~140 | 0 | Every 3 tasks |
| Manifest updates | ~100 per read | ~20 per update | Small atomic writes |

### What to read when

| Context | When to Read | When NOT to Read |
|---------|-------------|-----------------|
| `docs/prd.md` | STAGE 0, Step 2.2 only | During build (STAGE 3) |
| `FEATURE_DIR/plan.md` | Never during build | Its info is in tasks.md |
| `FEATURE_DIR/spec.md` | Steps 2.2-2.9, batch anchor, drift checks | Don't read full spec during build — only relevant US |
| `FEATURE_DIR/tasks.md` | Steps 2.8-2.9, batch anchor | Only current batch section, not full file |
| `CLAUDE.md` | Batch anchor, drift checks | Only patterns section (~100 lines) |
| `.specify/memory/constitution.md` | Drift checks only | ~40 lines |
| Other features' specs | **NEVER** | Cross-contamination risk |

### Compaction Warning

**Do NOT use /compact while a feature is in progress.** If context is getting heavy, update the manifest checkpoint and tell the user:
```
Context is getting heavy. I've saved the checkpoint.
Run /phase5 resume in a new conversation to continue with fresh context.
```

### Estimated Context Per Feature

For Haversack remaining features (7-15 tasks each, 2-3 batches):
- Planning: ~15K tokens read, ~8K written
- Build: ~10K tokens read per batch, ~15K written per batch
- Total per feature: ~35-45K read, ~40-55K written
- Well within context window without compaction

---

## Verification Layers Reference

```
Layer 0: Per-file      PostToolUse hooks (on every save)
Layer 1: Per-task      Task tests pass + no regressions
Layer 2: Per-batch     finish-batch.sh (unit, integration, lint, typecheck, coverage, build)
Layer 3: Pre-merge     merge-batch.sh (post-merge regression)
Layer 4: Cross-batch   verify-regression.sh (on integration branch)
Layer 5: Per-feature   E2E browser testing via e2e-test skill (STAGE 4, Step 4.2)
Layer 6: Final         Full acceptance suite (STAGE 5) + E2E regression
```

Seven layers. Feature branch isolation means a failed batch never pollutes the integration branch. E2E browser testing catches visual, UX, RBAC, and data integrity issues that unit/integration tests miss.

---

## Error Recovery Reference

| Scenario | Manifest State | On Resume |
|----------|---------------|-----------|
| Context exhausted mid-planning | Step 2.X marked [x], 2.Y still [ ] | Continues from step 2.Y |
| Build batch fails verification | `Status: FAILED (attempt N/5)` | Retries from clean state |
| Post-merge regression fails | `Status: REGRESSION_FAIL` | Reports to user, awaits guidance |
| E2E testing fails | `Status: E2E_FAIL (attempt N/3)` | Fix issues and re-run e2e-test skill |
| User wants to skip a feature | User says "skip {feature}" | Mark SKIPPED in manifest, advance |
| BREAKING conflict found | `Status: BLOCKED (BREAKING)` | Present conflicts, await resolution |
| Conversation ended mid-batch | Build checklist shows batch in progress | Resume from batch start (3A) |

---

## Manifest Format Reference

`docs/phase5-manifest.md` — the single source of truth across conversations.

```markdown
# Phase 5 Orchestrator Manifest

**Created:** {date}
**Last Updated:** {date time}
**Base Branch:** dev
**Merge Mode:** auto
**Baseline Tests:** 507
**Global Batch Counter:** 7

## Feature Queue

| # | Feature | Spec Dir | Status | Batches | Tests Added | E2E |
|---|---------|----------|--------|---------|-------------|-----|
| 1 | Pipeline & Opportunities | 002-pipeline-opportunities | PENDING | -- | -- | -- |
| 2 | Commissions | 003-commissions | PENDING | -- | -- | -- |
| 3 | Dashboards & Reports | 004-dashboards-reports | PENDING | -- | -- | -- |
| 4 | Business Rules Engine | 005-business-rules | PENDING | -- | -- | -- |
| 5 | AI Meeting Briefs | 006-ai-meeting-briefs | PENDING | -- | -- | -- |
| 6 | Polish & NFRs | 007-polish-nfrs | PENDING | -- | -- | -- |

## Current State

- **Active Feature:** 1 (Pipeline & Opportunities)
- **Active Stage:** PLANNING
- **Active Step:** 2.1 (Create feature directory)
- **Resume Point:** STAGE 2, Step 2.1

## Feature 1: Pipeline & Opportunities

### PRD References
- FR-016: Pipeline stage management
- FR-017: Opportunity tracking and forecasting

### Planning Checklist
- [ ] 2.1 Create feature directory
- [ ] 2.2 Generate spec.md
- [ ] 2.3 Clarify
- [ ] 2.4 Requirements checklist
- [ ] 2.5 Conflict analysis
- [ ] 2.6 Research
- [ ] 2.7 Plan
- [ ] 2.8 Tasks
- [ ] 2.9 Validation gate

### Build Checklist
(populated after planning completes)
- [ ] Batch {N}: {description} -- {test count} tests
- [ ] Batch {N+1}: {description} -- {test count} tests

### E2E Validation
- [ ] E2E browser testing -- {N} journeys, {M} screenshots, {K} issues fixed
```

**Key properties:**
- `## Current State` is the resume dispatch — tells any new conversation exactly where to pick up
- Checklists are updated one line at a time (minimal writes)
- Batch numbering is global and sequential across all features (continues from 7)
- Only the active feature has a detailed section; pending features show only their queue row
- Feature status values: `PENDING`, `PLANNING`, `BUILDING`, `E2E_TESTING`, `COMPLETE`, `SKIPPED`, `BLOCKED`, `FAILED`, `REGRESSION_FAIL`, `E2E_FAIL`

---

## Feature Queue Reference (Haversack-Specific)

These are the expected remaining features based on the PRD. Verify against actual `docs/progress.md` during STAGE 0.

| # | Feature | PRD References | Description | Depends On |
|---|---------|---------------|-------------|------------|
| 1 | Pipeline & Opportunities | FR-016, FR-017 | Pipeline stages (lead/qualify/propose/negotiate/close), opportunity tracking, revenue forecasting, win/loss analysis | Accounts (Batch 1-2) |
| 2 | Commissions | FR-020, FR-021, FR-022 | Commission rule configuration per brand/territory/tier, automated calculation, monthly statement generation, audit trail | Orders (Batch 4) |
| 3 | Dashboards & Reports | FR-023, FR-024, FR-025 | Territory dashboard, sales performance metrics, pipeline analytics, commission summaries, exportable reports | Commissions (Feature 2) |
| 4 | Business Rules Engine | FR-028 | Configurable business rules for pricing, approvals, territory assignments, commission tiers. Admin-managed rule sets | Accounts (Batch 1-2) |
| 5 | AI Meeting Briefs | FR-030 | AI-generated pre-meeting account briefs with recent activity, order history, health score, talking points. "AI-Generated" label required | AI provider (Batch 6) |
| 6 | Polish & NFRs | NFR-001 through NFR-014 | Performance optimization, accessibility (WCAG 2.1 AA), mobile responsiveness, error handling hardening, monitoring, documentation | All features |

**Dependency ordering:** Features 1, 2, 4, 5 can start independently (their dependencies are met). Feature 3 depends on Feature 2 (Commissions). Feature 6 depends on all others.

---

## Git Branch Flow

```
main ---------------------------------------------------- merge <--+
  |                                                                  |
  +- dev --+-- merge B8 --+-- merge B9 --+-- merge B10 --+-- ... --+
            |              |              |               |
            |  feature/    |  feature/    |  feature/     |
            |  batch-8-    |  batch-9-    |  batch-10-    |
            |  pipeline-   |  pipeline-   |  commissions- |
            |  foundation  |  tracking    |  rules        |
            |    |         |    |         |    |          |
            |    +- tests  |    +- tests  |    +- tests   |
            |    +- impl   |    +- impl   |    +- impl    |
            |    +- verify |    +- verify |    +- verify   |
            |    v         |    v         |    v           |
            |  finish      |  finish      |  finish        |
            |  merge ----> |  merge ----> |  merge ------> |
```

One feature's batches are sequential. Features are sequential (one per conversation). Batch numbers are globally unique and monotonically increasing.
