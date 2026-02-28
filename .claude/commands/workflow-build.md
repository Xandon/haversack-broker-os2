# Phase 5 — Autonomous Feature Build Loop

You are the lead development orchestrator. Your job is to **autonomously** implement ALL remaining frontend features — writing production code, tests, and verification — without pausing for user approval between features or batches.

## OPERATING MODE: FULLY AUTONOMOUS

**DO NOT ask the user questions.** Do not use AskUserQuestion. Do not pause between features. Do not ask for batch approval. Make all decisions autonomously using the PRD, spec, and CLAUDE.md conventions. The only reason to stop is:

- A BREAKING conflict that cannot be resolved without architectural guidance
- All features are complete

When invoked with `resume`, read `docs/progress.md` to determine current state and continue from where you left off.

## CRITICAL RULES

1. NEVER ask the user for approval, confirmation, or feature selection
2. NEVER implement a task without a failing test first (Red-Green-Refactor)
3. NEVER commit code that hasn't passed all automated tests
4. NEVER proceed to the next batch until the current batch passes tests
5. ALWAYS re-anchor context by reading the spec before starting each batch
6. ALWAYS work in a feature branch — never commit directly to dev or main
7. When implementation reveals a spec gap, UPDATE THE SPEC, then update the code
8. ALWAYS create speckit artifacts BEFORE writing any implementation code

## FEATURE PRIORITY ORDER

Build features in this fixed order (remaining P0 first, then P1, then P2):

**P0 (MVP):**

1. F-002c: Account Forms and Contacts
2. F-006: Product Catalog and Brands
3. F-012: User Management

**P1:** 4. F-007: Pipeline Kanban 5. F-007b: Opportunity CRUD 6. F-008: Commission Tracking 7. F-009: Enhanced Dashboard and Charts 8. F-010: Custom Reports 9. F-011: AI Features Integration 10. F-013: Data Import Wizard 11. F-016: Notifications

**P2:** 12. F-014: Data Quality Scorecard 13. F-015: Email Integration

Check `docs/progress.md` to skip already-completed features.

---

## MASTER LOOP

```
FOR each remaining feature in priority order:
  1. PRE-FLIGHT — verify clean git state, on base branch, tests pass
  2. PLAN — create speckit artifacts (spec, plan, tasks, conflicts, research, etc.)
  3. EXECUTE — implement all batches sequentially (branch → code → test → merge)
  4. VERIFY — run regression tests after all batches merged
  5. PROGRESS — update docs/progress.md
  6. CONTINUE — move to next feature immediately
END FOR
```

---

## STEP 1: PRE-FLIGHT

```bash
git rev-parse --abbrev-ref HEAD  # must be dev/develop/main
npm test 2>&1 | tail -5          # must pass
```

Determine BASE_BRANCH (check for `dev`, then `develop`, then `main`).

If working tree is dirty, stash or commit untracked speckit artifacts before proceeding.

---

## STEP 2: PLAN (Speckit Pipeline — autonomous, no user input)

### 2.1: Create Feature Directory

1. Check `.specify/specs/` for next available number.
2. Run: `.specify/scripts/bash/create-new-feature.sh --json --number {NNN} --short-name "{short-name}" "{description}"`
3. Switch back to BASE_BRANCH immediately.

### 2.2: Generate All Artifacts

Read `docs/prd-frontend.md` for the feature's FR section, then generate ALL of these in the feature directory:

- **spec.md** — User stories, acceptance criteria (Given/When/Then), FRs, edge cases, success criteria, clarifications (resolve ALL ambiguities autonomously)
- **research.md** — Reference patterns from existing codebase (pick most similar domain)
- **conflicts.md** — Schema/route/component/hook conflict analysis. Classify as SAFE/ADDITIVE/BREAKING
- **data-model.md** — Entity definitions (reference existing Prisma models)
- **plan.md** — File structure (NEW/MODIFIED), workspace assignments
- **contracts/** — API endpoint contracts
- **quickstart.md** — Key validation scenarios
- **checklists/requirements.md** — Requirements validation
- **tasks.md** — Tasks grouped by user story, batch assignments, dependency DAG

**GATE**: If ANY conflict is BREAKING → output conflict report and STOP (this is the only valid stop point). Otherwise, continue automatically.

### 2.3: Validation

Verify internally (no user output needed):

- All spec checklist items pass
- No BREAKING conflicts
- Task dependencies form valid DAG
- Batch numbering continues global counter from `docs/progress.md`

---

## STEP 3: EXECUTE (Batch Implementation Loop)

For each batch defined in tasks.md:

### 3A. Start Batch

```bash
bash scripts/start-batch.sh [batch-name] [base-branch]
```

Update `docs/progress.md`: mark batch as IN PROGRESS.

### 3B. Re-Anchor Context

Before implementing, read:

1. `FEATURE_DIR/spec.md` — relevant user story section
2. `FEATURE_DIR/tasks.md` — this batch's tasks
3. Reference files for patterns (existing hooks, components in same domain)

### 3C. Implement Tasks (Red-Green-Refactor)

For each task in the batch:

1. **Write failing test** first
2. **Implement** minimum code to pass
3. **Refactor** while keeping tests green
4. **Run tests** to confirm

Task order within a batch:

```
1. Hooks (data layer) + hook tests — parallel where possible
2. Components + component tests — depend on hooks
3. Pages + page skeletons — depend on components
4. Wiring (modifications to existing files)
```

### 3D. Finish Batch

Run tests:

```bash
npm test 2>&1 | tail -20
```

All tests must pass. If failures, fix them before proceeding.

### 3E. Merge Batch

```bash
bash scripts/merge-batch.sh [batch-name] [base-branch]
```

Update `docs/progress.md`: mark batch as MERGED, record test count.

---

## STEP 4: VERIFY (Post-Feature Regression)

After all batches for a feature are merged:

```bash
npm test 2>&1 | tail -20
```

Record total test count in `docs/progress.md` regression history.

---

## STEP 5: PROGRESS UPDATE

Update `docs/progress.md`:

- Mark feature as COMPLETE in the Feature Completion table
- Update task completion counter
- Update global batch counter
- Add regression history entry

Output a brief summary:

```
FEATURE COMPLETE: [name]
Batches: [N] | Tasks: [N] | Tests added: [N] | Total tests: [N]
Next: [next feature name] — continuing automatically...
```

Then **immediately continue** to the next feature (loop back to STEP 1).

---

## STEP 6: ALL FEATURES DONE — TRANSITION TO PAGE ASSEMBLY

When all features are complete, output:

```
ALL FRONTEND FEATURES COMPLETE
================================
Features implemented: [count]
Total batches: [count]
Total tests: [count]
All changes on dev branch.
Transitioning to Phase 2 — Page Assembly...
```

Then **immediately** proceed to Phase 2.

---

## PHASE 2 — PAGE ASSEMBLY LOOP

After all feature-level work (hooks, components, services) is complete, assemble them into Next.js pages.

### Page Discovery

1. Read `docs/prd-pages.md` (Page Assembly PRD Addendum) for all FR-PXXX page requirements
2. If `prd-pages.md` does not exist, extract pages from the PRD Screen Inventory table: `grep -E '^\|.*\|.*/' docs/prd.md`
3. Group pages by priority: P0 first, then P1, then P2

### Page Build Loop

```
FOR each page FR-PXXX in priority order:
  1. PRE-FLIGHT — verify clean git state, on base branch, tests pass
  2. BRANCH — create feature branch: feature/page-{route-name}
  3. BUILD — implement page + layout + wiring:
     a. Create route directory under frontend/src/app/
     b. Create page.tsx importing existing components
     c. Wire components to existing hooks (TanStack Query)
     d. Handle loading states (skeleton loaders)
     e. Handle error states (error boundaries)
     f. Handle empty states
     g. Add breadcrumb/navigation wiring
  4. TEST — write page-level tests (renders, loads data, handles states)
  5. VERIFY — run all tests: npm test
  6. MERGE — merge to base branch with --no-ff
  7. PROGRESS — update docs/progress.md
END FOR
```

### Page Build Order

Build in this order (layout shell first, then pages that depend on it):

1. **App Shell** (sidebar, header, auth guard) — all routes depend on this
2. **Login** — /login (no auth guard)
3. **Dashboard** — /dashboard (landing page after login)
4. **Account List** → **Account Detail** (tabbed)
5. **Order List** → **Order Entry** → **Order Detail**
6. **Pipeline / Kanban**
7. **Product Catalog** → **Brand Management**
8. **Commission Dashboard** → **Commission Statement Detail**
9. **Report Builder**
10. **Admin pages**: Data Import, User Management, Business Rules
11. **Settings**

### Definition of Done (per page)

- Page renders with real components wired to hooks
- Loading state shows skeleton loaders
- Error state shows error boundary with retry
- Empty state shows appropriate empty message
- Navigation links work (breadcrumbs, sidebar highlighting)
- Page-level test passes
- All existing tests still pass (no regressions)

### Phase 2 Complete

When all pages are built, output:

```
ALL PAGES ASSEMBLED
================================
Pages built: [count]
Total batches: [count]
Total tests: [count]
All changes on dev branch.
```

---

## Spec Gap Protocol

If implementation reveals something the spec didn't cover:

1. Document the gap in the spec artifact
2. Implement the fix
3. Continue — do NOT stop to ask the user

## Context Anchoring

When working on long features:

1. Re-read spec.md before each batch
2. Re-read CLAUDE.md patterns section if unsure about conventions
3. Check progress.md to maintain orientation
4. One batch at a time — complete fully before starting next
