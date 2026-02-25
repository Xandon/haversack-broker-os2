# Feature Specification: Haversack Unified Platform

**Feature Branch**: `001-haversack-unified-platform`
**Created**: 2026-02-24
**Status**: Final
**Input**: PRD at docs/prd.md — CRM-first web application replacing FileMaker for specialty food broker/wholesaler

## Feature Overview

Haversack Sales is a specialty food broker and wholesaler operating in the Pacific Northwest with 9 territory sales representatives managing approximately 50 artisan food brands. The company uses a dual revenue model: brokerage (8–15% commission on sales represented to retailers) and wholesale distribution (25–40% product markup). The current FileMaker-based system is slow, fragmented, and cannot support mobile field workflows, automated commission calculations, or AI-assisted insights. This platform replaces FileMaker entirely with a CRM-first web application built for field sales, providing unified account management, mobile order entry, automated commission tracking, pipeline visibility, and AI-augmented productivity tools.

## User Scenarios & Testing

### User Story 1 - Account Creation with Duplicate Detection (Priority: P1)

A territory representative standing in front of a prospect's store creates a new account from a mobile device, entering the required fields (account name, address, primary contact, territory, account type). Before persisting, the system checks for duplicate records using fuzzy matching on name, phone, and address. If a near-match is found, the system surfaces it with a confidence percentage so the Rep can merge or proceed. On save, confirmation appears within 3 seconds.

**Why this priority**: Account creation is the entry point for all CRM value. Without accurate, deduplicated account records, the entire pipeline, commission, and reporting chain produces unreliable data. This is prerequisite for nearly every other story.

**Independent Test**: Create accounts in a staging environment. Verify a new account persists with all required fields, the system blocks save when a required field is blank, and a duplicate warning appears when a name within Levenshtein distance 3 of an existing record is entered.

**Acceptance Scenarios**:

1. **Given** a Rep is authenticated, **When** the Rep completes the new account form with all required fields and taps "Save," **Then** the system persists the Account record and displays a save confirmation within 3 seconds.
2. **Given** a Rep submits the form with the account name field blank, **When** the Rep taps "Save," **Then** the system displays a field-level validation error on account name and does not persist the record.
3. **Given** a Rep enters "Pacific Bistro" and "Pacific Bistros" already exists, **When** the Rep moves past the name field, **Then** the system displays a duplicate warning listing the match with confidence percentage.
4. **Given** a Rep selects "Create Anyway" after a duplicate warning, **When** save completes, **Then** the system persists the record and logs a duplicate-override entry in the audit trail.

**Covers**: FR-001, FR-002, FR-003

---

### User Story 2 - Account Detail and Parent-Child Hierarchy (Priority: P1)

A territory representative preparing for a meeting views everything about an account on one screen: contacts, activity timeline, orders, opportunities, health score, notes, and parent-child relationships. If the account is part of a restaurant group, the Rep sees the group's rolled-up revenue alongside individual location data.

**Why this priority**: The unified account view is the core daily-use surface for field reps. Reps who must navigate multiple screens lose time during live meetings. Health scores and hierarchies feed the manager dashboard and business rules.

**Independent Test**: Load an account with a parent, 5 child accounts, 25 activities, and 12 orders. Verify all sections render within 2 seconds and roll-up metrics match the sum of child values.

**Acceptance Scenarios**:

1. **Given** a Rep navigates to an Account detail page, **When** the page loads, **Then** it displays contacts, 20 most recent activities, 10 most recent orders, and open opportunities within 2 seconds.
2. **Given** an Account has zero orders, **When** the detail page loads, **Then** the system displays "No orders yet" rather than a blank area.
3. **Given** a parent Account has 3 child accounts, **When** the Rep views the parent, **Then** aggregated order count, total revenue, and last activity date across children are displayed.
4. **Given** an Account was created within 24 hours, **When** the Rep views the detail page, **Then** the health score shows "Health score calculating..." instead of a number.

**Covers**: FR-004, FR-005, FR-006

---

### User Story 3 - Account Search and Discovery (Priority: P1)

A territory representative types a partial name, phone number, city, or contact name into the global search bar and matching results appear ranked by relevance before finishing the query, allowing the Rep to tap the correct account instantly.

**Why this priority**: Search is the primary navigation path for reps managing dozens of accounts. Any latency or inaccuracy directly reduces platform utility in live field conditions.

**Independent Test**: With 50,000 Account records, run search queries and verify p95 response time is under 200 milliseconds.

**Acceptance Scenarios**:

1. **Given** a Rep types at least 3 characters, **When** the Rep pauses for 300 milliseconds, **Then** matching results appear within 200 milliseconds at p95, ranked by relevance.
2. **Given** a Rep enters "503-555," **When** results return, **Then** every displayed account has a contact with a phone number containing "503-555."
3. **Given** zero results match, **When** results render, **Then** the system displays "No accounts found for '[query]'" with suggestions to check spelling.

**Covers**: FR-007

---

### User Story 4 - Quick Activity Logging with Email Tracking (Priority: P1)

A Rep finishing a store visit records the activity in under 60 seconds. The quick-log form pre-populates date, Rep name, and last-visited account. For email activities, the system auto-links messages to Contact and Account records and tracks engagement events (opens, clicks).

**Why this priority**: Activity logging drives health scores, which power business rules, manager dashboards, and AI briefings. If logging is burdensome, health scores become unreliable and the entire downstream chain breaks.

**Independent Test**: Time the quick-log flow with a stopwatch — form open to confirmation must be under 60 seconds. Send an email and verify tracking events appear on the timeline.

**Acceptance Scenarios**:

1. **Given** a Rep opens quick-log from mobile, **When** the Rep selects "Visit," accepts defaults, and taps "Save," **Then** the activity persists within 2 seconds and total time is under 60 seconds.
2. **Given** "Demo" activity type is selected, **When** the template loads, **Then** fields for product demoed, quantity sampled, and buyer feedback appear with appropriate input controls.
3. **Given** a Rep sends an email to a known contact, **When** the recipient opens it, **Then** an "Email Opened" event with timestamp appears on Contact and Account timelines within 60 seconds.
4. **Given** an inbound email doesn't match any Contact, **When** the system processes it, **Then** the email goes to the "Unmatched Emails" queue for manual association.

**Covers**: FR-008, FR-009, FR-010, FR-011

---

### User Story 5 - Task Management with Reminders (Priority: P1)

A Rep creates follow-up tasks with due dates, priority levels, and account or contact links. The system sends automatic reminders at 24 hours and 1 hour before the due date. Overdue tasks surface prominently with red indicators.

**Why this priority**: Task management closes the loop on activity logging. Without reminders, the CRM is a passive record rather than an active workflow tool.

**Independent Test**: Create a task due in 25 hours. Verify notifications at the 24-hour mark. Let it pass due date without completion and verify red indicator.

**Acceptance Scenarios**:

1. **Given** a Manager creates a task due in 24 hours with priority "High," **When** the 24-hour mark is reached, **Then** both in-app and email reminders are sent to the assigned Rep.
2. **Given** overdue tasks exist, **When** the Rep views the task dashboard, **Then** overdue tasks appear at top with red indicators, sorted by due date ascending.
3. **Given** a task due date is set in the past, **When** the Rep saves, **Then** the warning "Due date is in the past — this task will appear as overdue immediately" is displayed.

**Covers**: FR-012

---

### User Story 6 - Order Entry with Multi-Vendor Splitting (Priority: P1)

A Rep sitting with a buyer builds a multi-line order mixing broker and wholesale items from different brands, searches products by name/SKU/brand/category, and submits. The system splits the order into per-vendor sub-orders. Orders >= $5,000 require manager approval. Confirmed orders export to the accounting system within 1 hour.

**Why this priority**: Order entry is the core revenue transaction. Line-item revenue-model accuracy drives commission correctness. The $5,000 approval gate is a financial control.

**Independent Test**: Enter a 10-line order across 3 brands with mixed revenue models. Verify vendor sub-orders are created. Enter a $5,200 order and verify "Pending Approval" status and manager notification within 30 seconds.

**Acceptance Scenarios**:

1. **Given** a Rep searches "honey" during order entry, **When** results appear, **Then** each shows product name, SKU, brand, prices, and availability color-coded (green/yellow/red).
2. **Given** a product has an active promotional price, **When** added to an order during the promo window, **Then** the promotional price is the default unit price.
3. **Given** a Rep submits 10 items across 3 vendor brands, **When** saved, **Then** 3 vendor sub-orders are created with correct line items per vendor.
4. **Given** an order totals >= $5,000, **When** submitted, **Then** status is "Pending Approval," manager notified within 30 seconds, and order cannot advance to "Confirmed" without approval.
5. **Given** a Manager rejects an order with reason, **When** submitted, **Then** status is "Rejected," Rep notified with reason, and rejection logged in audit trail.

**Covers**: FR-013, FR-014, FR-015, FR-016, FR-017

---

### User Story 7 - AI Reorder Suggestions (Priority: P2)

A Rep visiting a repeat account sees AI-generated product reorder suggestions based on the account's order history. The Rep can modify the suggestion and submit it as a new order. The feature requires 6+ historical orders and gracefully handles AI service outages.

**Why this priority**: Reorder suggestions accelerate the order cycle but depend on sufficient order history, making this a value-add that becomes more useful over time rather than a day-one necessity.

**Independent Test**: Seed an account with 8 orders. Verify a "Suggested Reorder" card appears within 3 seconds. Simulate AI outage and verify no stale content.

**Acceptance Scenarios**:

1. **Given** an Account has 6+ orders in 12 months, **When** a Rep views it, **Then** a "Suggested Reorder" card with products, quantities, and estimated total appears within 3 seconds.
2. **Given** the AI suggests 5 products and the Rep removes 2, **When** reviewed, **Then** the total recalculates and the modified draft can be submitted as a new order.
3. **Given** an Account has < 6 orders, **When** viewed, **Then** "Not enough order history for suggestions — reorder suggestions appear after 6 orders" is displayed.
4. **Given** the AI service is unavailable, **When** a suggestion is requested, **Then** "AI service temporarily unavailable — please try again in a few minutes" is shown with no stale content.

**Covers**: FR-018, FR-035, FR-036

---

### User Story 8 - Product Catalog and Brand Line Cards (Priority: P2)

An Admin maintains the product catalog with certifications, allergens, dietary attributes, availability, and pricing. Reps filter by certification and category. Managers generate brand line card PDFs and share them with buyers by email.

**Why this priority**: The catalog is shared reference data underpinning order entry, commission calculation, and line card generation. Certification and allergen data are legally significant for specialty food buyers.

**Independent Test**: Create a product with "Organic" + "Non-GMO" certifications. Filter by "Organic" + "Honey" — verify it appears. Filter by "Organic" + "Condiments" — verify it doesn't. Generate a line card PDF and verify content.

**Acceptance Scenarios**:

1. **Given** an Admin creates a product with certifications and availability "Active," **When** saved, **Then** the product appears in search results by brand, category, or certification.
2. **Given** a Rep filters by "Organic" AND "Condiments," **When** results load, **Then** only products matching both criteria appear with a result count.
3. **Given** a Manager clicks "Generate Line Card" for a brand, **When** generation completes within 10 seconds, **Then** the PDF contains all active products with images, descriptions, prices, case sizes, and certification icons.
4. **Given** a line card PDF is ready, **When** "Share via Email" is clicked, **Then** an email form opens with the PDF attached and the Account's primary contact email pre-populated.

**Covers**: FR-019, FR-020

---

### User Story 9 - Pipeline and Opportunity Management (Priority: P2)

A Rep creates Opportunities linked to accounts with pipeline stages, estimated values, and close dates. A Manager views a kanban board of all team opportunities with weighted forecast totals. Stage transitions happen by drag-and-drop and log to the account timeline.

**Why this priority**: Pipeline visibility is the primary tool managers use for coaching and revenue forecasting. It does not block core CRM operations but enables proactive revenue management.

**Independent Test**: Create 15 opportunities across 4 stages. Verify weighted forecast equals sum of (value × probability). Drag a card between stages and verify updates.

**Acceptance Scenarios**:

1. **Given** a Rep creates an Opportunity with stage "Qualified," **When** saved, **Then** probability auto-populates to 40% and the card appears in the "Qualified" column.
2. **Given** the kanban loads, **When** displayed, **Then** the weighted forecast total equals sum of (value × probability) for all open opportunities.
3. **Given** a Rep drags a card from "Proposal" (60%) to "Negotiation" (75%), **When** dropped, **Then** stage and probability update, forecast recalculates, and a timeline event logs on the Account.
4. **Given** a Rep moves an Opportunity to "Closed Won," **When** the transition begins, **Then** a close-reason prompt appears, and dismissing it reverts the card with no change.

**Covers**: FR-021, FR-022

---

### User Story 10 - Commission Calculation and Statements (Priority: P2)

A Rep reviews monthly commission statements breaking down each confirmed broker order by line item with applied rates (including territory modifiers and volume tiers). Managers approve statements, and Admins export approved data to the accounting system. Rate changes apply only to orders confirmed on or after the effective date.

**Why this priority**: Transparent commission statements are essential for rep retention and financial compliance. Errors after export require manual correction.

**Independent Test**: Configure a brand at 10% base rate with tier 2 at +1%. Confirm a $12,000 line item and verify commission of $1,320. Change rate to 12% effective next month and verify existing items use 10%.

**Acceptance Scenarios**:

1. **Given** a $12,000 broker line item with 10% base, 1.0x territory modifier, and tier 2 (+1%), **When** processed, **Then** commission = $1,320 (12,000 × 11% × 1.0).
2. **Given** a rate changes from 10% to 12% effective a future date, **When** pre-effective orders are processed, **Then** 10% applies; post-effective orders use 12%.
3. **Given** monthly statements are generated, **When** a Rep views commissions, **Then** all confirmed broker orders show with order number, account, brand, amount, rate, and commission, status "Pending Approval."
4. **Given** a Manager approves a statement, **When** confirmed, **Then** status changes to "Approved," timestamp and approver recorded in audit trail, Rep notified.
5. **Given** an Admin exports 5 approved statements, **When** export completes, **Then** each shows "Exported" status with timestamp and accounting reference.

**Covers**: FR-023, FR-024, FR-025

---

### User Story 11 - Dashboards (Priority: P2)

A Rep sees a personal dashboard with current-month and trailing-12-month revenue, activity count, pipeline value, commission figures, and health distribution. Tapping the "critical" count navigates to those accounts. A Manager sees aggregate team revenue, rep rankings, territory heat map, and pipeline forecast. Custom reports can be built and exported.

**Why this priority**: Dashboards convert raw data into actionable priority signals. Without them, reps and managers must manually aggregate performance data.

**Independent Test**: With known seeded data, verify each KPI matches direct queries. Click critical count and verify filtered list. Build a custom report and export to verify data integrity.

**Acceptance Scenarios**:

1. **Given** a Rep opens "My Dashboard," **When** it loads within 3 seconds, **Then** current-month revenue, trailing-12-month revenue, activities, opportunities, pipeline value, and commission figures are displayed.
2. **Given** 3 accounts have health score < 40, **When** the Rep clicks the critical count, **Then** the filtered list shows exactly those 3 accounts.
3. **Given** a Manager views the team dashboard with 9 Reps, **When** loaded, **Then** the ranking table lists all 9 sorted by revenue with order count, activity count, and pipeline value columns.
4. **Given** a Manager exports a custom report with 500 records, **When** "Export to Excel" is clicked, **Then** an XLSX file downloads within 10 seconds with matching data.

**Covers**: FR-026, FR-027, FR-028

---

### User Story 12 - Data Import and User Management (Priority: P1)

An Admin uploads CSV/Excel files validated against canonical field definitions, sees a pre-import preview flagging invalid rows, and imports only valid records. The Admin also manages user accounts with role assignment, where permission changes take effect within 60 seconds. A data quality scorecard shows field completeness, email validity, image coverage, duplicates, and stale accounts.

**Why this priority**: Data migration and user provisioning are prerequisites for going live. Without validated import, the 120-day FileMaker decommission target cannot be met.

**Independent Test**: Upload 200-row CSV with 5 invalid rows. Verify preview shows "195 valid, 5 errors." Import valid rows and verify 195 created with downloadable error log.

**Acceptance Scenarios**:

1. **Given** a 200-row CSV with 5 invalid rows is uploaded, **When** processed, **Then** preview shows "200 rows parsed, 195 valid, 5 errors" with specific field-level error descriptions per row.
2. **Given** "Import Valid Rows" is clicked, **When** complete, **Then** 195 records are created, 5 skipped, and a downloadable error log is available.
3. **Given** an Admin changes a user's role from "Rep" to "Manager," **When** saved, **Then** permissions update within 60 seconds without re-authentication.
4. **Given** a user is deactivated, **When** confirmed, **Then** sessions invalidated within 15 seconds and user redirected to login.
5. **Given** the nightly quality job runs, **When** complete, **Then** the scorecard shows updated field completeness, email validity, image coverage, duplicate count, and stale account count.

**Covers**: FR-029, FR-030, FR-031, FR-032, FR-033

---

### User Story 13 - Business Rule Automation (Priority: P2)

An Admin defines IF/THEN automation rules with AND/OR conditions on entity fields, triggering notifications, field updates, task creation, or emails. Rules execute within 30 seconds. Invalid rules referencing non-existent fields are rejected at save time.

**Why this priority**: The rule engine eliminates manual monitoring and enforces proactive account management at scale, directly supporting the churn-rate success metric.

**Independent Test**: Create a rule for health score < 30. Trigger it and verify task creation within 30 seconds. Try saving a rule with a bad field reference and verify rejection.

**Acceptance Scenarios**:

1. **Given** a rule fires when health score drops below 30, **When** triggered during nightly recalculation, **Then** the specified task is created within 30 seconds.
2. **Given** a rule references "Account.foobar," **When** Admin clicks Save, **Then** "Field 'Account.foobar' does not exist" error is shown and the rule is not persisted.
3. **Given** a rule's condition is satisfied, **When** the event fires, **Then** the action executes asynchronously without blocking the user's session.

**Covers**: FR-034

---

### User Story 14 - AI Meeting Briefs and Summaries (Priority: P3)

A Rep preparing for a meeting gets an AI-generated briefing document with key contacts, recent activity summary, order trends, and talking points, returned within 3 seconds. All AI content is labeled "AI-Generated" and editable. The system communicates outages clearly without showing stale content.

**Why this priority**: AI meeting prep is a productivity multiplier but not a blocker for core operations. Depends on a functioning activity timeline and order history.

**Independent Test**: Seed an account with 15 activities and 8 orders. Click "Prepare Meeting Brief" and verify labeled output within 3 seconds. Simulate outage and verify error message.

**Acceptance Scenarios**:

1. **Given** a Rep clicks "Prepare Meeting Brief" on an account with 15 activities and 8 orders, **When** processed, **Then** a structured brief labeled "AI-Generated" with contacts, activities, trends, and talking points appears within 3 seconds.
2. **Given** AI content is displayed, **When** the Rep edits it, **Then** changes persist in the text area.
3. **Given** the AI service is unavailable or times out after 5 seconds, **When** a brief is requested, **Then** "AI service temporarily unavailable — please try again in a few minutes" is shown with no stale content.

**Covers**: FR-035, FR-036

---

### Edge Cases

- What happens when a Rep creates an account while offline? The system queues locally and syncs when connectivity resumes.
- What happens when two users edit the same Opportunity simultaneously? The first save wins; the second user sees a conflict notification.
- What happens when a CSV import contains columns not in the canonical field definitions? Unmapped columns are ignored with a warning listing the skipped column names.
- What happens when more than 100 business rules are active? Rules execute in priority order with a 30-second maximum per triggering event; skipped rules are logged.

## Requirements

### Functional Requirements

- **FR-001**: System MUST persist a new Account record and display confirmation within 3 seconds when an authenticated user with Rep, Manager, or Admin role submits the account form with all required fields (account name, address, primary contact, territory, account type).
- **FR-002**: System MUST display a field-level validation error and MUST NOT persist the record when a user submits a new account form with any required field blank.
- **FR-003**: System MUST detect potential duplicate Account records during creation by comparing name, phone, and address using fuzzy matching (Levenshtein distance threshold of 3 or less for names) and MUST display a warning listing similar records with match confidence percentages.
- **FR-004**: System MUST display a unified Account detail view showing contacts, activity timeline, order history, open opportunities, health score, notes, and photos within 2 seconds when a user navigates to an Account.
- **FR-005**: System MUST support parent-child Account hierarchies and MUST display aggregated roll-up metrics (order count, total revenue, last activity date) on the parent account detail page.
- **FR-006**: System MUST calculate an Account health score (0–100) based on weighted factors: days since last activity (30%), order frequency vs. historical average (25%), order value trend (25%), and contact engagement recency (20%), recalculated nightly at 02:00 UTC.
- **FR-007**: System MUST provide full-text search across Account records by account name, contact name, phone, email, city, and territory, returning relevance-ranked results within 200 milliseconds at p95 when a user enters at least 3 characters and pauses for 300 milliseconds.
- **FR-008**: System MUST allow a Rep to log an activity (visit, call, email, demo, sampling) against an Account in under 60 seconds using a quick-log form with pre-populated fields and selectable activity type templates.
- **FR-009**: System MUST display an activity timeline on each Account showing all activities, emails, order events, and system events in reverse chronological order with infinite scroll pagination (20 items per page) loading within 500 milliseconds.
- **FR-010**: System MUST auto-link emails to Account and Contact records by matching sender/recipient addresses and MUST track engagement events (open, click, bounce) with timestamps logged on the activity timeline within 60 seconds.
- **FR-011**: System MUST place unmatched inbound emails in an "Unmatched Emails" queue visible to Rep and Manager roles when no matching Contact record exists.
- **FR-012**: System MUST support task creation with due date, priority (High, Medium, Low), assignee, and optional Account/Contact/Opportunity association, with reminder notifications via in-app and email at 24 hours and 1 hour before the due date.
- **FR-013**: System MUST allow a Rep to create an Order with 1 or more line items specifying product, quantity, unit price, and revenue model (broker or wholesale), defaulting to the product's configured default model.
- **FR-014**: System MUST automatically split a multi-vendor order into vendor-specific sub-orders with correct line items and vendor association when the order contains products from more than one brand.
- **FR-015**: System MUST provide product search within order entry returning matches by name, SKU, brand, or category within 200 milliseconds, displaying availability (in-stock/limited/out-of-stock), unit price, and active promotional pricing.
- **FR-016**: System MUST apply active promotional pricing as the default unit price when a product with a valid promotion is added to an order during the promotion window.
- **FR-017**: System MUST require Manager approval for Orders totaling $5,000 or more before status transitions from Pending to Confirmed, notifying the approver via in-app and email within 30 seconds.
- **FR-018**: System MUST generate AI-powered reorder suggestions for Accounts with 6+ orders in the past 12 months, presenting a modifiable pre-populated draft within 3 seconds, and MUST display "Not enough order history" for accounts with fewer than 6 orders.
- **FR-019**: System MUST maintain a Product catalog with: name, SKU, brand, category, subcategory, unit price, wholesale price, case size, certifications, allergens (Big 9), dietary attributes, availability status, and product image.
- **FR-020**: System MUST allow generation of a brand line card document listing all active products with images, descriptions, pricing, certifications, and availability within 10 seconds, attachable to an email pre-populated with the Account's primary contact address.
- **FR-021**: System MUST allow creation of Opportunity records linked to Accounts with: name, estimated value, close date, pipeline stage, probability (auto-populated by stage, manually overridable), and associated brands.
- **FR-022**: System MUST display a pipeline kanban board with drag-and-drop stage transitions, weighted forecast summary at top, and MUST prompt for a close reason when moving to Closed Won.
- **FR-023**: System MUST calculate Rep commissions for confirmed broker-model order line items based on configurable rules: base rate per brand (8–15%), territory modifier (0.80–1.20x), and volume tier thresholds, applying the rate effective on the order confirmation date.
- **FR-024**: System MUST generate monthly commission statements showing per-order breakdown (order number, account, brand, line total, rate, commission amount), total earned, approval status, and YTD total.
- **FR-025**: System MUST export approved commission data to the accounting system in a compatible format (Rep name, pay period, total, line-item detail).
- **FR-026**: System MUST provide a Rep KPI dashboard displaying: current-month and trailing-12-month revenue, account count, activity count, opportunity count, weighted pipeline value, commission (current month + YTD), and health distribution counts, loading within 3 seconds.
- **FR-027**: System MUST provide a Manager team dashboard with aggregate monthly revenue, Rep rankings by revenue, territory revenue density, and pipeline forecast by stage, updating within 2 seconds when date filters are applied.
- **FR-028**: System MUST allow Manager/Admin users to create custom reports by selecting entity type, applying filters, choosing columns, and exporting to CSV or XLSX within 10 seconds for up to 500 records.
- **FR-029**: System MUST provide Admin-only user management (create, edit, deactivate, role assignment across 5 roles) with permission changes effective within 60 seconds without re-authentication.
- **FR-030**: System MUST invalidate all sessions for a deactivated user within 15 seconds and redirect to login.
- **FR-031**: System MUST support CSV/XLSX import for Account, Contact, Product, and Order entities validated against canonical field definitions, showing a pre-import preview with row count, per-row errors with field-level descriptions, and change summary before writing data.
- **FR-032**: System MUST reject import files exceeding 50 MB with a descriptive error message.
- **FR-033**: System MUST maintain a data quality scorecard measuring: Account field completeness %, Contact email validity %, Product image coverage %, duplicate Account count, and stale Account count (90+ days inactive), recalculated nightly.
- **FR-034**: System MUST provide a business rule engine allowing Admins to define IF/THEN rules with AND/OR conditions on entity fields, supporting actions (notify, update field, create task, send email), executing within 30 seconds of the trigger, and MUST reject rules referencing non-existent fields with a descriptive error.
- **FR-035**: System MUST generate AI-powered activity summaries, email drafts, and meeting briefs with all content labeled "AI-Generated" and editable, returned within 3 seconds at p95.
- **FR-036**: System MUST display "AI service temporarily unavailable" and MUST NOT show stale or partial AI content when the AI provider is unavailable or times out after 5 seconds.

### Non-Functional Requirements

- **NFR-001**: All API endpoints MUST respond at p95 latency of 200 milliseconds or less under 100 concurrent authenticated users.
- **NFR-002**: First Contentful Paint MUST occur within 2 seconds on a simulated 4G connection (9 Mbps down, 1.5 Mbps up, 150 ms RTT).
- **NFR-003**: Full-text search MUST return results within 200 milliseconds at p95 for up to 50,000 Account records, 200,000 Contact records, and 10,000 Product records.
- **NFR-004**: Database queries MUST execute at p95 latency of 50 milliseconds or less.
- **NFR-005**: AI features MUST return results within 3 seconds at p95, with a hard timeout of 10 seconds.
- **NFR-006**: System MUST maintain 99.5% monthly uptime excluding scheduled maintenance (max 4 hours/month, 48-hour notice).
- **NFR-007**: Authentication MUST use 15-minute access tokens and 7-day refresh tokens. Passwords MUST be hashed with bcrypt cost factor 12. Auth endpoints MUST be rate-limited to 10 requests/minute/IP.
- **NFR-008**: RBAC MUST enforce 5 roles (Admin, Manager, Rep, Logistics, Viewer) with territory-scoped data isolation. Access checks MUST complete within 5 milliseconds.
- **NFR-009**: All data in transit MUST use TLS 1.3. Data at rest MUST use AES-256. The application MUST pass OWASP Top 10 assessment with zero critical/high findings.
- **NFR-010**: System MUST comply with CAN-SPAM, CCPA, and FSMA 204 (2-year traceability data retention).
- **NFR-011**: Application MUST conform to WCAG 2.1 Level AA. Contrast ratios MUST meet 4.5:1 for normal text, 3:1 for large text. All elements MUST be keyboard-navigable.
- **NFR-012**: Touch targets MUST be minimum 44×44 CSS pixels. All inputs MUST have ARIA labels or visible labels compatible with screen readers.
- **NFR-013**: Multi-table writes MUST use ACID transactions with rollback on partial failure, returning errors within 5 seconds with a unique error ID.
- **NFR-014**: Immutable audit trail MUST record actor, timestamp, entity, field, old/new values for all Account, Order, Commission, and User mutations, retained for 3 years minimum with write latency under 10 milliseconds.

### Key Entities

- **Account**: Customer business (store, restaurant, distributor) managed by a territory rep. Attributes: name, type, address, territory, assigned rep, parent link, health score.
- **Contact**: Individual person at an Account. Attributes: name, email, phone, title, primary flag.
- **Territory**: Geographic sales zone. Attributes: name, region, ZIP codes, boundary, assigned rep.
- **User**: Authenticated platform user. Attributes: email, password hash, name, role, active status.
- **Activity**: Logged interaction (visit, call, email, demo, sampling). Attributes: type, account, user, timestamp, notes.
- **Order**: Sales transaction. Attributes: order number, account, rep, status, total, approval metadata.
- **OrderItem**: Line within an Order. Attributes: product, quantity, price, revenue model (broker/wholesale), commission rate.
- **Product**: Catalog item. Attributes: name, SKU, brand, category, prices, certifications, allergens, dietary, availability, image.
- **Brand**: Food supplier/principal. Attributes: name, principal contact, base commission rate, territory modifier.
- **Commission**: Earnings record per broker line item per period. Attributes: rep, order item, period, rate, amount, approval status.
- **Opportunity**: Prospective deal. Attributes: name, account, stage, value, probability, close date.
- **Pipeline**: Aggregation of Opportunity records by stage with weighted forecast calculation.
- **EmailRecord**: Tracked email message. Attributes: contact, account, subject, direction, engagement status, timestamps.
- **EmailTemplate**: Reusable email template with merge fields. Attributes: name, subject, body, active status.
- **LineCard**: Generated brand product catalog document. Attributes: brand, generator, document URL, timestamp.
- **Organization**: Company instance. Attributes: name, address, configuration.
- **BusinessRule**: IF/THEN automation rule. Attributes: name, entity type, conditions, actions, active, priority.
- **Demo**: Product sampling detail linked to an Activity. Attributes: product, quantity, feedback, outcome.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 9 of 9 territory representatives actively using the platform within 90 days (at least 1 session and 1 activity per rep per week)
- **SC-002**: Greater than 99% uptime during first 90 days post-launch
- **SC-003**: FileMaker fully decommissioned within 120 days of launch
- **SC-004**: Data quality score exceeds 90% within 60 days of migration
- **SC-005**: 10-line-item order entry completed in under 5 minutes
- **SC-006**: Commission processing cycle under 1 business day
- **SC-007**: Account search p95 under 200 milliseconds
- **SC-008**: Account churn rate below 10% annualized
- **SC-009**: Revenue per rep increases at least 15% within 12 months
- **SC-010**: Email engagement response rate exceeds 30%
- **SC-011**: Brand coverage per territory exceeds 60% within 6 months
- **SC-012**: Zero critical/high OWASP Top 10 findings at deployment

## Out of Scope

- **Native mobile applications** — PWA only in Phase 1
- **Multi-tenant architecture** — single-organization deployment
- **EDI integration** with retailers or distributors
- **Warehouse management** — no bin locations, lot tracking, or pick/pack
- **Payment processing or invoicing** — handled by accounting system
- **SMS/text messaging** — email only for outbound communication
- **Automated route optimization** for field visits
- **White-label portals** for brand principals
- **Real-time chat** between users
- **Predictive lead scoring** from external data
- **Multi-currency** — USD only
- **Automated vendor purchase orders** — vendor notification is manual
- **HIPAA compliance** — not applicable to food brokerage
- **Bulk email campaign management** — individual sends only in Phase 1

## PRD Traceability

Every PRD functional requirement (FR-001 through FR-030) maps to this specification:

| PRD FR | Spec Coverage |
|--------|--------------|
| FR-001 (Account CRUD) | FR-001, FR-002, US-1 |
| FR-002 (Account detail) | FR-004, US-2 |
| FR-003 (Account search) | FR-007, US-3 |
| FR-004 (Parent-child) | FR-005, US-2 |
| FR-005 (Duplicate detection) | FR-003, US-1 |
| FR-006 (Health scoring) | FR-006, US-2, US-11 |
| FR-007 (Activity logging) | FR-008, US-4 |
| FR-008 (Activity timeline) | FR-009, US-4 |
| FR-009 (Task management) | FR-012, US-5 |
| FR-010 (Email linking) | FR-010, FR-011, US-4 |
| FR-011 (Order entry) | FR-013, FR-014, US-6 |
| FR-012 (Product search) | FR-015, US-6 |
| FR-013 (Order approval) | FR-017, US-6 |
| FR-014 (AI reorder) | FR-018, US-7 |
| FR-015 (QuickBooks export) | FR-025, US-10 |
| FR-016 (Opportunities) | FR-021, US-9 |
| FR-017 (Pipeline kanban) | FR-022, US-9 |
| FR-018 (Product catalog) | FR-019, US-8 |
| FR-019 (Line cards) | FR-020, US-8 |
| FR-020 (Commission calc) | FR-023, US-10 |
| FR-021 (Commission statements) | FR-024, US-10 |
| FR-022 (Commission export) | FR-025, US-10 |
| FR-023 (Rep dashboard) | FR-026, US-11 |
| FR-024 (Manager dashboard) | FR-027, US-12 |
| FR-025 (Custom reports) | FR-028, US-12 |
| FR-026 (User management) | FR-029, FR-030, US-12 |
| FR-027 (Data import) | FR-031, FR-032, US-12 |
| FR-028 (Business rules) | FR-034, US-13 |
| FR-029 (Data quality) | FR-033, US-12 |
| FR-030 (AI features) | FR-035, FR-036, US-14 |

## Review & Acceptance Checklist

- [x] All PRD functional requirements (FR-001 through FR-030) are covered by spec FRs and user stories
- [x] Every spec FR follows the "System MUST" pattern with measurable criteria
- [x] Every user story has priority (P1/P2/P3), "Why this priority," and "Independent Test"
- [x] Every user story has at least 2 Given/When/Then acceptance scenarios
- [x] Every FR is referenced by at least one user story
- [x] Every user story references at least one FR
- [x] At least 2 edge case/error FRs exist (FR-002, FR-011, FR-032, FR-036)
- [x] At least one NFR addresses security (NFR-007, NFR-008, NFR-009)
- [x] At least one NFR addresses performance with specific metric (NFR-001: 200ms p95)
- [x] No subjective language without measurable qualifier
- [x] No unresolved NEEDS CLARIFICATION markers
- [x] Out of Scope section is non-empty with 14 explicit exclusions
- [x] No out-of-scope item appears as a functional requirement
- [x] No technology stack names in spec body (tech choices deferred to plan.md)
- [x] Key Entities section covers all entities referenced in FRs
- [x] Success Criteria are quantifiable with specific numbers
