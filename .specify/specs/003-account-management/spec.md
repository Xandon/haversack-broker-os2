# Feature Specification: Account Management

**Feature Branch**: `003-account-management`
**Created**: 2026-02-26
**Status**: Draft
**Input**: Account management with CRUD operations, full-text search, health scores, territory assignment, parent-child hierarchies, duplicate detection, and contact management.

## User Scenarios & Testing

### User Story 1 - Create Account from Mobile (Priority: P1)

As a territory representative, I want to create a new Account from my phone while standing in front of a prospect's store, so that I can capture account details before I leave the location.

**Implements:** FR-001, FR-005
**Why this priority**: Account creation is the foundational action — no other account features work without at least one account. Mobile-first creation is the primary use case for field reps.

**Independent Test**: Can be fully tested by creating an account via the API with required fields (name, address, contact, territory, type) and verifying persistence. Duplicate detection (FR-005) can be tested by creating accounts with similar names and verifying warnings.

**Acceptance Scenarios**:

1. **Given** a Rep is authenticated and has the Rep, Manager, or Admin role, **When** the Rep submits the new account form with all required fields (account name, physical address, primary contact name, primary contact phone, primary contact email, territory assignment, account type), **Then** the system persists the Account record and returns a confirmation within 3 seconds.
2. **Given** a Rep submits the new account form with the account name field blank, **When** the Rep submits, **Then** the system returns a validation error on the account name field and does not persist the record.
3. **Given** a Rep creates an Account with a territory assignment outside the Rep's assigned territories, **When** the Rep submits, **Then** the system returns a warning indicating the territory mismatch and requires confirmation before persisting.
4. **Given** a Rep enters an account name "Pacific Bistro" and an account named "Pacific Bistros" already exists in the same tenant, **When** the Rep proceeds past the name field, **Then** the system returns a duplicate warning listing similar accounts with match confidence percentages.
5. **Given** a Rep is shown a duplicate warning with 1 potential match, **When** the Rep confirms "Create Anyway," **Then** the system persists the new account and logs the duplicate override decision in the audit trail.

---

### User Story 2 - View Account Detail (Priority: P1)

As a territory representative, I want to view all details about an Account on a single page, so that I can prepare for a meeting without switching between multiple screens.

**Implements:** FR-002, FR-004, FR-006
**Why this priority**: The detail view is the most frequently accessed screen — reps use it before every meeting. It aggregates contacts, activities, orders, opportunities, health score, and parent-child hierarchy.

**Independent Test**: Can be fully tested by creating an account with contacts and then retrieving the detail endpoint, verifying all sections are populated. Parent-child hierarchy can be tested by linking accounts and verifying roll-up metrics.

**Acceptance Scenarios**:

1. **Given** a Rep requests an existing Account's detail, **When** the request is processed, **Then** the system returns all associated contacts, the 20 most recent activities (if any), the 10 most recent orders (if any), and any open opportunities within 2 seconds (p95).
2. **Given** a Rep requests an Account detail for an account with zero orders, **When** the response is returned, **Then** the orders section contains an empty array (not null) and the response includes metadata indicating zero orders.
3. **Given** a Rep views a parent Account with 3 child accounts, **When** the detail is loaded, **Then** the response includes aggregated order count, total revenue, and last activity date across all child accounts.
4. **Given** an Account has a health score that has been calculated, **When** the detail is loaded, **Then** the response includes the health score (0-100), score breakdown by factor, and last calculation timestamp.
5. **Given** an Account was just created and has no health score yet, **When** the detail is loaded, **Then** the health score field is null with a status indicating "pending calculation."

---

### User Story 3 - Search Accounts (Priority: P1)

As a territory representative, I want to search for accounts by name, contact, phone, or territory, so that I can quickly find the account I need before a meeting.

**Implements:** FR-003
**Why this priority**: Search is the primary navigation path — reps use it dozens of times daily to locate accounts before calls and meetings.

**Independent Test**: Can be fully tested by creating several accounts and searching by various fields, verifying results are ranked by relevance and returned within 200ms at p95.

**Acceptance Scenarios**:

1. **Given** a Rep submits a search query with at least 3 characters, **When** the search is processed, **Then** the system returns matching Account results ranked by relevance within 200 milliseconds at the 95th percentile.
2. **Given** a Rep searches for a partial phone number "503-555," **When** results are returned, **Then** all displayed accounts contain a contact with a phone number matching the partial input.
3. **Given** a Rep searches and zero results match, **When** the response is returned, **Then** the system returns an empty results array with a total count of 0.
4. **Given** a Rep submits a search query with fewer than 3 alphanumeric characters, **When** the search is processed, **Then** the system returns a validation error requiring at least 3 alphanumeric characters.

---

### User Story 4 - Manage Parent-Child Hierarchies (Priority: P2)

As an administrator, I want to set up parent-child Account hierarchies (e.g., a restaurant group with individual locations), so that managers can see aggregated metrics across related accounts.

**Implements:** FR-004
**Why this priority**: Parent-child hierarchies enable enterprise account management. While important, most reps work with individual accounts day-to-day.

**Independent Test**: Can be tested by creating a parent account, linking child accounts, and verifying roll-up metrics are correctly aggregated.

**Acceptance Scenarios**:

1. **Given** an Admin or Manager edits a child Account and sets its parent_account_id to an existing account, **When** the save is processed, **Then** the child appears in the parent's child accounts list.
2. **Given** a parent Account has child accounts with order data, **When** the parent is retrieved, **Then** roll-up metrics (total revenue, order count, last activity date) include data from all children.
3. **Given** a user attempts to create a circular hierarchy (A -> B -> A), **When** the save is processed, **Then** the system rejects the update with a validation error.
4. **Given** a child Account is moved to a different parent, **When** the save is processed, **Then** both the old and new parent's roll-up metrics are recalculated.

---

### User Story 5 - Account Health Scores (Priority: P2)

As a manager, I want to see health scores for all accounts so I can identify at-risk accounts and prioritize rep activities.

**Implements:** FR-006
**Why this priority**: Health scores drive proactive account management. The nightly batch calculation ensures scores are always current without impacting API performance.

**Independent Test**: Can be tested by creating accounts with varying activity patterns and running the health score calculation, then verifying scores reflect the weighted factors.

**Acceptance Scenarios**:

1. **Given** an Account has had no logged activity in 45 days, **When** the health score is recalculated (nightly batch at 02:00 UTC), **Then** the account's health score decreases by at least 15 points from its previous score.
2. **Given** a Manager requests accounts filtered by "At Risk" (health score below 40), **When** the response is returned, **Then** only accounts with a health score of 39 or below are included, sorted by score ascending.
3. **Given** the health score calculation runs, **When** it completes, **Then** the score is computed from: days since last activity (30% weight), order frequency vs. historical average (25% weight), order value trend (25% weight), and contact engagement recency (20% weight).
4. **Given** a newly created Account with no historical data, **When** the health score is first calculated, **Then** the score defaults to 50 (neutral baseline).

---

### User Story 6 - Update and Soft-Delete Accounts (Priority: P2)

As a territory representative, I want to update Account details and mark accounts as inactive, so that the account list stays clean and current.

**Implements:** FR-001, FR-002
**Why this priority**: Account updates are a daily activity, and soft-delete ensures data integrity for audit and reporting.

**Independent Test**: Can be tested by updating account fields and verifying persistence and audit trail, and by soft-deleting an account and verifying it no longer appears in standard queries.

**Acceptance Scenarios**:

1. **Given** a Rep updates an existing Account's fields, **When** the update is saved, **Then** the system persists the changes, updates the updated_at timestamp, and writes an audit trail record with old and new values.
2. **Given** a Rep soft-deletes an Account, **When** the deletion is processed, **Then** the system sets deleted_at to the current timestamp and the account no longer appears in standard list/search queries.
3. **Given** an Account has been soft-deleted, **When** an Admin retrieves it by ID with an include_deleted flag, **Then** the system returns the account with its deleted_at timestamp.

---

### User Story 7 - Manage Contacts (Priority: P2)

As a territory representative, I want to add, edit, and remove contacts linked to an Account, so that I always have current contact information for my accounts.

**Implements:** FR-002
**Why this priority**: Contacts are a core part of the account detail view. Reps need to maintain current contact information for meetings and communications.

**Independent Test**: Can be tested by creating, updating, and deleting contacts on an account and verifying the contact list on the account detail.

**Acceptance Scenarios**:

1. **Given** a Rep adds a new contact to an Account with name, phone, email, and role, **When** the save is processed, **Then** the contact is persisted and appears in the account's contact list.
2. **Given** a Rep updates a contact's email, **When** the save is processed, **Then** the change is persisted and an audit trail record is written.
3. **Given** a Rep removes a contact from an Account, **When** the deletion is processed, **Then** the contact is soft-deleted (deleted_at set) and no longer appears in the account's active contacts.
4. **Given** an Account has a primary contact designated, **When** the primary contact is removed, **Then** the system requires the Rep to designate a new primary contact or confirm leaving the account without one.

---

### Edge Cases

- **Concurrent edits**: Two reps update the same account simultaneously — the system uses optimistic concurrency (updated_at comparison) and returns a 409 Conflict if the record has been modified since the client's last read.
- **Territory reassignment**: When an account's territory changes, the account's RLS visibility changes — the old rep loses access and the new territory's rep gains access.
- **Tenant isolation**: All account queries include tenant_id filtering via RLS. Cross-tenant account access returns 404 (not 403) to prevent tenant enumeration.
- **Large result sets**: Account list and search results are paginated with cursor-based pagination (default 20, max 100 per page).
- **Health score edge cases**: Accounts with deleted_at set are excluded from health score calculation. New accounts with zero history get a baseline score of 50.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow users with Rep, Manager, or Admin role to create Account records with required fields: account name, physical address, primary contact name, primary contact phone, primary contact email, territory assignment, and account type (retail, restaurant, distributor).
- **FR-002**: The system MUST provide an Account detail endpoint returning account metadata, linked contacts, activity timeline (20 most recent), order history (10 most recent), open opportunities, and health score.
- **FR-003**: The system MUST provide full-text search across Account records by account name, contact name, phone number, email address, city, and territory, returning results ranked by relevance within 200ms at p95.
- **FR-004**: The system MUST support parent-child Account hierarchies with roll-up metrics (total revenue, order count, last activity date) visible on the parent account.
- **FR-005**: The system MUST detect potential duplicate Account records during creation by comparing account name, phone number, and address against existing records using fuzzy matching (Levenshtein distance threshold of 3 or less for names).
- **FR-006**: The system MUST calculate Account health scores (0-100) via nightly batch job at 02:00 UTC using weighted factors: days since last activity (30%), order frequency vs. historical average (25%), order value trend (25%), and contact engagement recency (20%).

### Key Entities

- **Account**: Represents a customer account (retail store, restaurant, distributor). Key attributes: name, physical address (street, city, state, zip), account type, territory assignment, parent account (optional), health score, is_active, soft-delete (deleted_at). Belongs to a tenant. Linked to a territory. May have a parent account.
- **Contact**: Represents a person at an account. Key attributes: first name, last name, phone, email, role/title, is_primary flag. Belongs to an account. Soft-deletable.
- **AccountHealthScore**: Tracks the calculated health score for an account. Key attributes: score (0-100), factor breakdown (JSON), calculated_at timestamp. One active score per account (historical scores retained).

## Clarifications

1. **Account address structure**: The physical address is stored as separate fields (street_address, city, state, zip_code) rather than a single text field, enabling city-based search (FR-003) and geographic filtering.
2. **Account type enum**: Limited to three values per PRD: `retail`, `restaurant`, `distributor`. Extensible via future migration if needed.
3. **Duplicate detection scope**: Fuzzy matching runs only within the same tenant. The check executes on the server during account creation (not real-time as-you-type) to avoid excessive database load.
4. **Health score initial value**: New accounts with no historical data receive a baseline score of 50. The first real calculation occurs on the next nightly batch run after the account has at least one activity or order.
5. **Contact limit**: No hard limit on contacts per account. The API returns all active contacts for an account (typical accounts have 1-5 contacts).
6. **Search indexing**: Full-text search uses PostgreSQL pg_trgm extension for trigram-based fuzzy matching, which is already available in the tech stack. No external search engine required.
7. **Parent-child depth**: Hierarchies are limited to 2 levels (parent -> child). Grandchild relationships are not supported to keep roll-up queries simple and performant.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Account creation via API completes within 3 seconds including duplicate detection check.
- **SC-002**: Account detail endpoint returns complete data within 2 seconds at p95.
- **SC-003**: Account search returns results within 200 milliseconds at p95 for queries of 3+ characters.
- **SC-004**: Health score nightly batch processes all accounts for a tenant within 60 seconds for up to 10,000 accounts.
- **SC-005**: All account CRUD operations produce immutable audit trail records.
- **SC-006**: Duplicate detection identifies accounts with Levenshtein distance of 3 or less with zero false negatives.
- **SC-007**: Parent account roll-up metrics are accurate to within the last nightly calculation cycle.
- **SC-008**: RLS policies enforce tenant isolation — cross-tenant queries return zero results.
