# Feature Specification: Admin & Data Import

**Feature Branch**: `009-admin-import`
**Created**: 2026-02-27
**Status**: Draft
**Input**: PRD FR-026, FR-027, FR-029, US-010

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Management (Priority: P0)

As an administrator, I want to create, edit, deactivate, and assign roles to user accounts so that I can control who has access to the platform and what they can do.

**Why this priority**: User management is foundational — without it, the admin cannot onboard new sales reps, adjust permissions, or revoke access for departed employees. This is a prerequisite for secure system operation.

**Independent Test**: Can be fully tested by creating a user, editing their role, deactivating them, and verifying permission changes propagate — delivers user lifecycle management value.

**Acceptance Scenarios**:

1. **Given** an Admin navigates to the user management page, **When** the Admin creates a new user with email, name, role (Rep), and territory assignment, **Then** the system creates the user account with a hashed password, sends a welcome notification, and the new user can authenticate immediately.
2. **Given** an Admin changes a user's role from "Rep" to "Manager," **When** the Admin saves the change, **Then** the user's permissions update to the Manager role's permission set within 60 seconds, and the user gains access to Manager-only features (team dashboard, approval queue) on their next navigation action without re-authentication. (AC-026a)
3. **Given** an Admin deactivates a user account, **When** the Admin confirms the deactivation, **Then** the system invalidates all active sessions for that user within 15 seconds, the user is redirected to the login page on their next request, and the user cannot authenticate until reactivated. (AC-026b)
4. **Given** an Admin views the user list, **When** the Admin filters by role or status, **Then** the system returns the filtered list with pagination within 200ms.
5. **Given** an Admin attempts to deactivate their own account, **When** the system processes the request, **Then** the system rejects the operation with "Cannot deactivate your own account."

---

### User Story 2 - CSV/Excel Data Import (Priority: P0)

As an administrator, I want to import Account, Contact, Product, and Order data from CSV and Excel files validated against the Layout of Truth, so that I can bulk-load data during initial migration and ongoing data updates.

**Why this priority**: Bulk data import is critical for initial system migration from FileMaker and for ongoing data maintenance. Without it, all data entry must be manual.

**Independent Test**: Can be fully tested by uploading a CSV file with mixed valid/invalid rows and verifying the preview, selective import, and error reporting — delivers bulk data loading value.

**Acceptance Scenarios**:

1. **Given** an Admin uploads a CSV file containing 200 Account records where 5 rows have missing required fields, **When** the system processes the file, **Then** the pre-import preview displays: "200 rows parsed, 195 valid, 5 errors" with each error row highlighted and the specific validation failure described (e.g., "Row 47: account_name is required"). (AC-027a)
2. **Given** an Admin reviews the pre-import preview and clicks "Import Valid Rows," **When** the import executes, **Then** the system creates or updates 195 Account records, skips the 5 error rows, generates an import summary report with counts and a downloadable error log, and writes audit trail entries for all created/updated records. (AC-027b)
3. **Given** an Admin uploads a CSV file exceeding 50 MB, **When** the system receives the file, **Then** the system rejects the upload with "File size exceeds the 50 MB limit — please split the file into smaller batches."
4. **Given** an Admin uploads a CSV containing columns not in the Layout of Truth, **When** the system parses the file, **Then** the system ignores unmapped columns and displays a warning listing the unrecognized column names.
5. **Given** an Admin uploads a CSV that would create duplicate Account records, **When** the system validates the data, **Then** duplicates are flagged using fuzzy matching (same as FR-005) and included in the error report with suggested merge targets.
6. **Given** an Admin uploads an Excel (XLSX) file with multiple sheets, **When** the system processes the file, **Then** the system uses the first sheet for import and warns if additional sheets are present.

---

### User Story 3 - Data Quality Scorecard (Priority: P1)

As an administrator or manager, I want to view a data quality scorecard that measures completeness and health of the database, so that I can identify data hygiene issues and track improvement over time.

**Why this priority**: Data quality visibility helps administrators maintain system integrity and prioritize cleanup efforts. It depends on having data in the system first (hence P1 after import).

**Independent Test**: Can be fully tested by running the nightly job and verifying the scorecard displays correct metrics — delivers data quality visibility.

**Acceptance Scenarios**:

1. **Given** the nightly data quality job runs at 03:00 UTC, **When** the job completes, **Then** the data quality scorecard displays updated percentages for each metric and an overall composite score (weighted average), visible to Admin and Manager roles. (AC-029a)
2. **Given** the scorecard shows "68% of Accounts have complete required fields," **When** an Admin clicks on that metric, **Then** the system displays a filtered list of Account records missing 1 or more required fields, with the missing fields highlighted per row. (AC-029b)
3. **Given** the scorecard is accessed by a Rep role user, **When** the system checks permissions, **Then** the request is denied with 403 Forbidden.

---

### User Story 4 - Import History & Audit (Priority: P1)

As an administrator, I want to view a history of all data imports with their results, so that I can track what data has been loaded and troubleshoot import issues.

**Why this priority**: Import audit trail is essential for accountability and debugging, but is secondary to the core import functionality.

**Independent Test**: Can be fully tested by performing an import and verifying the history record appears with correct metadata — delivers import traceability.

**Acceptance Scenarios**:

1. **Given** an Admin navigates to the import history page, **When** the page loads, **Then** the system displays a list of past imports with: date, entity type, filename, row counts (total, created, updated, skipped, errors), and the user who performed the import.
2. **Given** an Admin clicks on a specific import record, **When** the detail loads, **Then** the system shows the full error log with row numbers and validation failures, and offers a download link for the original error CSV.

---

### User Story 5 - Layout of Truth Management (Priority: P2)

As an administrator, I want the system to maintain canonical field definitions (Layout of Truth) for each importable entity, so that CSV validation is consistent and predictable.

**Why this priority**: The Layout of Truth is infrastructure that supports the import feature. It can be hardcoded initially and made configurable later.

**Independent Test**: Can be fully tested by querying the Layout of Truth API for an entity and verifying the field definitions match the Prisma schema — delivers validation reference data.

**Acceptance Scenarios**:

1. **Given** an Admin requests the Layout of Truth for the "Account" entity, **When** the API responds, **Then** it returns a list of field definitions including: field name, data type, required/optional, validation rules, and allowed values.
2. **Given** the system validates an import row against the Layout of Truth, **When** a field value violates a validation rule (e.g., email format, enum value), **Then** the error message includes the field name, expected format, and actual value.

---

### Edge Cases

- What happens when two admins import data for the same entity simultaneously? The system processes imports sequentially per entity type using a BullMQ queue to prevent race conditions.
- How does the system handle CSV files with different encodings (UTF-8 BOM, Latin-1)? The system auto-detects encoding and normalizes to UTF-8 before parsing.
- What happens if the import job crashes mid-import? The system uses database transactions — all-or-nothing per batch of rows. Partial imports are rolled back and the import is marked as failed.
- What happens when a user's role is changed while they have an active session? The JWT access token continues with old permissions until it expires (max 15 minutes). The refresh token check enforces new permissions.
- What if the Admin tries to create a user with an email that already exists? The system returns a validation error: "A user with this email already exists."
- What happens if an import CSV has more than 10,000 rows? The system processes in batches of 500 rows within a single import job, with progress tracking.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-026**: The system MUST provide Admin-only user management allowing creation, editing, deactivation, and role assignment (Admin, Manager, Rep, Logistics, Viewer) for user accounts, with role changes taking effect within 60 seconds without requiring the affected user to log out.
- **FR-027**: The system MUST support CSV and Excel (XLSX) data import for Account, Contact, Product, and Order entities, validated against the Layout of Truth, with a pre-import preview showing row count, validation errors per row, and a summary of changes (new records, updates, skipped).
- **FR-029**: The system MUST maintain a data quality scorecard measuring: percentage of Accounts with complete required fields, percentage of Contacts with valid email format, percentage of Products with images, duplicate Account count, and stale Account count (no activity in 90+ days), recalculated nightly at 03:00 UTC.

### Key Entities

- **User**: System user account with email, name, hashed password, role (enum: admin, manager, rep, logistics, viewer), territory assignment, active/inactive status, and timestamps.
- **DataImport**: Record of an import operation with entity type, filename, file size, row counts (total, valid, error, created, updated, skipped), status (pending, processing, completed, failed), error log, and the admin who initiated it.
- **DataQualityScore**: Nightly snapshot of data quality metrics with individual metric percentages and a composite weighted score.
- **LayoutOfTruth**: Canonical field definitions per entity type — field name, data type, required/optional, validation rules, allowed values. Initially hardcoded from Prisma schema, can be made configurable later.

## Assumptions

- The User entity already exists in the Prisma schema from Feature 1 (Foundation). This feature extends it with management CRUD endpoints.
- Territory assignment for users references the existing Territory model.
- The Layout of Truth is derived from the Prisma schema and Zod validation schemas already defined for each entity.
- Excel (XLSX) parsing will use a library like `xlsx` or `exceljs` — the specific library will be chosen during planning.
- File uploads for import are limited to 50 MB per FR-032.
- Import operations run as BullMQ background jobs to avoid blocking the API.

## Clarifications

1. **Role change propagation**: Role changes take effect on the next JWT refresh (max 15 minutes) rather than requiring real-time session invalidation. The refresh token endpoint checks the current role from the database. This satisfies the "within 60 seconds" requirement since access tokens expire every 15 minutes.
2. **Session invalidation on deactivation**: When a user is deactivated, their refresh tokens are invalidated immediately in the database. Active access tokens will fail on the next API call because the auth middleware checks `active` status. This achieves the "within 15 seconds" SLA.
3. **Layout of Truth source**: The Layout of Truth is generated programmatically from Prisma schema introspection combined with Zod schema definitions. It is not a separate database table but a computed API response.
4. **Import job processing**: Imports run as BullMQ jobs in the worker process. Large files are processed in batches of 500 rows. Each batch is wrapped in a database transaction. Failed batches do not affect successfully imported batches.
5. **Duplicate detection during import**: Uses the same Levenshtein distance fuzzy matching already implemented in the account service (FR-005). Duplicates are flagged in the preview, not during the actual import execution.
6. **Data quality scorecard metrics weighting**: Composite score uses equal weighting (20% each) for the 5 metrics: account completeness, contact email validity, product images, duplicate count (inverse), stale account count (inverse).
7. **User password handling on creation**: Admin-created users receive a system-generated temporary password. The system does not send emails in this feature scope — password delivery is out of scope (handled by email feature later).
8. **Excel multi-sheet handling**: Only the first sheet is imported. Additional sheets generate a warning but do not cause errors.
9. **Import entity matching for updates**: For imports that update existing records, matching is done by a primary identifier field: `id` (UUID) if present in the CSV, otherwise by `name` + `territory` for Accounts, `email` for Contacts, `sku` for Products, and `order_number` for Orders.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can create, edit, deactivate, and reactivate users with any of the 5 roles, with changes reflected within 60 seconds.
- **SC-002**: CSV import of 1,000 Account records completes within 30 seconds with accurate validation and error reporting.
- **SC-003**: Pre-import preview accurately identifies 100% of validation errors before import execution.
- **SC-004**: Data quality scorecard updates nightly and displays correct metrics within 5 seconds of page load.
- **SC-005**: All import operations produce immutable audit trail records.
- **SC-006**: RBAC enforcement: only Admin role can access user management and data import; Admin and Manager can view data quality scorecard.
