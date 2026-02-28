---
name: e2e-test
description: Comprehensive end-to-end testing for a completed feature. Launches parallel sub-agents to research the feature's user journeys, database changes, and potential bugs, then uses the Vercel Agent Browser CLI to test every journey — taking screenshots, validating UI/UX, and querying PostgreSQL to verify records. Run after feature implementation to validate everything before marking the feature complete.
disable-model-invocation: true
---

# End-to-End Feature Testing

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Valid arguments:
- `{feature name}` — test a specific feature (reads its spec.md for journeys)
- `responsive only` — skip journey testing; only run responsive viewport checks
- `report only` — skip testing; generate report from existing screenshots
- (empty) — auto-detect the most recently completed feature from the phase5 manifest

## Pre-flight Check

### 1. Platform Check

agent-browser requires **Linux, WSL, or macOS**. Check the platform:
```bash
uname -s
```
- `Linux` or `Darwin` -> proceed
- Anything else -> stop with:

> "agent-browser only supports Linux, WSL, and macOS. It cannot run on native Windows. Please run this command from WSL or a Linux/macOS environment."

Stop execution if the platform is unsupported.

### 2. Application Check

Verify the Haversack application can be tested:
- `frontend/package.json` exists with a `dev` script
- `backend/package.json` exists with a `dev` script
- Docker services are available: `docker compose ps` (PostgreSQL + Redis must be running)
- If Docker is down, start it: `npm run docker:up` and wait for healthy status

If the frontend or backend are missing:
> "Cannot run E2E tests — frontend and backend must both exist. Ensure the project scaffolding is complete."

Stop execution if prerequisites are not met.

### 3. agent-browser Installation

Check if agent-browser is installed:
```bash
agent-browser --version
```

If the command is not found, install it automatically:
```bash
npm install -g agent-browser
```

After installation (or if it was already installed), ensure the browser engine is set up:
```bash
agent-browser install --with-deps
```

Verify installation succeeded:
```bash
agent-browser --version
```

If installation fails, stop with:
> "Failed to install agent-browser. Please install it manually with `npm install -g agent-browser && agent-browser install --with-deps`, then re-run this command."

### 4. Feature Context

Determine what feature to test:
1. If user provided a feature name, find its spec directory under `.specify/specs/`.
2. If no argument, read `docs/phase5-manifest.md` and find the feature with status `BUILDING` or `COMPLETE` that has not yet been E2E tested (no `E2E: PASS` marker).
3. Read the feature's `spec.md` to extract user stories and acceptance criteria.
4. Read the feature's `tasks.md` to understand what was implemented.

Record `FEATURE_NAME`, `FEATURE_DIR`, and `SPEC_FILE` for use throughout.

---

## Phase 1: Parallel Research

Launch **three sub-agents simultaneously** using the Task tool. All three run in parallel.

### Sub-agent 1: Application Structure & User Journeys

> Research the Haversack application for the **{FEATURE_NAME}** feature. Return a structured summary covering:
>
> 1. **How to start the application** — the frontend runs on `http://localhost:3000` (Next.js), the backend API runs on `http://localhost:3001` (Fastify). Commands: `npm run dev` from repo root (Turborepo starts both). Docker must be running for PostgreSQL and Redis.
> 2. **Authentication** — check `backend/src/auth/` for login flow. Look for seed data in `prisma/seed.ts` or test fixtures for test credentials. The app uses JWT with access/refresh tokens.
> 3. **Routes for this feature** — read `frontend/src/app/(dashboard)/` for the feature's pages. List every URL path and what it renders.
> 4. **User journeys for this feature** — read `{SPEC_FILE}` for user stories and acceptance criteria. For each US, list the complete flow: specific steps, interactions (clicks, form fills, navigation), and expected outcomes. Map each to the Given/When/Then acceptance criteria.
> 5. **Key UI components** — read `frontend/src/components/{domain}/` for forms, modals, tables, and interactive elements that need testing.
>
> Be exhaustive. Testing will only cover what you identify here.

### Sub-agent 2: Database Schema & Data Flows

> Research the Haversack database layer for the **{FEATURE_NAME}** feature. Return a structured summary covering:
>
> 1. **Database connection** — PostgreSQL 16+. Connection string is in `DATABASE_URL` environment variable. Check `.env.docker` or `.env.example` for the value.
> 2. **Schema for this feature** — read `prisma/schema.prisma` and extract all models relevant to this feature. Document columns, types, relations, and RLS policies.
> 3. **Data flows per user action** — for each user story in the feature spec, document exactly what records are created, updated, or deleted and in which tables. Include tenant_id filtering expectations.
> 4. **Validation queries** — for each data flow, provide the exact `psql` command to verify records. Format: `psql "$DATABASE_URL" -c "SELECT ... FROM ... WHERE ..."`
> 5. **Audit trail** — document what audit records should be created for each write operation (per CLAUDE.md: Account, Order, Commission, User entities require immutable audit trail records).

### Sub-agent 3: Bug Hunting & Feature-Specific Risks

> Analyze the Haversack codebase for potential issues in the **{FEATURE_NAME}** feature. Read the implementation files (routes, services, components, hooks) and focus on:
>
> 1. **Tenant isolation** — verify every database query includes `tenant_id` filtering. Flag any that don't.
> 2. **Zod validation gaps** — check that all API route handlers validate input with Zod schemas before processing. Flag missing validation.
> 3. **RBAC enforcement** — verify routes check user roles. Cross-reference with the 5-role system (admin, manager, rep, logistics, viewer).
> 4. **Form validation** — check React Hook Form + Zod schemas on the frontend match backend expectations.
> 5. **Error handling** — verify API errors return structured JSON `{ error, message, code, requestId }`. Check for unhandled promise rejections.
> 6. **Logic errors** — incorrect conditionals, off-by-one, missing null checks in the feature code.
> 7. **Mobile responsiveness** — check components use Tailwind responsive classes. Flag fixed widths or non-responsive patterns.
>
> Return a prioritized list with file paths and line numbers.

**Wait for all three sub-agents to complete before proceeding.**

---

## Phase 2: Start the Application

Using Sub-agent 1's startup instructions:

1. Verify Docker services are running: `docker compose ps`
2. Run database migrations if needed: `npm run db:migrate`
3. Seed test data if available: `npm run db:seed`
4. Start the dev server **in the background**: run `npm run dev` in background
5. Wait for both servers to be ready (check `http://localhost:3000` and `http://localhost:3001/health`)
6. Open the app with `agent-browser open http://localhost:3000` and confirm it loads
7. Take an initial screenshot: `agent-browser screenshot e2e-screenshots/{feature-slug}/00-initial-load.png`

---

## Phase 3: Create Task List

Using the user journeys from Sub-agent 1, acceptance criteria from the spec, and findings from Sub-agent 3, create a task (using TaskCreate) for each user journey. Each task should include:

- **subject:** The journey name, prefixed with the user story ID (e.g., "US-016a: Test pipeline stage creation flow")
- **description:** Steps to execute (mapped from Given/When/Then acceptance criteria), expected outcomes, database records to verify, and any related bug findings from Sub-agent 3
- **activeForm:** Present continuous (e.g., "Testing pipeline stage creation flow")

Also create these additional tasks:
- "Test RBAC enforcement for {feature}" — verify each role sees/does only what it should
- "Test tenant isolation for {feature}" — verify cross-tenant data is inaccessible
- "Responsive testing across viewports for {feature}"

---

## Phase 4: User Journey Testing

For each task, mark it `in_progress` with TaskUpdate and execute the following.

### 4a. Browser Testing

Use the Vercel Agent Browser CLI for all browser interaction:

```
agent-browser open <url>              # Navigate to a page
agent-browser snapshot -i             # Get interactive elements with refs (@e1, @e2...)
agent-browser click @eN               # Click element by ref
agent-browser fill @eN "text"         # Clear field and type
agent-browser select @eN "option"     # Select dropdown option
agent-browser press Enter             # Press a key
agent-browser screenshot <path>       # Save screenshot
agent-browser screenshot --annotate   # Screenshot with numbered element labels
agent-browser set viewport W H        # Set viewport (e.g., 320 568 for mobile)
agent-browser wait --load networkidle # Wait for page to settle
agent-browser console                 # Check for JS errors
agent-browser errors                  # Check for uncaught exceptions
agent-browser get text @eN            # Get element text
agent-browser get url                 # Get current URL
agent-browser close                   # End session
```

**Refs become invalid after navigation or DOM changes.** Always re-snapshot after page navigation, form submissions, or dynamic content updates (modals, tabs, theme changes).

For each step in a user journey:

1. Snapshot to get current refs
2. Perform the interaction
3. Wait for the page to settle
4. **Take a screenshot** — save to `e2e-screenshots/{feature-slug}/{journey-slug}/{NN}-{description}.png`
5. **Analyze the screenshot** — use the Read tool to view the screenshot image. Check for:
   - Visual correctness and layout integrity
   - Skeleton loaders appearing during data fetch (not spinners — per CLAUDE.md)
   - Touch targets at least 44px on mobile viewports
   - "AI-Generated" labels on any AI-produced content
   - Proper error states and validation messages
6. Check `agent-browser console` and `agent-browser errors` periodically for JavaScript issues

Be thorough. Go through EVERY interaction, EVERY form field, EVERY button for the feature. The goal is that by the time this finishes, every part of the feature's UI has been exercised and screenshotted.

### 4b. Database Validation

After any interaction that should modify data (form submits, deletions, updates):

1. Query PostgreSQL to verify records:
   ```bash
   psql "$DATABASE_URL" -c "SELECT ... FROM ... WHERE tenant_id = '...' AND ..."
   ```
2. Verify:
   - Records created/updated/deleted as expected
   - Values match what was entered in the UI
   - `tenant_id` is correctly set on all records
   - Relationships between records are correct (foreign keys)
   - Audit trail records exist for Account, Order, Commission, User mutations
   - `updated_at` timestamps are current
   - Soft deletes use `deleted_at` (not hard deletes)
   - No orphaned or duplicate records

### 4c. RBAC Testing

For the RBAC task, test with different user roles:
1. Log in as each role (admin, manager, rep, logistics, viewer)
2. Attempt to access the feature's routes
3. Verify:
   - Unauthorized roles get proper 403 responses
   - Territory-scoped users only see their territory's data
   - Manager approval flows work for orders >= $5,000
   - Admin can access all data across territories

### 4d. Issue Handling

When an issue is found (UI bug, database mismatch, JS error, RBAC gap):

1. **Document it:** what was expected vs what happened, screenshot path, relevant DB query results
2. **Fix the code** — make the correction directly
3. **Re-run the failing step** to verify the fix worked
4. **Take a new screenshot** confirming the fix
5. **Commit the fix:** `fix(e2e): {description of what was fixed}`

### 4e. Responsive Testing

For the responsive testing task, revisit key pages at these viewports (mobile-first per CLAUDE.md):

- **Small Mobile:** `agent-browser set viewport 320 568` (minimum supported breakpoint)
- **Mobile:** `agent-browser set viewport 375 812` (iPhone standard)
- **Tablet:** `agent-browser set viewport 768 1024` (iPad)
- **Desktop:** `agent-browser set viewport 1440 900` (standard desktop)

At each viewport, screenshot every major page for this feature. Analyze for:
- Layout issues, overflow, broken alignment
- Touch target sizes (minimum 44px on mobile)
- Key actions reachable in 2 taps on mobile
- Skeleton loaders appearing correctly
- Text readability and spacing

After completing each journey, mark its task as `completed` with TaskUpdate.

---

## Phase 5: Cleanup

After all testing is complete:
1. Stop the dev server background process
2. Close the browser session: `agent-browser close`

---

## Phase 6: Report

### Text Summary (always output)

Present a concise summary:

```
## E2E Testing Complete — {FEATURE_NAME}

**Journeys Tested:** [count] (mapped to [count] acceptance criteria)
**Screenshots Captured:** [count]
**Database Validations:** [count]
**RBAC Checks:** [count roles] x [count routes]
**Responsive Viewports:** 4 (320px, 375px, 768px, 1440px)
**Issues Found:** [count] ([count] fixed, [count] remaining)

### Issues Fixed During Testing
- [Description] — [file:line] — [commit hash]

### Remaining Issues
- [Description] — [severity: high/medium/low] — [file:line]

### Acceptance Criteria Coverage
- [AC-XXXa]: PASS/FAIL — [journey name]
- [AC-XXXb]: PASS/FAIL — [journey name]

### Bug Hunt Findings (from code analysis)
- [Description] — [severity] — [file:line]

### Screenshots
All saved to: `e2e-screenshots/{feature-slug}/`
```

### Write Report File

Write the detailed report to `e2e-screenshots/{feature-slug}/report.md` containing:
- Full summary with stats
- Per-journey breakdown: steps taken, screenshots, database checks, issues found
- Acceptance criteria pass/fail matrix
- RBAC test results per role
- Responsive test results per viewport
- All issues with full details, fix status, and file references
- Bug hunt findings from the code analysis sub-agent

### Return Status

Set the exit status for the calling skill (phase5):
- If all acceptance criteria pass and no HIGH severity remaining issues: **E2E: PASS**
- If any acceptance criteria fail or HIGH severity issues remain: **E2E: FAIL**

Output the status clearly:
```
E2E STATUS: PASS ✓
```
or
```
E2E STATUS: FAIL ✗ — [count] acceptance criteria failed, [count] high-severity issues
```
