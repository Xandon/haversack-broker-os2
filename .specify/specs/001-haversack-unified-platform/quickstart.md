# Quickstart Validation: Haversack Unified Platform

**Purpose**: End-to-end validation scenarios to verify the platform works correctly after each implementation phase.
**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md)

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20 LTS
- PostgreSQL 16+ running (via Docker)
- Redis 7+ running (via Docker)
- Environment variables configured (.env from .env.example)

## Setup

```bash
# Clone and install
git clone <repo-url> && cd haversack-broker-os
cp .env.example .env

# Start infrastructure
docker compose up -d postgres redis

# Install dependencies
npm install

# Run migrations and seed
npx prisma migrate deploy
npx prisma db seed

# Start services
npm run dev
```

## Validation Scenarios

### Scenario 1: Account Creation with Duplicate Detection (FR-001, FR-002, FR-003, US-1)

**Given** the system is running and a user with Rep role is authenticated,
**When** the Rep navigates to "New Account" and fills in:
- Account Name: "Pacific Bistro Test"
- Address: "123 Test St, Portland, OR 97201"
- Primary Contact: "Jane Doe"
- Territory: "Portland Metro"
- Account Type: "Restaurant"

**Then** verify:
- [ ] Account persists and confirmation appears within 3 seconds
- [ ] Account appears in search results when searching "Pacific Bistro"
- [ ] Creating a second account named "Pacific Bistros Test" triggers a duplicate warning with confidence percentage
- [ ] Submitting with account name blank shows field-level validation error

**Check**: `GET /api/v1/accounts?search=Pacific+Bistro` returns the created account.

---

### Scenario 2: Account Detail and Hierarchy (FR-004, FR-005, FR-006, US-2)

**Given** Account "Pacific Bistro Test" exists with 3 child accounts, 5 activities, and 2 orders,
**When** the Rep navigates to the parent account detail page,
**Then** verify:
- [ ] Page loads within 2 seconds
- [ ] Contacts, activity timeline, orders, opportunities, and health score sections are visible
- [ ] Parent account shows aggregated metrics (order count, total revenue, last activity date) from children
- [ ] Health score shows "Health score calculating..." if account was created within 24 hours

**Check**: `GET /api/v1/accounts/:id` returns all sections with roll-up metrics.

---

### Scenario 3: Full-Text Search (FR-007, US-3)

**Given** 100+ Account records exist in the database,
**When** the Rep types "port" into the global search bar and waits 300ms,
**Then** verify:
- [ ] Results appear within 200 milliseconds
- [ ] Results are ranked by relevance
- [ ] Searching "503-555" returns accounts with contacts matching that phone prefix
- [ ] Searching "xyznonexistent" returns "No accounts found" message

**Check**: `GET /api/v1/accounts/search?q=port` responds in under 200ms.

---

### Scenario 4: Activity Quick-Log (FR-008, FR-009, FR-010, US-4)

**Given** a Rep is authenticated and viewing an Account,
**When** the Rep opens the quick-log form, selects "Visit," accepts defaults, and taps "Save,"
**Then** verify:
- [ ] Activity persists within 2 seconds
- [ ] Total time from form open to confirmation is under 60 seconds
- [ ] Activity appears on the Account timeline in reverse chronological order
- [ ] Selecting "Demo" type shows product-specific fields (product demoed, quantity, feedback)

**Check**: `POST /api/v1/activities` returns 201 with the created activity.

---

### Scenario 5: Order Entry with Multi-Vendor Splitting (FR-013, FR-014, FR-015, FR-016, FR-017, US-6)

**Given** a Rep is authenticated and products from 3 brands exist,
**When** the Rep creates an order with 10 line items across 3 brands (mixed broker/wholesale),
**Then** verify:
- [ ] Product search returns results within 200ms showing availability and pricing
- [ ] Promotional pricing is applied when a product has an active promo
- [ ] 3 vendor sub-orders are created with correct line items per vendor
- [ ] If order total >= $5,000, status is "Pending Approval" and manager is notified within 30 seconds
- [ ] Manager can approve or reject with reason

**Check**: `POST /api/v1/orders` creates the order; `GET /api/v1/orders/:id` shows vendor sub-orders.

---

### Scenario 6: Commission Calculation (FR-023, FR-024, FR-025, US-10)

**Given** a confirmed broker order exists with a $12,000 line item at 10% base rate, 1.0x territory modifier, tier 2 (+1%),
**When** commission calculation runs,
**Then** verify:
- [ ] Commission = $1,320 (12,000 x 11% x 1.0)
- [ ] Monthly statement shows per-order breakdown with rate and amount
- [ ] Manager can approve the statement
- [ ] Admin can export approved statements to accounting format

**Check**: `GET /api/v1/commissions/statements/:period` returns correct amounts.

---

### Scenario 7: Data Import (FR-031, FR-032, US-12)

**Given** an Admin is authenticated,
**When** the Admin uploads a 200-row CSV with 5 invalid rows,
**Then** verify:
- [ ] Preview shows "200 rows parsed, 195 valid, 5 errors" with field-level error descriptions
- [ ] "Import Valid Rows" creates 195 records and skips 5
- [ ] Downloadable error log is available
- [ ] Uploading a file > 50 MB returns a descriptive error message

**Check**: `POST /api/v1/admin/import/preview` returns validation results; `POST /api/v1/admin/import/execute` creates records.

---

### Scenario 8: User Management and RBAC (FR-029, FR-030, US-12)

**Given** an Admin is authenticated,
**When** the Admin changes a user's role from "Rep" to "Manager,"
**Then** verify:
- [ ] Permission changes take effect within 60 seconds without re-authentication
- [ ] Deactivating a user invalidates sessions within 15 seconds
- [ ] A Viewer role user cannot create accounts or orders (403 Forbidden)

**Check**: `PUT /api/v1/admin/users/:id` updates role; verify permission enforcement on protected endpoints.

---

### Scenario 9: AI Features (FR-018, FR-035, FR-036, US-7, US-14)

**Given** an Account has 8 orders in the past 12 months,
**When** the Rep views the Account,
**Then** verify:
- [ ] "Suggested Reorder" card appears within 3 seconds with products and estimated total
- [ ] Rep can modify the suggestion and submit as a new order
- [ ] "Prepare Meeting Brief" returns a labeled "AI-Generated" brief within 3 seconds
- [ ] All AI content is editable
- [ ] When AI service is unavailable, "AI service temporarily unavailable" message appears with no stale content

**Check**: `GET /api/v1/ai/reorder-suggestions/:accountId` returns suggestions; `POST /api/v1/ai/meeting-brief/:accountId` returns brief.

---

### Scenario 10: Dashboard and Reporting (FR-026, FR-027, FR-028, US-11)

**Given** seeded data exists with known values,
**When** a Rep opens "My Dashboard,"
**Then** verify:
- [ ] Dashboard loads within 3 seconds
- [ ] Current-month revenue, trailing-12-month revenue, activity count, pipeline value, and commission figures are displayed
- [ ] Clicking critical health count navigates to filtered account list
- [ ] Manager dashboard shows team rankings sorted by revenue
- [ ] Custom report export to XLSX completes within 10 seconds for 500 records

**Check**: `GET /api/v1/dashboards/rep` and `GET /api/v1/dashboards/manager` return correct KPIs.

---

## Smoke Test Checklist

After each deployment, verify these critical paths:

- [ ] Authentication: Login with valid credentials returns JWT tokens
- [ ] Authorization: Each of the 5 roles can only access permitted endpoints
- [ ] Account CRUD: Create, read, update, delete an account (FR-001, FR-002)
- [ ] Search: Full-text search returns results under 200ms (FR-007)
- [ ] Order: Create and confirm a multi-line order (FR-013, FR-014)
- [ ] Commission: Verify deterministic calculation produces correct amount (FR-023)
- [ ] Import: Upload and preview a CSV file (FR-031)
- [ ] AI: Request a reorder suggestion and verify labeled response (FR-018, FR-035)
- [ ] Audit: Verify create/update operations write audit trail entries (NFR-014)
- [ ] RLS: Verify cross-tenant data access is blocked (NFR-008)
