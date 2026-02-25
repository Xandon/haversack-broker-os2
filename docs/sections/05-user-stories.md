## 5. User Stories

This section defines 20 user stories covering all 28 functional requirements. Each story follows the standard format with acceptance criteria using Given/When/Then, error/edge case scenarios, and full traceability to functional requirements.

**Roles referenced:**
- **Rep** = Field Sales Representative (Jordan persona)
- **Manager** = Sales Manager Lead (Helgi persona)
- **Ops** = Operations/Logistics Coordinator (Mike persona)
- **Admin** = Company Owner/Administrator (Chris persona)
- **Buyer** = Retail Buyer, external (Chen persona)

---

- US-001: As a Rep, I want to create, view, edit, and search accounts with configurable fields so that I can manage my territory's customer records from any device without switching between systems

  **Acceptance Criteria:**

  - AC-001a: Given a Rep is on the Accounts screen on a 320px mobile device, When they tap "New Account" and fill in required fields (name, address, territory), Then the account is saved within 1 second and appears in the account list with a confirmation toast notification.
  - AC-001b: Given a Rep types at least 2 characters into the account search bar, When results are returned, Then matching accounts by name, city, phone number, vendor, or product appear within 200ms with the matching text highlighted.
  - AC-001c: Given an Admin is on the Account settings page, When they add a custom field with a name, type (text, number, date, dropdown, checkbox), and optional validation rule, Then the field appears on all account forms and is persisted to the database.

  **Error/Edge Cases:**

  - Given a Rep submits a new account form with a blank required field (name or address), When they tap "Save," Then the system displays an inline validation error beneath the empty field stating "Account name is required" and does not submit the form.
  - Given a Rep searches for an account while offline (no network connectivity), Then the system displays an offline indicator banner and returns results from the locally cached account list if available, or shows an empty state with the message "You are offline. Cached results shown."

  **Traceability: FR-001, FR-002**

---

- US-002: As a Rep, I want to manage multiple contacts per account with role designations and a primary contact flag so that I reach the correct person for each type of communication

  **Acceptance Criteria:**

  - AC-002a: Given a Rep is viewing the Contacts tab on an account detail screen, When they tap "Add Contact" and enter name, role (buyer, owner, manager, receiving), email, and phone, Then the contact is saved and displayed on the contact card list with one-tap call and email action buttons.
  - AC-002b: Given an account has 3 or more contacts, When a Rep toggles the "Primary" flag on a contact, Then that contact becomes the primary and the previous primary contact's flag is removed, with only one primary contact allowed at any time.

  **Error/Edge Cases:**

  - Given a Rep attempts to save a contact with an invalid email format (missing "@" or domain), When they tap "Save," Then an inline validation error displays "Enter a valid email address" and the form is not submitted.
  - Given a Rep attempts to delete the only remaining contact on an account, When they confirm deletion, Then the system displays a warning: "This is the last contact on this account. The account will have no contacts after deletion. Proceed?"

  **Traceability: FR-003**

---

- US-003: As a Manager, I want to assign accounts to territories and reps with territory-scoped data access so that account ownership is unambiguous and reps see only their assigned data

  **Acceptance Criteria:**

  - AC-003a: Given a Manager is on the Territory Management screen, When they select an account and assign it to a territory and rep from dropdown selectors, Then the account's territory and owner fields are updated and the assigned rep can see the account in their account list.
  - AC-003b: Given RBAC enforcement is active, When a Rep logs in and navigates to the Accounts screen, Then only accounts assigned to their territory are displayed, and API requests for accounts outside their territory return a 403 Forbidden response.

  **Error/Edge Cases:**

  - Given a Manager attempts to assign an account to a territory that already has a different rep assigned for that geographic area, When they confirm the assignment, Then the system displays a confirmation dialog: "This account will be reassigned from [Current Rep] to [New Rep]. [Current Rep] will lose access. Confirm?"
  - Given a Manager attempts to assign an account while another Manager is simultaneously editing the same account's territory, When the second Manager saves, Then the system detects the conflict via optimistic concurrency (version field) and displays: "This account was modified by [Other Manager] at [timestamp]. Please refresh and retry."

  **Traceability: FR-004, FR-025**

---

- US-004: As a Manager, I want to view account health scores derived from order frequency, recency, and engagement metrics so that I can identify at-risk accounts and prioritize coaching conversations

  **Acceptance Criteria:**

  - AC-004a: Given an account has order history and activity logs, When a Manager views the Account Overview tab, Then a health score badge (green for scores 70-100, yellow for 40-69, red for 0-39) is displayed, calculated from: order frequency (40% weight), days since last order (30% weight), and activity engagement count in the last 90 days (30% weight).
  - AC-004b: Given a Manager is on the Accounts list, When they sort or filter by health score, Then accounts are ordered by their computed score and the color-coded badge is visible on each row or card.

  **Error/Edge Cases:**

  - Given an account was created within the last 30 days and has no order history, When the health score is calculated, Then the system assigns a "New" designation instead of a numeric score and displays a gray badge labeled "New - Insufficient Data."
  - Given the background job that recalculates health scores fails (database timeout or job queue error), When a Manager views account health, Then the system displays the last successfully calculated score with a timestamp label "Last updated: [date]" and logs the failure for operations review.

  **Traceability: FR-005**

---

- US-005: As a Rep, I want to log calls, visits, emails, tasks, and demos against an account in under 60 seconds on mobile so that I capture interactions immediately after they occur without losing selling time

  **Acceptance Criteria:**

  - AC-005a: Given a Rep is on any screen on a mobile device, When they tap the floating action button (FAB) and select an activity type (call, visit, email, task, demo), Then a pre-filled quick-log form opens with the current date/time, rep name, and (if navigated from an account) the account pre-selected, requiring only subject and notes to submit.
  - AC-005b: Given a Rep completes the quick-log form fields, When they tap "Save," Then the activity is persisted, appears in the account's activity timeline, and the total interaction time from FAB tap to successful save is measurable and targeted at under 60 seconds.
  - AC-005c: Given a Rep selects "Demo" as the activity type, When the form opens, Then additional fields appear: product (searchable dropdown), store location (pre-filled from account), outcome (buyer interest level: high/medium/low/no interest), and follow-up date with action type.

  **Error/Edge Cases:**

  - Given a Rep is logging an activity and loses network connectivity mid-save, When the save request fails, Then the system queues the activity locally, displays a toast "Activity saved offline. Will sync when connected," and submits the queued activity when connectivity is restored.
  - Given a Rep attempts to log a visit for an account that has been deactivated by an Admin since the Rep last refreshed, When they tap "Save," Then the system returns an error: "This account has been deactivated. Contact your manager." and does not save the activity.

  **Traceability: FR-006, FR-011**

---

- US-006: As a Rep, I want to view a chronological activity timeline for any account filtered by activity type so that I can review interaction history before a store visit

  **Acceptance Criteria:**

  - AC-006a: Given a Rep navigates to an account's Activities tab, When the tab loads, Then activities are displayed in reverse chronological order (most recent first) with type-specific icons (phone for call, map-pin for visit, mail for email, clipboard for task, shopping-bag for demo), the rep who logged each activity, date/time, subject, and a truncated notes preview (first 120 characters).
  - AC-006b: Given a Rep taps a filter chip (e.g., "Visits" or "Demos"), When the filter is applied, Then only activities of that type are displayed and the active filter chip is visually highlighted, with the total count shown in the chip label (e.g., "Visits (12)").

  **Error/Edge Cases:**

  - Given an account has zero logged activities, When a Rep opens the Activities tab, Then an empty state is displayed with an illustration placeholder, the message "No activities yet for this account," and a prominent "Log First Activity" call-to-action button.
  - Given an account has over 500 activities, When the Rep scrolls the timeline, Then activities load in pages of 25 using infinite scroll with a skeleton loader showing 3 placeholder cards while the next page loads.

  **Traceability: FR-007**

---

- US-007: As a Rep, I want to create tasks with due dates, reminders, and defined follow-up actions so that I never miss a commitment to a customer

  **Acceptance Criteria:**

  - AC-007a: Given a Rep is creating a task, When they set a due date, reminder timing (e.g., "1 day before," "morning of," "1 hour before"), and follow-up action type (send email, call customer, create order, filter customers), Then the system schedules the reminder and displays it on the Rep Dashboard's "Today's Priorities" card on the due date.
  - AC-007b: Given a reminder triggers for a task, When the Rep views their Dashboard, Then the reminder card shows the task subject, account name, due date, and a one-tap action button that initiates the defined follow-up action (e.g., tapping "Send Email" opens the email composer pre-filled with the account and template).

  **Error/Edge Cases:**

  - Given a Rep sets a due date in the past (e.g., yesterday), When they tap "Save," Then the system displays an inline warning: "Due date is in the past. This task will appear as overdue immediately. Save anyway?" with "Save" and "Change Date" options.
  - Given a Rep has 50+ overdue tasks, When they view the Dashboard's Today's Priorities card, Then tasks are paginated (showing the 10 most urgent first) with a "View all overdue (50)" link, preventing the dashboard from becoming unresponsive.

  **Traceability: FR-008**

---

- US-008: As a Rep, I want to compose emails using HTML templates with merge fields and schedule them for future delivery so that I send branded, personalized communications that arrive during business hours

  **Acceptance Criteria:**

  - AC-008a: Given a Rep is composing an email from an account's Emails tab, When they select a template (e.g., "Follow-Up After Visit," "Seasonal Order Reminder"), Then the template's HTML body loads in the editor with merge fields auto-populated from account data (customer name, last order date, product, vendor), and the Rep can edit the content before sending.
  - AC-008b: Given a Rep has composed an email, When they toggle "Schedule Send" and select a future date and time, Then the email is saved with status "Scheduled," appears in the account's email timeline with a clock icon, and is delivered by the background job within 30 seconds of the scheduled time.

  **Error/Edge Cases:**

  - Given a Rep schedules an email for a date/time that has already passed by the time they tap "Schedule," When the system processes the request, Then it displays: "The scheduled time has passed. Send now instead?" with "Send Now" and "Pick New Time" options.
  - Given a merge field references a data point that is null for the account (e.g., "last order date" for an account with no orders), When the template renders, Then the merge field is replaced with a configurable fallback value (e.g., "[no previous order]") and the Rep is shown a yellow warning banner: "1 merge field could not be populated. Review before sending."

  **Traceability: FR-009, FR-010**

---

- US-009: As a Rep, I want to enter orders from my phone during a store visit with clear broker vs. wholesale designation per line item and real-time pricing so that I capture orders accurately on the spot

  **Acceptance Criteria:**

  - AC-009a: Given a Rep initiates a new order from an account, When they search for products by name, SKU, brand, or certification in the "Add Products" step, Then matching products appear within 200ms with product name, SKU, brand, unit price, availability status, and a badge indicating "Broker" or "Wholesale" fulfillment model.
  - AC-009b: Given a Rep adds a product to the order, When they set the quantity, Then the line item displays: unit price, extended price (quantity x unit price), the fulfillment model (broker at 8-15% commission or wholesale at 25-40% markup), and the line total updates in real time without a page reload.
  - AC-009c: Given a Rep has added all products and is on the "Review Cart" step, When the cart is displayed, Then line items are grouped by fulfillment model (broker items, then wholesale items) with subtotals per group and a grand total, and each line shows the product name, quantity, unit price, extended price, and fulfillment model badge.

  **Error/Edge Cases:**

  - Given a Rep adds a product to an order and that product's availability changes to "Out of Stock" between the time it was added and the time the order is submitted, When the Rep taps "Submit Order," Then the system displays: "1 item is no longer available: [Product Name]. Remove it or save as draft?" with "Remove Item" and "Save Draft" options.
  - Given a Rep is entering an order in a low-connectivity environment, When a pricing API call fails, Then the system uses the last-cached price (displayed with a warning label "Price as of [cache date]") and flags the order for price verification by Ops before fulfillment.

  **Traceability: FR-012, FR-013**

---

- US-010: As Ops, I want submitted orders to automatically split into broker and wholesale fulfillment streams with status tracking and rep notifications so that I can fulfill each line item through the correct channel

  **Acceptance Criteria:**

  - AC-010a: Given a Rep submits an order containing both broker and wholesale line items, When the order is saved, Then the system creates two fulfillment records: one for broker items (routed to the principal/brand for fulfillment) and one for wholesale items (routed to the Haversack warehouse), each with independent status tracking.
  - AC-010b: Given Ops updates the status of a fulfillment record (from "Confirmed" to "Shipped" or "Shipped" to "Delivered"), When the status change is saved, Then the Rep who placed the order receives a push notification and an in-app notification badge on the Orders tab with the message: "Order #[number] - [Broker/Wholesale] items [new status]."

  **Error/Edge Cases:**

  - Given an order contains a line item where the product's fulfillment model is ambiguous (e.g., the product exists in both broker and wholesale catalogs), When the order is submitted, Then the system flags the item for manual review by Ops with the message: "Fulfillment model could not be auto-determined for [Product Name]. Assign manually."
  - Given Ops attempts to update an order status to "Shipped" but the order is in "Cancelled" state, When they select the new status, Then the system prevents the transition and displays: "Cannot ship a cancelled order. To reactivate, create a new order."

  **Traceability: FR-014, FR-015**

---

- US-011: As a Manager, I want orders exceeding $5,000 to require approval before fulfillment so that high-value transactions are reviewed for accuracy and margin protection

  **Acceptance Criteria:**

  - AC-011a: Given a Rep submits an order with a total exceeding $5,000, When the order is saved, Then the order status is set to "Pending Approval" instead of "Confirmed," the assigned Manager receives a notification with the order total and account name, and the Rep sees a status badge "Awaiting Approval" on the order.
  - AC-011b: Given a Manager opens a pending approval order, When they review the line items, pricing, and fulfillment split and tap "Approve," Then the order status transitions to "Confirmed," fulfillment streams are created, and the Rep receives a notification: "Order #[number] approved by [Manager Name]."

  **Error/Edge Cases:**

  - Given a Manager rejects an order, When they tap "Reject" and enter a reason, Then the order status transitions to "Rejected," the Rep receives a notification with the rejection reason, and the Rep can edit and resubmit the order (creating a new version linked to the original).
  - Given the $5,000 approval threshold is reached only after a line item quantity is increased post-submission (e.g., Rep edits a confirmed order from $4,800 to $5,200), When the edit is saved, Then the system re-triggers the approval workflow and changes the status back to "Pending Approval."

  **Traceability: FR-016**

---

- US-012: As a Rep, I want to view and manage my sales pipeline on a kanban board with drag-and-drop stage transitions so that I can visualize deal progress and prioritize my selling effort

  **Acceptance Criteria:**

  - AC-012a: Given a Rep navigates to the Pipeline screen on a tablet or desktop device (768px+ viewport), When the board loads, Then opportunities are displayed as cards in columns representing stages (Prospect, Qualified, Proposal, Negotiation, Won, Lost), each card showing account name, estimated value, probability percentage, and days in current stage.
  - AC-012b: Given a Rep drags an opportunity card from one stage column to another on tablet/desktop, When the card is dropped, Then the opportunity's stage is updated via an optimistic UI update (card moves immediately, API call in background), and a pipeline summary bar at the top recalculates total value per stage and the weighted forecast.
  - AC-012c: Given a Rep is on a mobile device (below 768px), When they tap an opportunity card and select "Move to Stage," Then a bottom sheet appears with stage options, and tapping a stage transitions the opportunity with the same optimistic update behavior.

  **Error/Edge Cases:**

  - Given a Rep drags an opportunity to the "Won" stage, When the card is dropped, Then the system prompts for a won reason and links any associated orders, and if no order exists for this opportunity, displays: "No order linked to this opportunity. Create an order now?" with "Create Order" and "Skip" options.
  - Given the optimistic UI update succeeds locally but the background API call fails (e.g., network error), When the failure is detected, Then the card reverts to its previous column, a toast notification displays "Stage change failed. Check your connection and try again," and the pipeline summary bar recalculates to the previous state.

  **Traceability: FR-017**

---

- US-013: As a Rep, I want to browse and search the product catalog with allergen data, certifications, dietary attributes, and seasonal availability so that I can recommend the right products to each buyer

  **Acceptance Criteria:**

  - AC-013a: Given a Rep navigates to the Product Catalog, When they search by name, SKU, brand, or certification keyword, Then matching products appear within 200ms, each displaying: product name, brand, SKU, unit price, availability status, allergen flags (Big 9: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame), certification badges (organic, kosher, non-GMO, gluten-free), dietary attribute tags (vegan, paleo, keto), and a seasonal availability indicator.
  - AC-013b: Given a Rep applies a filter for "Peanut-Free" and "Organic," When the filter is active, Then only products that are both free of peanut allergens and carry organic certification are displayed, with active filter chips shown above the results and a count of matching products.

  **Error/Edge Cases:**

  - Given a Rep searches for a product that has been deactivated by an Admin, When results are returned, Then deactivated products do not appear in search results unless the Rep toggles a "Show Inactive" filter (available only to Admin and Manager roles).
  - Given a product's seasonal availability window has expired (e.g., "Available Oct-Dec" and the current month is February), When the product appears in search results, Then it displays an "Out of Season" badge in amber and the "Add to Order" button is disabled with a tooltip: "Available again in [next availability month]."

  **Traceability: FR-018**

---

- US-014: As an Admin, I want to manage brand/principal records with contacts, territory restrictions, and line cards so that rep authorization and brand relationships are systematically tracked

  **Acceptance Criteria:**

  - AC-014a: Given an Admin navigates to the Brand Management screen, When they create or edit a brand, Then they can set: brand name, principal contact(s) (name, email, phone), commission rate(s) per brand, territory restrictions (which territories can sell this brand), authorized account types, and effective dates.
  - AC-014b: Given an Admin manages line cards, When they assign a brand to a rep with an effective date range, Then the rep can see and sell that brand's products within the authorized territories during the effective period, and cannot add those products to orders outside the effective dates or restricted territories.

  **Error/Edge Cases:**

  - Given an Admin deactivates a brand that has open orders with pending fulfillment, When they attempt to deactivate, Then the system displays: "This brand has [N] orders with pending fulfillment. Deactivating will not cancel existing orders but will prevent new orders. Proceed?" with "Deactivate" and "Cancel" options.
  - Given an Admin sets territory restrictions on a brand that a rep is currently selling in an unrestricted territory, When the restriction is saved, Then the system sends a notification to the affected rep(s): "Brand [Name] is no longer available in your territory effective [date]."

  **Traceability: FR-019**

---

- US-015: As a Rep, I want to view my earned commissions with line-item detail and an audit trail showing the calculation logic per order so that I can verify my compensation without needing to ask a manager

  **Acceptance Criteria:**

  - AC-015a: Given a Rep navigates to the Commission screen, When the screen loads, Then it displays: current period total commission earned, a list of orders with commission amounts, and for each order line item: product, quantity, sale amount, commission rate applied, commission amount, and the rule that was applied (e.g., "Brand X base rate: 10%" or "Volume tier 2: 12%").
  - AC-015b: Given an Admin configures commission rules, When they set a rule with brand, territory, and volume tier parameters (e.g., "Brand X, Pacific Northwest, $0-5K: 10%; $5K-20K: 12%; $20K+: 15%"), Then the rule is saved and applied to all future orders matching those parameters, with the calculation logic recorded in the audit trail.

  **Error/Edge Cases:**

  - Given two commission rules overlap for the same order line (e.g., a brand-specific rule and a territory-specific rule both apply), When the commission is calculated, Then the system applies the rule with the highest specificity (brand+territory+tier > brand+territory > brand > default), logs which rule was selected and which were overridden in the audit trail, and flags the overlap for Admin review.
  - Given a commission calculation job fails mid-batch (e.g., database connection lost), When the failure occurs, Then the system rolls back the partial calculation, retries the job up to 3 times with exponential backoff, and if all retries fail, sends an alert to the Admin with the error details and the list of unprocessed orders.

  **Traceability: FR-020, FR-021**

---

- US-016: As a Rep and Manager, I want role-specific dashboards with configurable KPI displays so that I see the metrics that matter to my daily workflow at a glance

  **Acceptance Criteria:**

  - AC-016a: Given a Rep opens the Dashboard (the default landing screen), When it loads within 2 seconds, Then the following sections are displayed: Today's Priorities card (overdue tasks, scheduled visits, follow-ups due), KPI strip (MTD revenue, commission earned, accounts visited this week, pipeline value), Quick Actions floating action button, and Recent Activity feed (last 10 activities).
  - AC-016b: Given a Manager opens their Dashboard, When it loads, Then they see: team-wide KPI summary (total revenue, total pipeline, activity compliance percentage per rep), a filterable rep performance comparison table, and a territory coverage map or list.
  - AC-016c: Given a Rep or Manager wants to customize their KPI strip, When they tap "Edit KPIs" and reorder or swap KPI widgets from the available list, Then the dashboard persists their configuration across sessions using local storage backed by a server-side user preference record.

  **Error/Edge Cases:**

  - Given the dashboard data API call fails or times out (over 5 seconds), When the dashboard loads, Then skeleton loaders display for each card for up to 5 seconds, followed by an error state per card showing "Unable to load [KPI Name]. Tap to retry" with a retry button, while cards that loaded successfully remain visible.
  - Given a new Rep has zero activities, zero orders, and zero pipeline items, When they view the Dashboard for the first time, Then each section displays a contextual empty state: "No activities yet. Log your first visit to get started" with a "Log Visit" button, "No orders this month. Create your first order" with a "New Order" button, and so on.

  **Traceability: FR-022**

---

- US-017: As an Admin, I want to configure business rules with IF/THEN conditions and AND/OR logic so that automated actions (reminders, emails, task creation) trigger without manual intervention

  **Acceptance Criteria:**

  - AC-017a: Given an Admin navigates to the Business Rules screen, When they create a rule, Then they can define: a trigger condition using IF/THEN logic with AND/OR operators (e.g., IF account.last_order_date > 45 days ago AND account.territory = "North Seattle" THEN send_email("Inactivity Follow-up") AND create_task("Follow up call", due: 3 days)), an action list (send email from template, create task, update field, send notification), and an active/inactive toggle.
  - AC-017b: Given a business rule is active, When the rule engine evaluates conditions (on a configurable schedule or triggered by a data change event), Then matching records trigger the defined actions, and each execution is logged with: timestamp, rule name, matching records count, actions taken, and success/failure status.

  **Error/Edge Cases:**

  - Given an Admin creates a rule with a condition that matches over 1,000 accounts (e.g., "all accounts in the system"), When the rule executes, Then the system processes actions in batches of 100 with a maximum execution time of 10 seconds per batch, logs progress, and can be paused or cancelled by an Admin.
  - Given a business rule references an email template that has been deleted since the rule was created, When the rule engine attempts to execute the "send email" action, Then the action fails gracefully, is logged as "Failed: Template not found," and the Admin receives a notification: "Rule [Name] failed: referenced email template '[Template Name]' no longer exists."

  **Traceability: FR-023**

---

- US-018: As an Admin, I want to import data from CSV/Excel files with a column mapping interface and Layout of Truth validation so that migrated data meets quality standards before entering the system

  **Acceptance Criteria:**

  - AC-018a: Given an Admin uploads a CSV or Excel file on the Data Import screen, When the file is parsed, Then the system displays a column mapping interface showing: source columns from the file on the left, target fields from the Layout of Truth on the right (with required fields marked), a sample preview of the first 5 rows with the mapping applied, and auto-suggested mappings for columns with matching names.
  - AC-018b: Given an Admin confirms the column mapping and clicks "Validate," When validation runs, Then the system checks every row against Layout of Truth rules (field types, required fields, format patterns, uniqueness constraints) and displays a validation report: total rows, rows passing, rows failing with row numbers and specific errors, and a "Fix and Re-upload" or "Import Valid Rows Only" option.

  **Error/Edge Cases:**

  - Given an Admin uploads a file with 50,000 rows, When the import runs, Then the system processes the file in a background job with a progress indicator (e.g., "Processing row 12,000 of 50,000 - 24%"), does not block the UI, and sends a notification when complete.
  - Given an Admin uploads a CSV with encoding issues (e.g., UTF-16 instead of UTF-8) or a corrupted Excel file, When the system attempts to parse it, Then it displays: "Unable to read file. Supported formats: CSV (UTF-8), XLSX. Error: [specific parser error]. Please re-export and try again."

  **Traceability: FR-024**

---

- US-019: As Ops, I want order entry to capture FSMA 204 Key Data Elements and product-level allergen tracking so that Haversack maintains regulatory compliance and can respond to recall queries within 24 hours

  **Acceptance Criteria:**

  - AC-019a: Given a Rep is on the "Add Products" step of order entry, When they add a product to the order, Then FSMA 204 Key Data Elements are captured per line item: lot number (manual entry or scan), batch ID (if available), origin/source, and the system auto-records the order date as the receiving/shipping CTE timestamp.
  - AC-019b: Given an Admin or Ops user runs a recall query (e.g., "Find all orders containing [Product X] lot [ABC123] in the last 12 months"), When the query executes, Then the system returns matching orders with: order number, account, date, lot number, quantity, and fulfillment status within 10 seconds, and the results can be exported to CSV.
  - AC-019c: Given a Rep adds products to an order where one product contains a Big 9 allergen (e.g., peanuts) and the account has a contact with a "peanut-free" preference, When the allergen conflict is detected, Then the system displays a warning banner: "Allergen Alert: [Product Name] contains peanuts. [Contact Name] has a peanut-free preference on file."

  **Error/Edge Cases:**

  - Given a Rep submits an order without entering a lot number for a product that requires FSMA traceability, When they tap "Submit," Then the system blocks submission with an inline error: "Lot number is required for [Product Name] per FSMA 204 compliance. Enter the lot number to continue."
  - Given the recall query returns more than 10,000 matching records, When the system processes the query, Then results are paginated (100 per page) with a CSV export option for the full result set, and query execution does not exceed 30 seconds.

  **Traceability: FR-026**

---

- US-020: As a Rep, I want AI-generated activity summaries, email drafts, order suggestions, and meeting briefs so that I spend less time on administrative work and more time selling

  **Acceptance Criteria:**

  - AC-020a: Given a Rep has a store visit scheduled today, When they tap "Generate Meeting Brief" on the Dashboard or Account Detail screen, Then the AI produces a summary within 3 seconds containing: account health status, last 5 activities, recent order history, products the account carries, products the account does not carry (gap analysis), and any open tasks or follow-ups.
  - AC-020b: Given a Rep is composing an email, When they tap "AI Draft," Then the AI generates an email body based on the selected template, recent account context (last visit notes, order history), and the Rep can edit the draft before sending.
  - AC-020c: Given a Rep is on the order entry screen for a returning account, When they tap "Suggested Items," Then the AI displays a ranked list of products the account has previously ordered but not ordered recently, sorted by predicted relevance, with one-tap "Add to Order" buttons.

  **Error/Edge Cases:**

  - Given the AI service (LLM API) is unavailable or responds with an error, When a Rep requests an AI feature, Then the system displays: "AI assistant is temporarily unavailable. You can continue without AI assistance." All AI features degrade gracefully, and all non-AI workflows remain fully functional.
  - Given the AI generates a meeting brief that contains outdated information (e.g., references a contact who has been removed from the account), When the brief is displayed, Then a disclaimer appears at the top: "Generated from data as of [timestamp]. Verify details before your visit." The Rep can tap "Regenerate" to get a fresh brief.

  **Traceability: FR-027, FR-028**

---

### FR Coverage Traceability Matrix

| FR | Covered By |
|---|---|
| FR-001 | US-001 |
| FR-002 | US-001 |
| FR-003 | US-002 |
| FR-004 | US-003 |
| FR-005 | US-004 |
| FR-006 | US-005 |
| FR-007 | US-006 |
| FR-008 | US-007 |
| FR-009 | US-008 |
| FR-010 | US-008 |
| FR-011 | US-005 |
| FR-012 | US-009 |
| FR-013 | US-009 |
| FR-014 | US-010 |
| FR-015 | US-010 |
| FR-016 | US-011 |
| FR-017 | US-012 |
| FR-018 | US-013 |
| FR-019 | US-014 |
| FR-020 | US-015 |
| FR-021 | US-015 |
| FR-022 | US-016 |
| FR-023 | US-017 |
| FR-024 | US-018 |
| FR-025 | US-003 |
| FR-026 | US-019 |
| FR-027 | US-020 |
| FR-028 | US-020 |
