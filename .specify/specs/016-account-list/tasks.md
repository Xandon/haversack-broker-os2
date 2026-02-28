# Tasks — F-002a: Account List & Search

**Feature**: Account List & Search (FR-033)
**Task Range**: T284-T297
**Batch Range**: 40-41
**Base Branch**: dev

## Batch 40: Backend + Frontend Foundation (T284-T290)

**Branch**: `feature/batch-40-account-list-foundation`
**Focus**: Territory API, backend service modification, frontend hooks, column definitions, health score badge

### T284: Create territory list endpoint (P1)
**US**: US-3 (Manager Views All Territories) | **FR**: FR-033c, FR-033f
**Files**:
- `packages/shared/src/schemas/territory.schema.ts` (NEW)
- `packages/shared/src/index.ts` (MOD — add territory exports)
- `backend/src/domains/territories/territory.routes.ts` (NEW)
- `backend/src/domains/territories/territory.routes.test.ts` (NEW)
- `backend/src/app.ts` (MOD — register territoryRoutes)
**Workspace**: backend, shared
**Dependencies**: None
**Description**: Create GET /api/territories returning active territories for the tenant. Zod schema for response in shared package. Route requires authentication. Tests: returns territories filtered by tenant, returns only active, 401 without auth.

### T285: Add territory include to listAccounts (P1)
**US**: US-1 (Rep Views Territory Accounts) | **FR**: FR-033b
**Files**:
- `backend/src/domains/accounts/account.service.ts` (MOD — add territory include)
**Workspace**: backend
**Dependencies**: None
**Description**: Modify the listAccounts Prisma query to include `territory: { select: { id: true, name: true } }`. Update the return type accordingly. Existing tests should still pass; add one test verifying territory name is included in response.

### T286: Create useAccounts hook (P1)
**US**: US-1 (Rep Views Territory Accounts) | **FR**: FR-033a, FR-033e, FR-033j
**Files**:
- `frontend/src/hooks/use-accounts.ts` (NEW)
- `frontend/src/hooks/use-accounts.test.ts` (NEW)
**Workspace**: frontend
**Dependencies**: T285 (backend returns territory data)
**Description**: TanStack Query hook accepting filter params (territoryId, accountType, healthScoreMin, healthScoreMax, search, sortBy, sortOrder, cursor, limit). Query key includes all filter values. Returns typed data + pagination. Tests: builds correct query string, handles loading/error states, invalidation on filter change.

### T287: Create useTerritories hook (P1)
**US**: US-2 (Filter Accounts), US-3 (Manager Views All Territories) | **FR**: FR-033c
**Files**:
- `frontend/src/hooks/use-territories.ts` (NEW)
- `frontend/src/hooks/use-territories.test.ts` (NEW)
**Workspace**: frontend
**Dependencies**: T284 (territory endpoint exists)
**Description**: TanStack Query hook for GET /api/territories. staleTime: 5 minutes. Query key: ['territories']. Tests: fetches territories, caches correctly, handles error state.

### T288: Create health-score-badge component (P1)
**US**: US-1 (Rep Views Territory Accounts) | **FR**: FR-033b
**Files**:
- `frontend/src/components/accounts/health-score-badge.tsx` (NEW)
- `frontend/src/components/accounts/health-score-badge.test.tsx` (NEW)
**Workspace**: frontend
**Dependencies**: None
**Description**: Renders color-coded badge: green (70-100 "Healthy"), yellow (40-69 "Needs Attention"), red (0-39 "At Risk"), gray (null "No Score"). Props: score (number | null). Uses Badge from shadcn/ui. Tests: renders correct color/label for each range, handles null score.

### T289: Create account column definitions (P1)
**US**: US-1 (Rep Views Territory Accounts), US-4 (Sort and Paginate) | **FR**: FR-033b, FR-033d
**Files**:
- `frontend/src/components/accounts/account-columns.tsx` (NEW)
- `frontend/src/components/accounts/account-columns.test.tsx` (NEW)
**Workspace**: frontend
**Dependencies**: T288 (health-score-badge)
**Description**: Define ColumnDef array for TanStack Table: Account Name (sortable, links to /accounts/[id]), Territory (display-only), Account Type (display-only, capitalized), Health Score (renders HealthScoreBadge, sortable), Updated Date (sortable, formatted). Mark sortable columns with enableSorting: true. Tests: column count, sort enablement, cell renderers produce expected output.

### T290: Create account empty state component (P1)
**US**: US-1 (Rep Views Territory Accounts) | **FR**: FR-033h
**Files**:
- `frontend/src/components/accounts/account-empty-state.tsx` (NEW)
**Workspace**: frontend
**Dependencies**: None
**Description**: Two variants: (1) No accounts: "No accounts found" + "Create Account" CTA link to /accounts/new. (2) Filtered empty: "No accounts match your filters" + "Clear Filters" CTA (onClick callback). Uses EmptyState pattern from F-000. Tests inline with page tests in batch 41.

---

## Batch 41: Page Assembly, Filters & E2E (T291-T297)

**Branch**: `feature/batch-41-account-list-page`
**Focus**: Filter bar, page assembly, URL state sync, Playwright E2E

### T291: Create account filters component (P1)
**US**: US-2 (Filter Accounts), US-3 (Manager Views All Territories) | **FR**: FR-033c, FR-033i, FR-033j
**Files**:
- `frontend/src/components/accounts/account-filters.tsx` (NEW)
- `frontend/src/components/accounts/account-filters.test.tsx` (NEW)
**Workspace**: frontend
**Dependencies**: T287 (useTerritories), T286 (useAccounts for context)
**Description**: Filter bar with: territory Select (populated from useTerritories), account type Select (retail/restaurant/distributor), health score preset buttons (All/Healthy/Needs Attention/At Risk), search input with 300ms debounce (useDebounce hook), "Clear All" button. All filter values read from/written to URL search params via useSearchParams(). Tests: renders all filter controls, selecting territory updates URL params, search input debounces, clear all resets all params.

### T292: Assemble account list page (P1) [P]
**US**: US-1, US-2, US-3, US-4 | **FR**: FR-033a through FR-033j
**Files**:
- `frontend/src/app/(authenticated)/accounts/page.tsx` (NEW)
- `frontend/src/app/(authenticated)/accounts/loading.tsx` (NEW)
**Workspace**: frontend
**Dependencies**: T286, T287, T288, T289, T290, T291
**Description**: Main /accounts page. Reads URL search params for initial state. Renders: PageHeader ("Accounts" title + "Create Account" action button), AccountFilters, DataTable with account columns, pagination controls with result count ("Showing X-Y of Z"). Passes onSortingChange to sync sort state to URL params. Handles server-side sorting via manualSorting: true. Loading.tsx renders skeleton table rows. Manages cursor history for Previous button support.

### T293: URL state synchronization (P1)
**US**: US-4 (Sort and Paginate) | **FR**: FR-033j
**Files**:
- `frontend/src/app/(authenticated)/accounts/page.tsx` (MOD — integrated into page)
**Workspace**: frontend
**Dependencies**: T292
**Description**: Ensure all state is synced to URL: sortBy, sortOrder, territoryId, accountType, healthScoreMin, healthScoreMax, search, cursor. On mount, read URL params to initialize. On change, update URL params via router.replace (no history stack pollution). Test: changing any filter updates URL, refreshing page preserves state.

### T294: Responsive column visibility (P2)
**US**: Edge case (mobile) | **FR**: FR-033b
**Files**:
- `frontend/src/app/(authenticated)/accounts/page.tsx` (MOD — add useMediaQuery)
**Workspace**: frontend
**Dependencies**: T292
**Description**: Use useMediaQuery hook to detect viewport width. Set column visibility: hide updatedAt below 768px, hide territory below 640px. The DataTable's columnVisibility state drives this. Test: verify columns hidden at appropriate breakpoints.

### T295: Cursor history for Previous button (P1)
**US**: US-4 (Sort and Paginate) | **FR**: FR-033e
**Files**:
- `frontend/src/app/(authenticated)/accounts/page.tsx` (MOD — cursor stack logic)
**Workspace**: frontend
**Dependencies**: T292
**Description**: Maintain a cursor stack (array of previous cursors). On "Next", push current cursor to stack. On "Previous", pop from stack and use that cursor. Previous disabled when stack is empty (first page). Reset stack when filters change.

### T296: Error state handling (P1)
**US**: Edge case (API error) | **FR**: FR-033h
**Files**:
- `frontend/src/app/(authenticated)/accounts/page.tsx` (MOD — error branch)
**Workspace**: frontend
**Dependencies**: T292
**Description**: When useAccounts returns isError, render ErrorState component with "Failed to load accounts" message and "Retry" button (calls refetch). Display error request ID if available.

### T297: Playwright E2E tests (P1)
**US**: All | **FR**: FR-033a through FR-033j
**Files**:
- `e2e/tests/account-list.spec.ts` (NEW)
**Workspace**: e2e
**Dependencies**: T292, T293, T294, T295, T296 (all tasks complete)
**Description**: End-to-end browser tests:
1. Login as rep -> /accounts shows territory-scoped data
2. Login as manager -> /accounts shows all territories, territory filter has all options
3. Apply health score filter -> table filters correctly
4. Click column header -> sort changes, URL updates
5. Click Next -> pagination works, Previous becomes enabled
6. Type search query -> debounced results appear
7. Apply filter + sort + navigate to page 2 -> copy URL -> open in new tab -> state restored
8. Filter to zero results -> empty state shown with Clear Filters CTA
Desktop Chrome + Mobile Pixel 5 viewports.

---

## Task Summary

| Batch | Tasks | Focus | Test Count (est.) |
|-------|-------|-------|-------------------|
| 40 | T284-T290 (7) | Backend territory API, service modification, hooks, components | ~25 |
| 41 | T291-T297 (7) | Filters, page assembly, URL sync, E2E | ~20 + E2E |

**Total**: 14 tasks, 2 batches (40-41)
