You are executing the full speckit-to-build pipeline for a new feature. Run every step below autonomously. DO NOT stop between steps unless a CONFLICT GATE fails. If all gates pass, proceed straight through to building with an agent team.

## FEATURE INPUT

Feature number: {NUMBER — e.g., 002}
Feature branch: {BRANCH — e.g., 002-order-management}
Feature description: {DESCRIPTION — 2-5 sentences describing what this feature does}

---

## CRITICAL PATH RULE — Feature Directory Location

**ALL** feature artifacts MUST live under `.specify/specs/` — never under a top-level `specs/` directory.

The canonical feature directory is:
```
.specify/specs/{NNN}-{short-name}/
```

Examples:
- `.specify/specs/001-haversack-unified-platform/`
- `.specify/specs/002-order-management/`

If at ANY point you discover artifacts were written outside `.specify/specs/`, STOP and move them before continuing.

---

## PIPELINE — Execute in order

### STEP 1: SPECIFY

**1a. Set up the feature directory.**

Before running /speckit.specify, ensure the feature directory exists at the correct location. Run:

```bash
.specify/scripts/bash/create-new-feature.sh --json --number {NUMBER} --short-name "{BRANCH-SHORT-NAME}" "{DESCRIPTION}"
```

Parse the JSON output to get `BRANCH_NAME`, `SPEC_FILE`, and `FEATURE_NUM`. These are your source of truth for the rest of the pipeline.

**1b. Verify the directory was created in the right place.**

Immediately after the script runs, verify:
```bash
ls -la .specify/specs/{NNN}-{short-name}/spec.md
```

- If the file exists under `.specify/specs/` — proceed.
- If the file was created under a top-level `specs/` directory instead — move it:
  ```bash
  mv specs/{NNN}-{short-name} .specify/specs/{NNN}-{short-name}
  rmdir specs 2>/dev/null || true
  ```
- If neither exists — the script failed. Manually create the directory:
  ```bash
  mkdir -p .specify/specs/{NNN}-{short-name}
  cp .specify/templates/spec-template.md .specify/specs/{NNN}-{short-name}/spec.md
  ```

**1c. Define the FEATURE_DIR variable.**

Set this for all subsequent steps:
```
FEATURE_DIR=.specify/specs/{NNN}-{short-name}
```

Every artifact produced by Steps 2-7 MUST be written inside `FEATURE_DIR`. If any command tries to write elsewhere, redirect to `FEATURE_DIR`.

**1d. Run /speckit.specify to populate the spec.**

Now run /speckit.specify with the feature description. The specify command will generate the spec content. Ensure it writes to `FEATURE_DIR/spec.md` (the file created in step 1a).

- Output: `FEATURE_DIR/spec.md`
- Include: user stories with priorities, acceptance criteria, functional requirements, edge cases, success criteria, assumptions
- Scope constraint: Only what's described above. Do not add stretch goals.

**1e. Post-specify verification gate.**

After specify completes, confirm:
- [ ] `FEATURE_DIR/spec.md` exists and is non-empty
- [ ] The spec contains at least one User Story section
- [ ] The spec contains at least one Functional Requirement (FR-XXX)
- [ ] No spec artifacts were written outside `FEATURE_DIR`

If any check fails, fix it before proceeding to Step 2.

### STEP 2: CLARIFY
Run /speckit.clarify on `FEATURE_DIR/spec.md`.
- Resolve all [NEEDS CLARIFICATION] markers with reasonable defaults
- Document each decision in the spec
- If a decision requires user input (truly ambiguous, no reasonable default), mark it and continue — do NOT stop
- Verify changes were written to `FEATURE_DIR/spec.md` (not a different path)

### STEP 3: REQUIREMENTS CHECK
Run /speckit.checklist to validate `FEATURE_DIR/spec.md` quality.
- All checklist items must pass
- If any fail, fix the spec in `FEATURE_DIR/spec.md` and re-validate
- Do not proceed until all items pass

### STEP 4: CONFLICT ANALYSIS (GATE)
Analyze the spec against the EXISTING codebase. Read the actual source files, not just docs. Check:

1. **Schema conflicts** — Does this feature modify existing Prisma models in `prisma/schema.prisma`? Will migrations break existing data or relations?
2. **File conflicts** — Which existing files in `backend/src/domains/`, `frontend/src/`, `packages/shared/` must be MODIFIED (not just new files created)?
3. **API conflicts** — Do new Fastify routes collide with existing routes registered in `backend/src/app.ts`? Do existing contracts in `.specify/specs/001-haversack-unified-platform/contracts/` change?
4. **Shared schema conflicts** — Do Zod schemas in `packages/shared/src/schemas/` need breaking changes? Do shared types need modification?
5. **Component conflicts** — Do existing UI components in `frontend/src/components/` need modification to support this feature?
6. **Hook conflicts** — Do existing TanStack Query hooks in `frontend/src/hooks/` need changes that could affect other pages?
7. **Worker conflicts** — Do existing BullMQ jobs or queues need modification?
8. **Dependency conflicts** — Do new packages conflict with existing versions in any workspace?

Classify each finding:
- SAFE — New files only, no existing code touched
- ADDITIVE — Existing files modified but only by adding (new fields, new props, new imports, new enum values). Manageable.
- BREAKING — Existing contracts, types, or behavior change in ways that could break working features

**GATE RULE:**
- If ALL findings are SAFE or ADDITIVE -> Log the conflict report and CONTINUE to Step 5
- If ANY finding is BREAKING -> STOP. Output the full conflict report. Ask the user how to resolve each breaking conflict before proceeding.

Output: `FEATURE_DIR/conflicts.md`

### STEP 5: RESEARCH
Run /speckit.plan Phase 0 research.
- Document technical decisions with rationale and alternatives
- Account for conflicts identified in Step 4 (especially ADDITIVE changes)
- Research existing domain patterns: read at least one existing domain in `backend/src/domains/` to understand route/service patterns
- Research existing hook patterns: read at least one existing hook in `frontend/src/hooks/` to understand query key and mutation patterns
- Output: `FEATURE_DIR/research.md`

### STEP 6: PLAN
Run /speckit.plan (full plan).
- Include: file structure across all workspaces, data model changes, API contracts, constitution check
- For every file, mark it as NEW or MODIFIED and which workspace it belongs to (backend, frontend, worker, shared)
- For MODIFIED files, specify exactly what changes (added fields, new imports, new route registrations)
- Respect monorepo boundaries:
  - Backend routes and services in `backend/src/domains/{domain}/`
  - Frontend pages in `frontend/src/app/(dashboard)/{domain}/`
  - Frontend components in `frontend/src/components/{domain}/`
  - Frontend hooks in `frontend/src/hooks/use-{domain}.ts`
  - Shared schemas in `packages/shared/src/schemas/{domain}.schema.ts`
  - Worker jobs in `worker/src/jobs/` and queues in `worker/src/queues/`
- Output: `FEATURE_DIR/plan.md`, `FEATURE_DIR/data-model.md`, `FEATURE_DIR/quickstart.md`, `FEATURE_DIR/contracts/`

### STEP 7: TASKS — Agent Team Optimized
Run /speckit.tasks with these MANDATORY constraints for agent team execution:

**File ownership rules (Haversack-specific):**
- Every file must be assigned to exactly ONE owner (lead, or a named teammate)
- If a file is MODIFIED, only the owner of that file touches it
- Lead-owned files (NEVER assigned to teammates):
  - `prisma/schema.prisma`
  - `packages/shared/src/**` (all shared schemas, types, constants)
  - `backend/src/app.ts` (route registration)
  - `backend/src/auth/**` (auth middleware)
  - `frontend/src/components/ui/**` (shadcn/ui primitives)
  - All `package.json` / `package-lock.json` files
  - Root configs (`tsconfig.json`, `turbo.json`, `docker-compose.yml`)
- No two teammates can write to the same file — if they need to, restructure the tasks

**Task structure requirements:**
- Group tasks by teammate, not just by phase
- Mark parallel opportunities with [P]
- Mark file status: [NEW] or [MOD] for each file touched
- Mark workspace: [backend], [frontend], [worker], [shared] for each file
- Include explicit dependency chain: which tasks block which
- Include a "Team Assignment" section at the bottom mapping: teammate name -> owned files -> task IDs

**Team sizing guidance (Haversack monorepo):**
- 1-10 tasks total -> 1 teammate (backend) + lead (handles shared + frontend, or vice versa)
- 11-20 tasks total -> 2 teammates (backend + frontend) + lead (handles shared/schema/coordination)
- 21-35 tasks total -> 3 teammates (backend + frontend + worker) + lead
- 35+ tasks -> 4 teammates + lead (max recommended)

**Communication points (Haversack contract chain):**
- Lead produces: Prisma types -> Zod schemas -> shared TS types
- Backend agent consumes shared schemas, produces: API endpoint contracts
- Frontend agent consumes shared schemas + API contracts, produces: pages + hooks
- Worker agent consumes shared schemas, produces: job processors
- Mark these as SYNC POINTS — the producing task must complete and notify before the consuming task starts

Output: `FEATURE_DIR/tasks.md`

### STEP 8: FINAL VALIDATION GATE
Before building, verify:
- [ ] All spec checklist items pass
- [ ] No unresolved BREAKING conflicts
- [ ] Every file has exactly one owner
- [ ] No two teammates write to the same file
- [ ] Task dependencies form a valid DAG (no circular deps)
- [ ] Team size matches task count guidance
- [ ] All routes include auth middleware in their task description
- [ ] All database queries include tenant_id filtering in their task description
- [ ] Shared schemas are lead-owned, not assigned to teammates

If any check fails, fix it. Do not proceed to build until all pass.

### STEP 9: BUILD WITH AGENT TEAM
All gates passed. Now execute the build:

1. Create the feature branch if not already on it: `git checkout -b feature/{feature-branch}`
2. Create agent team named "feature-{number}"
3. Lead performs all setup tasks:
   - Schema migrations (prisma/schema.prisma + npx prisma migrate dev)
   - Shared Zod schemas (packages/shared/src/schemas/)
   - Shared TypeScript types (packages/shared/src/types/)
   - Route registration in backend/src/app.ts
   - Any dependency installs
   - Any shadcn/ui component additions
4. Spawn teammates per the team assignment in tasks.md
5. Assign tasks following the dependency chain and contract flow:
   - Lead setup -> Backend agent -> Frontend agent (sequential for contracts)
   - Backend + Worker can often run in parallel after lead setup
6. At each SYNC POINT, the producing teammate messages the consuming teammate
7. Lead monitors progress and handles all shared file modifications
8. After all tasks complete, lead runs the quickstart.md validation flow
9. Run full validation: `npx tsc --noEmit && npm run lint && npm test && npm run build`
10. On validation pass: commit all changes to feature branch with message: "feat({number}): {short feature description}"
11. Shut down team and clean up

**Communication rules for all teammates:**
- Never touch files outside your ownership — message the owner or lead
- Never install packages — message lead with what you need
- Never modify shared schemas or types — message lead with what you need added
- When a task is done, message lead with: task ID, files created/modified, any deviations
- If you discover the spec or contracts need changes, STOP and message lead
- If you hit an error that requires changing another teammate's file, STOP and message lead
- Always include tenant_id filtering in database queries
- Always include extractUser + requireRole in route handlers
- Always add audit trail entries for create/update/delete operations

---

## EXECUTION LOG

As you execute each step, output a one-line status:

```
[STEP 1] SPECIFY    — [DONE/SKIP/FAIL] — spec.md written, N user stories, N FRs
[STEP 2] CLARIFY    — [DONE/SKIP/FAIL] — N clarifications resolved
[STEP 3] CHECKLIST  — [DONE/SKIP/FAIL] — N/N items passing
[STEP 4] CONFLICTS  — [DONE/SKIP/FAIL] — N safe, N additive, N breaking
[STEP 5] RESEARCH   — [DONE/SKIP/FAIL] — N decisions documented
[STEP 6] PLAN       — [DONE/SKIP/FAIL] — N files planned (N new, N modified)
[STEP 7] TASKS      — [DONE/SKIP/FAIL] — N tasks, N agents, N sync points
[STEP 8] VALIDATE   — [DONE/SKIP/FAIL] — all checks passing
[STEP 9] BUILD      — [DONE/SKIP/FAIL] — N files created, N tests passing
```
