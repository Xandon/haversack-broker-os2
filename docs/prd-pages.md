# Page Assembly PRD Addendum

This addendum defines page-level functional requirements (FR-PXXX) for assembling existing components and hooks into Next.js App Router pages. All components and hooks referenced below are already implemented and tested.

## Page Requirements

- FR-P001: App Shell (Sidebar, Header, Auth Guard)
  - AC-P001a: Given an authenticated user navigates to any route, when the page loads, then the app shell renders with a collapsible sidebar (navigation links), top header (user name, NotificationBell, search), and main content area with the child page
  - AC-P001b: Given an unauthenticated user navigates to any protected route, when the page loads, then the system redirects to /login
  - AC-P001c: Given the app shell is loading, when data is being fetched, then a skeleton loader appears for the sidebar and header
  - AC-P001d: Given an error occurs loading user session, when the shell fails, then an error boundary displays "Unable to load application" with a Retry button
  - AC-P001e: Given no navigation items match the current route, when the sidebar renders, then the empty state shows a minimal sidebar with the Haversack logo

- FR-P002: Login Page
  - AC-P002a: Given an unauthenticated user navigates to /login, when the page loads, then a login form renders with email and password fields and a submit button
  - AC-P002b: Given valid credentials are submitted, when the login succeeds, then the user is redirected to /dashboard with a JWT stored in localStorage
  - AC-P002c: Given the login form is submitting, when waiting for the API response, then a loading spinner appears on the submit button
  - AC-P002d: Given invalid credentials are submitted, when the login fails, then an error message "Invalid email or password" appears below the form
  - AC-P002e: Given no session exists, when /login renders, then the empty state shows just the login form centered on the page with the Haversack logo above

- FR-P003: Dashboard
  - AC-P003a: Given an authenticated rep navigates to /dashboard, when the page loads, then the KpiStrip renders with current-month revenue, trailing-12-month revenue, accounts managed, activities this month, open opportunities, weighted pipeline, and commission MTD/YTD from useRepKpi
  - AC-P003b: Given a manager navigates to /dashboard, when the page loads, then the RepRankingTable renders below the KPI strip from useTeamDashboard
  - AC-P003c: Given the dashboard is loading, when data is being fetched, then skeleton loaders appear for each KPI card and the ranking table
  - AC-P003d: Given the dashboard API returns an error, when the fetch fails, then an error banner "Unable to load dashboard" with Retry button appears
  - AC-P003e: Given a new rep with no data, when the dashboard loads, then the empty state shows "No activity yet — start by visiting your accounts" with a link to /accounts

- FR-P004: Account List
  - AC-P004a: Given a user navigates to /accounts, when the page loads, then a paginated table of accounts renders using data from useAccounts with columns: name, type, territory, health score, assigned rep, and last activity date
  - AC-P004b: Given the user types in the search box, when at least 2 characters are entered after 300ms debounce, then the account list filters via the search parameter
  - AC-P004c: Given accounts are loading, when the fetch is in progress, then skeleton rows appear in the table
  - AC-P004d: Given the accounts API fails, when an error occurs, then "Unable to load accounts" with Retry button appears
  - AC-P004e: Given no accounts exist or the search returns no results, when the list is empty, then an empty state shows "No accounts found" with a "Create Account" button

- FR-P005: Account Detail (Tabbed)
  - AC-P005a: Given a user navigates to /accounts/[id], when the page loads, then the account header renders (name, type, health score badge, territory) with tabs: Overview, Contacts, Activities, Orders, Pipeline, Emails
  - AC-P005b: Given the Overview tab is active, when data loads, then the AccountForm (read mode) renders with account fields and the MeetingBriefPanel renders using useAi
  - AC-P005c: Given the Contacts tab is active, when data loads, then the ContactList renders from useContacts
  - AC-P005d: Given the account is loading, when data is being fetched, then skeleton loaders appear for the header and active tab content
  - AC-P005e: Given the account fetch fails, when an error occurs, then an error boundary shows "Account not found" with a Back button
  - AC-P005f: Given an account has no contacts, when the Contacts tab is viewed, then the empty state shows "No contacts yet — add one" with an Add Contact button

- FR-P006: Order List
  - AC-P006a: Given a user navigates to /orders, when the page loads, then a paginated table of orders renders with columns: order number, account name, status, total, date, and assigned rep
  - AC-P006b: Given filters are applied (status chips), when a filter is toggled, then the list re-fetches with the selected status filter
  - AC-P006c: Given orders are loading, when the fetch is in progress, then skeleton rows appear
  - AC-P006d: Given the orders API fails, when an error occurs, then "Unable to load orders" with Retry button appears
  - AC-P006e: Given no orders match filters, when the list is empty, then an empty state shows "No orders found" with a "Create Order" link to /orders/new

- FR-P007: Order Entry (Multi-step)
  - AC-P007a: Given a user navigates to /orders/new, when the page loads, then a multi-step order form renders with steps: Account Selection, Line Items, Review, Submit
  - AC-P007b: Given the user completes all steps and submits, when the order is created, then the system redirects to /orders/[id]
  - AC-P007c: Given the form is submitting, when waiting for API response, then a loading indicator appears on the Submit button
  - AC-P007d: Given validation fails on any step, when the user clicks Next, then inline validation errors appear on invalid fields
  - AC-P007e: Given the order creation API fails, when an error occurs, then an error banner "Unable to create order" appears with a Retry button

- FR-P008: Order Detail
  - AC-P008a: Given a user navigates to /orders/[id], when the page loads, then the order header (order number, status badge, account name, total) and line item list render
  - AC-P008b: Given the order is loading, when data is being fetched, then skeleton loaders appear for header and line items
  - AC-P008c: Given the order fetch fails, when an error occurs, then "Order not found" with a Back button appears
  - AC-P008d: Given an order has no line items, when the detail page loads, then the empty state shows "No line items" (edge case for draft orders)

- FR-P009: Pipeline / Kanban
  - AC-P009a: Given a user navigates to /pipeline, when the page loads, then the KanbanBoard renders with columns per pipeline stage and OpportunityCards from usePipeline, with a WeightedForecastBar at the top
  - AC-P009b: Given the pipeline is loading, when data is being fetched, then skeleton columns appear
  - AC-P009c: Given the pipeline API fails, when an error occurs, then "Unable to load pipeline" with Retry button appears
  - AC-P009d: Given no opportunities exist, when the pipeline loads, then the empty state shows "No opportunities in pipeline — create one" with a Create button

- FR-P010: Product Catalog
  - AC-P010a: Given a user navigates to /products, when the page loads, then a grid of ProductCards renders from useProducts with search, brand filter, and category filter
  - AC-P010b: Given products are loading, when the fetch is in progress, then skeleton cards appear in the grid
  - AC-P010c: Given the products API fails, when an error occurs, then "Unable to load products" with Retry button appears
  - AC-P010d: Given no products match the search or filters, when the list is empty, then an empty state shows "No products found"

- FR-P011: Brand Management
  - AC-P011a: Given a user navigates to /brands, when the page loads, then a list of brands renders from useBrands with name, commission rate, revenue model, and product count
  - AC-P011b: Given brands are loading, when the fetch is in progress, then skeleton rows appear
  - AC-P011c: Given the brands API fails, when an error occurs, then "Unable to load brands" with Retry button appears
  - AC-P011d: Given no brands exist, when the list is empty, then an empty state shows "No brands configured"

- FR-P012: Commission Dashboard
  - AC-P012a: Given a user navigates to /commissions, when the page loads, then the CommissionSummaryCard renders from useCommissionSummary and the CommissionLineItemTable renders from useCommissions with period picker and status filters
  - AC-P012b: Given commissions are loading, when data is being fetched, then skeleton loaders appear for the summary card and table
  - AC-P012c: Given the commissions API fails, when an error occurs, then "Unable to load commissions" with Retry button appears
  - AC-P012d: Given no commissions exist for the selected period, when the table is empty, then an empty state shows "No commissions for this period"

- FR-P013: Commission Statement Detail
  - AC-P013a: Given a user navigates to /commissions/[id], when the page loads, then the statement header (rep name, period, status, total) and CommissionLineItemTable render from useCommissionStatement
  - AC-P013b: Given the statement is loading, when data is being fetched, then skeleton loaders appear for header and line items
  - AC-P013c: Given the statement fetch fails, when an error occurs, then "Statement not found" with a Back button appears
  - AC-P013d: Given a statement has no line items, when the detail loads, then the empty state shows "No commission line items for this period"

- FR-P014: Report Builder
  - AC-P014a: Given a user navigates to /reports, when the page loads, then the ReportBuilder renders with EntityPicker, ColumnSelector, FilterBuilder, ReportTable, and ExportButton from useReportColumns and useRunReport
  - AC-P014b: Given a report is being generated, when the user clicks Run, then a loading skeleton appears in the ReportTable
  - AC-P014c: Given the report API fails, when an error occurs, then "Unable to generate report" with Retry button appears
  - AC-P014d: Given no results match the report criteria, when the table is empty, then an empty state shows "No data matches your criteria — try adjusting filters"

- FR-P015: Data Import
  - AC-P015a: Given an admin navigates to /admin/import, when the page loads, then the import wizard renders with FileDropzone, entity type selector, ImportPreview, and ImportSummary from useImportFields, useValidateImport, and useExecuteImport
  - AC-P015b: Given a file is being validated, when the validation is in progress, then a loading bar shows "Validating row N of M"
  - AC-P015c: Given the import API fails, when an error occurs, then "Import failed" with error details and Retry button appears
  - AC-P015d: Given no file has been uploaded, when the page first loads, then the empty state shows the FileDropzone with "Drag and drop a CSV file here"

- FR-P016: User Management
  - AC-P016a: Given an admin navigates to /admin/users, when the page loads, then the UserList renders from useUsers with columns: name, email, role, territory, status, last login
  - AC-P016b: Given users are loading, when the fetch is in progress, then skeleton rows appear
  - AC-P016c: Given the users API fails, when an error occurs, then "Unable to load users" with Retry button appears
  - AC-P016d: Given no users exist, when the list is empty, then an empty state shows "No users — invite your first team member"

- FR-P017: Business Rules
  - AC-P017a: Given an admin navigates to /admin/rules, when the page loads, then a list of business rules renders with name, entity type, status toggle, and last-modified date
  - AC-P017b: Given rules are loading, when the fetch is in progress, then skeleton rows appear
  - AC-P017c: Given the rules API fails, when an error occurs, then "Unable to load rules" with Retry button appears
  - AC-P017d: Given no business rules exist, when the list is empty, then an empty state shows "No business rules configured — create one"

- FR-P018: Settings
  - AC-P018a: Given a user navigates to /settings, when the page loads, then the settings page renders with profile section and notification preferences
  - AC-P018b: Given settings are loading, when data is being fetched, then skeleton loaders appear for each section
  - AC-P018c: Given the settings API fails, when an error occurs, then "Unable to load settings" with Retry button appears
  - AC-P018d: Given this is a new user with default settings, when the page loads, then all preference toggles show their default values
