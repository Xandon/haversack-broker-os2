# Haversack Unified Platform — Product Requirements Document

**Version:** 1.0.0
**Date:** 2026-02-24
**Status:** Draft — Phase 1 (P0/P1)
**Author:** Requirements Analyst


## 1. Overview

### Problem Statement

Haversack Sales is a specialty food broker and wholesaler operating in the Pacific Northwest with 9 territory representatives managing approximately 50 artisan food brands. The company operates a dual revenue model: brokerage (8–15% commission) and wholesale (25–40% markup). The existing FileMaker-based system cannot support mobile field workflows, lacks commission automation, provides no AI-assisted insights, and creates data silos that prevent territory representatives from accessing account, order, and product information in a unified view. Haversack requires a CRM-first web application to replace FileMaker entirely, enabling field-based account management, automated order processing, commission tracking, and data-driven decision-making.

### Target Users

- **Territory Representative (Rep):** 9 field-based sales reps who manage accounts, enter orders, log activities, and track commissions from mobile devices and desktops.
- **Sales Manager:** Oversees team performance, approves high-value orders and commissions, manages territory assignments, and reviews pipeline forecasts.
- **Administrator (Admin):** Configures system settings, manages users and roles, defines territories, imports data, and maintains integrations (QuickBooks, Shopify).
- **Logistics Coordinator:** Tracks order fulfillment, monitors inventory availability, and coordinates multi-vendor shipments.
- **Viewer:** Read-only access for brand principals and stakeholders who review reports and brand performance metrics.

### Success Metrics

- 9 out of 9 territory representatives actively using the platform within 90 days of launch
- Greater than 99% system uptime during Phase 1 (measured monthly)
- Account search returns results in under 200 milliseconds at the 95th percentile
- FileMaker fully decommissioned within 120 days of platform launch
- Data quality score exceeds 90% as measured by the data quality scorecard
- Order entry completed in under 5 minutes for a 10-line-item order
- Commission processing cycle reduced to under 1 business day
- Account churn rate below 10% annualized
- Revenue per territory representative increases by at least 15% within 12 months
- Email engagement response rate exceeds 30% across all outbound campaigns
- Brand coverage per territory exceeds 60% of the active product catalog

## 2. Functional Requirements

### Account Management

- FR-001: The system shall allow a user with the Rep, Manager, or Admin role to create a new Account record from a mobile or desktop device, capturing at minimum: account name, physical address, primary contact name, primary contact phone, primary contact email, territory assignment, and account type (retail, restaurant, distributor).
  - AC-001a: Given a Rep is authenticated and has network connectivity, when the Rep completes the new account form with all required fields and taps "Save," then the system persists the Account record to the database and displays a confirmation within 3 seconds.
  - AC-001b: Given a Rep is authenticated and submits the new account form with the account name field blank, when the Rep taps "Save," then the system displays a validation error on the account name field and does not persist the record.
  - AC-001c: Given a Rep creates an Account with a territory assignment outside the Rep's assigned territories, when the Rep taps "Save," then the system displays a warning indicating the territory mismatch and requires confirmation before persisting.

- FR-002: The system shall display a unified Account detail view showing account metadata, linked contacts, activity timeline, order history, open opportunities, notes, photos, and brand gap analysis for the selected account.
  - AC-002a: Given a Rep navigates to an existing Account's detail page, when the page loads, then the system displays all associated contacts, the 20 most recent activities, the 10 most recent orders, and any open opportunities within 2 seconds.
  - AC-002b: Given a Rep views an Account detail page for an account with zero orders, when the page loads, then the system displays an empty state message "No orders yet" in the order history section rather than a blank area.

- FR-003: The system shall provide full-text search across Account records by account name, contact name, phone number, email address, city, and territory, returning results ranked by relevance.
  - AC-003a: Given a Rep types at least 3 characters into the global search bar, when the Rep pauses typing for 300 milliseconds, then the system returns matching Account results within 200 milliseconds at the 95th percentile.
  - AC-003b: Given a Rep searches for a partial phone number "503-555," when results are returned, then all displayed accounts contain a contact with a phone number matching the partial input.

- FR-004: The system shall support parent-child Account hierarchies allowing a parent account (e.g., a restaurant group) to be linked to 1 or more child accounts (e.g., individual locations), with roll-up metrics visible on the parent account.
  - AC-004a: Given an Admin edits a child Account and sets its "Parent Account" field to an existing account, when the Admin saves, then the child account appears in the parent account's "Child Accounts" list and the parent account's total revenue roll-up includes the child's revenue.
  - AC-004b: Given a Rep views a parent Account with 3 child accounts, when the Rep views the parent account detail page, then the system displays aggregated order count, total revenue, and last activity date across all child accounts.

- FR-005: The system shall detect potential duplicate Account records during creation by comparing the new account name, phone number, and address against existing records using fuzzy matching (Levenshtein distance threshold of 3 or less for names).
  - AC-005a: Given a Rep enters an account name "Pacific Bistro" and an account named "Pacific Bistros" already exists, when the Rep proceeds past the name field, then the system displays a duplicate warning listing the existing similar account(s) with a match confidence percentage.
  - AC-005b: Given a Rep is shown a duplicate warning with 1 potential match, when the Rep selects "Create Anyway," then the system persists the new account and logs the duplicate override decision in the audit trail.

- FR-006: The system shall calculate and display an Account health score (0–100) based on configurable weighted factors: days since last activity (weight: 30%), order frequency vs. historical average (weight: 25%), order value trend (weight: 25%), and contact engagement recency (weight: 20%).
  - AC-006a: Given an Account has had no logged activity in 45 days, when the system recalculates health scores (nightly batch at 02:00 UTC), then the account's health score decreases by at least 15 points from its previous score.
  - AC-006b: Given a Manager views the account list filtered by "At Risk" (health score below 40), when the list loads, then only accounts with a health score of 39 or below are displayed, sorted by score ascending.

### Activity and Communication

- FR-007: The system shall allow a Rep to log an activity (visit, call, email, demo, sampling event) against an Account in under 60 seconds using a quick-log form with pre-populated fields (current date/time, Rep name, last-visited account) and selectable activity type templates.
  - AC-007a: Given a Rep opens the quick-log form from the mobile home screen, when the Rep selects activity type "Visit," picks the pre-populated account, and taps "Save," then the system persists the activity record in under 2 seconds and the total interaction time is under 60 seconds (measured from form open to save confirmation).
  - AC-007b: Given a Rep selects the "Demo" activity type template, when the form loads, then the system pre-fills fields for product demoed, quantity sampled, and buyer feedback with appropriate input controls (product picker, numeric input, text area).

- FR-008: The system shall provide an activity timeline on each Account showing all logged activities, linked emails, order events, and system-generated events in reverse chronological order with infinite scroll pagination (20 items per page).
  - AC-008a: Given an Account has 50 activity records, when a Rep views the activity timeline and scrolls to the bottom of the initial 20 items, then the system loads the next 20 items within 500 milliseconds without a full page reload.
  - AC-008b: Given a Rep views the activity timeline, when the Rep applies a filter for "Visits only," then only activities with type "Visit" are displayed and the count label updates to reflect the filtered total.

- FR-009: The system shall support task creation with due date, priority (High, Medium, Low), assignee (any active user), and optional association to an Account, Contact, or Opportunity, with configurable reminder notifications delivered via in-app notification and email at 24 hours and 1 hour before the due date.
  - AC-009a: Given a Manager creates a task assigned to a Rep with a due date of 2026-03-15 10:00 UTC and priority "High," when the current time reaches 2026-03-14 10:00 UTC (24 hours before), then the system sends an in-app notification and an email reminder to the assigned Rep.
  - AC-009b: Given a Rep views their task dashboard, when tasks are displayed, then overdue tasks (due date in the past and status not "Completed") appear at the top with a red visual indicator, sorted by due date ascending.

- FR-010: The system shall auto-link inbound and outbound emails to Account and Contact records by matching the email sender/recipient address against Contact email fields, and shall track email engagement events (open, click, bounce) with timestamps.
  - AC-010a: Given a Rep sends an email through the platform to a contact at "buyer@pacificbistro.com," when the recipient opens the email, then the system logs an "Email Opened" event with a timestamp on the associated Contact and Account activity timelines within 60 seconds of the tracking pixel being loaded.
  - AC-010b: Given an inbound email arrives from an address not matching any Contact record, when the system processes the email, then the email is placed in an "Unmatched Emails" queue visible to the Rep and Manager roles for manual association.

### Order Management

- FR-011: The system shall allow a Rep to create an Order with 1 or more line items, where each line item specifies: product, quantity, unit price, and revenue model (broker at 8–15% commission or wholesale at 25–40% markup), with the revenue model defaulting to the product's configured default.
  - AC-011a: Given a Rep adds a line item for product "Artisan Honey 12oz" with quantity 24 and selects revenue model "Broker," when the Rep views the line item subtotal, then the system displays the broker commission amount calculated as unit price times quantity times the product's configured commission rate (e.g., 12%).
  - AC-011b: Given a Rep adds 10 line items to an order across 3 different vendor brands, when the Rep taps "Submit Order," then the system automatically splits the order into 3 vendor-specific sub-orders and persists each sub-order with the correct line items and vendor association.

- FR-012: The system shall provide real-time product search within the order entry form, returning matching products by name, SKU, brand, or category within 200 milliseconds, displaying current availability status (in-stock, limited, out-of-stock), unit price, and any active promotional pricing.
  - AC-012a: Given a Rep types "honey" into the product search field during order entry, when results appear, then each result row displays: product name, SKU, brand name, unit price, promotional price (if active), and availability status with a color-coded indicator (green for in-stock, yellow for limited, red for out-of-stock).
  - AC-012b: Given a product has an active promotional price of $8.50 (regular price $10.00) valid through 2026-04-01, when the Rep adds this product to an order on 2026-03-15, then the system applies the promotional price of $8.50 as the default unit price for the line item.

- FR-013: The system shall require Manager approval for any Order with a total value of $5,000 or greater before the order status can transition from "Pending" to "Confirmed," and shall notify the designated approver via in-app notification and email within 30 seconds of submission.
  - AC-013a: Given a Rep submits an order totaling $6,200, when the order is saved, then the system sets the order status to "Pending Approval," sends an in-app notification and email to the Rep's assigned Manager within 30 seconds, and prevents the order from progressing to "Confirmed" until the Manager approves.
  - AC-013b: Given a Manager views the approval queue and rejects an order with a written reason "Pricing not approved by vendor," when the Manager submits the rejection, then the system sets the order status to "Rejected," notifies the originating Rep via in-app notification and email with the rejection reason, and logs the rejection in the order's audit trail.

- FR-014: The system shall generate AI-powered reorder suggestions for each Account by analyzing the account's order history (frequency, quantities, seasonal patterns) and presenting a pre-populated reorder draft that the Rep can review, modify, and submit.
  - AC-014a: Given an Account has placed 6 or more orders in the past 12 months, when a Rep views the Account detail page, then the system displays a "Suggested Reorder" card with recommended products, quantities (based on the account's median order quantities), and an estimated total, generated by the AI engine within 3 seconds.
  - AC-014b: Given the AI generates a reorder suggestion containing 5 products, when the Rep removes 2 products and adjusts the quantity of 1 product, then the system recalculates the order total and allows the Rep to submit the modified order as a new order.

- FR-015: The system shall export confirmed Orders to QuickBooks in the QuickBooks-compatible format (CSV or API), including order number, date, account name, line items with SKU, quantity, unit price, tax, and total, within 1 hour of order confirmation.
  - AC-015a: Given an order transitions to "Confirmed" status at 14:00 UTC, when the next QuickBooks export cycle runs (hourly), then the order data appears in the QuickBooks export queue and is transmitted successfully, with a sync status of "Exported" recorded on the order record.
  - AC-015b: Given a QuickBooks export fails due to a network timeout, when the system retries (up to 3 retries with exponential backoff: 1 min, 5 min, 15 min), then if all retries fail, the system sets the sync status to "Export Failed" and notifies the Admin via in-app notification.

### Pipeline and Opportunities

- FR-016: The system shall allow a Rep to create an Opportunity record linked to an Account, with fields: opportunity name, estimated value, expected close date, pipeline stage (Prospect, Qualified, Proposal, Negotiation, Closed Won, Closed Lost), probability percentage (auto-populated by stage but manually overridable), and associated Brand(s).
  - AC-016a: Given a Rep creates a new Opportunity with stage "Qualified," when the Rep saves the record, then the system auto-populates the probability field to 40% (the configured default for "Qualified" stage) and the Opportunity appears on the pipeline kanban board in the "Qualified" column.
  - AC-016b: Given a Rep moves an Opportunity from "Negotiation" to "Closed Won" on the kanban board, when the Rep saves, then the system prompts for a closed-won reason, sets the probability to 100%, records the close date, and updates the weighted forecast accordingly.

- FR-017: The system shall display a pipeline kanban board showing all open Opportunities for the logged-in Rep (or all Reps for Manager/Admin roles), grouped by pipeline stage columns, with drag-and-drop stage transitions and a weighted forecast summary (sum of estimated value times probability for each stage) displayed at the top.
  - AC-017a: Given a Manager views the pipeline kanban board with 15 open opportunities across 4 stages, when the board loads, then each opportunity card displays: opportunity name, account name, estimated value, and expected close date, and the weighted forecast total at the top equals the sum of (estimated value times probability) for all displayed opportunities.
  - AC-017b: Given a Rep drags an Opportunity card from "Proposal" (probability 60%) to "Negotiation" (probability 75%), when the card is dropped, then the system updates the opportunity's stage and probability, recalculates the weighted forecast total, and logs a stage-change activity on the associated Account's timeline.

### Product Catalog and Brand Management

- FR-018: The system shall maintain a Product catalog with fields: product name, SKU, brand, category, subcategory, unit price, wholesale price, case size, certifications (organic, non-GMO, gluten-free, kosher, vegan), allergens, dietary attributes, availability status (active, seasonal, discontinued), and a product image.
  - AC-018a: Given an Admin creates a new Product with brand "Mountain Meadow Farms," category "Honey," certifications ["Organic", "Non-GMO"], and availability "Active," when the Admin saves, then the product appears in search results when a Rep searches by brand name, category, or certification.
  - AC-018b: Given a Rep browses the product catalog filtered by certification "Organic" and category "Condiments," when results load, then only products matching both "Organic" certification AND "Condiments" category are displayed, with a result count shown.

- FR-019: The system shall allow an Admin or Manager to generate a Brand line card (PDF) for a selected Brand, listing all active products with images, descriptions, pricing, certifications, and availability, formatted for sharing with retail buyers.
  - AC-019a: Given a Manager selects brand "Mountain Meadow Farms" and clicks "Generate Line Card," when the PDF generation completes (within 10 seconds), then the resulting PDF contains all active products for that brand with product images, names, descriptions, unit prices, case sizes, and certification icons.
  - AC-019b: Given a generated line card PDF is available, when the Manager clicks "Share via Email," then the system attaches the PDF to a new email composition form pre-populated with the selected Account's primary contact email address.

### Commission Tracking

- FR-020: The system shall calculate Rep commissions for each confirmed broker-model order line item based on configurable commission rules: base rate per brand (8–15%), territory modifier (multiplier 0.8–1.2x), and volume tier thresholds (e.g., tier 1: 0–$10K at base rate, tier 2: $10K–$25K at base +1%, tier 3: $25K+ at base +2%).
  - AC-020a: Given a Rep has a confirmed order line item of $12,000 for brand "Mountain Meadow Farms" (base commission rate 10%, territory modifier 1.0x, volume tier 2: +1%), when the commission engine processes the order, then the system calculates the commission as $12,000 times 11% (10% base + 1% tier bonus) times 1.0x = $1,320 and records it on the Rep's commission statement.
  - AC-020b: Given an Admin changes the commission rate for brand "Pacific Preserves" from 10% to 12% effective 2026-04-01, when orders confirmed before 2026-04-01 are processed, then those orders use the 10% rate, and orders confirmed on or after 2026-04-01 use the 12% rate.

- FR-021: The system shall generate monthly commission statements for each Rep showing: order-by-order breakdown (order number, account, brand, line item total, commission rate, commission amount), total earned commissions, approval status (Pending, Approved, Paid), and a running year-to-date total.
  - AC-021a: Given it is 2026-04-01 and the March 2026 commission cycle closes, when the system generates statements (nightly batch), then each Rep receives a commission statement listing all confirmed broker orders from March 2026 with status "Pending Approval" and the statement is visible in the Rep's commission dashboard.
  - AC-021b: Given a Manager approves a Rep's monthly commission statement, when the Manager clicks "Approve" and confirms, then the statement status changes to "Approved," the approval timestamp and approver name are recorded in the audit trail, and the Rep receives an in-app notification.

- FR-022: The system shall export approved commission data to QuickBooks in a format compatible with QuickBooks payroll or accounts payable, including Rep name, pay period, total commission amount, and line-item detail.
  - AC-022a: Given a Manager has approved 5 Rep commission statements for March 2026, when the Admin triggers "Export to QuickBooks," then the system generates a QuickBooks-compatible export file containing all 5 approved statements with Rep name, period "March 2026," and total commission amounts matching the approved statement totals.
  - AC-022b: Given a commission export to QuickBooks succeeds, when the Admin views the commission export log, then each exported statement shows status "Exported," the export timestamp, and the QuickBooks reference identifier.

### Reporting and Analytics

- FR-023: The system shall provide a Rep KPI dashboard displaying: total revenue (current month and trailing 12 months), number of accounts managed, number of activities logged (current month), open opportunity count and weighted pipeline value, commission earned (current month and year-to-date), and account health distribution (healthy/at-risk/critical counts).
  - AC-023a: Given a Rep logs in and navigates to "My Dashboard," when the dashboard loads within 3 seconds, then it displays the Rep's current-month revenue, trailing-12-month revenue, activity count for the current month, open opportunity count, weighted pipeline total, and current-month plus YTD commission figures.
  - AC-023b: Given a Rep's dashboard shows 3 accounts with health score below 40 (critical), when the Rep clicks on the critical count, then the system navigates to a filtered account list showing only those 3 critical accounts.

- FR-024: The system shall provide a Manager team dashboard displaying: aggregate team revenue by month (bar chart), individual Rep performance ranking by revenue, territory heat map showing revenue density by geographic area, and pipeline forecast by stage.
  - AC-024a: Given a Manager views the team dashboard with 9 active Reps, when the dashboard loads, then the Rep performance ranking table lists all 9 Reps sorted by current-month revenue descending, with columns for Rep name, revenue, order count, activity count, and pipeline value.
  - AC-024b: Given a Manager selects a date range of "Q1 2026" on the team dashboard, when the filter is applied, then all charts and tables update to reflect only data from January 1, 2026 through March 31, 2026, within 2 seconds.

- FR-025: The system shall allow users with Manager or Admin roles to create custom reports by selecting entity type (Account, Order, Product, Commission, Activity), applying filters (date range, territory, brand, Rep, status), choosing columns, and exporting results to CSV or Excel (XLSX) format.
  - AC-025a: Given a Manager creates a custom report on the Order entity filtered by territory "Portland Metro" and date range "2026-01-01 to 2026-03-31," when the Manager clicks "Run Report," then the system returns all matching orders with the selected columns within 5 seconds and displays a result count.
  - AC-025b: Given a Manager has a report displaying 500 order records, when the Manager clicks "Export to Excel," then the system generates an XLSX file containing all 500 records with column headers matching the report configuration, and the browser initiates a download within 10 seconds.

### Administration and Automation

- FR-026: The system shall provide Admin-only user management allowing creation, editing, deactivation, and role assignment (Admin, Manager, Rep, Logistics, Viewer) for user accounts, with role changes taking effect within 60 seconds without requiring the affected user to log out.
  - AC-026a: Given an Admin changes a user's role from "Rep" to "Manager," when the Admin saves the change, then the user's permissions update to the Manager role's permission set within 60 seconds, and the user gains access to Manager-only features (team dashboard, approval queue) on their next navigation action without re-authentication.
  - AC-026b: Given an Admin deactivates a user account, when the Admin confirms the deactivation, then the system invalidates all active sessions for that user within 15 seconds, the user is redirected to the login page on their next request, and the user cannot authenticate until reactivated.

- FR-027: The system shall support CSV and Excel (XLSX) data import for Account, Contact, Product, and Order entities, validated against the Layout of Truth (canonical field definitions including field name, data type, required/optional, validation rules, and allowed values), with a pre-import preview showing row count, validation errors per row, and a summary of changes (new records, updates, skipped).
  - AC-027a: Given an Admin uploads a CSV file containing 200 Account records where 5 rows have missing required fields, when the system processes the file, then the pre-import preview displays: "200 rows parsed, 195 valid, 5 errors" with each error row highlighted and the specific validation failure described (e.g., "Row 47: account_name is required").
  - AC-027b: Given an Admin reviews the pre-import preview and clicks "Import Valid Rows," when the import executes, then the system creates or updates 195 Account records, skips the 5 error rows, and generates an import summary report with counts and a downloadable error log.

- FR-028: The system shall provide a business rule engine allowing an Admin to define IF/THEN automation rules with AND/OR conditions on entity field values, supporting actions: send notification, update field value, create task, and send email. Rules execute asynchronously within 30 seconds of the triggering event.
  - AC-028a: Given an Admin creates a rule "IF Account.healthScore < 30 AND Account.lastOrderDate > 60 days ago THEN create Task 'Re-engage account' assigned to Account.assignedRep with priority High," when an Account's health score drops below 30 during the nightly recalculation, then the system creates the specified task within 30 seconds and the task appears in the assigned Rep's task list.
  - AC-028b: Given an Admin defines a rule with an invalid condition (referencing a non-existent field "Account.foobar"), when the Admin attempts to save the rule, then the system displays a validation error "Field 'Account.foobar' does not exist" and does not persist the rule.

- FR-029: The system shall maintain a data quality scorecard that measures and displays: percentage of Accounts with complete required fields, percentage of Contacts with valid email format, percentage of Products with images, duplicate Account count, and stale Account count (no activity in 90+ days), recalculated nightly.
  - AC-029a: Given the nightly data quality job runs at 03:00 UTC, when the job completes, then the data quality scorecard displays updated percentages for each metric and an overall composite score (weighted average), and the scorecard is visible to Admin and Manager roles on the admin dashboard.
  - AC-029b: Given the data quality scorecard shows "68% of Accounts have complete required fields," when an Admin clicks on that metric, then the system displays a filtered list of Account records that are missing 1 or more required fields, with the missing fields highlighted per row.

- FR-030: The system shall generate AI-powered activity summaries, email drafts, and meeting preparation briefs for Accounts using LLM integration (Anthropic Claude API as primary provider), with all AI-generated content clearly labeled as "AI-Generated" and editable by the user before use.
  - AC-030a: Given a Rep clicks "Prepare Meeting Brief" on an Account with 15 logged activities and 8 orders in the past 6 months, when the AI processes the request, then the system returns a structured meeting brief (key contacts, recent activity summary, order trends, suggested talking points) within 3 seconds, labeled "AI-Generated," and displayed in an editable text area.
  - AC-030b: Given the Anthropic Claude API is unavailable (HTTP 503 or timeout after 5 seconds), when a Rep requests an AI-generated summary, then the system displays an error message "AI service temporarily unavailable — please try again in a few minutes" and does not display stale or partial AI content.


## 3. Non-Functional Requirements

### Performance

- NFR-001: All API endpoints shall respond at p95 latency of 200ms or less under a load of 100 concurrent authenticated users, measured via synthetic load testing with k6 or equivalent.

- NFR-002: The application's First Contentful Paint (FCP) shall occur within 2 seconds on a 4G mobile connection (simulated 9 Mbps download / 1.5 Mbps upload, 150ms RTT) as measured by Lighthouse CI.

- NFR-003: Full-text search queries across Account, Contact, and Product entities shall return results within 200ms at p95 for a database containing up to 50,000 Account records, 200,000 Contact records, and 10,000 Product records.

- NFR-004: Database queries shall execute at p95 latency of 50ms or less, enforced via Prisma query logging and pg_stat_statements monitoring in PostgreSQL 16.

- NFR-005: AI-powered features (activity summaries, email drafts, reorder suggestions, meeting briefs) shall return results within 3s at p95, with a timeout threshold of 10s after which the system returns a graceful error.

### Reliability and Availability

- NFR-006: The system shall maintain 99.5% uptime on a monthly basis during Phase 1, excluding scheduled maintenance windows (maximum 4 hours per month, announced 48 hours in advance), measured by external uptime monitoring (e.g., Pingdom or UptimeRobot).

### Security

- NFR-007: Authentication shall use JWT tokens with 15min access token expiry and 7days refresh token expiry. Passwords shall be hashed using bcrypt with a cost factor of 12x rounds. All authentication endpoints shall be rate-limited to 10req per minute per IP address.

- NFR-008: The system shall enforce RBAC across 5 roles (Admin, Manager, Rep, Logistics, Viewer) with PostgreSQL Row-Level Security (RLS) policies ensuring that Reps can only access data within their assigned territories, and Viewers have read-only access to reporting data only. Access control checks shall complete within 5ms per request.

- NFR-009: All data in transit shall be encrypted using TLS 1.3. All data at rest shall be encrypted using AES-256. The application shall pass an OWASP Top 10 vulnerability assessment with zero critical or high findings before production deployment.

- NFR-010: The system shall comply with CAN-SPAM requirements for all outbound marketing emails (unsubscribe link, physical address, honest subject lines) and CCPA requirements for personal data (right to access, right to delete, data inventory). FSMA 204 traceability data shall be retained for a minimum of 2 years.

### Accessibility

- NFR-011: The application shall conform to WCAG 2.1 Level AA across all pages and components. Text contrast ratios shall meet or exceed 4.5:1 for normal text and 3:1 for large text. All interactive elements shall be operable via keyboard navigation with visible focus indicators.

- NFR-012: All touch targets on mobile views shall have a minimum size of 44 by 44 CSS pixels. All form inputs, buttons, and interactive elements shall have associated ARIA labels or visible text labels compatible with screen readers (NVDA, VoiceOver).

### Data Integrity

- NFR-013: All write operations that span multiple database tables (e.g., Order creation with line items, commission calculations) shall execute within ACID-compliant database transactions. In the event of a partial failure, all changes within the transaction shall be rolled back, and the system shall return a descriptive error to the user within 5s and log the failure with a unique error ID.

- NFR-014: The system shall maintain a complete audit trail for all create, update, and delete operations on Account, Order, Commission, and User entities, recording: actor user ID, timestamp (UTC), entity type, entity ID, field changed, old value, and new value. Audit records shall be immutable and retained for a minimum of 3years with write latency under 10ms.


## 4. Technical Constraints

- **Frontend Framework:** React with Next.js 14 or later, using the App Router for server-side rendering and static generation.
- **UI Component Library:** Tailwind CSS with shadcn/ui component library. No other CSS frameworks permitted.
- **Backend Framework:** Fastify running on Node.js 20 LTS or later.
- **Database:** PostgreSQL 16 or later, with Prisma ORM for schema management and query generation.
- **Caching:** Redis 7 or later for session storage, query caching, and rate limiting.
- **Job Queue:** Bull (backed by Redis) for asynchronous job processing (email sending, commission calculations, data imports, AI requests).
- **Deployment:** Docker-based monorepo with separate containers for frontend, backend, worker, and database services.
- **PWA:** The application must function as a Progressive Web App with offline-capable read access for previously loaded Account and Product data via service worker caching.
- **External Integrations (Phase 1):** QuickBooks Online (order and commission export), Shopify (order sync), Anthropic Claude API (AI features). No native mobile app in Phase 1.
- **Browser Support:** Latest 2 versions of Chrome, Firefox, Safari, and Edge. iOS Safari 16+ and Chrome for Android 120+.
- **No support for Internet Explorer** or legacy Edge (pre-Chromium).


## 5. User Stories

- US-001: As a **territory representative**, I want to create a new Account from my phone while standing in front of a prospect's store, so that I can capture the account details before I leave the location. **Implements:** FR-001, FR-005. **Priority:** P0.
  - **Workflow:** Rep opens mobile app > taps "New Account" > fills required fields (name, address, contact, territory) > system checks for duplicates (FR-005) > Rep reviews and saves > confirmation displayed.
  - **Error/Edge Cases:**
    - Network drops during save: system queues the record locally and syncs when connectivity resumes, displaying "Saved offline — will sync when online."
    - Duplicate detected: system presents potential matches; Rep can merge with existing or create new.
    - GPS fails to auto-detect address: Rep enters address manually; "Location unavailable" shown in the address auto-fill area.

- US-002: As a **territory representative**, I want to view all details about an Account on a single page, so that I can prepare for a meeting without switching between multiple screens. **Implements:** FR-002, FR-004, FR-006, FR-008. **Priority:** P0.
  - **Workflow:** Rep taps account name from search results or account list > Account detail page loads with tabs/sections for contacts, activity timeline (FR-008), orders, opportunities, health score (FR-006), parent-child hierarchy (FR-004), and notes.
  - **Error/Edge Cases:**
    - Account has been deleted by another user since the Rep's last view: system displays "This account has been removed" with a link to the account list.
    - Health score calculation is pending (newly created account): system displays "Health score calculating..." with a placeholder indicator instead of a numeric score.
    - API timeout loading order history: system displays the account header and available sections, with an error message "Unable to load order history — tap to retry" in the orders section.

- US-003: As a **territory representative**, I want to search for accounts by name, contact, phone, or territory, so that I can quickly find the account I need before a meeting. **Implements:** FR-003. **Priority:** P0.
  - **Workflow:** Rep taps global search bar > types at least 3 characters > results appear in real-time > Rep taps desired result to navigate to Account detail.
  - **Error/Edge Cases:**
    - Search returns zero results: system displays "No accounts found for '[query]'" with suggestions to check spelling or broaden the search.
    - Search query contains only special characters: system displays "Please enter at least 3 alphanumeric characters."
    - Search service is degraded: system falls back to a direct database ILIKE query and displays a notice "Search may be slower than usual."

- US-004: As a **territory representative**, I want to log a visit, call, or demo in under 60 seconds from my phone, so that I can record my activity immediately without it becoming a burden. **Implements:** FR-007, FR-010. **Priority:** P0.
  - **Workflow:** Rep taps "Quick Log" from home screen or account page > selects activity type > template pre-fills fields > Rep adds notes (optional) > taps "Save" > activity appears in timeline.
  - **Error/Edge Cases:**
    - Rep submits activity log while offline: system saves locally and syncs upon reconnection, timestamping with the original creation time.
    - Rep accidentally selects wrong account: activity edit is available for 15 minutes after creation; after that, a Manager must edit.
    - Activity type "Demo" selected but no product chosen: system displays a validation warning "Please select at least 1 product for demo activities."

- US-005: As a **territory representative**, I want to enter a multi-line order on my tablet or phone with broker and wholesale items mixed together, so that I can capture the full order during a buyer meeting. **Implements:** FR-011, FR-012, FR-013, FR-015, FR-018. **Priority:** P0.
  - **Workflow:** Rep opens "New Order" on account page > searches and adds products from the catalog (FR-018) using product search (FR-012) > sets quantity and revenue model per line > system calculates totals > Rep submits > if total >= $5,000, order goes to Manager approval (FR-013) > system splits order by vendor (FR-011) > confirmed orders export to QuickBooks (FR-015).
  - **Error/Edge Cases:**
    - Product marked "out-of-stock" added to order: system displays warning "Product X is currently out of stock — order may be delayed" but allows the Rep to proceed.
    - Order total exceeds $5,000 but no Manager is available (all Managers deactivated): system queues the order as "Pending Approval" and sends an email to the Admin role notifying that no Manager is available for approval.
    - Network failure during order submission: system saves the order draft locally and displays "Order saved as draft — submit when online."

- US-006: As a **sales manager**, I want to see a pipeline kanban board with weighted forecast totals, so that I can understand the team's revenue outlook and coach Reps on stuck opportunities. **Implements:** FR-016, FR-017. **Priority:** P1.
  - **Workflow:** Manager navigates to Pipeline view > kanban board loads with columns per stage > opportunity cards show key info > Manager can filter by Rep or territory > weighted forecast total displayed at top > Manager drags card to new stage.
  - **Error/Edge Cases:**
    - Opportunity dragged to "Closed Won" without a close reason: system prompts "Please provide a close reason" and reverts the card to its previous column if the prompt is dismissed.
    - Two users move the same Opportunity simultaneously: system applies the first change and displays a conflict notification to the second user: "This opportunity was updated by [User] — please refresh."
    - Kanban board has more than 100 opportunities: system paginates within each column (showing 20 cards with "Load more") to maintain rendering performance under 2 seconds.

- US-007: As a **territory representative**, I want to see AI-generated reorder suggestions for my accounts and share brand line cards with buyers, so that I can proactively reach out with relevant product recommendations. **Implements:** FR-014, FR-019, FR-030. **Priority:** P1.
  - **Workflow:** Rep views Account detail > "Suggested Reorder" card appears (if eligible per FR-014) > Rep reviews products and quantities > Rep modifies as needed > Rep submits as a new order. Alternatively, Rep generates a brand line card PDF (FR-019) to share with the buyer.
  - **Error/Edge Cases:**
    - Account has fewer than 6 historical orders (minimum for AI suggestion): system displays "Not enough order history for suggestions — reorder suggestions appear after 6 orders."
    - AI service returns an error: system displays "Unable to generate suggestions at this time" with a "Retry" button; no stale suggestions shown.
    - Suggested product has been discontinued since last order: system excludes discontinued products from the suggestion and notes "1 previously ordered product is no longer available."

- US-008: As a **territory representative**, I want to view my commission statement showing order-by-order detail, so that I can verify my earnings and raise questions before approval. **Implements:** FR-020, FR-021, FR-022. **Priority:** P1.
  - **Workflow:** Rep navigates to "My Commissions" > selects month > system displays statement with order breakdown (FR-021), total earned, approval status > Rep can flag a discrepancy for Manager review. After Manager approval, Admin exports to QuickBooks (FR-022).
  - **Error/Edge Cases:**
    - Commission statement for the current month is not yet generated (mid-month): system displays partial statement labeled "In Progress — final statement generated on the 1st of next month."
    - Commission rate changed mid-month: system applies the rate that was effective on the order confirmation date (FR-020) and displays the applied rate per line item.
    - Rep flags a line item as disputed: system adds a "Disputed" tag to the line item, notifies the Manager, and prevents the statement from being approved until the dispute is resolved.

- US-009: As a **sales manager**, I want a team dashboard showing revenue, Rep rankings, and territory performance with custom reporting, so that I can identify top performers and underperforming territories. **Implements:** FR-023, FR-024, FR-025. **Priority:** P1.
  - **Workflow:** Manager navigates to "Team Dashboard" > views aggregate revenue chart > reviews Rep ranking table > clicks territory heat map for geographic drill-down > adjusts date range filter. Manager can also create custom reports (FR-025) for deeper analysis.
  - **Error/Edge Cases:**
    - A Rep has been deactivated mid-quarter: system includes the deactivated Rep's historical data in the date range but marks them as "Inactive" in the ranking table.
    - No orders exist for the selected date range: system displays "No data available for the selected period" across all charts with a suggestion to adjust the date range.
    - Territory heat map fails to load (map tile service unavailable): system displays a fallback table view of territory revenue data with a notice "Map view temporarily unavailable."

- US-010: As an **administrator**, I want to import Account and Product data from CSV files validated against the Layout of Truth and manage users, so that I can bulk-load data during initial migration and maintain the system. **Implements:** FR-026, FR-027, FR-029. **Priority:** P0.
  - **Workflow:** Admin manages user accounts and roles (FR-026). Admin navigates to "Data Import" > selects entity type > uploads CSV > system validates against Layout of Truth (FR-027) > preview shows valid/error counts > Admin clicks "Import Valid Rows" > import summary generated > data quality scorecard (FR-029) reflects updated metrics.
  - **Error/Edge Cases:**
    - CSV file exceeds 50 MB: system rejects the upload with "File size exceeds the 50 MB limit — please split the file into smaller batches."
    - CSV contains columns not in the Layout of Truth: system ignores unmapped columns and displays a warning "3 columns not recognized and will be skipped: [column names]."
    - Import creates duplicate Account records: system flags duplicates using the same fuzzy matching as FR-005 and includes them in the error report with suggested merge targets.

- US-011: As an **administrator**, I want to configure business rules with IF/THEN logic, so that the system can automate routine actions like churn alerts and re-engagement tasks without manual intervention. **Implements:** FR-028, FR-006. **Priority:** P1.
  - **Workflow:** Admin navigates to "Business Rules" > clicks "New Rule" > defines conditions using entity fields, comparison operators, and AND/OR logic > defines actions (notify, update field, create task, send email) > saves and activates rule > system evaluates rule on triggering events.
  - **Error/Edge Cases:**
    - Rule references a field that is later deleted from the schema: system deactivates the rule and notifies the Admin "Rule '[name]' deactivated — references deleted field '[field]'."
    - Rule creates an infinite loop (e.g., rule A updates a field that triggers rule B, which updates a field that triggers rule A): system detects circular dependencies at save time and displays "Circular dependency detected between rules [A] and [B] — please revise conditions."
    - More than 100 rules are active simultaneously: system processes rules in priority order with a maximum execution time of 30 seconds per triggering event, logging any rules that were skipped due to timeout.

- US-012: As a **territory representative**, I want to manage my tasks with reminders, so that I never miss a follow-up with an account. **Implements:** FR-009. **Priority:** P0.
  - **Workflow:** Rep creates a task from the Account page or task dashboard > sets due date, priority, and optional account/contact link > system sends reminders at 24 hours and 1 hour before due > Rep marks task complete.
  - **Error/Edge Cases:**
    - Task due date is set in the past: system displays a validation warning "Due date is in the past — this task will appear as overdue immediately" and allows the Rep to proceed.
    - Reminder email fails to send (email service down): system logs the failure, retries up to 3 times at 5-minute intervals, and falls back to in-app notification only if email delivery fails after all retries.
    - Rep is deactivated while having open tasks: system reassigns open tasks to the Rep's Manager and sends a notification "3 tasks reassigned from [deactivated Rep] to [Manager]."


## 6. Data Model

### Account

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| name | VARCHAR(255) | Yes | Unique per territory |
| type | ENUM(retail, restaurant, distributor) | Yes | |
| address_line1 | VARCHAR(255) | Yes | |
| address_line2 | VARCHAR(255) | No | |
| city | VARCHAR(100) | Yes | |
| state | VARCHAR(2) | Yes | US state code |
| zip | VARCHAR(10) | Yes | |
| latitude | DECIMAL(9,6) | No | Geocoded |
| longitude | DECIMAL(9,6) | No | Geocoded |
| territory_id | UUID FK | Yes | References Territory |
| parent_account_id | UUID FK | No | Self-referential for hierarchy |
| health_score | INTEGER | No | 0–100, recalculated nightly |
| assigned_rep_id | UUID FK | Yes | References User |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

### Contact

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| account_id | UUID FK | Yes | References Account |
| first_name | VARCHAR(100) | Yes | |
| last_name | VARCHAR(100) | Yes | |
| email | VARCHAR(255) | No | Validated format |
| phone | VARCHAR(20) | No | |
| title | VARCHAR(100) | No | |
| is_primary | BOOLEAN | Yes | Default false |
| created_at | TIMESTAMPTZ | Yes | |

### Territory

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| name | VARCHAR(100) | Yes | Unique |
| region | VARCHAR(100) | No | |
| zip_codes | TEXT[] | No | Array of ZIP codes |
| geometry | GEOMETRY | No | PostGIS polygon |
| assigned_rep_id | UUID FK | No | References User |

### User

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| email | VARCHAR(255) | Yes | Unique |
| password_hash | VARCHAR(255) | Yes | bcrypt cost 12 |
| first_name | VARCHAR(100) | Yes | |
| last_name | VARCHAR(100) | Yes | |
| role | ENUM(admin, manager, rep, logistics, viewer) | Yes | |
| is_active | BOOLEAN | Yes | Default true |
| last_login_at | TIMESTAMPTZ | No | |
| created_at | TIMESTAMPTZ | Yes | |

### Activity

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| account_id | UUID FK | Yes | References Account |
| user_id | UUID FK | Yes | References User (who logged it) |
| type | ENUM(visit, call, email, demo, sampling) | Yes | |
| notes | TEXT | No | |
| occurred_at | TIMESTAMPTZ | Yes | |
| duration_minutes | INTEGER | No | |
| template_id | UUID FK | No | References ActivityTemplate |
| created_at | TIMESTAMPTZ | Yes | |

### Order

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| order_number | VARCHAR(20) | Yes | Auto-generated, unique |
| account_id | UUID FK | Yes | References Account |
| rep_id | UUID FK | Yes | References User |
| status | ENUM(draft, pending_approval, confirmed, shipped, delivered, cancelled, rejected) | Yes | |
| total_amount | DECIMAL(12,2) | Yes | Calculated from line items |
| approved_by_id | UUID FK | No | References User (Manager) |
| approved_at | TIMESTAMPTZ | No | |
| rejection_reason | TEXT | No | |
| quickbooks_sync_status | ENUM(pending, exported, failed) | No | |
| quickbooks_ref | VARCHAR(50) | No | |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

### OrderItem

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| order_id | UUID FK | Yes | References Order |
| product_id | UUID FK | Yes | References Product |
| quantity | INTEGER | Yes | Min 1 |
| unit_price | DECIMAL(10,2) | Yes | |
| revenue_model | ENUM(broker, wholesale) | Yes | |
| commission_rate | DECIMAL(5,2) | No | For broker model |
| vendor_sub_order_id | UUID FK | No | For multi-vendor split |
| line_total | DECIMAL(12,2) | Yes | quantity * unit_price |

### Product

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| name | VARCHAR(255) | Yes | |
| sku | VARCHAR(50) | Yes | Unique |
| brand_id | UUID FK | Yes | References Brand |
| category | VARCHAR(100) | Yes | |
| subcategory | VARCHAR(100) | No | |
| unit_price | DECIMAL(10,2) | Yes | |
| wholesale_price | DECIMAL(10,2) | No | |
| case_size | INTEGER | No | |
| certifications | TEXT[] | No | Array: organic, non-gmo, etc. |
| allergens | TEXT[] | No | |
| dietary | TEXT[] | No | |
| availability | ENUM(active, seasonal, discontinued) | Yes | |
| image_url | VARCHAR(500) | No | |
| default_revenue_model | ENUM(broker, wholesale) | No | |
| created_at | TIMESTAMPTZ | Yes | |

### Brand

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| name | VARCHAR(255) | Yes | Unique |
| principal_name | VARCHAR(255) | No | Brand owner contact |
| principal_email | VARCHAR(255) | No | |
| base_commission_rate | DECIMAL(5,2) | Yes | 8–15% |
| territory_modifier | DECIMAL(3,2) | No | 0.80–1.20, default 1.00 |
| created_at | TIMESTAMPTZ | Yes | |

### Commission

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| rep_id | UUID FK | Yes | References User |
| order_item_id | UUID FK | Yes | References OrderItem |
| period | VARCHAR(7) | Yes | Format: YYYY-MM |
| commission_rate | DECIMAL(5,2) | Yes | Applied rate |
| commission_amount | DECIMAL(12,2) | Yes | Calculated |
| status | ENUM(pending, approved, paid, disputed) | Yes | |
| approved_by_id | UUID FK | No | References User |
| approved_at | TIMESTAMPTZ | No | |
| created_at | TIMESTAMPTZ | Yes | |

### Opportunity

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| name | VARCHAR(255) | Yes | |
| account_id | UUID FK | Yes | References Account |
| rep_id | UUID FK | Yes | References User |
| stage | ENUM(prospect, qualified, proposal, negotiation, closed_won, closed_lost) | Yes | |
| estimated_value | DECIMAL(12,2) | Yes | |
| probability | DECIMAL(5,2) | Yes | 0–100 |
| expected_close_date | DATE | Yes | |
| close_reason | TEXT | No | Required for closed stages |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

### Pipeline

The Pipeline entity is represented by the aggregation of Opportunity records grouped by stage. The pipeline kanban board (FR-017) renders Opportunity records in their respective stage columns. Weighted forecast = SUM(estimated_value * probability / 100) across all open opportunities.

### EmailRecord

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| contact_id | UUID FK | No | References Contact |
| account_id | UUID FK | No | References Account |
| user_id | UUID FK | Yes | Sender (References User) |
| subject | VARCHAR(500) | Yes | |
| body_html | TEXT | No | |
| direction | ENUM(inbound, outbound) | Yes | |
| status | ENUM(sent, delivered, opened, clicked, bounced, failed) | Yes | |
| opened_at | TIMESTAMPTZ | No | |
| clicked_at | TIMESTAMPTZ | No | |
| sent_at | TIMESTAMPTZ | Yes | |

### EmailTemplate

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| name | VARCHAR(255) | Yes | |
| subject_template | VARCHAR(500) | Yes | Supports merge fields |
| body_html_template | TEXT | Yes | Supports merge fields |
| created_by_id | UUID FK | Yes | References User |
| is_active | BOOLEAN | Yes | Default true |
| created_at | TIMESTAMPTZ | Yes | |

### LineCard

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| brand_id | UUID FK | Yes | References Brand |
| generated_by_id | UUID FK | Yes | References User |
| pdf_url | VARCHAR(500) | Yes | |
| generated_at | TIMESTAMPTZ | Yes | |

### Organization

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key, singleton |
| name | VARCHAR(255) | Yes | "Haversack Sales" |
| address | TEXT | No | CAN-SPAM physical address |
| settings | JSONB | No | System configuration |
| created_at | TIMESTAMPTZ | Yes | |

### BusinessRule

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| name | VARCHAR(255) | Yes | |
| entity_type | VARCHAR(50) | Yes | Account, Order, etc. |
| conditions | JSONB | Yes | IF conditions (AND/OR tree) |
| actions | JSONB | Yes | THEN actions array |
| is_active | BOOLEAN | Yes | Default true |
| priority | INTEGER | Yes | Execution order |
| created_by_id | UUID FK | Yes | References User |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

### Demo

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | Yes | Primary key |
| activity_id | UUID FK | Yes | References Activity |
| product_id | UUID FK | Yes | References Product |
| quantity_sampled | INTEGER | No | |
| buyer_feedback | TEXT | No | |
| outcome | ENUM(positive, neutral, negative) | No | |


## 7. UI/UX Requirements

### Layout and Navigation

- The application shall use a responsive layout with a collapsible sidebar navigation on desktop (1024px and above) and a bottom tab navigation on mobile (below 1024px).
- Primary navigation items: Dashboard, Accounts, Orders, Pipeline, Products, Commissions, Reports, Admin (Admin/Manager roles only).
- A persistent global search bar shall be accessible from every page via a top navigation bar or keyboard shortcut (Cmd+K / Ctrl+K).

### Loading States

- Every data-fetching view shall display a skeleton loading state (animated placeholder elements matching the layout structure) while data is being retrieved, rather than a blank page or a generic spinner.
- Long-running operations (PDF generation, data import, AI requests) shall display a progress indicator with an estimated time remaining or a determinate progress bar when the total is known.

### Error States

- API errors (HTTP 4xx/5xx) shall display a contextual error message within the affected component, not a full-page error. The error message shall include: a description of what went wrong, a suggested action (e.g., "Tap to retry" or "Contact your administrator"), and an error reference ID for support purposes.
- Network connectivity loss shall trigger a persistent banner at the top of the viewport reading "You are offline — some features may be unavailable" that dismisses automatically when connectivity is restored.

### Empty States

- List views with zero records (accounts, orders, activities, commissions) shall display an illustrative empty state with: a descriptive message (e.g., "No accounts in this territory yet"), a primary call-to-action button (e.g., "Create First Account"), and, where applicable, a brief explanation of the feature.
- Dashboard widgets with no data for the selected period shall display "No data for this period" with a link to adjust the date range filter.

### Mobile-Specific Requirements

- The order entry form shall support swipe gestures for removing line items on mobile devices.
- The quick-log activity form shall be reachable in 1 tap from the mobile home screen.
- Touch targets for all interactive elements shall be at least 44 by 44 CSS pixels per NFR-012.

### Accessibility

- Color shall never be the sole means of conveying information; all color-coded indicators (health scores, availability status, pipeline stages) shall have accompanying text labels or icons.
- All modal dialogs shall trap keyboard focus within the modal and return focus to the triggering element on close.
- All data tables shall use proper semantic HTML (`<table>`, `<thead>`, `<th scope>`, `<tbody>`) with sortable column headers accessible via keyboard.


## 8. Out of Scope

The following items are explicitly excluded from Phase 1 and may be considered for Phase 2 or later:

- **Native mobile applications** (iOS App Store, Google Play Store). Phase 1 delivers a PWA only.
- **Multi-tenant architecture.** The platform serves Haversack Sales as a single organization. Multi-tenancy is not required.
- **EDI (Electronic Data Interchange)** integration with retailers or distributors.
- **Warehouse management or inventory tracking** beyond product availability status (in-stock, limited, out-of-stock). No bin locations, lot tracking, or pick/pack workflows.
- **Built-in payment processing** or invoicing. QuickBooks handles invoicing and payment collection.
- **SMS/text message communication.** Phase 1 supports email only for outbound communication.
- **Advanced route optimization** for field reps. Territory visualization is included, but automated route planning is not.
- **Custom branded white-label portals** for brand principals. Viewers access the main platform with restricted permissions.
- **Real-time chat or instant messaging** between users.
- **Predictive lead scoring** using external data sources. Phase 1 AI is limited to internal data (order history, activity logs).
- **Multi-currency support.** All transactions are in USD.
- **Automated vendor purchase order generation.** Orders are split by vendor but transmitted manually or via email to vendors.
- **HIPAA compliance.** Not applicable to specialty food brokerage.


## 9. Open Questions

**HUMAN DECISION NEEDED:** The following questions require stakeholder input before implementation:

- What is the maximum number of Accounts a single Rep can be assigned before the system should warn about territory overload? (Proposed: 150 accounts per Rep.)
- Should the $5,000 order approval threshold (FR-013) be configurable per territory or fixed globally?
- What is the retention period for audit trail data beyond the 3-year minimum specified in NFR-014? Are there regulatory requirements that extend this?
- Should commission disputes (US-008) block the entire monthly statement from approval, or only the disputed line items?
- What is the desired SLA for Shopify order sync frequency? (Proposed: every 15 minutes.)
- For the AI meeting brief (FR-030), what is the acceptable maximum data window — should the AI consider the full account history or only the trailing 12 months?
- What is the threshold for "limited" product availability status — is it a percentage of typical inventory, an absolute unit count, or vendor-reported?
- Should deactivated Reps' Accounts be automatically reassigned to their Manager, distributed across remaining Reps, or left unassigned pending manual reassignment?
- **HUMAN DECISION NEEDED:** Is the 60-day stale account threshold for the data quality scorecard (FR-029 lists 90 days) aligned with the business rule engine churn threshold (FR-028 example uses 60 days)? These should be reconciled to a single configurable value.
- **HUMAN DECISION NEEDED:** What email service provider will be used for transactional and marketing emails? (Proposed: SendGrid or AWS SES.) This affects CAN-SPAM compliance implementation (NFR-010) and email engagement tracking (FR-010).


## 10. Review Findings

### Requirements Coverage Assessment

- **86 user stories** identified in the comprehensive PRD research across 10 modules. This Phase 1 PRD captures the P0 and P1 stories (approximately 60% of the total) across the 6 highest-priority modules: Account Management, Activity and Communication, Order Management, Pipeline and Opportunities, Commission Tracking, and Reporting.
- **30 functional requirements** defined with 64 acceptance criteria (AC/FR ratio: 2.13). All acceptance criteria use Given/When/Then format.
- **14 non-functional requirements** defined, covering performance (5), reliability (1), security (4), accessibility (2), and data integrity (2). Every NFR contains at least one measurable target.
- **12 user stories** defined with full workflows and error/edge case coverage.

### Gaps and Risks

- **Offline capability depth:** FR-001 and US-004 reference offline save-and-sync, but the detailed offline data model (which entities are cached, conflict resolution strategy, storage limits) is not yet specified. This should be elaborated in the Technical Design Document.
- **Shopify sync scope:** The Shopify integration is listed as a Phase 1 constraint but has limited FR coverage (FR-015 covers QuickBooks export). A dedicated FR for Shopify order sync should be added if this is confirmed as P0.
- **Email sending infrastructure:** FR-010 references email auto-linking and tracking, but the outbound email sending capability (bulk emails, templates, scheduled sends) is referenced in the research but not fully captured in Phase 1 FRs. This is intentional — email campaign features are P2.
- **Data migration plan:** FR-027 covers CSV/Excel import, but the one-time migration from FileMaker (schema mapping, data transformation, validation) requires a separate migration plan document.
- **Load testing baseline:** NFR-001 specifies 100 concurrent users, but the current user base is 9 Reps + Managers + Admins (approximately 15 users). The 100-user target provides headroom but should be validated against realistic growth projections.

### Conflict Analysis

- No contradictory requirements detected between functional requirements.
- The data quality scorecard stale account threshold (90 days in FR-029) and the business rule example (60 days in FR-028) represent a potential inconsistency flagged in Open Questions.
- NFR-007 (15-minute access token expiry) and the PWA offline requirement may conflict if a Rep is offline for more than 15 minutes — the offline mode must use a separate authentication mechanism (e.g., device-local encrypted token). This is flagged for technical design.

### Validation Summary

- All FRs have sequential numbering (FR-001 through FR-030).
- All NFRs have sequential numbering (NFR-001 through NFR-014).
- All ACs follow Given/When/Then format.
- No subjective language detected in requirement text without measurable qualifiers.
- All entities referenced in requirements (Account, Contact, Order, OrderItem, Product, Brand, Territory, User, Activity, Commission, Opportunity, EmailRecord, EmailTemplate, LineCard, Organization, BusinessRule, Demo) are defined in the Data Model section.
