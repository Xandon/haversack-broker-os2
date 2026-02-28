# Feature Specification: Account List & Search

**Feature Branch**: `016-account-list`
**Created**: 2026-02-27
**Status**: Draft
**Input**: PRD FR-033 — Account list data table at /accounts with filters, sorting, and pagination

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rep Views Territory Accounts (Priority: P1)

A sales rep logs in and navigates to /accounts to see all accounts assigned to their territories. The page displays a data table with key account information, sorted by last updated date descending. The rep can quickly scan account health, type, and last activity to prioritize their daily work.

**Why this priority**: This is the primary entry point for reps to manage their book of business. Every other account feature depends on this list view existing.

**Independent Test**: Can be fully tested by logging in as a rep, navigating to /accounts, and verifying the table renders with territory-scoped data, skeleton loaders during fetch, and correct default sort.

**Acceptance Scenarios**:

1. **Given** a Rep is logged in, **When** the Rep navigates to /accounts, **Then** the system displays accounts filtered to the Rep's assigned territories, sorted by updated_at descending, with 20 items per page and skeleton loaders displayed during the initial fetch. (AC-033a)
2. **Given** a Rep is on the accounts page, **When** data finishes loading, **Then** each row displays: account name, territory, account type, health score badge (color-coded), last activity date, and updated date.
3. **Given** a Rep is on the accounts page with no accounts, **When** the page loads, **Then** the system displays a contextual empty state with a message ("No accounts found"), a "Create Account" CTA button, and maintains the layout dimensions of the populated state. (NFR-018)

---

### User Story 2 - Filter Accounts by Criteria (Priority: P1)

A rep or manager uses filter controls to narrow the account list by territory, account type, and health score range. Filters update the table immediately, reset pagination to the first page, and update the result count. A "Clear All" action removes all active filters.

**Why this priority**: Filtering is essential for reps managing 50+ accounts to focus on specific segments (e.g., at-risk accounts, restaurant-only accounts in a territory).

**Independent Test**: Can be tested by applying each filter individually and in combination, verifying the table updates and result count reflects the filtered data.

**Acceptance Scenarios**:

1. **Given** a Rep applies a health score filter of "At Risk (below 40)," **When** the filter is applied, **Then** the table displays only accounts with a health score of 39 or below, updates the result count label, and resets pagination to the first page. (AC-033b)
2. **Given** a Rep selects territory "Portland Metro" from the territory filter, **When** the filter is applied, **Then** only accounts in the Portland Metro territory are displayed.
3. **Given** a Rep selects account type "Restaurant" from the type filter, **When** the filter is applied, **Then** only restaurant accounts are displayed.
4. **Given** multiple filters are active, **When** the Rep clicks "Clear All," **Then** all filters are removed, the table returns to the default view, and pagination resets to page 1.
5. **Given** filter state is active, **When** the filter values are reflected in URL query parameters, **Then** the page is shareable and refreshable without losing the current filter state. (NFR-016)

---

### User Story 3 - Manager Views All Territories (Priority: P1)

A manager logs in and navigates to /accounts to see accounts across all territories. The territory filter dropdown is pre-populated with all active territories, allowing the manager to drill into specific territories.

**Why this priority**: Managers need cross-territory visibility for oversight, coaching, and redistribution decisions.

**Independent Test**: Can be tested by logging in as a manager, navigating to /accounts, and verifying all territories are visible with the territory filter showing all options.

**Acceptance Scenarios**:

1. **Given** a Manager is logged in, **When** the Manager navigates to /accounts, **Then** the system displays accounts across all territories with a territory filter dropdown pre-populated with all active territories. (AC-033c)
2. **Given** a Manager applies a territory filter, **When** the filter is applied, **Then** only accounts from the selected territory are displayed, matching the same behavior as the rep view for that territory.

---

### User Story 4 - Sort and Paginate Account List (Priority: P1)

A user sorts the account table by clicking column headers and navigates through pages using cursor-based pagination. Sort direction toggles between ascending, descending, and default on successive clicks. The sort state persists in URL query parameters.

**Why this priority**: Sorting and pagination are core table interactions needed for any meaningful data exploration.

**Independent Test**: Can be tested by clicking column headers to sort, verifying sort indicators, and navigating through pages with next/previous controls.

**Acceptance Scenarios**:

1. **Given** the account list is displayed, **When** a user clicks the "Name" column header, **Then** the table sorts by name ascending and displays an ascending sort indicator on the column.
2. **Given** the table is sorted by name ascending, **When** the user clicks the "Name" column header again, **Then** the table sorts by name descending and displays a descending sort indicator.
3. **Given** more than 20 accounts match the current filters, **When** the user views the table, **Then** cursor-based pagination controls (Next / Previous) are displayed below the table with a result count label (e.g., "Showing 1-20 of 87").
4. **Given** the user clicks "Next," **When** the next page loads, **Then** the next 20 results are displayed with skeleton loaders during fetch, and the URL updates to include the cursor parameter.
5. **Given** the user is on the first page, **When** they view the pagination controls, **Then** the "Previous" button is disabled.
6. **Given** sort and filter state is in URL query parameters, **When** the user copies the URL and opens it in a new tab, **Then** the same sort order, filters, and page position are restored. (NFR-016)

---

### User Story 5 - Search Accounts by Text (Priority: P2)

A user types a search query into the search input above the table to find accounts by name. The search uses the existing backend search service with 300ms debounce, and results update inline in the table.

**Why this priority**: Text search enhances discoverability but the global search (F-001) provides an alternative path, making this additive rather than critical.

**Independent Test**: Can be tested by typing a search term, verifying debounced API call, and confirming results match the query.

**Acceptance Scenarios**:

1. **Given** a user types "pacific" into the search input, **When** 300 milliseconds elapse after the last keystroke, **Then** the table updates to show only accounts matching "pacific" in their name.
2. **Given** a search is active, **When** the user clears the search input, **Then** the table returns to the full filtered view.
3. **Given** the search input has fewer than 3 characters, **When** the user pauses typing, **Then** no search API call is made (minimum 3 characters required by backend).

---

### Edge Cases

- What happens when the API returns an error during account list fetch? Display an error state with "Failed to load accounts" message, a "Retry" button, and error reference ID.
- What happens when the user navigates to an invalid cursor? Reset to the first page and display the default view.
- What happens when a filter combination returns zero results? Display a filtered empty state: "No accounts match your filters" with a "Clear Filters" CTA.
- What happens when the user resizes from desktop to mobile? The table adapts: hide low-priority columns (last activity, updated date) on screens below 768px. On mobile (<640px), switch to a card layout or condensed list view.
- What happens when network is slow? Skeleton loaders display for each table row during fetch. If the request takes longer than 5 seconds, show a "Still loading..." message.
- What happens when a rep has no territories assigned? Show empty state: "No territories assigned. Contact your manager."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-033a**: System MUST display an Account List page at the route /accounts accessible to authenticated users with roles Rep, Manager, or Admin.
- **FR-033b**: System MUST render a data table with columns: Account Name, Territory (name), Account Type, Health Score (as a color-coded badge), and Updated Date. Territory and type columns are display-only.
- **FR-033c**: System MUST support filtering by territory (dropdown), account type (dropdown: retail, restaurant, distributor), and health score range (preset ranges or min/max inputs).
- **FR-033d**: System MUST support sorting by clicking column headers for: name, health score, and updated date (columns backed by backend sort). Sort state MUST be preserved in URL query parameters.
- **FR-033e**: System MUST implement cursor-based pagination with 20 items per page, displaying Next/Previous controls and a result count label.
- **FR-033f**: System MUST scope data by role — Reps see only accounts in their assigned territories; Managers and Admins see accounts across all territories.
- **FR-033g**: System MUST display skeleton loaders (not spinners) during data fetching.
- **FR-033h**: System MUST display contextual empty states when no accounts exist or when filters produce zero results, with appropriate CTA buttons.
- **FR-033i**: System MUST support text search with 300ms debounce, minimum 3-character threshold, and inline result display.
- **FR-033j**: System MUST persist filter, sort, and pagination state in URL query parameters so the view is shareable and refreshable.

### Key Entities

- **Account**: Core CRM entity — name, territory, account type (retail/restaurant/distributor), health score (0-100), parent/child relationships, addresses, primary contact. Already exists in backend.
- **Territory**: Geographic/organizational assignment unit. Already exists in backend.
- **Health Score Badge**: Visual indicator mapped from numeric score: green (70-100), yellow (40-69), red (0-39).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Account list page renders with skeleton loaders and transitions to data display within 2 seconds on a 4G connection (FCP < 2s).
- **SC-002**: Applying any filter updates the table within 200ms of user interaction (API p95 < 200ms).
- **SC-003**: Sorting by any column updates the table within 200ms.
- **SC-004**: Users can find a specific account within 10 seconds using search or filters.
- **SC-005**: All filter, sort, and pagination state is preserved across page refresh with zero data loss.
- **SC-006**: Table displays correctly on viewports from 320px to 1440px without horizontal scrolling.

## Clarifications

1. **Sortable columns scope**: The backend `accountListQuerySchema` supports `sortBy: name | createdAt | healthScore | updatedAt`. The PRD mentions sorting by territory, type, last activity, and updated date as well. **Decision**: Frontend-sortable columns are limited to what the backend supports: name, healthScore, updatedAt. The createdAt sort is available but not exposed as a column (updatedAt is preferred). Territory and type columns are display-only (not sortable via backend). Last activity date is not a direct database field and therefore not sortable. **Rationale**: Adding new backend sort columns would require schema changes outside this feature's scope. Users can filter by territory and type instead of sorting.

2. **Health score filter UX**: The spec says "preset ranges or min/max inputs." **Decision**: Use preset range buttons: "All" (default), "Healthy (70-100)", "Needs Attention (40-69)", "At Risk (0-39)". These map cleanly to the backend's healthScoreMin/healthScoreMax parameters. **Rationale**: Preset ranges match the domain language (health score thresholds are well-established at Haversack) and are faster to use than manual min/max inputs. Three presets cover all meaningful segments.

3. **Territory filter for single-territory Reps**: **Decision**: Always show the territory filter dropdown for all roles. For reps with a single territory, the dropdown shows only their territory (pre-selected and effectively read-only). For reps with multiple territories, they can switch between them. **Rationale**: Consistent UI across roles; hiding the filter would make the layout shift between roles.

4. **Mobile table behavior**: **Decision**: On screens 768px-1024px, hide "Last Activity" and "Updated Date" columns. On screens below 768px, hide those plus "Territory" column (since reps already know their territory). Below 640px, the data-table component renders rows in a condensed card-like layout using the responsive mode of our TanStack Table wrapper. **Rationale**: Progressive disclosure keeps the most important info (name, type, health) visible at all breakpoints.

5. **Last Activity Date source**: **Decision**: Use the `updatedAt` field from the Account record as the "Updated Date" column. "Last Activity Date" is NOT a direct Account field — it would require a join to the activities table. For MVP, display only the columns available from the direct Account query: name, territory (name via include), accountType, healthScore, updatedAt. **Rationale**: Keeping the list query efficient (no joins to activities table) is critical for p95 < 200ms. The "Last Activity" column can be added in a follow-up when the activity timeline feature (F-003) is complete.

6. **Result count with cursor pagination**: **Decision**: The backend already returns `total` count via a parallel `prisma.account.count()` call. Use this for the "Showing 1-20 of 87" label. Offset calculation: page number = 1 + (number of "Next" clicks). **Rationale**: Backend already supports this, no additional work needed.

7. **Territory data for filter dropdown**: **Decision**: There is no dedicated `/api/territories` endpoint. The frontend will need to either (a) add a lightweight territory list to the account list API response, or (b) create a small dedicated hook that queries territories. **Decision**: Add a `GET /api/territories` route to the backend in this feature's scope (ADDITIVE change). This is a simple query returning `[{ id, name, region }]` filtered by tenant_id and is_active=true. **Rationale**: Territory dropdown is used in multiple features (accounts, orders, commissions) — a dedicated endpoint prevents duplicating logic.

8. **Account list response — territory name**: The `listAccounts` service currently returns raw Account records without territory relation includes. **Decision**: Modify the `listAccounts` service to include `territory: { select: { id: true, name: true } }` in the Prisma query. This is an ADDITIVE change to the existing service. **Rationale**: Displaying territory names in the table is a core requirement; fetching territory IDs and then resolving names client-side would require an extra API call.

## Assumptions

- The backend GET /api/accounts endpoint is fully functional with territory-based filtering, account type filtering, health score range filtering, cursor-based pagination, and sorting (already implemented in backend batch).
- The shared Zod schema `accountListQuerySchema` defines the valid query parameters.
- The data-table composite component from F-000 (Design System) provides the reusable table infrastructure.
- Health score values range from 0-100 and are pre-calculated by a backend nightly job.
- Territory data for filter dropdowns is available via an existing API endpoint.
