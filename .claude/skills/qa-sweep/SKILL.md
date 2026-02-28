---
name: qa-sweep
description: Full-application QA sweep — systematically tests ALL features of the live Haversack Broker OS running in Docker. Uses Chrome MCP browser automation, curl API smoke tests, and psql database verification. Fixes bugs as found, commits fixes, and tracks progress via a persistent manifest that survives conversation boundaries.
disable-model-invocation: true
---

# Full-Application QA Sweep

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Valid arguments:
- `init` — first-time setup: create manifest, begin from the top
- `resume` — read manifest, continue from last checkpoint (default if manifest exists)
- `status` — show current manifest state without executing
- `domain {name}` — test only a specific domain (e.g., `domain accounts`, `domain orders`)
- `rbac only` — skip domain testing; only run the RBAC sweep (Phase 5)
- `api only` — skip browser testing; only run API health checks and DB verification
- `report only` — skip testing; generate report from existing manifest data
- `fix {description}` — apply a specific known fix, verify, commit, update manifest
- (empty) — equivalent to `init` if no manifest exists, `resume` if one does

## Role

You are the **full-application QA orchestrator**. Your job is to systematically test every feature of the live Haversack Broker OS application by navigating the UI in a real Chrome browser, exercising API endpoints, and verifying database state. When bugs are found, you fix them immediately, verify the fix, and commit. You track all progress in a persistent manifest that survives conversation boundaries.

## Critical Rules

1. **ALWAYS** fix bugs as they are found — do not accumulate a list for later
2. **ALWAYS** verify fixes by re-testing the failing step after applying the fix
3. **ALWAYS** commit fixes individually with structured messages: `fix(qa-{domain}): {description}` (see Git Strategy)
4. **ALWAYS** take a screenshot before and after fixing a visual bug
5. **ALWAYS** update the manifest after completing each test domain
6. **NEVER** skip a test step — if a page fails to load, that IS a bug to fix
7. **NEVER** use /compact while a sweep is in progress — write manifest and tell user to `/qa-sweep resume`
8. **NEVER** commit code that breaks existing tests — run `npm test` after every fix
9. **ALWAYS** use Chrome MCP tools for browser automation (see Browser Tools section)
10. **ALWAYS** use Bash + curl for API smoke tests and Bash + psql for database verification

## Git Strategy

The QA sweep uses a **single feature branch** with structured per-fix commits, merged via PR with the full report as the PR body. This creates a complete audit trail: every fix is an individually reviewable commit, the PR captures the full sweep results, and `--no-ff` merge preserves all history in dev.

### Branch Flow

```
dev ──────────────────────────────────────── merge (--no-ff) ←── PR #NNN
  \                                           /
   fix/qa-sweep-{YYYY-MM-DD} ───────────────
     ├─ fix(qa-auth): login form missing email validation
     ├─ fix(qa-auth): logout not clearing refresh token
     ├─ fix(qa-accounts): list page crash on empty state
     ├─ fix(qa-orders): line item total rounding error
     ├─ fix(qa-rbac): rep can access /admin/rules route
     ├─ fix(qa-commissions): statement detail 500 error
     └─ chore(qa): sweep complete — 22 domains, N bugs fixed
```

### Branch Creation (Phase 0)

During pre-flight, create the QA branch:
```bash
git checkout dev
git pull origin dev 2>/dev/null || true
git checkout -b "fix/qa-sweep-$(date +%Y-%m-%d)"
```

Record `QA_BRANCH` name in the manifest.

### Commit Convention

Every fix commit follows this exact format:
```
fix(qa-{domain}): {concise description}

Domain: {domain name}
Test: {test ID, e.g., 3.2}
Severity: {HIGH|MEDIUM|LOW}
Bug: #{bug_number from manifest}
```

Example:
```
fix(qa-accounts): list page crashes when no accounts exist

Domain: Accounts List
Test: 3.1
Severity: HIGH
Bug: #3
```

### Conversation Boundary Handling

When context gets heavy and you need to tell the user to resume in a new conversation:
1. Commit all current work (even partial)
2. Push the QA branch: `git push origin {QA_BRANCH} -u`
3. Update manifest with branch name and last commit hash
4. Tell user: "Run `/qa-sweep resume` in a new conversation"

On resume:
1. Read manifest to get `QA_BRANCH`
2. `git checkout {QA_BRANCH}` and `git pull origin {QA_BRANCH}`
3. Continue from the recorded test

### PR Creation (Phase 6)

After all testing is complete:
1. Push the branch: `git push origin {QA_BRANCH} -u`
2. Run `finish-batch.sh` equivalent verification:
   ```bash
   npm test && npm run lint
   ```
3. Create PR using `gh`:
   ```bash
   gh pr create \
     --base dev \
     --head "{QA_BRANCH}" \
     --title "fix(qa): QA sweep — {N} bugs fixed across {M} domains" \
     --body "$(cat docs/qa-sweep-report.md)"
   ```
4. Record the PR URL in the manifest

The PR body IS the sweep report — domains tested, bugs found/fixed, RBAC results, API health, screenshots index. Reviewers see the full audit trail in both the PR description and individual commits.

### Merge (after review)

After the PR is reviewed and approved:
```bash
# Merge with --no-ff to preserve commit history
git checkout dev
git merge --no-ff "{QA_BRANCH}" -m "merge: qa-sweep {QA_BRANCH} into dev"
git push origin dev
```

Or the user merges via the GitHub PR UI (set to "Create a merge commit" to preserve history).

---

## Constants

```
TENANT_ID       = "00000000-0000-4000-a000-000000000001"
DATABASE_URL    = "postgresql://postgres:postgres@localhost:5432/haversack_dev"
API_BASE        = "http://localhost:4000"
APP_BASE        = "http://localhost:3000"
MANIFEST_PATH   = "docs/qa-sweep-manifest.md"
SCREENSHOT_DIR  = "qa-screenshots"
```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| admin | admin@haversack.com | AdminPass123! |
| manager | manager@haversack.com | ManagerPass123! |
| rep | rep1@haversack.com | RepPass123! |
| rep2 | rep2@haversack.com | RepPass123! |
| logistics | logistics@haversack.com | LogisticsPass123! |
| viewer | viewer@haversack.com | ViewerPass123! |

## Browser Tools Reference

All browser interaction uses the **Chrome MCP tools**. The application runs in Docker and is accessed via Chrome at `http://localhost:3000`.

### Setup (once per session)

```
tabs_context_mcp(createIfEmpty: true)   → get or create a tab group, returns tab IDs
tabs_create_mcp()                        → create a new empty tab (returns tabId)
```

Store the `tabId` — you will use it in every subsequent call.

### Navigation

```
navigate(url: "http://localhost:3000/login", tabId: TAB_ID)
```

### Reading Page Content

```
read_page(tabId: TAB_ID)                          → full accessibility tree (element refs like ref_1, ref_2)
read_page(tabId: TAB_ID, filter: "interactive")    → only buttons, links, inputs
find(query: "sign in button", tabId: TAB_ID)       → locate elements by natural language
get_page_text(tabId: TAB_ID)                        → extract raw text content
```

### Interactions

```
computer(action: "left_click", coordinate: [x, y], tabId: TAB_ID)
computer(action: "type", text: "admin@haversack.com", tabId: TAB_ID)
computer(action: "key", text: "Enter", tabId: TAB_ID)
computer(action: "key", text: "cmd+k", tabId: TAB_ID)       → open command palette
computer(action: "screenshot", tabId: TAB_ID)                 → take screenshot
computer(action: "scroll", coordinate: [x, y], scroll_direction: "down", tabId: TAB_ID)
form_input(ref: "ref_5", value: "admin@haversack.com", tabId: TAB_ID)
```

### Debugging

```
read_console_messages(tabId: TAB_ID, onlyErrors: true)              → JS errors
read_console_messages(tabId: TAB_ID, pattern: "error|warning")      → filtered logs
read_network_requests(tabId: TAB_ID)                                 → all XHR/fetch
read_network_requests(tabId: TAB_ID, urlPattern: "/api/")           → API calls only
```

### Key Patterns

- **Refs become invalid** after navigation or DOM changes. Always call `read_page` or `find` again after navigating, submitting forms, or opening modals.
- **Wait after navigation**: use `computer(action: "wait", duration: 3, tabId: TAB_ID)` after navigating or submitting.
- **Screenshots**: always take a screenshot after verifying a page or finding a bug.

---

## PHASE 0: Pre-Flight Checks

### Step 0.1: Verify Docker Services

```bash
docker compose -f docker/docker-compose.dev.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

Verify these containers are running:
- `haversack-db` (PostgreSQL, port 5432)
- `haversack-redis` (Redis, port 6379)
- `haversack-backend` (Fastify, port 4000)
- `haversack-frontend` (Next.js, port 3000)
- `haversack-worker` (BullMQ)

If Docker is not running, start it:
```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

Wait for healthy status (poll every 5s, max 90s):
```bash
for i in $(seq 1 18); do
  STATUS=$(docker compose -f docker/docker-compose.dev.yml ps --format json 2>/dev/null | grep -c '"running"' || echo 0)
  echo "Running containers: $STATUS"
  [ "$STATUS" -ge 4 ] && break
  sleep 5
done
```

### Step 0.2: Verify Database and Seed Data

```bash
psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
  -c "SELECT email, role FROM users WHERE tenant_id = '00000000-0000-4000-a000-000000000001' ORDER BY role;"
```

Expected: 6 users (admin, logistics, manager, rep x2, viewer). If missing or table doesn't exist:
```bash
docker exec haversack-backend npx tsx prisma/seed.ts
```

### Step 0.3: Verify Backend API Health

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health
```

Expected: `200`. If not responding, check Docker logs:
```bash
docker logs haversack-backend --tail 30
```

### Step 0.4: Verify Frontend

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
```

Expected: `200`. If not responding, check Docker logs:
```bash
docker logs haversack-frontend --tail 30
```

### Step 0.5: Setup Browser Tab

```
tabs_context_mcp(createIfEmpty: true)
```

If no tabs exist in the group, create one:
```
tabs_create_mcp()
```

Store the `tabId` for all subsequent browser operations. Navigate to the app:
```
navigate(url: "http://localhost:3000/login", tabId: TAB_ID)
```

Wait 3 seconds, then take a screenshot to verify the login page renders:
```
computer(action: "wait", duration: 3, tabId: TAB_ID)
computer(action: "screenshot", tabId: TAB_ID)
```

**Expected:** Login page with email field, password field, and sign-in button.

### Step 0.6: Create QA Branch

Create the QA feature branch from dev (see Git Strategy section):

```bash
cd /Users/frogx/VisualStudioProjects/haversack-broker-os
git checkout dev
git pull origin dev 2>/dev/null || true
QA_BRANCH="fix/qa-sweep-$(date +%Y-%m-%d)"
git checkout -b "$QA_BRANCH"
echo "QA branch created: $QA_BRANCH"
```

Record `QA_BRANCH` in the manifest. All fix commits will be made on this branch.

If the branch already exists (resuming a sweep started on the same date):
```bash
git checkout "$QA_BRANCH"
git pull origin "$QA_BRANCH" 2>/dev/null || true
```

### Step 0.7: Create Screenshot Directory

```bash
mkdir -p qa-screenshots/{auth,dashboard,accounts,activities,orders,products,brands,opportunities,commissions,tasks,reports,admin-rules,admin-imports,admin-quality,admin-emails,notifications,search,ai,rbac}
```

If any pre-flight check fails after remediation attempts, **STOP** and report:
```
PRE-FLIGHT FAILED: {which check} — {error details}
Cannot proceed with QA sweep until infrastructure is healthy.
```

---

## PHASE 1: Parallel Research (3 Sub-Agents)

Launch **three sub-agents simultaneously** using the Task tool with `subagent_type: "Explore"`. All three run in parallel.

### Sub-agent 1: Route & Component Inventory

> Inventory ALL frontend routes and their expected UI elements for the Haversack Broker OS application. For each route:
>
> 1. **URL path** (e.g., `/accounts`, `/accounts/new`)
> 2. **Page component file** in `frontend/src/app/(authenticated)/`
> 3. **Key UI elements** expected (tables, forms, buttons, cards, charts)
> 4. **API endpoints called** by the page (check hooks in `frontend/src/hooks/`)
> 5. **RBAC restrictions** (check `frontend/src/components/layout/sidebar.tsx` for nav items and role checks in page components)
>
> Read: `frontend/src/components/layout/sidebar.tsx`, `frontend/src/components/layout/top-bar.tsx`, every `page.tsx` under `frontend/src/app/(authenticated)/`, every hook in `frontend/src/hooks/`.
>
> Return a structured inventory grouped by domain.

### Sub-agent 2: API Endpoint Smoke Test Commands

> Inventory ALL backend API endpoints. For each endpoint:
>
> 1. **Method + Path** (e.g., `GET /api/accounts`)
> 2. **Auth requirement** (which roles can access)
> 3. **Request body** (for POST/PUT — Zod schema fields)
> 4. **Expected response shape**
>
> Read: `backend/src/app.ts` (route registration), every `*.routes.ts` in `backend/src/domains/`, `backend/src/auth/auth.routes.ts`.
>
> For each endpoint, provide a ready-to-use curl command that can be run for smoke testing (use `$TOKEN` placeholder for the auth header).

### Sub-agent 3: Known Issues & Risk Areas

> Scan the Haversack codebase for potential bugs and high-risk areas:
>
> 1. **TODO/FIXME/HACK comments** across all source files
> 2. **Console.error/console.warn calls** that suggest known issues
> 3. **Missing error boundaries** in React components
> 4. **Hardcoded values** that could break (URLs, IDs, credentials)
> 5. **Missing loading/empty states** on pages
> 6. **Recent git changes** (`git log --oneline -20`) — recently changed files are higher risk
> 7. **Missing auth checks** on API routes or pages
>
> Return a prioritized risk list with file paths and line numbers.

**Wait for all three sub-agents to complete before proceeding.**

Merge the research results into a unified test plan. If any sub-agent identifies routes or API endpoints not covered in the 22-domain list below, add them as additional test cases.

---

## PHASE 2: Manifest Creation

### Step 2.1: Create or Read Manifest

**If argument is `resume`:** Read `docs/qa-sweep-manifest.md`, parse `## Current State`, and dispatch to the recorded phase/domain/test.

**If argument is `status`:** Read manifest and output the Summary table and Domain Checklist. Do not execute any tests.

**If creating new:** Write `docs/qa-sweep-manifest.md` using this format:

```markdown
# QA Sweep Manifest

**Created:** {date}
**Last Updated:** {date time}
**QA Branch:** fix/qa-sweep-{YYYY-MM-DD}
**Base Branch:** dev
**Status:** IN_PROGRESS
**PR:** (pending — created in Phase 6)

## Summary

| Metric | Value |
|--------|-------|
| Domains Tested | 0 / 22 |
| Tests Executed | 0 |
| Tests Passed | 0 |
| Tests Failed | 0 |
| Bugs Found | 0 |
| Bugs Fixed | 0 |
| Bugs Deferred | 0 |
| Fix Commits | 0 |
| Screenshots | 0 |

## Current State

- **Active Phase:** 3 (Systematic Testing)
- **Active Domain:** 1 (Auth)
- **Active Test:** 1.1
- **Resume Point:** PHASE 3, Domain 1, Test 1.1

## Domain Checklist

| # | Domain | Status | Tests | Pass | Fail | Bugs Fixed | Screenshots |
|---|--------|--------|-------|------|------|------------|-------------|
| 1 | Auth (Login/Logout) | PENDING | -- | -- | -- | -- | -- |
| 2 | Dashboard | PENDING | -- | -- | -- | -- | -- |
| 3 | Accounts List | PENDING | -- | -- | -- | -- | -- |
| 4 | Account Detail | PENDING | -- | -- | -- | -- | -- |
| 5 | Account Forms | PENDING | -- | -- | -- | -- | -- |
| 6 | Activities | PENDING | -- | -- | -- | -- | -- |
| 7 | Orders List & Detail | PENDING | -- | -- | -- | -- | -- |
| 8 | Order Entry | PENDING | -- | -- | -- | -- | -- |
| 9 | Order Approval | PENDING | -- | -- | -- | -- | -- |
| 10 | Products | PENDING | -- | -- | -- | -- | -- |
| 11 | Brands | PENDING | -- | -- | -- | -- | -- |
| 12 | Opportunities | PENDING | -- | -- | -- | -- | -- |
| 13 | Commissions | PENDING | -- | -- | -- | -- | -- |
| 14 | Tasks | PENDING | -- | -- | -- | -- | -- |
| 15 | Reports | PENDING | -- | -- | -- | -- | -- |
| 16 | Admin: Business Rules | PENDING | -- | -- | -- | -- | -- |
| 17 | Admin: Data Import | PENDING | -- | -- | -- | -- | -- |
| 18 | Admin: Data Quality | PENDING | -- | -- | -- | -- | -- |
| 19 | Admin: Unmatched Emails | PENDING | -- | -- | -- | -- | -- |
| 20 | Notifications | PENDING | -- | -- | -- | -- | -- |
| 21 | Global Search | PENDING | -- | -- | -- | -- | -- |
| 22 | AI Features | PENDING | -- | -- | -- | -- | -- |

## RBAC Sweep

| Role | Sidebar Correct | Admin Blocked | Territory Scoped | API 403s | Status |
|------|----------------|---------------|-----------------|----------|--------|
| admin | -- | N/A | N/A | N/A | PENDING |
| manager | -- | -- | -- | -- | PENDING |
| rep | -- | -- | -- | -- | PENDING |
| logistics | -- | -- | N/A | -- | PENDING |
| viewer | -- | -- | N/A | -- | PENDING |

## Bug Log

| # | Domain | Test | Severity | Description | File(s) | Fix Commit | Status |
|---|--------|------|----------|-------------|---------|------------|--------|

## API Health

| Endpoint | Method | Status Code | Response Time | Notes |
|----------|--------|-------------|---------------|-------|
```

---

## PHASE 3: Systematic Testing

Execute each domain sequentially. After completing all tests in a domain, update the manifest Domain Checklist row and Current State before moving to the next domain.

### Helper Procedures

#### PROCEDURE: LOGIN(email, password)

1. Navigate to login page:
   ```
   navigate(url: "http://localhost:3000/login", tabId: TAB_ID)
   ```
2. Wait for page load:
   ```
   computer(action: "wait", duration: 3, tabId: TAB_ID)
   ```
3. Get interactive elements:
   ```
   read_page(tabId: TAB_ID, filter: "interactive")
   ```
4. Fill email field:
   ```
   find(query: "email input", tabId: TAB_ID)
   ```
   Use the returned ref to fill:
   ```
   form_input(ref: "{email_ref}", value: "{email}", tabId: TAB_ID)
   ```
5. Fill password field:
   ```
   find(query: "password input", tabId: TAB_ID)
   form_input(ref: "{password_ref}", value: "{password}", tabId: TAB_ID)
   ```
6. Click sign in:
   ```
   find(query: "sign in button", tabId: TAB_ID)
   computer(action: "left_click", ref: "{button_ref}", tabId: TAB_ID)
   ```
7. Wait for redirect:
   ```
   computer(action: "wait", duration: 3, tabId: TAB_ID)
   ```
8. Verify login succeeded:
   ```
   read_page(tabId: TAB_ID)
   ```
   Confirm the page shows dashboard content, not the login form.
9. Take confirmation screenshot:
   ```
   computer(action: "screenshot", tabId: TAB_ID)
   ```

#### PROCEDURE: NAVIGATE(path)

1. Navigate:
   ```
   navigate(url: "http://localhost:3000{path}", tabId: TAB_ID)
   ```
2. Wait:
   ```
   computer(action: "wait", duration: 3, tabId: TAB_ID)
   ```
3. Check for JS errors:
   ```
   read_console_messages(tabId: TAB_ID, onlyErrors: true)
   ```
4. Read page content:
   ```
   read_page(tabId: TAB_ID)
   ```
5. Screenshot:
   ```
   computer(action: "screenshot", tabId: TAB_ID)
   ```

#### PROCEDURE: BUG_FIX(domain, test_id, severity, description)

1. **Document:** Add entry to manifest Bug Log with next bug number (status: INVESTIGATING)
2. **Screenshot before:** `computer(action: "screenshot", tabId: TAB_ID)` — save reference
3. **Investigate:** Read relevant source files using Read tool to understand root cause
4. **Fix:** Edit the source file(s) with minimal changes using Edit tool
5. **Run tests:**
   ```bash
   cd /Users/frogx/VisualStudioProjects/haversack-broker-os && npm test 2>&1 | tail -20
   ```
   If tests fail, revert the fix (`git checkout -- {files}`) and mark bug as DEFERRED. Continue testing.
6. **Reload page:** `navigate(url: "http://localhost:3000{current_path}", tabId: TAB_ID)`
7. **Re-test:** Execute the failing test step again to verify the fix
8. **Screenshot after:** `computer(action: "screenshot", tabId: TAB_ID)`
9. **Commit with structured message** (see Git Strategy section for format):
   ```bash
   git add {changed_files}
   git commit -m "$(cat <<'EOF'
   fix(qa-{domain_slug}): {concise description}

   Domain: {domain name}
   Test: {test_id}
   Severity: {severity}
   Bug: #{bug_number}

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
   Where `{domain_slug}` is the kebab-case domain name (e.g., `accounts`, `order-entry`, `admin-rules`).
10. **Update manifest:** Bug status -> FIXED, record commit hash and changed file(s)

---

### Domain 1: Auth (Login/Logout)

#### Test 1.1: Login Page Renders
- NAVIGATE(`/login`)
- **Verify via `read_page`:**
  - Email input field present
  - Password input field present
  - Sign-in button present
  - Page title or heading contains "Haversack" or "Sign in"
- **Screenshot:** `qa-screenshots/auth/01-login-page.jpg`

#### Test 1.2: Login Validation — Empty Fields
- Click sign-in without filling fields
- **Verify via `read_page`:** Validation error messages appear for email and password
- **Screenshot:** `qa-screenshots/auth/02-validation-empty.jpg`

#### Test 1.3: Login Validation — Invalid Credentials
- Fill email: `wrong@haversack.com`, password: `WrongPass123!`
- Click sign-in, wait 3 seconds
- **Verify via `read_page`:** Error message visible (e.g., "Invalid credentials")
- User remains on `/login`
- **Screenshot:** `qa-screenshots/auth/03-validation-invalid.jpg`

#### Test 1.4: Successful Login — Admin
- LOGIN(`admin@haversack.com`, `AdminPass123!`)
- **Verify via `read_page`:**
  - URL is `/dashboard` (or `/app/dashboard`)
  - Sidebar navigation visible with all nav items
  - Top bar shows user info and role
  - Notification bell icon visible
- **Screenshot:** `qa-screenshots/auth/04-admin-login.jpg`
- **API verification:**
  ```bash
  TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@haversack.com","password":"AdminPass123!"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken','FAILED'))")
  echo "Token: ${TOKEN:0:20}..."
  curl -s http://localhost:4000/api/auth/me -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
  ```

#### Test 1.5: Login All 6 Accounts
For EACH user in the credentials table:
1. NAVIGATE(`/login`) (logs out if needed, or click logout first)
2. LOGIN(`{email}`, `{password}`)
3. **Verify:** Dashboard loads successfully
4. **Verify via `read_page`:** Sidebar shows role-appropriate nav items
   - admin: all items including Admin section
   - manager: most items, may include approval queue
   - rep: accounts, orders, activities, tasks, pipeline
   - logistics: limited nav items
   - viewer: read-only items only
5. **Screenshot:** `qa-screenshots/auth/05-{role}-login.jpg`

#### Test 1.6: Logout Flow
- While logged in as admin, find and click the logout/sign-out element
- **Verify via `read_page`:** Redirected to `/login`, no authenticated content visible
- **Screenshot:** `qa-screenshots/auth/06-logout.jpg`

**Update manifest:** Domain 1 complete. Record counts.

---

### Domain 2: Dashboard

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 2.1: Dashboard Page Load
- NAVIGATE(`/dashboard`)
- **Verify via `read_page`:**
  - Page heading or title related to Dashboard
  - KPI cards/widgets present (revenue, orders, accounts, activities)
  - Chart elements present (SVG, canvas, or recharts components)
- **Check errors:** `read_console_messages(tabId: TAB_ID, onlyErrors: true)`
- **Screenshot:** `qa-screenshots/dashboard/01-dashboard.jpg`

#### Test 2.2: Dashboard Data Display
- **Verify via `read_page` and `get_page_text`:**
  - Numeric values appear formatted (currency with $, percentages)
  - No "NaN", "undefined", or "null" visible in data displays
  - Date ranges are reasonable (not epoch dates)
- **Screenshot:** `qa-screenshots/dashboard/02-dashboard-data.jpg`

#### Test 2.3: Dashboard as Rep
- LOGIN(`rep1@haversack.com`, `RepPass123!`)
- NAVIGATE(`/dashboard`)
- **Verify via `read_page`:** Dashboard shows rep-specific view (territory-scoped)
- **Screenshot:** `qa-screenshots/dashboard/03-rep-dashboard.jpg`

**Update manifest:** Domain 2 complete.

---

### Domain 3: Accounts List

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 3.1: Page Load
- NAVIGATE(`/accounts`)
- **Verify via `read_page`:**
  - Data table or list with account rows (or empty state with message)
  - Column headers (Name, Type, Territory, Health Score or similar)
  - "New Account" button/link
  - Filter/search controls
- **Screenshot:** `qa-screenshots/accounts/01-list.jpg`
- **API:**
  ```bash
  curl -s "http://localhost:4000/api/accounts" -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Count: {len(d.get(\"data\",[]))}')"
  ```

#### Test 3.2: Search/Filter
- If search input exists, type a search query (e.g., first few letters of a known account)
- **Verify:** Table filters to matching results
- Clear the search
- **Screenshot:** `qa-screenshots/accounts/02-search.jpg`

#### Test 3.3: Row Click-Through
- Click on an account row
- **Verify:** Navigates to `/accounts/{id}` detail page
- **Screenshot:** `qa-screenshots/accounts/03-clickthrough.jpg`

**Update manifest:** Domain 3 complete.

---

### Domain 4: Account Detail

#### Test 4.1: Detail Page Load
- Navigate to an account detail page (from Domain 3 click-through, or find an ID from the API)
- **Verify via `read_page`:**
  - Account name displayed prominently
  - Tab navigation present (Overview, Contacts, Timeline, Orders, Opportunities)
  - Overview tab content visible
  - Edit button present
- **Screenshot:** `qa-screenshots/accounts/04-detail.jpg`

#### Test 4.2: Tab Navigation
For each tab visible on the page:
- Click the tab
- Wait 2 seconds
- **Verify via `read_page`:** Tab content loads (data or empty state)
- **Screenshot:** `qa-screenshots/accounts/05-tab-{name}.jpg`

#### Test 4.3: Health Score Display
- **Verify via `read_page`:** Health score (0-100) displayed with visual indicator
- **DB:**
  ```bash
  psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
    -c "SELECT id, name, health_score FROM accounts WHERE tenant_id = '00000000-0000-4000-a000-000000000001' LIMIT 5;"
  ```

**Update manifest:** Domain 4 complete.

---

### Domain 5: Account Forms (Create/Edit)

LOGIN(`rep1@haversack.com`, `RepPass123!`)

#### Test 5.1: New Account Form
- NAVIGATE(`/accounts/new`)
- **Verify via `read_page`:**
  - Form with fields: name, type, territory, address fields
  - Submit button
  - Cancel/Back button
- **Screenshot:** `qa-screenshots/accounts/06-new-form.jpg`

#### Test 5.2: Validation — Empty Submit
- Click submit without filling required fields
- **Verify via `read_page`:** Validation error messages on required fields
- **Screenshot:** `qa-screenshots/accounts/07-validation.jpg`

#### Test 5.3: Create Account
- Fill form with valid data:
  - Name: "QA Sweep Test Account"
  - Type: select first available option
  - Territory: select available territory
  - Fill other required fields
- Submit
- Wait 3 seconds
- **Verify:** Success — redirected to detail or list, success message shown
- **Screenshot:** `qa-screenshots/accounts/08-created.jpg`
- **DB:**
  ```bash
  psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
    -c "SELECT id, name, account_type, created_at FROM accounts WHERE name LIKE 'QA Sweep%' ORDER BY created_at DESC LIMIT 1;"
  ```

#### Test 5.4: Edit Account
- Navigate to the created account's detail page
- Click Edit button
- **Verify:** Edit form with pre-populated data
- Change the name to "QA Sweep Test Account Edited"
- Submit
- **Verify:** Changes reflected in detail view
- **Screenshot:** `qa-screenshots/accounts/09-edited.jpg`

#### Test 5.5: Duplicate Detection
- NAVIGATE(`/accounts/new`)
- Enter a name matching an existing account
- **Verify via `read_page`:** Duplicate warning appears (if implemented)
- **Screenshot:** `qa-screenshots/accounts/10-duplicate.jpg`

**Update manifest:** Domain 5 complete.

---

### Domain 6: Activities

LOGIN(`rep1@haversack.com`, `RepPass123!`)

#### Test 6.1: Activities Page Load
- NAVIGATE(`/activities`)
- **Verify via `read_page`:**
  - Activity list/timeline present
  - Activity type indicators
  - Add/quick-log button
- **Screenshot:** `qa-screenshots/activities/01-page.jpg`

#### Test 6.2: Create Activity
- Click add/quick-log button
- **Verify via `read_page`:** Form or modal appears
- Fill: activity type, account, notes ("QA test activity")
- Submit
- **Verify:** New activity appears in list
- **Screenshot:** `qa-screenshots/activities/02-created.jpg`
- **DB:**
  ```bash
  psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
    -c "SELECT id, activity_type, notes, created_at FROM activities WHERE tenant_id = '00000000-0000-4000-a000-000000000001' ORDER BY created_at DESC LIMIT 3;"
  ```

**Update manifest:** Domain 6 complete.

---

### Domain 7: Orders List & Detail

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 7.1: Orders List
- NAVIGATE(`/orders`)
- **Verify via `read_page`:**
  - Order table/list with rows
  - Status badges (draft, pending, approved, etc.)
  - "New Order" button
- **Screenshot:** `qa-screenshots/orders/01-list.jpg`
- **API:**
  ```bash
  curl -s "http://localhost:4000/api/orders" -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Orders: {len(d.get(\"data\",[]))}')"
  ```

#### Test 7.2: Order Detail
- Click on an order row (or navigate to `/orders/{id}`)
- **Verify via `read_page`:**
  - Order header (number, status, date)
  - Line items table
  - Total amounts
- **Screenshot:** `qa-screenshots/orders/02-detail.jpg`

**Update manifest:** Domain 7 complete.

---

### Domain 8: Order Entry

LOGIN(`rep1@haversack.com`, `RepPass123!`)

#### Test 8.1: New Order Form
- NAVIGATE(`/orders/new`)
- **Verify via `read_page`:**
  - Account selector
  - Product search/add area
  - Line items section
  - Submit/save button
- **Screenshot:** `qa-screenshots/orders/03-new-form.jpg`

#### Test 8.2: Add Products
- Select an account
- Search for a product, add it
- **Verify via `read_page`:** Product in line items, quantity editable, total calculated
- **Screenshot:** `qa-screenshots/orders/04-line-items.jpg`

#### Test 8.3: Submit Order
- Fill all required fields and submit
- **Verify:** Order created successfully
- **Screenshot:** `qa-screenshots/orders/05-submitted.jpg`
- **DB:**
  ```bash
  psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
    -c "SELECT id, order_number, status, total_amount FROM orders WHERE tenant_id = '00000000-0000-4000-a000-000000000001' ORDER BY created_at DESC LIMIT 3;"
  ```

**Update manifest:** Domain 8 complete.

---

### Domain 9: Order Approval

LOGIN(`manager@haversack.com`, `ManagerPass123!`)

#### Test 9.1: Approval Queue
- NAVIGATE(`/orders/approval-queue`)
- **Verify via `read_page`:** Approval queue page loads with pending orders (if any) or empty state
- **Screenshot:** `qa-screenshots/orders/06-approval-queue.jpg`

#### Test 9.2: RBAC — Rep Cannot Access
- LOGIN(`rep1@haversack.com`, `RepPass123!`)
- NAVIGATE(`/orders/approval-queue`)
- **Verify:** Access denied or redirect
- **Screenshot:** `qa-screenshots/orders/07-approval-rbac.jpg`

**Update manifest:** Domain 9 complete.

---

### Domain 10: Products

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 10.1: Products List
- NAVIGATE(`/products`)
- **Verify via `read_page`:** Product grid/list with names, brands, prices
- **Screenshot:** `qa-screenshots/products/01-list.jpg`

#### Test 10.2: Product Detail
- Click a product
- **Verify via `read_page`:** Detail page with name, description, pricing, brand
- **Screenshot:** `qa-screenshots/products/02-detail.jpg`

**Update manifest:** Domain 10 complete.

---

### Domain 11: Brands

#### Test 11.1: Brands List
- NAVIGATE(`/brands`)
- **Verify via `read_page`:** Brand list/grid with names
- **Screenshot:** `qa-screenshots/brands/01-list.jpg`

#### Test 11.2: Brand Detail
- Click a brand
- **Verify via `read_page`:** Brand detail with associated products
- **Screenshot:** `qa-screenshots/brands/02-detail.jpg`

**Update manifest:** Domain 11 complete.

---

### Domain 12: Opportunities

LOGIN(`rep1@haversack.com`, `RepPass123!`)

#### Test 12.1: Pipeline/Kanban View
- NAVIGATE(`/opportunities`)
- **Verify via `read_page`:** Kanban board with pipeline stages, or list view
- **Screenshot:** `qa-screenshots/opportunities/01-pipeline.jpg`

#### Test 12.2: New Opportunity
- NAVIGATE(`/opportunities/new`)
- **Verify via `read_page`:** Form with name, account, stage, value, close date
- Fill and submit
- **Verify:** Created successfully
- **Screenshot:** `qa-screenshots/opportunities/02-created.jpg`
- **DB:**
  ```bash
  psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
    -c "SELECT id, name, stage, estimated_value FROM opportunities WHERE tenant_id = '00000000-0000-4000-a000-000000000001' ORDER BY created_at DESC LIMIT 3;"
  ```

#### Test 12.3: Opportunity Detail
- Navigate to `/opportunities/{id}`
- **Verify via `read_page`:** Detail page with stage, value, history
- **Screenshot:** `qa-screenshots/opportunities/03-detail.jpg`

**Update manifest:** Domain 12 complete.

---

### Domain 13: Commissions

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 13.1: Commissions Page
- NAVIGATE(`/commissions`)
- **Verify via `read_page`:** Commission list/dashboard with amounts, periods
- **Screenshot:** `qa-screenshots/commissions/01-page.jpg`

#### Test 13.2: Commission Detail
- Click a commission entry (or navigate to `/commissions/{id}`)
- **Verify via `read_page`:** Calculation breakdown, rates, amounts
- **Screenshot:** `qa-screenshots/commissions/02-detail.jpg`

**Update manifest:** Domain 13 complete.

---

### Domain 14: Tasks

LOGIN(`rep1@haversack.com`, `RepPass123!`)

#### Test 14.1: Tasks Page
- NAVIGATE(`/tasks`)
- **Verify via `read_page`:** Task list, filters (status/priority/overdue), create button
- **Screenshot:** `qa-screenshots/tasks/01-page.jpg`

#### Test 14.2: Create Task
- Click create button, fill form (title, due date, priority), submit
- **Verify:** Task appears in list
- **Screenshot:** `qa-screenshots/tasks/02-created.jpg`
- **DB:**
  ```bash
  psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
    -c "SELECT id, title, status, priority FROM tasks WHERE tenant_id = '00000000-0000-4000-a000-000000000001' ORDER BY created_at DESC LIMIT 3;"
  ```

**Update manifest:** Domain 14 complete.

---

### Domain 15: Reports

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 15.1: Reports List
- NAVIGATE(`/reports`)
- **Verify via `read_page`:** Reports page, "New Report" button
- **Screenshot:** `qa-screenshots/reports/01-list.jpg`

#### Test 15.2: Report Builder
- NAVIGATE(`/reports/new`)
- **Verify via `read_page`:** Builder form with entity/filter/column selection
- **Screenshot:** `qa-screenshots/reports/02-builder.jpg`

**Update manifest:** Domain 15 complete.

---

### Domain 16: Admin — Business Rules

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 16.1: Rules List
- NAVIGATE(`/admin/rules`)
- **Verify via `read_page`:** Rules list page, "New Rule" button
- **Screenshot:** `qa-screenshots/admin-rules/01-list.jpg`

#### Test 16.2: New Rule Form
- NAVIGATE(`/admin/rules/new`)
- **Verify via `read_page`:** Rule creation form with type selector, conditions
- **Screenshot:** `qa-screenshots/admin-rules/02-new.jpg`

#### Test 16.3: RBAC — Non-Admin Blocked
- LOGIN(`rep1@haversack.com`, `RepPass123!`)
- NAVIGATE(`/admin/rules`)
- **Verify:** Access denied or redirect
- **Screenshot:** `qa-screenshots/admin-rules/03-rbac.jpg`

**Update manifest:** Domain 16 complete.

---

### Domain 17: Admin — Data Import

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 17.1: Imports List
- NAVIGATE(`/admin/imports`)
- **Verify via `read_page`:** Import list page, "New Import" button
- **Screenshot:** `qa-screenshots/admin-imports/01-list.jpg`

#### Test 17.2: Import Wizard
- NAVIGATE(`/admin/imports/new`)
- **Verify via `read_page`:** Multi-step wizard (type, upload, preview, confirm)
- **Screenshot:** `qa-screenshots/admin-imports/02-wizard.jpg`

**Update manifest:** Domain 17 complete.

---

### Domain 18: Admin — Data Quality

#### Test 18.1: Quality Scorecard
- NAVIGATE(`/admin/quality`)
- **Verify via `read_page`:** Quality page with composite score, metric cards
- **Screenshot:** `qa-screenshots/admin-quality/01-scorecard.jpg`

**Update manifest:** Domain 18 complete.

---

### Domain 19: Admin — Unmatched Emails

#### Test 19.1: Unmatched Emails Page
- NAVIGATE(`/admin/emails/unmatched`)
- **Verify via `read_page`:** Page loads with email list or empty state
- **Screenshot:** `qa-screenshots/admin-emails/01-page.jpg`

**Update manifest:** Domain 19 complete.

---

### Domain 20: Notifications

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 20.1: Notification Bell
- Find the notification bell icon in the top bar:
  ```
  find(query: "notification bell", tabId: TAB_ID)
  ```
- **Verify:** Bell icon exists, may have unread count badge
- Click the bell
- Wait 2 seconds
- **Verify via `read_page`:** Notification dropdown/panel opens
- **Screenshot:** `qa-screenshots/notifications/01-panel.jpg`
- **API:**
  ```bash
  curl -s "http://localhost:4000/api/notifications" -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Notifications: {len(d.get(\"data\",[]))}')"
  ```

**Update manifest:** Domain 20 complete.

---

### Domain 21: Global Search

#### Test 21.1: Open Command Palette
- Trigger Cmd+K:
  ```
  computer(action: "key", text: "cmd+k", tabId: TAB_ID)
  ```
  Or find and click the search trigger in the top bar.
- Wait 1 second
- **Verify via `read_page`:** Search modal/palette open with input field
- **Screenshot:** `qa-screenshots/search/01-palette.jpg`

#### Test 21.2: Search Query
- Type a search query:
  ```
  computer(action: "type", text: "test", tabId: TAB_ID)
  ```
- Wait 1 second (300ms debounce + network)
- **Verify via `read_page`:** Search results appear, categorized by type
- **Screenshot:** `qa-screenshots/search/02-results.jpg`

#### Test 21.3: Click Result
- Click on a search result
- **Verify:** Navigates to the correct detail page
- **Screenshot:** `qa-screenshots/search/03-navigate.jpg`

**Update manifest:** Domain 21 complete.

---

### Domain 22: AI Features

LOGIN(`admin@haversack.com`, `AdminPass123!`)

#### Test 22.1: AI Feature Access
- Navigate to an account detail page
- Look for AI feature buttons (Meeting Brief, Email Draft, Activity Summary)
- **Verify via `read_page`:** AI action buttons or panels present
- **Screenshot:** `qa-screenshots/ai/01-buttons.jpg`

#### Test 22.2: AI Generation
- Click an AI feature button (e.g., Meeting Brief)
- Wait 5 seconds (AI has 5s timeout)
- **Verify via `read_page`:**
  - AI-generated content appears, OR
  - Graceful error message if AI API is not configured
  - "AI-Generated" label on any AI output
  - Content is editable
- **Screenshot:** `qa-screenshots/ai/02-generated.jpg`

#### Test 22.3: AI Degradation
- Check console for unhandled errors: `read_console_messages(tabId: TAB_ID, onlyErrors: true)`
- **Verify:** No JavaScript crashes from AI failures — app remains functional
- **Screenshot:** `qa-screenshots/ai/03-degradation.jpg`

**Update manifest:** Domain 22 complete.

---

### Cross-Domain: API Smoke Test

After completing all UI domains, run a comprehensive API smoke test:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@haversack.com","password":"AdminPass123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken','FAILED'))")

for EP in \
  "GET /api/health" \
  "GET /api/auth/me" \
  "GET /api/accounts" \
  "GET /api/activities" \
  "GET /api/tasks" \
  "GET /api/orders" \
  "GET /api/products" \
  "GET /api/brands" \
  "GET /api/opportunities" \
  "GET /api/commissions" \
  "GET /api/notifications" \
  "GET /api/dashboards/rep" \
  "GET /api/reports" \
  "GET /api/territories"; do
  METHOD=$(echo "$EP" | cut -d' ' -f1)
  PATH_=$(echo "$EP" | cut -d' ' -f2)
  START=$(date +%s%N)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "http://localhost:4000$PATH_" \
    -H "Authorization: Bearer $TOKEN")
  END=$(date +%s%N)
  MS=$(( (END - START) / 1000000 ))
  echo "$STATUS ${MS}ms $METHOD $PATH_"
done
```

Record all results in the manifest API Health table. Any non-2xx response is a potential issue to investigate.

---

## PHASE 4: Bug Fix Loop (Continuous)

This phase runs **throughout Phase 3** whenever a bug is found.

### Severity Classification

| Severity | Criteria | Action |
|----------|----------|--------|
| HIGH | Page crash, white screen, data loss, security bypass, login failure | Fix immediately |
| MEDIUM | Feature broken (workaround exists), layout issue, incorrect data | Fix immediately |
| LOW | Minor visual glitch, console warning, non-critical UX | Fix if quick (<5 min), else DEFER |

### Fix Workflow

Execute BUG_FIX procedure (defined in Helper Procedures above).

### Skip Rules

If a bug requires:
- Architectural changes beyond a single-file fix
- Database migration changes
- Third-party API configuration (e.g., AI API keys)
- Infrastructure/Docker changes

Mark it as **DEFERRED** in the Bug Log with a detailed description and suggested approach. Continue testing.

---

## PHASE 5: RBAC Sweep

After all 22 domains are tested, do a focused RBAC sweep.

### Step 5.1: Per-Role Verification

For each role (admin, manager, rep, logistics, viewer):

1. LOGIN with that role's credentials
2. **Sidebar check:** `read_page(tabId: TAB_ID)` — document which nav items are visible
3. **Navigate to every route:** Test each of these URLs:
   - `/dashboard`
   - `/accounts`
   - `/orders`
   - `/activities`
   - `/tasks`
   - `/opportunities`
   - `/commissions`
   - `/products`
   - `/brands`
   - `/reports`
   - `/admin/rules`
   - `/admin/imports`
   - `/admin/quality`
   - `/admin/emails/unmatched`
4. For each: record whether the page loads (allowed) or shows access denied (blocked)
5. **Screenshot:** `qa-screenshots/rbac/{role}-sidebar.jpg`

### Step 5.2: Territory Scoping (rep role)

1. LOGIN as rep1 (Portland Metro territory)
2. NAVIGATE(`/accounts`)
3. `get_page_text(tabId: TAB_ID)` — verify only Portland Metro accounts visible
4. **DB cross-check:**
   ```bash
   psql "postgresql://postgres:postgres@localhost:5432/haversack_dev" \
     -c "SELECT a.name, t.name as territory FROM accounts a JOIN territories t ON a.territory_id = t.id WHERE a.tenant_id = '00000000-0000-4000-a000-000000000001';"
   ```

### Step 5.3: Manager Approval Access

1. LOGIN as manager
2. NAVIGATE(`/orders/approval-queue`) — should load
3. LOGIN as rep
4. NAVIGATE(`/orders/approval-queue`) — should be blocked

Update manifest RBAC Sweep table for each role.

---

## PHASE 6: Report Generation

### Step 6.1: Final Test Suite Check

```bash
cd /Users/frogx/VisualStudioProjects/haversack-broker-os && npm test 2>&1 | tail -30
```

Ensure no regressions from QA fixes.

### Step 6.2: Generate Report

Write `docs/qa-sweep-report.md`:

```markdown
# QA Sweep Report — Haversack Broker OS

**Date:** {date}
**Branch:** {branch}
**Performed by:** Claude Code QA Sweep

## Executive Summary

| Metric | Value |
|--------|-------|
| Domains Tested | {N} / 22 |
| Tests Executed | {N} |
| Tests Passed | {N} |
| Tests Failed | {N} |
| Pass Rate | {N}% |
| Bugs Found | {N} |
| Bugs Fixed | {N} |
| Bugs Deferred | {N} |
| Fix Commits | {N} |
| Screenshots | {N} |

## Domain Results

{For each domain: status, test count, pass/fail, bugs, screenshots}

## RBAC Sweep Results

| Role | Sidebar | Admin Routes | Territory | API | Status |
|------|---------|-------------|-----------|-----|--------|
{Per-role results}

## API Health Check

{Endpoint table from manifest}

## Bug Log

{Full bug log with fix details}

## Deferred Issues

{Bugs requiring larger changes — description and recommended approach}

## Screenshots Index

All saved to: `qa-screenshots/`
```

### Step 6.3: Final Commit and Push

Add a summary commit and push the QA branch:

```bash
# Commit the report and manifest as the final entry
git add docs/qa-sweep-report.md docs/qa-sweep-manifest.md
git commit -m "$(cat <<'EOF'
chore(qa): sweep complete — {N} domains tested, {M} bugs fixed

QA Sweep Summary:
- Domains: {tested}/22
- Tests: {passed}/{total} ({rate}%)
- Bugs: {found} found, {fixed} fixed, {deferred} deferred
- RBAC: {roles}/5 roles verified

Full report: docs/qa-sweep-report.md

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# Push the branch
git push origin "$(git rev-parse --abbrev-ref HEAD)" -u
```

### Step 6.4: Verification Gate

Run the same checks as `finish-batch.sh`:

```bash
echo "[1/3] Running tests..."
npm test

echo "[2/3] Running linter..."
npm run lint

echo "[3/3] Type check..."
npx tsc --noEmit 2>/dev/null || echo "(typecheck skipped)"
```

If any check fails, fix it (using the BUG_FIX procedure), then re-run.

### Step 6.5: Create Pull Request

Create a PR with the full report as the body:

```bash
gh pr create \
  --base dev \
  --head "$(git rev-parse --abbrev-ref HEAD)" \
  --title "$(cat <<'EOF'
fix(qa): QA sweep — {N} bugs fixed across {M} domains
EOF
)" \
  --body "$(cat docs/qa-sweep-report.md)"
```

Record the PR URL in the manifest. Output it to the user:
```
PR created: {PR_URL}
```

If `gh` is not available or the push fails, instruct the user:
```
Branch pushed: {QA_BRANCH}
Create a PR manually: git -> dev, title: "fix(qa): QA sweep — {N} bugs fixed"
Use docs/qa-sweep-report.md as the PR description.
```

### Step 6.6: Final Manifest Update

Update manifest: Status -> COMPLETE, PR URL recorded, all metrics finalized, Last Updated timestamp.

### Step 6.7: Final Output

```
======================================================
  QA SWEEP COMPLETE — Haversack Broker OS
======================================================

  Domains:  {N}/22 tested
  Tests:    {passed}/{total} passed ({rate}%)
  Bugs:     {found} found, {fixed} fixed, {deferred} deferred
  RBAC:     {N}/5 roles verified
  Commits:  {N} fix commits applied

  Report:      docs/qa-sweep-report.md
  Screenshots: qa-screenshots/
  Manifest:    docs/qa-sweep-manifest.md

  OVERALL STATUS: {PASS / NEEDS ATTENTION}
======================================================
```

**PASS** if: all HIGH bugs fixed, all 22 domains tested, all 5 RBAC roles verified, `npm test` passes.
**NEEDS ATTENTION** if: any HIGH bugs deferred, domains untested, or RBAC violations found.

---

## Error Recovery Reference

| Scenario | Manifest State | On Resume |
|----------|---------------|-----------|
| Context exhausted mid-domain | Active Domain + Test recorded, branch pushed | `git checkout {QA_BRANCH}`, continue from test |
| Docker crashed | Active state recorded | Re-run pre-flight, resume from test |
| Fix broke tests | Bug marked ATTEMPTED | `git checkout -- {files}`, mark DEFERRED, continue |
| Page unreachable | Domain marked BLOCKED | Skip to next domain, retry later |
| Login session expired | Active Domain/Test recorded | Re-login, resume from test |
| Browser tab lost | Tab ID invalid | Re-run Step 0.5, resume |
| Branch diverged (someone pushed to dev) | QA_BRANCH has all fix commits | Rebase after sweep: `git rebase dev` |
| Resume in new conversation | QA_BRANCH + last commit in manifest | `git checkout {QA_BRANCH}`, read manifest, dispatch |

## Context Budget

| Phase | ~Tokens | Notes |
|-------|---------|-------|
| Phase 0 | ~2K | Quick checks |
| Phase 1 | ~15K | Three sub-agents (parallel) |
| Phase 2 | ~3K | Manifest creation |
| Phase 3 | ~5-8K per domain | 22 domains = ~120-175K total |
| Phase 4 | ~3-5K per fix | Variable |
| Phase 5 | ~10K | 5 roles across all routes |
| Phase 6 | ~5K | Report generation |

**This WILL span multiple conversations.** When context gets heavy, write the manifest checkpoint and instruct:
```
Context is getting heavy. Checkpoint saved at Domain {N}, Test {M}.
Run /qa-sweep resume in a new conversation to continue.
```
