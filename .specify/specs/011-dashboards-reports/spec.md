# Feature Specification: Dashboards & Reports

**Feature Branch**: `011-dashboards-reports`
**Created**: 2026-02-26
**Status**: Draft
**Input**: Territory dashboard, sales performance metrics, pipeline analytics, and custom reporting with CSV/Excel export

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rep KPI Dashboard (Priority: P1)

As a **sales rep**, I want a personal KPI dashboard displaying my current-month revenue, trailing 12-month revenue, activity count, open opportunity count, weighted pipeline value, current-month and year-to-date commission, and account health distribution, so that I can monitor my own performance at a glance.

**Implements:** FR-023
**Why this priority**: The rep dashboard is the primary landing page for 9 territory reps — the most frequent users. It provides immediate value by surfacing key metrics without requiring navigation to multiple screens.

**Independent Test**: Can be fully tested by authenticating as a rep, calling the rep dashboard API endpoint, and verifying all 7 KPI metrics return correct aggregated values based on seed data.

**Acceptance Scenarios**:

1. **Given** a Rep is authenticated, **When** they request their dashboard data via `GET /api/dashboards/rep`, **Then** the response contains current-month revenue, trailing-12-month revenue, current-month activity count, open opportunity count, weighted pipeline value, current-month commission, YTD commission, and account health distribution (healthy/at-risk/critical counts), all scoped to the Rep's territory.
2. **Given** a Rep's dashboard shows 3 accounts with health score below 40 (critical), **When** the Rep requests critical accounts via `GET /api/dashboards/rep/critical-accounts`, **Then** the system returns exactly those 3 accounts with their health scores, sorted by score ascending.
3. **Given** a Rep has no orders in the current month, **When** they request their dashboard, **Then** the current-month revenue displays as 0 and the trailing-12-month revenue still reflects historical data correctly.
4. **Given** the dashboard API is called, **When** the response is returned, **Then** the p95 response time is under 200ms.

---

### User Story 2 - Manager Team Dashboard (Priority: P1)

As a **sales manager**, I want a team dashboard showing aggregate team revenue by month, individual Rep performance rankings, territory revenue data, and pipeline forecast by stage, so that I can identify top performers and underperforming territories.

**Implements:** FR-024
**Why this priority**: Managers need team-wide visibility to make staffing, territory, and coaching decisions. This is the primary management decision-support tool.

**Independent Test**: Can be fully tested by authenticating as a manager, calling the team dashboard API endpoint with date range filters, and verifying aggregated team data returns correctly for all 9 reps.

**Acceptance Scenarios**:

1. **Given** a Manager is authenticated, **When** they request the team dashboard via `GET /api/dashboards/team`, **Then** the response contains a Rep performance ranking table with all active Reps sorted by current-month revenue descending, showing Rep name, revenue, order count, activity count, and pipeline value per Rep.
2. **Given** a Manager selects a date range filter of "Q1 2026" (2026-01-01 to 2026-03-31), **When** the filter is applied via query parameters `start_date` and `end_date`, **Then** all metrics reflect only data within that date range, returned within 2 seconds.
3. **Given** a Manager requests aggregate revenue by month via `GET /api/dashboards/team/revenue-by-month`, **Then** the response returns an array of monthly revenue totals for the trailing 12 months, suitable for bar chart rendering.
4. **Given** a Manager requests pipeline forecast via `GET /api/dashboards/team/pipeline-forecast`, **Then** the response returns opportunity counts and weighted values grouped by pipeline stage (prospect, qualified, proposal, negotiation, closed_won, closed_lost).
5. **Given** a Manager requests territory revenue data via `GET /api/dashboards/team/territory-revenue`, **Then** the response returns revenue totals grouped by territory with territory name and geographic identifiers.
6. **Given** a Rep has been deactivated mid-quarter, **When** the Manager views the team dashboard for that quarter, **Then** the deactivated Rep's historical data is included in metrics but the Rep is marked as "inactive" in the ranking.

---

### User Story 3 - Custom Report Builder (Priority: P1)

As a **manager or admin**, I want to create custom reports by selecting an entity type (Account, Order, Product, Commission, Activity), applying filters (date range, territory, brand, Rep, status), choosing columns, and running the report, so that I can perform ad-hoc analysis beyond the predefined dashboards.

**Implements:** FR-025
**Why this priority**: Custom reporting enables flexible data analysis that predefined dashboards cannot cover. Essential for monthly business reviews, brand performance analysis, and territory planning.

**Independent Test**: Can be fully tested by authenticating as a manager, building a report definition via POST, executing it, and verifying the results match the filters and column selection applied.

**Acceptance Scenarios**:

1. **Given** a Manager creates a report on the Order entity filtered by territory "Portland Metro" and date range "2026-01-01 to 2026-03-31," **When** the Manager executes the report via `POST /api/reports/execute`, **Then** the system returns all matching orders with the selected columns within 5 seconds and includes a total result count.
2. **Given** a Manager has a report returning 500 order records, **When** the Manager requests export via `POST /api/reports/export` with format "xlsx", **Then** the system generates an XLSX file containing all 500 records with column headers matching the report configuration, returned as a downloadable binary stream within 10 seconds.
3. **Given** a Manager requests CSV export, **When** the export completes, **Then** the system returns a CSV file with proper escaping, UTF-8 BOM for Excel compatibility, and column headers matching the report definition.
4. **Given** a report query would return more than 10,000 rows, **When** the report is executed, **Then** the system returns the first 10,000 rows with a `truncated: true` flag and a `total_count` indicating the full result set size.
5. **Given** a user with the "rep" role attempts to execute a report, **When** the request is processed, **Then** the system returns 403 Forbidden since only Manager and Admin roles can access custom reports.

---

### User Story 4 - Saved Report Definitions (Priority: P2)

As a **manager or admin**, I want to save report definitions with a name and description so that I can re-run frequently used reports without reconfiguring them each time.

**Implements:** FR-025
**Why this priority**: Saves time for recurring reports (monthly reviews, quarterly brand analysis) but is not strictly required for initial report functionality.

**Independent Test**: Can be fully tested by saving a report definition, retrieving it by ID, and verifying all configuration fields are preserved.

**Acceptance Scenarios**:

1. **Given** a Manager has configured a report, **When** they save it via `POST /api/reports` with a name and description, **Then** the report definition is persisted and returns a unique report ID.
2. **Given** a saved report exists, **When** the Manager requests it via `GET /api/reports/:id`, **Then** the full report definition (entity type, filters, columns) is returned.
3. **Given** a Manager lists saved reports via `GET /api/reports`, **Then** all reports they created are returned, plus any reports marked as shared by other managers/admins, sorted by last run date descending.
4. **Given** a saved report exists, **When** the Manager deletes it via `DELETE /api/reports/:id`, **Then** the report is soft-deleted and no longer appears in the list.

---

### User Story 5 - Dashboard Date Range Filtering (Priority: P2)

As a **rep or manager**, I want to filter dashboard data by predefined periods (current month, last month, current quarter, last quarter, YTD, trailing 12 months, custom range), so that I can analyze performance across different time periods.

**Implements:** FR-023, FR-024
**Why this priority**: Date filtering enhances both dashboards but the defaults (current month / trailing 12 months) provide immediate value without it.

**Independent Test**: Can be fully tested by calling dashboard endpoints with different date range parameters and verifying the metrics change correctly based on the time window.

**Acceptance Scenarios**:

1. **Given** a user requests dashboard data with `period=current_month`, **When** the API processes the request, **Then** all metrics are scoped to the current calendar month.
2. **Given** a user requests dashboard data with `period=custom` and `start_date=2025-10-01&end_date=2025-12-31`, **When** the API processes the request, **Then** all metrics reflect only data within that custom range.
3. **Given** no period parameter is provided, **When** the dashboard loads, **Then** the default period is `current_month` for point-in-time metrics and `trailing_12_months` for trend data.

---

### Edge Cases

- **No data for period**: When no orders, activities, or opportunities exist for the selected date range, all numeric metrics return 0 and array metrics return empty arrays. Response includes `has_data: false` indicator.
- **Deactivated Rep in team dashboard**: Historical data for deactivated Reps is included in aggregate metrics and rankings but the Rep is flagged `is_active: false` in the response.
- **Large report results**: Reports exceeding 10,000 rows are truncated with a `truncated: true` flag. Export operations handle up to 50,000 rows (the practical limit for XLSX generation in under 10 seconds).
- **Concurrent report execution**: A maximum of 3 concurrent report executions per tenant prevents resource exhaustion. Additional requests receive 429 Too Many Requests.
- **Territory with no accounts**: Territory appears in territory revenue data with 0 revenue rather than being omitted.
- **Commission data timing**: Commission metrics reflect the latest approved commission statements. Pending or disputed commissions are excluded from dashboard totals but available via custom reports.
- **Pipeline forecast accuracy**: Weighted pipeline value uses the probability assigned to each opportunity's current stage. Closed_won and closed_lost stages are excluded from forecast (they are actuals).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-023**: The system MUST provide a Rep KPI dashboard endpoint returning: current-month revenue, trailing-12-month revenue, current-month activity count, open opportunity count, weighted pipeline value, current-month commission, YTD commission, and account health distribution (healthy/at-risk/critical counts) — all scoped to the authenticated Rep's territory.
- **FR-024**: The system MUST provide a Manager team dashboard endpoint returning: Rep performance ranking by revenue (with order count, activity count, pipeline value per Rep), aggregate revenue by month (trailing 12 months), pipeline forecast by stage, and territory revenue breakdown.
- **FR-025**: The system MUST allow Manager and Admin roles to create, save, execute, and export custom reports by selecting entity type (Account, Order, Product, Commission, Activity), applying filters (date range, territory, brand, Rep, status), and choosing display columns. Export formats MUST include CSV and XLSX.

### Key Entities

- **SavedReport**: A persisted report definition containing entity type, filter configuration, column selection, name, description, creator reference, shared flag, and last run timestamp. Belongs to a tenant and creator user.
- **ReportExecution**: A transient operation that applies a report definition against live data and returns paginated results or generates an export file. Not persisted (stateless query).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Rep dashboard API responds in under 200ms at p95 with all 7 KPI sections populated.
- **SC-002**: Manager team dashboard API responds in under 2 seconds with data for all active Reps.
- **SC-003**: Custom report execution returns results within 5 seconds for queries returning up to 10,000 rows.
- **SC-004**: Report export generates downloadable CSV/XLSX files within 10 seconds for up to 50,000 rows.
- **SC-005**: All dashboard and report endpoints enforce RBAC: Reps see only their own data, Managers see team data, Admins see all data.
- **SC-006**: All dashboard queries include tenant_id filtering to prevent cross-tenant data leakage.

## Clarifications

1. **Revenue definition**: "Revenue" in dashboard metrics means the sum of `total_amount` from confirmed/fulfilled orders (not draft or cancelled). For broker orders, revenue is the order total; commission is tracked separately.
2. **Trailing 12 months**: Calculated as a rolling 12-month window from the first day of the current month backward (e.g., if current month is Feb 2026, trailing 12 months = Feb 2025 through Jan 2026). Current month is always separate.
3. **Health score thresholds**: Consistent with Feature 2 — healthy >= 70, at-risk 40-69, critical < 40. Dashboard counts accounts in each bucket.
4. **Report available columns**: Derived dynamically from the Prisma schema for each entity type. A column registry maps entity types to their available fields with display names and data types. Computed fields (e.g., order line item subtotals) are also available.
5. **Report pagination**: In-app report execution uses cursor-based pagination with 50 rows per page. Export bypasses pagination and streams all rows (up to 50,000).
6. **Concurrent report execution**: Tracked per-tenant via a Redis counter (INCR/DECR). Limit is 3 simultaneous report executions per tenant. Counter is decremented on completion or after a 60-second timeout.
7. **XLSX generation**: Uses ExcelJS with streaming WorkbookWriter for memory efficiency. Column widths auto-sized based on header length.
8. **Date filtering timezone**: All date filtering operates in UTC. The `start_date` and `end_date` parameters are ISO 8601 date strings interpreted as UTC midnight boundaries.
9. **Deactivated Rep handling**: The User model's `is_active` field (from Feature 8) determines active/inactive status. Inactive Reps are included in historical queries but excluded from "active Rep count" metrics.

## Assumptions

- Order, Commission, Opportunity, Activity, Account, and Product data models are already implemented (Features 1-9).
- Health score calculation is already running via the nightly cron job (Feature 2).
- Commission statements with approved status exist for commission metrics (Feature 7).
- Pipeline stages and opportunity probabilities are established (Feature 6).
- Territory assignments exist on User records for territory-scoped queries.
