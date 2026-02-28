# Feature Specification: Account Forms and Contacts (F-002c)

**Feature Branch**: `018-account-forms`
**Created**: 2026-02-28
**Status**: Draft
**FR**: FR-035
**Priority**: P0 | **Complexity**: M | **Epic**: 2
**Depends on**: F-000 (Design System), F-002a (Account List)

## User Scenarios & Testing

### User Story 1 - Create New Account (Priority: P1)

A sales rep navigates to /accounts/new to create a new account. The form collects all required fields (name, address, territory, account type) plus an inline primary contact. On name field blur, the system checks for duplicates and warns the rep if a similar account exists. The rep can choose to "Create Anyway" or view the existing account. On successful save, the rep is redirected to the new account's detail page with a success toast.

**Why this priority**: Account creation is a foundational CRM operation — reps cannot work without creating accounts.

**Independent Test**: Navigate to /accounts/new, fill in all required fields, submit, and verify redirect to the new account detail page.

**Acceptance Scenarios**:

1. **Given** a Rep opens /accounts/new, **When** the Rep fills in all required fields (name, street address, city, state, zip, territory, account type, primary contact first/last name) and clicks "Save," **Then** the system validates all fields against the Zod schema, submits the data via POST /api/accounts, and navigates to the new account's detail page with a success toast notification.

2. **Given** a Rep types an account name and blurs the name field, **When** the system detects a potential duplicate (Levenshtein distance of 3 or less), **Then** a duplicate warning dialog appears listing matching account(s) with name, territory, and a "View Existing" link, and the Rep can choose "Create Anyway" or cancel.

3. **Given** a Rep with territory assignments opens /accounts/new, **When** the territory dropdown loads, **Then** it shows only territories assigned to that Rep. **Given** a Manager or Admin opens /accounts/new, **When** the territory dropdown loads, **Then** it shows all territories.

4. **Given** a Rep submits the form with invalid data (e.g., missing required field, invalid email format), **When** validation runs, **Then** inline field-level error messages appear on the invalid fields and the form is not submitted.

---

### User Story 2 - Edit Existing Account (Priority: P1)

A sales rep navigates to /accounts/[id]/edit to modify an existing account's details. The form pre-populates with the current account data. The rep can change any field and save. On successful save, the rep is redirected back to the account detail page with a success toast.

**Why this priority**: Account editing is equally critical — data corrections and updates happen daily.

**Independent Test**: Navigate to /accounts/[id]/edit, verify form is pre-populated, change a field, submit, and verify redirect back to detail page.

**Acceptance Scenarios**:

1. **Given** a Rep navigates to /accounts/[id]/edit, **When** the page loads, **Then** the form is pre-populated with the account's current data (name, address, territory, type, parent account).

2. **Given** a Rep modifies the account name and clicks "Save," **When** the system processes the update, **Then** it submits via PUT /api/accounts/:id, navigates to the account detail page, and displays a success toast.

3. **Given** a Rep edits an account and clicks "Cancel," **When** the cancel action fires, **Then** the system navigates back to the account detail page without saving changes.

4. **Given** a Rep changes the account name to one that matches an existing account, **When** the name field blurs, **Then** the duplicate warning dialog appears (same behavior as create).

---

### Edge Cases

- What happens when the backend returns a 409 conflict (duplicate detected server-side)? The form displays an error toast with the duplicate info.
- What happens when the network request fails? The form displays an error toast and remains submittable.
- What happens when a Rep navigates to /accounts/[id]/edit for an account in another territory? The backend returns 403 and the UI shows an error state.
- What happens when /accounts/[id]/edit is loaded for a deleted account? The backend returns 404 and the UI shows a "not found" state.
- What happens when parent account is set to create a circular reference? The backend rejects with a validation error displayed on the field.

## Requirements

### Functional Requirements

- **FR-035a**: System MUST display an account creation form at /accounts/new using React Hook Form with Zod validation matching the shared `createAccountSchema`.
- **FR-035b**: System MUST display an account edit form at /accounts/[id]/edit pre-populated with existing account data, using `updateAccountSchema` for validation.
- **FR-035c**: System MUST check for duplicate accounts on name field blur via GET /api/accounts/check-duplicates and display a warning dialog listing matches.
- **FR-035d**: Territory dropdown MUST be scoped to the user's assigned territories for Rep role, and show all territories for Manager/Admin roles.
- **FR-035e**: System MUST navigate to the account detail page on successful create or update with a success toast notification.
- **FR-035f**: System MUST display inline field validation errors on blur and on submit attempt.
- **FR-035g**: The account form MUST include an inline primary contact section (first name, last name, email, phone, title) during account creation.

### Key Entities

- **Account**: Core CRM entity — name, type (retail/restaurant/distributor), address (street, city, state, zip), territory assignment, optional parent account, active status.
- **Contact**: Person at an account — first name, last name, email, phone, title, isPrimary flag. Inline during create; CRUD via modal on detail (already implemented in F-002b).
- **Territory**: Geographic sales region — id, name, region. Reps are assigned specific territories.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A Rep can create a new account with all required fields in under 90 seconds.
- **SC-002**: Duplicate detection fires within 500ms of name field blur.
- **SC-003**: Form validation catches 100% of invalid inputs before API submission.
- **SC-004**: Edit form loads with pre-populated data within 2 seconds.

## Clarifications

- **Territory scoping**: The `useTerritories` hook already fetches all territories. For Rep role scoping, we will filter the territories client-side based on the user's `territories` array from the auth context. Managers/Admins see the full unfiltered list.
- **Contact CRUD on detail page**: Already fully implemented in F-002b's ContactsTab component. F-002c only adds the inline primary contact section on the create form.
- **Duplicate check timing**: Fires on name field blur only, not on every keystroke. Uses the existing GET /api/accounts/check-duplicates endpoint.
- **Parent account selector**: Will use a simple searchable dropdown (search-combobox pattern) querying existing accounts. Optional field.
- **skipDuplicateCheck**: When the user clicks "Create Anyway" in the duplicate warning dialog, the form resubmits with `skipDuplicateCheck: true`.
