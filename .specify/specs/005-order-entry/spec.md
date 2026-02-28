# Feature Specification: Order Entry & Approval

**Feature Branch**: `005-order-entry`
**Created**: 2026-02-26
**Status**: Draft
**Input**: PRD FR-011, FR-012, FR-013, FR-014, FR-015; US-005, US-007

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Line Order Creation (Priority: P1)

As a territory representative, I want to create a multi-line order with broker and wholesale items mixed together on my tablet or phone, so that I can capture the full order during a buyer meeting.

**Why this priority**: Order creation is the core revenue-generating action. Without it, no downstream features (approval, commissions, export) can function.

**Independent Test**: Can be fully tested by creating an order with multiple line items across different vendors and verifying the order persists with correct totals, line items, and vendor splits.

**Acceptance Scenarios**:

1. **Given** a Rep is on an account page, **When** the Rep creates a new order with line items specifying product, quantity, unit price, and revenue model (broker or wholesale), **Then** the system persists the order with calculated subtotals per line item and an overall order total.
2. **Given** a Rep adds a line item for product "Artisan Honey 12oz" with quantity 24 and selects revenue model "Broker," **When** the Rep views the line item subtotal, **Then** the system displays the broker commission amount calculated as unit price × quantity × the product's configured commission rate (e.g., 12%). (AC-011a)
3. **Given** a Rep adds 10 line items to an order across 3 different vendor brands, **When** the Rep submits the order, **Then** the system automatically splits the order into 3 vendor-specific sub-orders and persists each sub-order with the correct line items and vendor association. (AC-011b)

---

### User Story 2 - Real-Time Product Search in Order Entry (Priority: P1)

As a territory representative, I want to search for products in real time while building an order, so that I can quickly find and add the right products without leaving the order form.

**Why this priority**: Product search is integral to order entry — without it, reps cannot efficiently find products to add to orders.

**Independent Test**: Can be tested by typing a search term in the order form product search field and verifying matching products return within 200ms with correct details.

**Acceptance Scenarios**:

1. **Given** a Rep types "honey" into the product search field during order entry, **When** results appear, **Then** each result displays: product name, SKU, brand name, unit price, promotional price (if active), and availability status with a color-coded indicator (green for in-stock, yellow for limited, red for out-of-stock). (AC-012a)
2. **Given** a product has an active promotional price of $8.50 (regular price $10.00) valid through 2026-04-01, **When** the Rep adds this product to an order on 2026-03-15, **Then** the system applies the promotional price of $8.50 as the default unit price for the line item. (AC-012b)

---

### User Story 3 - Manager Approval for High-Value Orders (Priority: P1)

As a sales manager, I want to review and approve or reject orders totaling $5,000 or more, so that high-value transactions are verified before confirmation.

**Why this priority**: The $5,000 approval threshold is a critical business control required for financial governance. Orders above this value cannot proceed without it.

**Independent Test**: Can be tested by submitting an order >= $5,000, verifying it enters "Pending Approval" status, sending notifications, and then approving/rejecting it as a Manager.

**Acceptance Scenarios**:

1. **Given** a Rep submits an order totaling $6,200, **When** the order is saved, **Then** the system sets the order status to "Pending Approval," sends an in-app notification and email to the Rep's assigned Manager within 30 seconds, and prevents the order from progressing to "Confirmed" until the Manager approves. (AC-013a)
2. **Given** a Manager views the approval queue and rejects an order with a written reason "Pricing not approved by vendor," **When** the Manager submits the rejection, **Then** the system sets the order status to "Rejected," notifies the originating Rep via in-app notification and email with the rejection reason, and logs the rejection in the order's audit trail. (AC-013b)

---

### User Story 4 - AI-Powered Reorder Suggestions (Priority: P2)

As a territory representative, I want to see AI-generated reorder suggestions for my accounts, so that I can proactively reach out with relevant product recommendations based on order history.

**Why this priority**: AI reorder is a value-add productivity enhancement. The core order workflow must work first. Requires account to have sufficient order history (6+ orders).

**Independent Test**: Can be tested by viewing an account with 6+ historical orders and verifying the AI generates a "Suggested Reorder" card with products, quantities, and estimated total within 3 seconds.

**Acceptance Scenarios**:

1. **Given** an Account has placed 6 or more orders in the past 12 months, **When** a Rep views the Account detail page, **Then** the system displays a "Suggested Reorder" card with recommended products, quantities (based on the account's median order quantities), and an estimated total, generated by the AI engine within 3 seconds. (AC-014a)
2. **Given** the AI generates a reorder suggestion containing 5 products, **When** the Rep removes 2 products and adjusts the quantity of 1 product, **Then** the system recalculates the order total and allows the Rep to submit the modified order as a new order. (AC-014b)

---

### User Story 5 - QuickBooks Export (Priority: P2)

As an admin, I want confirmed orders to automatically export to QuickBooks within 1 hour, so that accounting data stays synchronized without manual data entry.

**Why this priority**: Financial integration is essential for operations but depends on orders being created and confirmed first.

**Independent Test**: Can be tested by confirming an order and verifying it appears in the QuickBooks export queue and transmits successfully within 1 hour.

**Acceptance Scenarios**:

1. **Given** an order transitions to "Confirmed" status at 14:00 UTC, **When** the next QuickBooks export cycle runs (hourly), **Then** the order data appears in the QuickBooks export queue and is transmitted successfully, with a sync status of "Exported" recorded on the order record. (AC-015a)
2. **Given** a QuickBooks export fails due to a network timeout, **When** the system retries (up to 3 retries with exponential backoff: 1 min, 5 min, 15 min), **Then** if all retries fail, the system sets the sync status to "Export Failed" and notifies the Admin via in-app notification. (AC-015b)

---

### Edge Cases

- **Out-of-stock product added to order**: System displays warning "Product X is currently out of stock — order may be delayed" but allows the Rep to proceed.
- **Order total exceeds $5,000 but no Manager is available** (all Managers deactivated): System queues the order as "Pending Approval" and sends an email to the Admin role notifying that no Manager is available for approval.
- **Network failure during order submission**: System saves the order draft locally and displays "Order saved as draft — submit when online."
- **Account has fewer than 6 historical orders**: System displays "Not enough order history for suggestions — reorder suggestions appear after 6 orders."
- **AI service returns an error for reorder**: System displays "Unable to generate suggestions at this time" with a "Retry" button; no stale suggestions shown.
- **Suggested reorder product has been discontinued**: System excludes discontinued products from the suggestion and notes "1 previously ordered product is no longer available."
- **QuickBooks export fails all 3 retries**: System sets sync status to "Export Failed" and notifies Admin.
- **Zero line items on order submission**: System prevents submission and displays validation error "Order must have at least one line item."
- **Negative quantity or price**: System prevents entry and displays validation error.
- **Duplicate line items for same product**: System merges quantities or warns the user.
- **Order edit after submission**: Only orders in "Draft" status can be edited. Submitted/Approved/Confirmed orders are immutable (edits require a new order or cancellation).
- **Concurrent approval**: If two managers attempt to approve/reject simultaneously, optimistic concurrency prevents conflicts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-011**: The system MUST allow a Rep to create an Order with 1 or more line items, where each line item specifies: product, quantity, unit price, and revenue model (broker at 8–15% commission or wholesale at 25–40% markup), with the revenue model defaulting to the product's configured default. The system MUST automatically split orders into vendor-specific sub-orders upon submission.
- **FR-012**: The system MUST provide real-time product search within the order entry form, returning matching products by name, SKU, brand, or category within 200 milliseconds, displaying current availability status (in-stock, limited, out-of-stock), unit price, and any active promotional pricing.
- **FR-013**: The system MUST require Manager approval for any Order with a total value of $5,000 or greater before the order status can transition from "Pending" to "Confirmed," and MUST notify the designated approver via in-app notification and email within 30 seconds of submission.
- **FR-014**: The system MUST generate AI-powered reorder suggestions for each Account by analyzing the account's order history (frequency, quantities, seasonal patterns) and presenting a pre-populated reorder draft that the Rep can review, modify, and submit.
- **FR-015**: The system MUST export confirmed Orders to QuickBooks in a compatible format (CSV or API), including order number, date, account name, line items with SKU, quantity, unit price, tax, and total, within 1 hour of order confirmation.

### Key Entities

- **Order**: A purchase request from an account. Key attributes: order number, account reference, rep who created it, status (Draft, Pending Approval, Confirmed, Rejected, Cancelled), total amount, tax, submission date, approval date, notes.
- **OrderLineItem**: A single product entry within an order. Key attributes: product reference, quantity, unit price, revenue model (broker/wholesale), commission rate, discount, line total, promotional pricing flag.
- **VendorSubOrder**: An automatically-generated grouping of line items by vendor/brand for fulfillment routing. Key attributes: vendor/brand reference, line items, subtotal, fulfillment status.
- **OrderApproval**: A record of a manager's approval or rejection decision. Key attributes: order reference, approver reference, decision (approved/rejected), reason, decision timestamp.
- **QuickBooksExport**: A record tracking the export status of confirmed orders to QuickBooks. Key attributes: order reference, export status (Queued, Exported, Failed), attempt count, last attempt timestamp, error details.
- **ReorderSuggestion**: An AI-generated suggested reorder for an account. Key attributes: account reference, suggested products with quantities, estimated total, generation timestamp, AI model used, status (generated/converted/dismissed).

## Clarifications

1. **Revenue model default**: Each product has a configured default revenue model (broker or wholesale). When a rep adds a product to an order, the line item defaults to this model but can be overridden per line item.
2. **Commission rate source**: Commission rates come from the product's brand configuration (8-15% for broker). The line item stores the applied rate at time of order for audit purposes.
3. **Vendor sub-order creation timing**: Sub-orders are created at order submission time (not during draft editing). During draft editing, line items are grouped by vendor for display only.
4. **Approval routing**: Orders >= $5,000 are routed to the Manager assigned to the submitting Rep's territory. If no active Manager exists, the system falls back to Admin role users.
5. **QuickBooks integration method**: Initial implementation uses CSV export via a BullMQ background job running on an hourly cron schedule. Direct API integration is a future enhancement.
6. **AI reorder minimum history**: Accounts must have 6 or more orders in the past 12 months to qualify for AI reorder suggestions. The AI analyzes frequency, quantities, and seasonal patterns.
7. **Order status transitions**: Draft → Pending Approval (if >= $5,000) or Draft → Confirmed (if < $5,000). Pending Approval → Confirmed (approved) or Rejected. Any status → Cancelled (by Rep or Manager). Confirmed → Exported (after QuickBooks sync).
8. **Promotional pricing**: When a product has an active promotion (date-bounded), the promotional price is used as the default unit price. The rep can override it. Both regular and promotional prices are stored on the line item for audit.
9. **FSMA 204 traceability**: Order line items must capture Key Data Elements (KDEs) at the Critical Tracking Event (CTE) of order entry: product lot/batch if available, ship-from location, ship-to location (account address).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Rep can create and submit a multi-line order with mixed broker/wholesale items in under 3 minutes on a mobile device.
- **SC-002**: Product search returns results within 200 milliseconds at p95.
- **SC-003**: Orders >= $5,000 trigger approval notification to the assigned Manager within 30 seconds.
- **SC-004**: Manager can approve or reject an order from the approval queue in under 30 seconds.
- **SC-005**: AI reorder suggestions generate within 3 seconds at p95 for accounts with sufficient history.
- **SC-006**: Confirmed orders export to QuickBooks within 1 hour of confirmation.
- **SC-007**: All order CRUD operations are covered by immutable audit trail records.
- **SC-008**: Order API endpoints respond within 200ms at p95.
- **SC-009**: Vendor sub-orders are correctly split with 100% accuracy (no line items assigned to wrong vendor).
