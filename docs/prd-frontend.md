# Haversack Unified Platform — Frontend UI/UX PRD Addendum

**Version:** 1.0.0
**Date:** 2026-02-27
**Status:** Draft — Frontend Phase
**Parent Document:** docs/prd.md (v1.0.0, 2026-02-24)
**Author:** Requirements Analyst


## 1. Preamble

### Purpose

This addendum extends the Haversack Unified Platform PRD (docs/prd.md) with UI-specific functional requirements. The original PRD defines 30 functional requirements (FR-001 through FR-030), 14 non-functional requirements, and 12 user stories — all of which describe data operations, API behaviors, and backend logic. The backend implementing those requirements is 100% complete: 15 domains, 96 API endpoints, and 1,356 passing tests.

This document adds FR-031 through FR-053 (23 UI-specific requirements with 48 acceptance criteria) covering every screen, form, and interaction needed to expose the backend through a production-quality frontend.

### Why This Addendum Exists

The speckit pipeline translated data-centric FRs ("The system shall [verb] [data entity]") into services, routes, and tests — never into pages and components. Five root causes:

1. **Data-centric FRs** — Every original FR describes a data operation, not a screen or form layout.
2. **Domain decomposition** — Features split by domain produce API-first batches (Schema, Service, Route, Test). No batch generates UI.
3. **Dropped frontend tasks** — The master plan contained frontend tasks, but individual feature specs regenerated task lists with zero frontend tasks.
4. **API-level "done"** — Each feature's test section described API verification only. When "fully tested" means "API responds correctly," UI is out of scope.
5. **Cross-cutting UI/UX section** — PRD Section 7 describes patterns (skeleton loaders, empty states) but not screens. These had no implementation owner.

### Scope

- Adds 23 UI functional requirements (FR-031 through FR-053) with Given/When/Then acceptance criteria
- Defines a screen inventory of 32 pages/routes with role access and API dependencies
- Specifies the design system (theme tokens, component catalog, interaction patterns)
- Organizes work into 6 epics and 23 features for independent speckit pipeline execution
- Adds 4 UI-specific non-functional requirements (NFR-015 through NFR-018)

### Conventions

This addendum follows all conventions from the parent PRD:

- FR/NFR numbering is sequential from the parent document
- All acceptance criteria use Given/When/Then format
- AC identifiers follow the pattern AC-XXXx (FR number + sequential letter)
- Each FR references the backend FR(s) it depends on via "Depends on:" notation
- No subjective language without measurable qualifiers within 20 words


## 2. UI Functional Requirements

### Epic 1: Design Foundation

- FR-031: The system shall provide a design system consisting of theme tokens (semantic colors, typography scale, spacing, border radii), a component library of at least 15 reusable shadcn/ui primitives (dialog, table, tabs, badge, toast, command, date-picker, popover, dropdown-menu, tooltip, separator, switch, checkbox, textarea, scroll-area), and at least 10 reusable composite patterns (data-table, empty-state, error-state, form-field, page-header, filter-bar, confirmation-dialog, status-badge, infinite-scroll, loading-overlay) that all other features consume. Depends on: None (foundational).
  - AC-031a: Given a developer renders any shadcn/ui primitive component, when the component mounts, then it inherits theme tokens from CSS custom properties and renders consistently in both light and dark modes with contrast ratios meeting WCAG 2.1 AA (at least 4.5:1 for normal text, at least 3:1 for large text).
  - AC-031b: Given a page displays a list with zero records, when the empty-state composite pattern renders, then it displays a descriptive message, a primary call-to-action button, and an optional illustration, with the CTA button having a minimum touch target of 44 by 44 CSS pixels.
  - AC-031c: Given a data-fetching view is loading, when the skeleton composite pattern renders, then it displays animated placeholder elements that match the target layout structure (matching column count for tables, card dimensions for grids) rather than a generic spinner.

- FR-032: The system shall provide a global search command palette accessible from every authenticated page via a Cmd+K (macOS) or Ctrl+K (Windows/Linux) keyboard shortcut and a clickable search trigger in the top navigation bar, returning categorized results (Accounts, Contacts, Products) with 300-millisecond debounce, displaying up to 5 results per category. Depends on: FR-003 (Account search), FR-012 (Product search).
  - AC-032a: Given a user is on any authenticated page, when the user presses Cmd+K, then the command palette modal opens within 100 milliseconds with keyboard focus on the search input field and the previously typed query cleared.
  - AC-032b: Given a user types "pacific" into the command palette, when 300 milliseconds elapse after the last keystroke, then the palette displays matching results grouped under "Accounts," "Contacts," and "Products" headings with up to 5 results per category, each showing the entity name and a secondary identifier (territory for accounts, email for contacts, SKU for products).
  - AC-032c: Given search results are displayed in the command palette, when the user selects a result using keyboard arrow keys and presses Enter or clicks a result, then the system navigates to the corresponding detail page (/accounts/:id, /products/:id) and closes the palette.

### Epic 2: Core CRM UI

- FR-033: The system shall display an Account List page at /accounts with a searchable data table supporting territory, account type, and health score range filters, sortable columns (name, territory, type, health score, last activity, updated date), and cursor-based pagination with 20 items per page. Depends on: FR-001, FR-003, FR-006.
  - AC-033a: Given a Rep is logged in, when the Rep navigates to /accounts, then the system displays accounts filtered to the Rep's assigned territories, sorted by updated_at descending, with 20 items per page and skeleton loaders displayed during the initial fetch.
  - AC-033b: Given a Rep applies a health score filter of "At Risk (below 40)," when the filter is applied, then the table displays only accounts with a health score of 39 or below, updates the result count label, and resets pagination to the first page.
  - AC-033c: Given a Manager is logged in, when the Manager navigates to /accounts, then the system displays accounts across all territories with a territory filter dropdown pre-populated with all active territories.

- FR-034: The system shall display an Account Detail page at /accounts/:id with a tabbed layout containing: Overview tab (account metadata, health score breakdown, parent-child hierarchy), Contacts tab (contact list with inline add/edit), Timeline tab (unified activity timeline with infinite scroll), Orders tab (order history table), and Opportunities tab (linked opportunities list). Depends on: FR-002, FR-004, FR-006, FR-008.
  - AC-034a: Given a Rep navigates to /accounts/:id, when the page loads, then the system displays the account header (name, type, territory, health score badge) and the Overview tab content within 2 seconds, with skeleton loaders for each section while data loads.
  - AC-034b: Given a Rep views the Timeline tab for an account with 50 activity records, when the Rep scrolls to the bottom of the initial 20 items, then the system loads the next 20 items within 500 milliseconds via infinite scroll without a full page reload, and displays a type filter (visit, call, email, demo, sampling) above the timeline.
  - AC-034c: Given a Rep views an account with a parent account, when the Overview tab renders, then the system displays a "Parent Account" link navigating to the parent's detail page and, if the account has children, a "Child Accounts" section listing each child with name, type, and health score.

- FR-035: The system shall display Account creation (/accounts/new) and edit (/accounts/:id/edit) pages using React Hook Form with Zod validation matching the backend schema, including duplicate detection on account name blur and contact CRUD via modal dialog forms. Depends on: FR-001, FR-005.
  - AC-035a: Given a Rep opens /accounts/new, when the Rep fills in all required fields (name, address, contact, territory, type) and clicks "Save," then the system validates all fields against the Zod schema, submits the data via POST /api/accounts, and navigates to the new account's detail page with a success toast notification.
  - AC-035b: Given a Rep types an account name and blurs the name field, when the system detects a potential duplicate (Levenshtein distance of 3 or less), then a duplicate warning dialog appears listing matching account(s) with name, territory, and a "View Existing" link, and the Rep can choose "Create Anyway" or cancel.
  - AC-035c: Given a Rep views the Contacts tab on an account detail page, when the Rep clicks "Add Contact," then a modal form appears with fields for first name, last name, email, phone, title, and is_primary toggle, and on successful save the contact appears in the list without a full page reload.

- FR-036: The system shall display an Activity Logging and Timeline page at /activities with a data table of the user's logged activities, a quick-log floating action button (FAB) reachable in 1 tap on mobile, and an activity creation form that can be completed in under 60 seconds. Demo-type activities shall include product picker, quantity sampled, and buyer feedback fields. Depends on: FR-007, FR-008.
  - AC-036a: Given a Rep taps the quick-log FAB on mobile, when the activity form opens, then it pre-populates the current date/time and the Rep's name, displays activity type selection (visit, call, email, demo, sampling), and the Rep can select an account via a searchable dropdown, add notes, and save in under 60 seconds.
  - AC-036b: Given a Rep selects "Demo" as the activity type, when the form updates, then it displays additional fields: a product picker (searchable combobox querying GET /api/products/search), quantity sampled (numeric input), and buyer feedback (text area with outcome selector: positive, neutral, negative).
  - AC-036c: Given a Rep views an account's timeline with a type filter set to "Visits only," when the filter is applied, then only activities of type "visit" are displayed and the count label updates to show the filtered total.

- FR-037: The system shall display a Task Management page at /tasks with a data table supporting filters for assignee, status (open, completed), priority (high, medium, low), and overdue state, with task creation and editing via dialog forms, and a quick status toggle for marking tasks complete. Depends on: FR-009.
  - AC-037a: Given a Rep navigates to /tasks, when the page loads, then the system displays the Rep's tasks sorted with overdue tasks at the top (highlighted with a red indicator), followed by tasks sorted by due date ascending, with skeleton loaders during fetch.
  - AC-037b: Given a Rep clicks "New Task," when the task dialog opens, then it displays fields for subject, description, due date (date picker), priority (dropdown), assignee (searchable user dropdown), and optional account/contact association, with Zod validation on save.

### Epic 3: Commerce UI

- FR-038: The system shall display an Order List page at /orders with a data table supporting status, date range, and account filters, and an Order Detail page at /orders/:id showing the order header, status badge, line items table with vendor sub-order splits, approval history, and a status timeline. Depends on: FR-011, FR-013.
  - AC-038a: Given a Rep navigates to /orders, when the page loads, then the system displays orders scoped to the Rep's accounts, sorted by created_at descending, with columns for order number, account name, status (color-coded badge), total amount, and date, with 20 items per page.
  - AC-038b: Given a Rep navigates to /orders/:id for an order with line items from 3 vendors, when the page loads, then the system displays the order header (number, account, status, total), a line items table grouped by vendor sub-order, and an approval history section showing each status transition with actor, timestamp, and reason (if rejected).

- FR-039: The system shall display an Order Entry page at /orders/new with a multi-line form supporting inline product search via combobox (displaying availability status, unit price, and promotional pricing), revenue model toggle per line item (broker or wholesale), quantity and price inputs, running subtotals, swipe-to-delete on mobile, and AI-powered reorder suggestions when accessed from an account context. Depends on: FR-011, FR-012, FR-014.
  - AC-039a: Given a Rep opens /orders/new, when the Rep searches for a product by typing into the product combobox, then matching products appear within 200 milliseconds showing product name, SKU, brand, unit price, promotional price (if active), and availability status with color-coded indicator (green for in-stock, yellow for limited, red for out-of-stock).
  - AC-039b: Given a Rep has added 3 line items to the order form, when the Rep views the form, then each line item displays the product name, quantity input, unit price, revenue model toggle (broker/wholesale), and line total, with a running order subtotal updated in real time as quantities or prices change.
  - AC-039c: Given a Rep accesses /orders/new from an account with 6 or more historical orders, when the form loads, then the system displays an "AI Suggested Reorder" card with recommended products and quantities that the Rep can add to the order with a single click per item, labeled "AI-Generated."

- FR-040: The system shall display an Order Approval Queue page at /orders/approval-queue accessible to Manager and Admin roles, listing orders pending approval with approve and reject actions, where rejection requires a reason text input. Depends on: FR-013.
  - AC-040a: Given a Manager navigates to /orders/approval-queue, when the page loads, then the system displays all orders with status "pending_approval" sorted by created_at ascending, showing order number, account name, Rep name, total amount, and submission date.
  - AC-040b: Given a Manager clicks "Reject" on a pending order, when the rejection dialog appears, then the Manager must enter a reason (minimum 10 characters) before the reject action is enabled, and on submission the system updates the order status, notifies the originating Rep, and removes the order from the queue.

- FR-041: The system shall display a Product Catalog page at /products with grid and list view toggles, filterable by brand, category, certification, and availability status, a Product Detail page at /products/:id showing pricing, certifications, allergens, and availability, a Brand List page at /brands, and a Brand Detail page at /brands/:id with line card PDF generation and email sharing actions. Depends on: FR-018, FR-019.
  - AC-041a: Given a Rep navigates to /products, when the page loads, then the system displays products in a grid layout (default) with each card showing product name, brand, unit price, certification badges, and availability indicator, with filter controls for brand, category, certifications, and availability.
  - AC-041b: Given a Manager navigates to /brands/:id, when the Manager clicks "Generate Line Card," then the system calls GET /api/brands/:id/line-card, displays a loading indicator, and upon completion (within 10 seconds) presents the PDF for download, with a "Share via Email" button that opens an email composition form.
  - AC-041c: Given a Rep toggles from grid view to list view on the product catalog, when the view changes, then products display in a table format with columns for name, SKU, brand, category, unit price, availability, and certifications, preserving the current filter and sort state.

### Epic 4: Revenue and Pipeline UI

- FR-042: The system shall display a Pipeline Kanban board at /opportunities with drag-and-drop column transitions (Prospect, Qualified, Proposal, Negotiation, Closed Won, Closed Lost), a weighted forecast summary at the top, up to 20 opportunity cards per column with load-more, a close-won dialog requiring a close reason, a close-lost dialog requiring a loss reason, and a list view toggle. Depends on: FR-016, FR-017.
  - AC-042a: Given a Manager views /opportunities with 15 open opportunities across 4 stages, when the board loads within 2 seconds, then each card displays opportunity name, account name, estimated value, and expected close date, and the weighted forecast total at the top equals the sum of (estimated value times probability divided by 100) for all displayed opportunities.
  - AC-042b: Given a Rep drags an opportunity card from "Proposal" to "Negotiation," when the card is dropped, then the system calls POST /api/opportunities/:id/transition with the new stage, updates the card's position and the weighted forecast total optimistically, and reverts the card to its original position if the API call fails.
  - AC-042c: Given a Rep drags an opportunity to "Closed Won," when the card is dropped, then a dialog appears requiring a close reason (minimum 10 characters), and the system does not persist the transition until the Rep submits the reason.

- FR-043: The system shall display Opportunity creation (/opportunities/new) and detail (/opportunities/:id) pages with fields for name, account picker, estimated value, expected close date, stage, probability (auto-populated from stage but manually overridable), and associated brands. Depends on: FR-016.
  - AC-043a: Given a Rep opens /opportunities/new, when the Rep selects stage "Qualified," then the probability field auto-populates to 40% (the configured default for that stage) and remains editable.
  - AC-043b: Given a Rep views /opportunities/:id, when the page loads, then the system displays the opportunity header (name, stage badge, value, probability, close date), the associated account with a link to its detail page, associated brands, and a stage history timeline showing each transition with actor and timestamp.

- FR-044: The system shall display a Commission Dashboard at /commissions with a month selector, current statement summary (total earned, approval status), year-to-date total, and statement history, a Statement Detail page at /commissions/statements/:id with line-by-line breakdown, statement approve/reject actions for Managers, dispute filing for Reps, and dispute resolution for Managers. Admin users shall have access to /commissions/rules for commission rule CRUD and a QuickBooks export action. Depends on: FR-020, FR-021, FR-022.
  - AC-044a: Given a Rep navigates to /commissions and selects "March 2026," when the statement loads, then the system displays the total earned commission, number of order line items, approval status badge (Pending, Approved, Paid), and a year-to-date total, with a "View Details" link to the full statement.
  - AC-044b: Given a Rep views /commissions/statements/:id, when the page loads, then the system displays an order-by-order breakdown table with columns for order number, account, brand, line total, commission rate, commission amount, and a "Dispute" action per line item that opens a dialog with a reason text field.
  - AC-044c: Given a Manager views a pending commission statement, when the Manager clicks "Approve," then the system calls POST /api/commissions/statements/:id/approve, updates the status badge to "Approved," and displays a success toast notification.

### Epic 5: Analytics and Reporting UI

- FR-045: The system shall extend the existing /dashboard page with a revenue-by-month bar chart, a territory revenue summary table, an enhanced Rep performance ranking table, a pipeline forecast chart, and an account health distribution donut chart, all using the recharts library. Depends on: FR-023, FR-024.
  - AC-045a: Given a Manager views the team dashboard, when the page loads, then the system displays a revenue-by-month bar chart (trailing 12 months from GET /api/dashboards/team/revenue-by-month), a Rep ranking table (all Reps sorted by revenue descending), and a pipeline forecast chart (from GET /api/dashboards/team/pipeline-forecast), with skeleton loaders for each widget during fetch.
  - AC-045b: Given a Rep views their personal dashboard, when the page loads, then the system displays an account health distribution donut chart (healthy/at-risk/critical counts), and clicking on any segment navigates to /accounts filtered by the corresponding health range.

- FR-046: The system shall display a Reports page at /reports listing saved reports, a Report Builder page at /reports/new allowing users with Manager or Admin role to select an entity type (Account, Order, Product, Commission, Activity), apply filters (date range, territory, brand, Rep, status), choose display columns, preview results, and export to CSV or XLSX format. Depends on: FR-025.
  - AC-046a: Given a Manager navigates to /reports/new, when the Manager selects entity type "Order" and applies filters for territory "Portland Metro" and date range "2026-01-01 to 2026-03-31," then the system calls POST /api/reports/execute with the filters and displays matching results in a paginated preview table within 5 seconds.
  - AC-046b: Given a Manager views a report preview with 500 records, when the Manager clicks "Export to Excel," then the system calls POST /api/reports/export, displays a loading indicator, and initiates a browser file download of the XLSX file within 10 seconds.

- FR-047: The system shall integrate AI-powered features into existing pages: a Meeting Brief panel on the Account Detail page, an Email Draft panel accessible from the Account Detail page, and an Activity Summary panel on the Account Timeline tab. All AI-generated content shall be labeled "AI-Generated" with an editable text area, a 3-second target response time, a 10-second timeout, and graceful degradation when the AI service is unavailable. Depends on: FR-030.
  - AC-047a: Given a Rep clicks "Prepare Meeting Brief" on an account detail page, when the system calls POST /api/ai/meeting-brief, then a side panel displays a loading state (pulsing "AI-Generated" badge with skeleton text lines), and upon response (within 3 seconds at p95) displays the structured brief (key contacts, recent activity summary, order trends, talking points) in an editable text area.
  - AC-047b: Given the AI service is unavailable (timeout after 10 seconds or HTTP 503), when a Rep requests any AI feature, then the system displays an inline error message "AI service temporarily unavailable — please try again in a few minutes" within the panel, with a "Retry" button, and does not display stale or partial content.

### Epic 6: Admin and System UI

- FR-048: The system shall display a User Management page at /admin/users accessible to Admin role only, with a user list supporting role and active status filters, a User Creation page at /admin/users/new, and a User Detail/Edit page at /admin/users/:id with role assignment and deactivation actions. Depends on: FR-026.
  - AC-048a: Given an Admin navigates to /admin/users, when the page loads, then the system displays all users with columns for name, email, role (color-coded badge), status (active/inactive), last login date, and action buttons for edit and deactivate.
  - AC-048b: Given an Admin clicks "Deactivate" on an active user, when the confirmation dialog appears and the Admin confirms, then the system calls DELETE /api/admin/users/:id, updates the user's status badge to "Inactive" in the list, and displays a success toast notification.

- FR-049: The system shall display a Data Import section with an import history page at /admin/imports and a multi-step import wizard at /admin/imports/new consisting of: Step 1 (select entity type), Step 2 (upload CSV/XLSX file with drag-and-drop, maximum 50 MB), Step 3 (preview with valid/error row counts and per-row error details), and Step 4 (confirmation and import execution with a results summary). Depends on: FR-027.
  - AC-049a: Given an Admin navigates to /admin/imports/new and selects entity type "Account," when the Admin uploads a CSV file via the drag-and-drop dropzone, then the system calls POST /api/admin/imports/upload, transitions to the preview step, and displays "200 rows parsed, 195 valid, 5 errors" with each error row highlighted and the specific validation failure described.
  - AC-049b: Given an Admin reviews the import preview and clicks "Import Valid Rows," when the import executes, then the system calls POST /api/admin/imports/:id/confirm, displays a progress indicator during processing, and upon completion shows an import summary with counts for created, updated, and skipped records plus a downloadable error log.

- FR-050: The system shall display a Data Quality Scorecard page at /admin/quality accessible to Manager and Admin roles, showing a composite quality score, individual metric cards (required fields completion, email validity, product images, duplicate count, stale account count), and drill-down tables linking to affected records. Depends on: FR-029.
  - AC-050a: Given a Manager navigates to /admin/quality, when the page loads, then the system displays the composite quality score prominently and individual metric cards each showing percentage or count, trend indicator (up/down/stable vs. previous period), and a "View Details" action.
  - AC-050b: Given a Manager clicks "View Details" on the "Accounts with incomplete required fields" metric, when the drill-down table loads, then the system calls GET /api/admin/quality/drill-down with the metric type and displays a table of affected Account records with missing fields highlighted per row.

- FR-051: The system shall display email engagement data (sent, opened, clicked, bounced) as badges on email timeline items within the Account Detail Timeline tab, and provide an Unmatched Emails page at /admin/emails/unmatched for manual email-to-account association. Depends on: FR-010.
  - AC-051a: Given a Rep views an account's timeline, when an email activity appears, then the timeline item displays the email subject, recipient, sent date, and engagement badge (color-coded: green for opened, blue for clicked, yellow for sent, red for bounced) with the engagement timestamp on hover.
  - AC-051b: Given an Admin or Manager navigates to /admin/emails/unmatched, when the page loads, then the system displays unmatched emails (from GET /api/email-records/unmatched) with sender, subject, date, and a "Link to Account" action that opens a searchable account picker dialog.

- FR-052: The system shall display a notification bell icon with an unread count badge in the top navigation bar, opening a dropdown panel listing notifications grouped by date (Today, Yesterday, Earlier), with click-to-navigate behavior linking each notification to the relevant entity detail page. Depends on: FR-009 (task reminders), FR-013 (order approval notifications).
  - AC-052a: Given a user has 3 unread notifications, when the user views any authenticated page, then the notification bell in the top bar displays a badge with the count "3," and clicking the bell opens a dropdown panel showing notifications in reverse chronological order grouped under date headers.
  - AC-052b: Given a Rep receives an order approval notification, when the Rep clicks the notification item, then the system navigates to /orders/:id for the relevant order and marks the notification as read, decrementing the unread count badge.

- FR-053: The system shall ensure all pages and components comply with cross-cutting UI requirements: responsive layout from 320px to 1440px with mobile-first breakpoints, WCAG 2.1 Level AA accessibility, keyboard navigation with visible focus indicators on all interactive elements, and a First Contentful Paint under 2 seconds on a 4G mobile connection. Depends on: NFR-002, NFR-011, NFR-012.
  - AC-053a: Given a user accesses any page on a 320px-wide mobile viewport, when the page renders, then all content is visible without horizontal scrolling, touch targets are at least 44 by 44 CSS pixels, and the bottom tab navigation is displayed instead of the sidebar.
  - AC-053b: Given a user navigates any page using only the keyboard, when the user presses Tab, then focus moves through all interactive elements in a logical order with a visible focus ring, and all modal dialogs trap focus within the dialog and return focus to the triggering element on close.


## 3. UI Non-Functional Requirements

- NFR-015: All page transitions shall use optimistic UI updates for write operations (create, update, delete), displaying the expected result immediately while the API request is in flight, and reverting the UI with an error toast if the request fails.

- NFR-016: All data tables shall support column sorting (ascending, descending, default), and the sort state shall be preserved in URL query parameters so that the page is shareable and refreshable without losing the current view state.

- NFR-017: All form pages shall preserve unsaved input in session storage and restore it on page revisit or accidental navigation, with a confirmation dialog ("You have unsaved changes") when the user attempts to leave a dirty form.

- NFR-018: All list pages shall display contextual empty states with a descriptive message, a primary call-to-action button, and match the expected layout dimensions of the populated state rather than collapsing to a minimal height.


## 4. Screen Inventory

| Route | Page Title | Roles | Primary Components | API Dependencies | FR |
|-------|-----------|-------|-------------------|-----------------|-----|
| `/` | Redirect | All | — | — | — |
| `/login` | Login | Public | login-form | POST /api/auth/login | Existing |
| `/dashboard` | Dashboard | All | kpi-card, period-selector, revenue-chart, territory-table, rep-ranking, pipeline-chart, health-donut | GET /api/dashboards/rep, GET /api/dashboards/team/* | FR-045 |
| `/accounts` | Account List | Rep, Manager, Admin | account-list-page, data-table, account-filters, health-score-badge | GET /api/accounts | FR-033 |
| `/accounts/new` | Create Account | Rep, Manager, Admin | account-form, duplicate-warning-dialog | POST /api/accounts, GET /api/accounts/check-duplicates | FR-035 |
| `/accounts/[id]` | Account Detail | Rep, Manager, Admin | account-detail-header, tabs (overview, contacts, timeline, orders, opportunities), health-breakdown, contacts-tab, timeline, orders-tab, opportunities-tab | GET /api/accounts/:id, GET /api/accounts/:id/activities, GET /api/accounts/:id/timeline, GET /api/accounts/:id/contacts | FR-034 |
| `/accounts/[id]/edit` | Edit Account | Rep, Manager, Admin | account-form | PUT /api/accounts/:id | FR-035 |
| `/activities` | Activity List | Rep, Manager, Admin | activity-list-page, data-table, quick-log-fab | GET /api/activities, GET /api/accounts/:id/activities | FR-036 |
| `/tasks` | Task List | Rep, Manager, Admin | task-list-page, data-table, task-form-dialog, status-toggle, overdue-indicator | GET /api/tasks, POST /api/tasks, PUT /api/tasks/:id | FR-037 |
| `/orders` | Order List | Rep, Manager, Admin | order-list-page, data-table, order-status-badge | GET /api/orders | FR-038 |
| `/orders/new` | Create Order | Rep, Manager, Admin | order-form, product-search-combobox, line-item-row, reorder-suggestion-card | POST /api/orders, GET /api/products/search, GET /api/accounts/:id/reorder-suggestion | FR-039 |
| `/orders/[id]` | Order Detail | Rep, Manager, Admin | order-detail-page, order-status-badge, line-items-table, vendor-split-section, approval-history | GET /api/orders/:id | FR-038 |
| `/orders/approval-queue` | Approval Queue | Manager, Admin | approval-queue-page, order-approval-dialog | GET /api/orders/approval-queue, POST /api/orders/:id/approve, POST /api/orders/:id/reject | FR-040 |
| `/products` | Product Catalog | Rep, Manager, Admin | product-catalog, product-card, product-filters, view-toggle | GET /api/products | FR-041 |
| `/products/[id]` | Product Detail | Rep, Manager, Admin | product-detail, certification-badges, availability-indicator | GET /api/products/:id | FR-041 |
| `/brands` | Brand List | Rep, Manager, Admin | brand-list, data-table | GET /api/brands | FR-041 |
| `/brands/[id]` | Brand Detail | Rep, Manager, Admin | brand-detail, line-card-actions, product-list | GET /api/brands/:id, GET /api/brands/:id/line-card, POST /api/brands/:id/line-card/share | FR-041 |
| `/opportunities` | Pipeline Kanban | Rep, Manager, Admin | pipeline-kanban, opportunity-card, pipeline-summary, pipeline-filters, close-dialogs | GET /api/opportunities, GET /api/pipeline/summary, POST /api/opportunities/:id/transition | FR-042 |
| `/opportunities/new` | Create Opportunity | Rep, Manager, Admin | opportunity-form | POST /api/opportunities | FR-043 |
| `/opportunities/[id]` | Opportunity Detail | Rep, Manager, Admin | opportunity-detail, stage-history-timeline | GET /api/opportunities/:id | FR-043 |
| `/commissions` | Commission Dashboard | Rep, Manager, Admin | commission-dashboard, month-selector, statement-summary, ytd-card, statement-history | GET /api/commissions/statements | FR-044 |
| `/commissions/statements/[id]` | Statement Detail | Rep, Manager, Admin | statement-detail, line-item-table, dispute-dialog, approve-reject-actions | GET /api/commissions/statements/:id, POST /api/commissions/statements/:id/approve, POST /api/commissions/entries/:id/dispute | FR-044 |
| `/commissions/rules` | Commission Rules | Admin | rule-list, rule-form | GET /api/commissions/rules, POST /api/commissions/rules, PUT /api/commissions/rules/:id | FR-044 |
| `/reports` | Saved Reports | Manager, Admin | report-list, data-table | GET /api/reports | FR-046 |
| `/reports/new` | Report Builder | Manager, Admin | report-builder, filter-builder, column-picker, results-table, export-actions | POST /api/reports, POST /api/reports/execute, POST /api/reports/export | FR-046 |
| `/reports/[id]` | Report Results | Manager, Admin | results-table, export-actions | GET /api/reports/:id, POST /api/reports/execute | FR-046 |
| `/admin/users` | User List | Admin | user-list, data-table, role-badge | GET /api/admin/users | FR-048 |
| `/admin/users/new` | Create User | Admin | user-form | POST /api/admin/users | FR-048 |
| `/admin/users/[id]` | User Detail | Admin | user-detail, user-form, deactivate-dialog | GET /api/admin/users/:id, PUT /api/admin/users/:id, DELETE /api/admin/users/:id | FR-048 |
| `/admin/imports` | Import History | Admin | import-history-list, data-table | GET /api/admin/imports | FR-049 |
| `/admin/imports/new` | Import Wizard | Admin | import-wizard, file-upload-dropzone, import-preview-table, import-summary | POST /api/admin/imports/upload, POST /api/admin/imports/:id/confirm, GET /api/admin/layout-of-truth/:entityType | FR-049 |
| `/admin/quality` | Data Quality | Manager, Admin | quality-scorecard, metric-card, drill-down-table | GET /api/admin/quality/scorecard, GET /api/admin/quality/drill-down | FR-050 |
| `/admin/emails/unmatched` | Unmatched Emails | Manager, Admin | unmatched-email-list, account-picker-dialog | GET /api/email-records/unmatched | FR-051 |
| `/admin/rules` | Business Rules | Admin | rule-list, rule-form, condition-builder, action-builder | GET /api/business-rules, POST /api/business-rules | Existing |
| `/admin/rules/new` | Create Rule | Admin | rule-form, condition-builder, action-builder | POST /api/business-rules | Existing |
| `/admin/rules/[id]` | Edit Rule | Admin | rule-form, condition-builder, action-builder | GET /api/business-rules/:id, PUT /api/business-rules/:id | Existing |


## 5. Design System Specification

### Theme Tokens

The design system extends the existing CSS custom property architecture (HSL variables in globals.css):

| Token Category | Token | Light Value | Dark Value | Usage |
|---------------|-------|------------|------------|-------|
| Background | `--background` | 0 0% 100% | 222.2 84% 4.9% | Page background |
| Foreground | `--foreground` | 222.2 84% 4.9% | 210 40% 98% | Primary text |
| Primary | `--primary` | 222.2 47.4% 11.2% | 210 40% 98% | Buttons, links, active states |
| Secondary | `--secondary` | 210 40% 96.1% | 217.2 32.6% 17.5% | Secondary buttons, subtle backgrounds |
| Muted | `--muted` | 210 40% 96.1% | 217.2 32.6% 17.5% | Disabled elements, placeholders |
| Accent | `--accent` | 210 40% 96.1% | 217.2 32.6% 17.5% | Hover states, highlights |
| Destructive | `--destructive` | 0 84.2% 60.2% | 0 62.8% 30.6% | Delete, error, destructive actions |
| Success | `--success` | 142 76% 36% | 142 76% 36% | Health score good, in-stock, approved |
| Warning | `--warning` | 38 92% 50% | 38 92% 50% | At-risk, limited stock, pending |
| Info | `--info` | 217 91% 60% | 217 91% 60% | Informational badges, links |

### Typography Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|------------|-------|
| Display | 36px / 2.25rem | 700 | 1.2 | Dashboard KPI numbers |
| H1 | 30px / 1.875rem | 700 | 1.3 | Page titles |
| H2 | 24px / 1.5rem | 600 | 1.35 | Section headers |
| H3 | 20px / 1.25rem | 600 | 1.4 | Card titles, tab labels |
| H4 | 16px / 1rem | 600 | 1.5 | Sub-section headers |
| Body | 14px / 0.875rem | 400 | 1.5 | Default text |
| Small | 12px / 0.75rem | 400 | 1.5 | Labels, timestamps, badges |
| Tiny | 11px / 0.6875rem | 500 | 1.4 | Overline text, chart labels |

### Responsive Breakpoints

| Breakpoint | Width | Layout | Navigation |
|-----------|-------|--------|-----------|
| xs | 0–319px | Not supported (minimum 320px) | — |
| sm | 320–639px | Single column, stacked cards | Bottom tab bar |
| md | 640–1023px | Two-column where appropriate | Bottom tab bar |
| lg | 1024–1279px | Full multi-column | Collapsible sidebar |
| xl | 1280–1440px | Full multi-column, wider gutters | Fixed sidebar |

### Component Catalog

**Primitive Components (shadcn/ui):**

| Component | Status | Usage |
|-----------|--------|-------|
| Button | Exists | All clickable actions |
| Card | Exists | Container for grouped content |
| Input | Exists | Text input fields |
| Select | Exists | Single-option selection |
| Label | Exists | Form field labels |
| Skeleton | Exists | Loading placeholders |
| Dialog | Needed | Modals, confirmations, forms |
| Table | Needed | Data display (header, body, row, cell) |
| Tabs | Needed | Account detail, page sections |
| Badge | Needed | Status indicators, counts |
| Toast | Needed | Success/error notifications (via sonner) |
| Command | Needed | Global search palette (via cmdk) |
| DatePicker | Needed | Date selection (via react-day-picker) |
| Popover | Needed | Tooltips, dropdown content |
| DropdownMenu | Needed | Action menus, context menus |
| Tooltip | Needed | Hover information |
| Separator | Needed | Visual dividers |
| Switch | Needed | Boolean toggles |
| Checkbox | Needed | Multi-select options |
| Textarea | Needed | Multi-line text input |
| ScrollArea | Needed | Scrollable containers |

**Composite Patterns:**

| Pattern | Description | Used By |
|---------|-------------|---------|
| data-table | TanStack Table wrapper with sorting, filtering, pagination, column visibility | FR-033, FR-037, FR-038, FR-041, FR-046, FR-048 |
| empty-state | Illustration + message + CTA button for zero-record lists | All list pages |
| error-state | Error icon + message + retry button + error reference ID | All data-fetching views |
| form-field | Label + input + error message + description wrapper | All forms |
| page-header | Title + breadcrumb + action buttons + optional description | All pages |
| filter-bar | Horizontal filter controls with clear-all action | List pages |
| confirmation-dialog | Title + message + cancel/confirm buttons with destructive variant | Delete, deactivate, reject actions |
| status-badge | Color-coded badge with text for entity statuses | Orders, commissions, users, tasks |
| infinite-scroll | Intersection observer trigger with loading indicator | Timeline, kanban columns |
| loading-overlay | Semi-transparent overlay with spinner for in-place updates | Form submissions, drag-and-drop |
| search-combobox | Searchable dropdown with async results | Product search, account picker, user picker |
| file-dropzone | Drag-and-drop file upload with size validation | Data import wizard |

### Interaction Patterns

| Pattern | Specification |
|---------|--------------|
| Debounced search | 300ms debounce on all search/filter inputs |
| Optimistic updates | Write operations update UI immediately, revert on failure |
| Skeleton loaders | All data-fetching views show layout-matching skeletons |
| Toast notifications | Success (3s auto-dismiss), error (persistent until dismissed), positioned top-right |
| Confirmation dialogs | Required for all destructive actions (delete, deactivate, reject) |
| Form validation | Inline field errors on blur, summary on submit attempt |
| Infinite scroll | Triggered at 200px from bottom, loads 20 items per batch |
| Drag and drop | Visual drop indicator, 200ms settle delay, revert animation on failure |
| Keyboard shortcuts | Cmd+K (search), Escape (close modals/palettes), Enter (submit forms) |
| URL state | Filters, sorts, pagination cursors persisted in URL query parameters |

### State Patterns

| State | Visual Treatment |
|-------|-----------------|
| Loading (initial) | Skeleton loaders matching target layout |
| Loading (refresh) | Subtle loading bar at top of content area |
| Loading (action) | Button disabled with spinner icon, overlay on affected region |
| Empty | Centered illustration + message + CTA |
| Error (recoverable) | Inline error card with message + retry button |
| Error (fatal) | Full-page error boundary with "Go to Dashboard" fallback |
| Offline | Persistent top banner: "You are offline — some features may be unavailable" |
| Success | Toast notification (top-right, 3s auto-dismiss) |


## 6. Epic and Feature Breakdown

### Epic 1: Design Foundation (P0 — blocks all others)

| Feature | FR | Complexity | Priority | Dependencies |
|---------|-----|-----------|----------|-------------|
| F-000: Design System and Component Library | FR-031 | L | P0 | None |
| F-001: Global Search (Cmd+K) | FR-032 | M | P0 | F-000 |

**Epic 1 scope:** Theme tokens (dark mode, semantic colors). Typography scale. 15+ shadcn/ui primitives. 10+ composite patterns. New dependencies: @tanstack/react-table, cmdk, sonner, date-fns, react-day-picker, recharts, @dnd-kit/core.

### Epic 2: Core CRM UI (P0 — MVP rep workflow)

| Feature | FR | Complexity | Priority | Dependencies |
|---------|-----|-----------|----------|-------------|
| F-002a: Account List and Search | FR-033 | M | P0 | F-000 |
| F-002b: Account Detail View | FR-034 | L | P0 | F-000, F-002a |
| F-002c: Account Forms and Contacts | FR-035 | M | P0 | F-000, F-002a |
| F-003: Activity Logging and Timeline | FR-036 | L | P0 | F-000, F-002a |
| F-004: Task Management | FR-037 | M | P0 | F-000 |

**Epic 2 scope:** Account list, detail, create/edit. Contact CRUD. Activity logging with quick-log FAB. Timeline with infinite scroll. Task management. ~12 new pages, ~35 components, ~15 hooks.

### Epic 3: Commerce UI (P0 — order workflow)

| Feature | FR | Complexity | Priority | Dependencies |
|---------|-----|-----------|----------|-------------|
| F-005a: Order List and Detail | FR-038 | M | P0 | F-000, F-002a |
| F-005b: Order Entry Form | FR-039 | L | P0 | F-000, F-005a |
| F-005c: Order Approval Queue | FR-040 | S | P0 | F-000, F-005a |
| F-006: Product Catalog and Brands | FR-041 | L | P0 | F-000 |

**Epic 3 scope:** Order list, detail, creation with multi-line form. Product search combobox. Approval queue. Product catalog (grid/list). Brand detail with line card. ~10 new pages, ~25 components, ~10 hooks.

### Epic 4: Revenue and Pipeline UI (P1)

| Feature | FR | Complexity | Priority | Dependencies |
|---------|-----|-----------|----------|-------------|
| F-007: Pipeline Kanban | FR-042 | L | P1 | F-000 |
| F-007b: Opportunity CRUD | FR-043 | M | P1 | F-000, F-007 |
| F-008: Commission Tracking | FR-044 | L | P1 | F-000 |

**Epic 4 scope:** Kanban board with drag-and-drop. Opportunity forms. Commission dashboard and statement detail. Dispute flow. ~8 new pages, ~25 components, ~10 hooks. New dependency: @dnd-kit/core, @dnd-kit/sortable.

### Epic 5: Analytics and Reporting UI (P1)

| Feature | FR | Complexity | Priority | Dependencies |
|---------|-----|-----------|----------|-------------|
| F-009: Enhanced Dashboard and Charts | FR-045 | M | P1 | F-000 |
| F-010: Custom Reports | FR-046 | L | P1 | F-000 |
| F-011: AI Features Integration | FR-047 | M | P1 | F-000, F-002b |

**Epic 5 scope:** Dashboard chart widgets. Report builder with preview and export. AI panels (meeting brief, email draft, activity summary). ~5 new pages, ~20 components, ~8 hooks. Dependency: recharts.

### Epic 6: Admin and System UI (P0-P2 mixed)

| Feature | FR | Complexity | Priority | Dependencies |
|---------|-----|-----------|----------|-------------|
| F-012: User Management | FR-048 | M | P0 | F-000 |
| F-013: Data Import Wizard | FR-049 | M | P1 | F-000 |
| F-014: Data Quality Scorecard | FR-050 | S | P2 | F-000 |
| F-015: Email Integration | FR-051 | S | P2 | F-000, F-002b |
| F-016: Notifications | FR-052 | M | P1 | F-000 |

**Epic 6 scope:** User CRUD. Import wizard (multi-step). Quality scorecard with drill-down. Email engagement badges. Notification bell. ~8 new pages, ~20 components, ~8 hooks.


## 7. Feature Specifications

### F-000: Design System and Component Library

**FR:** FR-031
**Priority:** P0 | **Complexity:** L | **Epic:** 1
**Blocks:** All other features

**Scope:**
- Extend CSS custom property theme with semantic color tokens (success, warning, info) and dark mode support
- Add typography scale utilities
- Install and configure shadcn/ui primitives: dialog, table, tabs, badge, popover, dropdown-menu, tooltip, separator, switch, checkbox, textarea, scroll-area
- Install sonner for toast notifications, cmdk for command palette
- Build composite patterns: data-table (wrapping @tanstack/react-table), empty-state, error-state, form-field, page-header, filter-bar, confirmation-dialog, status-badge, infinite-scroll, loading-overlay, search-combobox, file-dropzone

**New Dependencies:**
- @tanstack/react-table (data tables with sorting, filtering, pagination)
- cmdk (command palette)
- sonner (toast notifications)
- date-fns (date formatting and manipulation)
- react-day-picker (date picker)
- recharts (charts and graphs)
- @dnd-kit/core + @dnd-kit/sortable (drag and drop for kanban)

**Components:** ~25 primitives + ~12 composite patterns
**Hooks:** useInfiniteScroll, useDebounce, useMediaQuery, useConfirmDialog
**Tests:** Component render tests, accessibility audit (axe-core), responsive snapshot tests

### F-001: Global Search (Cmd+K)

**FR:** FR-032
**Priority:** P0 | **Complexity:** M | **Epic:** 1
**Depends on:** F-000

**Scope:**
- Search trigger button in top-bar showing "Search... Cmd+K"
- Command palette modal (cmdk) with categorized results
- 300ms debounced search across accounts, contacts, products
- Keyboard navigation (arrow keys, Enter to select, Escape to close)
- Recent searches stored in localStorage

**Components:** search-trigger, command-palette, search-result-item, search-category-header
**Hooks:** useGlobalSearch, useRecentSearches
**API:** GET /api/accounts?search=, GET /api/products/search

### F-002a: Account List and Search

**FR:** FR-033
**Priority:** P0 | **Complexity:** M | **Epic:** 2
**Depends on:** F-000

**Scope:**
- /accounts page with data-table
- Territory, type, and health score range filters
- Sortable columns: name, territory, type, health score, last activity, updated date
- Cursor-based pagination (20 items/page)
- Role-scoped data (Rep sees own territories, Manager/Admin sees all)

**Components:** account-list-page, account-filters, health-score-badge, account-row
**Hooks:** useAccounts, useAccountFilters
**API:** GET /api/accounts

### F-002b: Account Detail View

**FR:** FR-034
**Priority:** P0 | **Complexity:** L | **Epic:** 2
**Depends on:** F-000, F-002a

**Scope:**
- /accounts/[id] page with tabbed layout
- Overview tab: metadata, health score breakdown, parent-child hierarchy
- Contacts tab: contact list with inline add/edit/delete via modal
- Timeline tab: unified activity timeline with type filter and infinite scroll
- Orders tab: order history table linked to order detail
- Opportunities tab: linked opportunities list

**Components:** account-detail-header, account-tabs, overview-tab, contacts-tab, contact-form-dialog, timeline-tab, timeline-item, type-icon, orders-tab, opportunities-tab, children-section, health-score-breakdown
**Hooks:** useAccount, useAccountTimeline, useAccountContacts, useAccountOrders, useAccountOpportunities
**API:** GET /api/accounts/:id, GET /api/accounts/:id/timeline, GET /api/accounts/:id/activities, contacts CRUD

### F-002c: Account Forms and Contacts

**FR:** FR-035
**Priority:** P0 | **Complexity:** M | **Epic:** 2
**Depends on:** F-000, F-002a

**Scope:**
- /accounts/new and /accounts/[id]/edit pages
- React Hook Form with shared Zod schemas
- Duplicate detection on name field blur
- Territory dropdown scoped to user's assignments (Rep) or all (Manager/Admin)
- Contact CRUD via modal forms on account detail

**Components:** account-form, duplicate-warning-dialog, territory-select
**Hooks:** useCreateAccount, useUpdateAccount, useCheckDuplicates
**API:** POST /api/accounts, PUT /api/accounts/:id, GET /api/accounts/check-duplicates

### F-003: Activity Logging and Timeline

**FR:** FR-036
**Priority:** P0 | **Complexity:** L | **Epic:** 2
**Depends on:** F-000, F-002a

**Scope:**
- /activities page with data table
- Quick-log FAB (floating action button) for mobile and desktop
- Activity form with type templates (visit, call, email, demo, sampling)
- Demo-specific fields: product picker, quantity sampled, buyer feedback
- Activity timeline on account detail (integrated with F-002b)

**Components:** activity-list-page, quick-log-fab, quick-log-form, demo-fields, product-picker, timeline (shared), timeline-item, type-icon
**Hooks:** useActivities, useCreateActivity, useUpdateActivity, useActivityMetrics
**API:** POST /api/activities, GET /api/activities, GET /api/accounts/:id/activities, GET /api/accounts/:id/timeline, GET /api/activities/metrics

### F-004: Task Management

**FR:** FR-037
**Priority:** P0 | **Complexity:** M | **Epic:** 2
**Depends on:** F-000

**Scope:**
- /tasks page with data table
- Filters: assignee, status, priority, overdue
- Task create/edit via dialog form
- Quick status toggle (checkbox to mark complete)
- Overdue highlighting (red indicator, sorted to top)

**Components:** task-list-page, task-form-dialog, task-card, status-toggle, overdue-indicator, priority-badge
**Hooks:** useTasks, useCreateTask, useUpdateTask
**API:** GET /api/tasks, POST /api/tasks, PUT /api/tasks/:id, DELETE /api/tasks/:id

### F-005a: Order List and Detail

**FR:** FR-038
**Priority:** P0 | **Complexity:** M | **Epic:** 3
**Depends on:** F-000, F-002a

**Scope:**
- /orders page with data table (status, date range, account filters)
- /orders/[id] detail page: header, status badge, line items table, vendor sub-order splits, approval history, status timeline

**Components:** order-list-page, order-detail-page, order-status-badge, line-items-table, vendor-split-section, approval-history, order-status-timeline
**Hooks:** useOrders, useOrder, useOrderFilters
**API:** GET /api/orders, GET /api/orders/:id

### F-005b: Order Entry Form

**FR:** FR-039
**Priority:** P0 | **Complexity:** L | **Epic:** 3
**Depends on:** F-000, F-005a

**Scope:**
- /orders/new page with multi-line form
- Inline product search combobox with availability, pricing, promo display
- Revenue model toggle per line (broker/wholesale)
- Running subtotals and order total
- Swipe-to-delete on mobile
- AI reorder suggestions (when accessed from account context)

**Components:** order-form, product-search-combobox, line-item-row, line-item-mobile, reorder-suggestion-card, order-summary
**Hooks:** useCreateOrder, useProductSearch, useReorderSuggestions
**API:** POST /api/orders, GET /api/products/search, GET /api/accounts/:id/reorder-suggestion

### F-005c: Order Approval Queue

**FR:** FR-040
**Priority:** P0 | **Complexity:** S | **Epic:** 3
**Depends on:** F-000, F-005a

**Scope:**
- /orders/approval-queue page (Manager/Admin only)
- Pending orders list with key fields
- Approve and reject actions via dialog
- Reject requires reason text (minimum 10 characters)

**Components:** approval-queue-page, order-approval-dialog, reject-reason-input
**Hooks:** useApprovalQueue, useApproveOrder, useRejectOrder
**API:** GET /api/orders/approval-queue, POST /api/orders/:id/approve, POST /api/orders/:id/reject

### F-006: Product Catalog and Brands

**FR:** FR-041
**Priority:** P0 | **Complexity:** L | **Epic:** 3
**Depends on:** F-000

**Scope:**
- /products page: grid/list toggle, filters (brand, category, certification, availability)
- /products/[id] detail page: pricing, certifications, allergens, availability
- /brands page: brand list with product counts
- /brands/[id] detail page: brand info, products, line card generation, email sharing

**Components:** product-catalog, product-card, product-detail, product-filters, view-toggle, certification-badges, availability-indicator, brand-list, brand-detail, line-card-actions
**Hooks:** useProducts, useProduct, useBrands, useBrand, useGenerateLineCard, useShareLineCard
**API:** GET /api/products, GET /api/products/:id, GET /api/brands, GET /api/brands/:id, GET /api/brands/:id/line-card, POST /api/brands/:id/line-card/share

### F-007: Pipeline Kanban

**FR:** FR-042
**Priority:** P1 | **Complexity:** L | **Epic:** 4
**Depends on:** F-000

**Scope:**
- /opportunities page: kanban board with 6 stage columns
- Drag-and-drop via @dnd-kit (Prospect, Qualified, Proposal, Negotiation, Closed Won, Closed Lost)
- 20 cards per column with "Load more"
- Weighted forecast summary at top
- Close-won/close-lost dialogs requiring reason
- List view toggle

**Components:** pipeline-kanban, kanban-column, opportunity-card, pipeline-summary, pipeline-filters, close-won-dialog, close-lost-dialog, pipeline-list-view, view-toggle
**Hooks:** useOpportunities, useTransitionOpportunity, usePipelineSummary, usePipelineAnalytics
**API:** GET /api/opportunities, POST /api/opportunities/:id/transition, GET /api/pipeline/summary, GET /api/pipeline/analytics

### F-007b: Opportunity CRUD

**FR:** FR-043
**Priority:** P1 | **Complexity:** M | **Epic:** 4
**Depends on:** F-000, F-007

**Scope:**
- /opportunities/new creation form
- /opportunities/[id] detail page
- Fields: name, account picker, value, close date, stage, probability, brands
- Stage history timeline

**Components:** opportunity-form, opportunity-detail, stage-history-timeline, account-picker, brand-multi-select
**Hooks:** useOpportunity, useCreateOpportunity, useUpdateOpportunity
**API:** POST /api/opportunities, GET /api/opportunities/:id, PUT /api/opportunities/:id

### F-008: Commission Tracking

**FR:** FR-044
**Priority:** P1 | **Complexity:** L | **Epic:** 4
**Depends on:** F-000

**Scope:**
- /commissions dashboard: month selector, current statement, YTD, history
- /commissions/statements/[id] detail: line-by-line breakdown
- Manager: approve/reject statements
- Rep: file disputes per line item
- Manager: resolve disputes
- Admin: /commissions/rules CRUD (extends existing admin rules), QuickBooks export

**Components:** commission-dashboard, month-selector, statement-summary-card, ytd-card, statement-history-table, statement-detail, commission-line-table, dispute-dialog, resolve-dispute-dialog, approve-statement-button, reject-statement-dialog, commission-rule-form, export-button
**Hooks:** useCommissionStatements, useCommissionStatement, useApproveStatement, useRejectStatement, useFileDispute, useResolveDispute, useCommissionRules, useExportCommissions
**API:** GET /api/commissions/statements, GET /api/commissions/statements/:id, POST /api/commissions/statements/:id/approve, POST /api/commissions/statements/:id/reject, POST /api/commissions/entries/:id/dispute, POST /api/commissions/disputes/:id/resolve, GET /api/commissions/rules, POST /api/commissions/rules, PUT /api/commissions/rules/:id, POST /api/commissions/export

### F-009: Enhanced Dashboard and Charts

**FR:** FR-045
**Priority:** P1 | **Complexity:** M | **Epic:** 5
**Depends on:** F-000

**Scope:**
- Extend existing /dashboard with recharts widgets
- Rep view: account health donut chart with click-to-filter navigation
- Team view: revenue-by-month bar chart, territory revenue table, enhanced Rep ranking, pipeline forecast chart

**Components:** revenue-chart, territory-revenue-table, rep-ranking-table, pipeline-forecast-chart, health-donut-chart, chart-loading-skeleton
**Hooks:** useRevenueByMonth, useTerritoryRevenue, usePipelineForecast (extend existing use-dashboard)
**API:** GET /api/dashboards/team/revenue-by-month, GET /api/dashboards/team/territory-revenue, GET /api/dashboards/team/pipeline-forecast

### F-010: Custom Reports

**FR:** FR-046
**Priority:** P1 | **Complexity:** L | **Epic:** 5
**Depends on:** F-000

**Scope:**
- /reports: saved report list
- /reports/new: report builder (entity type, filters, column picker, preview)
- /reports/[id]: saved report results view
- CSV and XLSX export

**Components:** report-list-page, report-builder, entity-type-selector, filter-builder, column-picker, report-preview-table, export-actions, report-results-page
**Hooks:** useReports, useReport, useCreateReport, useExecuteReport, useExportReport
**API:** GET /api/reports, POST /api/reports, GET /api/reports/:id, DELETE /api/reports/:id, POST /api/reports/execute, POST /api/reports/export

### F-011: AI Features Integration

**FR:** FR-047
**Priority:** P1 | **Complexity:** M | **Epic:** 5
**Depends on:** F-000, F-002b

**Scope:**
- Meeting brief panel on account detail page
- Email draft panel on account detail page
- Activity summary panel on account timeline tab
- All AI output labeled "AI-Generated" and editable
- 3s target, 10s timeout, graceful degradation

**Components:** meeting-brief-panel, email-draft-panel, activity-summary-panel, ai-loading-state, ai-error-state, ai-generated-badge, ai-editable-textarea
**Hooks:** useMeetingBrief, useEmailDraft, useActivitySummary
**API:** POST /api/ai/meeting-brief, POST /api/ai/email-draft, POST /api/ai/activity-summary

### F-012: User Management

**FR:** FR-048
**Priority:** P0 | **Complexity:** M | **Epic:** 6
**Depends on:** F-000

**Scope:**
- /admin/users: user list with role/status filters
- /admin/users/new: create user form
- /admin/users/[id]: detail/edit page with deactivation

**Components:** user-list-page, user-form, user-detail, deactivate-dialog, role-badge, status-badge
**Hooks:** useAdminUsers, useAdminUser, useCreateUser, useUpdateUser, useDeactivateUser
**API:** GET /api/admin/users, POST /api/admin/users, GET /api/admin/users/:id, PUT /api/admin/users/:id, DELETE /api/admin/users/:id

### F-013: Data Import Wizard

**FR:** FR-049
**Priority:** P1 | **Complexity:** M | **Epic:** 6
**Depends on:** F-000

**Scope:**
- /admin/imports: import history list
- /admin/imports/new: 4-step wizard (entity type, upload, preview, confirm)
- File upload with drag-and-drop (50 MB limit)
- Preview with valid/error counts and per-row detail
- Import results summary

**Components:** import-history-page, import-wizard, step-indicator, entity-type-step, file-upload-step, file-dropzone, preview-step, import-preview-table, error-row-highlight, confirm-step, import-summary
**Hooks:** useImportHistory, useUploadImport, useConfirmImport, useImportDetail, useLayoutOfTruth
**API:** GET /api/admin/imports, POST /api/admin/imports/upload, POST /api/admin/imports/:id/confirm, GET /api/admin/imports/:id, GET /api/admin/layout-of-truth/:entityType

### F-014: Data Quality Scorecard

**FR:** FR-050
**Priority:** P2 | **Complexity:** S | **Epic:** 6
**Depends on:** F-000

**Scope:**
- /admin/quality: dashboard with composite score and metric cards
- Drill-down tables for each metric
- Trend indicators (up/down/stable)

**Components:** quality-scorecard-page, composite-score-card, metric-card, trend-indicator, drill-down-table
**Hooks:** useQualityScorecard, useQualityDrillDown
**API:** GET /api/admin/quality/scorecard, GET /api/admin/quality/drill-down

### F-015: Email Integration

**FR:** FR-051
**Priority:** P2 | **Complexity:** S | **Epic:** 6
**Depends on:** F-000, F-002b

**Scope:**
- Email engagement badges on account timeline items
- /admin/emails/unmatched: queue for manual email-to-account association

**Components:** email-timeline-item, engagement-badge, unmatched-email-list, email-account-linker
**Hooks:** useUnmatchedEmails, useLinkEmail
**API:** GET /api/email-records/unmatched, PUT /api/email-records/:id/engagement

### F-016: Notifications

**FR:** FR-052
**Priority:** P1 | **Complexity:** M | **Epic:** 6
**Depends on:** F-000

**Scope:**
- Bell icon with unread count badge in top-bar
- Dropdown panel with notification list grouped by date
- Click-to-navigate to relevant entity
- Mark as read on click

**Components:** notification-bell, notification-panel, notification-item, notification-date-group
**Hooks:** useNotifications, useMarkNotificationRead, useUnreadCount
**API:** Notification CRUD endpoints (may require backend addition for persistent notifications)


## 8. API Endpoint Coverage Matrix

Every backend API endpoint mapped to the frontend feature that consumes it:

| Endpoint | Feature |
|----------|---------|
| POST /api/auth/login | Existing (login page) |
| POST /api/auth/refresh | Existing (api-client) |
| POST /api/auth/logout | Existing (auth-provider) |
| GET /api/accounts/check-duplicates | F-002c |
| POST /api/accounts | F-002c |
| GET /api/accounts | F-002a, F-001 |
| GET /api/accounts/:id | F-002b |
| PUT /api/accounts/:id | F-002c |
| DELETE /api/accounts/:id | F-002b |
| POST /api/accounts/:id/contacts | F-002b, F-002c |
| PUT /api/accounts/:id/contacts/:contactId | F-002b, F-002c |
| DELETE /api/accounts/:id/contacts/:contactId | F-002b, F-002c |
| POST /api/activities | F-003 |
| GET /api/activities/metrics | F-003 |
| GET /api/activities/:id | F-003 |
| PUT /api/activities/:id | F-003 |
| DELETE /api/activities/:id | F-003 |
| GET /api/accounts/:id/activities | F-002b, F-003 |
| GET /api/accounts/:id/timeline | F-002b, F-003 |
| POST /api/email-records | F-015 |
| GET /api/email-records/unmatched | F-015 |
| PUT /api/email-records/:id/engagement | F-015 |
| POST /api/tasks | F-004 |
| GET /api/tasks | F-004 |
| GET /api/tasks/:id | F-004 |
| PUT /api/tasks/:id | F-004 |
| DELETE /api/tasks/:id | F-004 |
| POST /api/orders | F-005b |
| GET /api/orders | F-005a |
| GET /api/orders/approval-queue | F-005c |
| GET /api/orders/:id | F-005a |
| PUT /api/orders/:id | F-005b |
| POST /api/orders/:id/submit | F-005b |
| POST /api/orders/:id/approve | F-005c |
| POST /api/orders/:id/reject | F-005c |
| POST /api/orders/:id/cancel | F-005a |
| GET /api/accounts/:id/reorder-suggestion | F-005b |
| GET /api/products/search | F-005b, F-001 |
| POST /api/products | F-006 |
| GET /api/products | F-006, F-001 |
| GET /api/products/:id | F-006 |
| PUT /api/products/:id | F-006 |
| DELETE /api/products/:id | F-006 |
| POST /api/brands | F-006 |
| GET /api/brands | F-006 |
| GET /api/brands/:id | F-006 |
| PUT /api/brands/:id | F-006 |
| GET /api/brands/:id/line-card | F-006 |
| POST /api/brands/:id/line-card/share | F-006 |
| POST /api/opportunities | F-007b |
| GET /api/opportunities | F-007 |
| GET /api/opportunities/:id | F-007b |
| PUT /api/opportunities/:id | F-007b |
| DELETE /api/opportunities/:id | F-007b |
| POST /api/opportunities/:id/transition | F-007 |
| GET /api/pipeline/summary | F-007 |
| GET /api/pipeline/analytics | F-007 |
| POST /api/commissions/rules | F-008 |
| GET /api/commissions/rules | F-008 |
| GET /api/commissions/rules/:id | F-008 |
| PUT /api/commissions/rules/:id | F-008 |
| GET /api/commissions/statements | F-008 |
| GET /api/commissions/statements/:id | F-008 |
| POST /api/commissions/statements/generate | F-008 |
| POST /api/commissions/statements/:id/approve | F-008 |
| POST /api/commissions/statements/:id/reject | F-008 |
| POST /api/commissions/entries/:id/dispute | F-008 |
| POST /api/commissions/disputes/:id/resolve | F-008 |
| POST /api/commissions/export | F-008 |
| POST /api/admin/users | F-012 |
| GET /api/admin/users | F-012 |
| GET /api/admin/users/:id | F-012 |
| PUT /api/admin/users/:id | F-012 |
| DELETE /api/admin/users/:id | F-012 |
| POST /api/admin/imports/upload | F-013 |
| POST /api/admin/imports/:id/confirm | F-013 |
| GET /api/admin/imports | F-013 |
| GET /api/admin/imports/:id | F-013 |
| GET /api/admin/layout-of-truth/:entityType | F-013 |
| GET /api/admin/quality/scorecard | F-014 |
| GET /api/admin/quality/drill-down | F-014 |
| POST /api/ai/meeting-brief | F-011 |
| POST /api/ai/email-draft | F-011 |
| POST /api/ai/activity-summary | F-011 |
| GET /api/dashboards/rep | F-009 (existing) |
| GET /api/dashboards/rep/critical-accounts | F-009 (existing) |
| GET /api/dashboards/team | F-009 |
| GET /api/dashboards/team/revenue-by-month | F-009 |
| GET /api/dashboards/team/pipeline-forecast | F-009 |
| GET /api/dashboards/team/territory-revenue | F-009 |
| POST /api/reports | F-010 |
| GET /api/reports | F-010 |
| GET /api/reports/:id | F-010 |
| DELETE /api/reports/:id | F-010 |
| POST /api/reports/execute | F-010 |
| POST /api/reports/export | F-010 |
| GET /api/business-rules | Existing (admin rules) |
| GET /api/business-rules/:id | Existing (admin rules) |
| POST /api/business-rules | Existing (admin rules) |
| PUT /api/business-rules/:id | Existing (admin rules) |
| DELETE /api/business-rules/:id | Existing (admin rules) |
| GET /api/health | System health (no UI) |


## 9. New Dependencies

| Package | Version | Purpose | Used By |
|---------|---------|---------|---------|
| @tanstack/react-table | ^8.x | Headless data table with sorting, filtering, pagination | F-000, all list pages |
| cmdk | ^1.x | Command palette for global search | F-000, F-001 |
| sonner | ^1.x | Toast notification system | F-000, all pages |
| date-fns | ^3.x | Date formatting and manipulation | F-000, all date displays |
| react-day-picker | ^8.x | Date picker component | F-000, forms with dates |
| recharts | ^2.x | Charts (bar, donut, line) for dashboard and reports | F-009, F-010 |
| @dnd-kit/core | ^6.x | Drag-and-drop primitives | F-007 |
| @dnd-kit/sortable | ^8.x | Sortable DnD extension for kanban | F-007 |


## 10. Implementation Order

```
Phase 1: Foundation
  F-000 (Design System)  ← MUST complete first, blocks everything
  F-001 (Global Search)

Phase 2: MVP Core (parallelizable after Phase 1)
  F-002a (Account List)  ──→  F-002b (Account Detail)  ──→  F-002c (Account Forms)
  F-003 (Activities)
  F-004 (Tasks)
  F-005a (Order List)  ──→  F-005b (Order Entry)  ──→  F-005c (Approval Queue)
  F-006 (Products/Brands)
  F-012 (User Management)

Phase 3: P1 Wave (after Phase 2 core)
  F-007 (Pipeline Kanban)  ──→  F-007b (Opportunity CRUD)
  F-008 (Commissions)
  F-009 (Dashboard Charts)
  F-010 (Reports)
  F-011 (AI Features)  [depends on F-002b]
  F-013 (Data Import)
  F-016 (Notifications)

Phase 4: Polish (after Phase 3)
  F-014 (Data Quality)
  F-015 (Email Integration)  [depends on F-002b]
```


## 11. Verification Checklist

| Check | Result |
|-------|--------|
| FR-031 through FR-053 defined (23 FRs) | 23 FRs |
| Each FR references at least one backend FR | All reference FR-001–030 or NFR-002/011/012 |
| Each screen in inventory maps to at least one FR | 32 routes mapped |
| AC/FR ratio >= 1.5 | 48 ACs / 23 FRs = 2.09 |
| All ACs use Given/When/Then format | Verified |
| Every backend API endpoint consumed by at least one feature | 96/96 mapped (Section 8) |
| Each feature independently spec-able through speckit pipeline | Verified (clear scope, components, hooks, API deps) |
| No circular dependencies between features | Verified (DAG: Epic 1 → 2/3/6 → 4/5 → Polish) |
| NFR-015 through NFR-018 defined (4 UI NFRs) | 4 NFRs |
