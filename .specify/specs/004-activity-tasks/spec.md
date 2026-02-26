# Feature Specification: Activity & Task Management

**Feature Branch**: `004-activity-tasks`
**Created**: 2026-02-26
**Status**: Draft
**Input**: FR-007, FR-008, FR-009, FR-010 — Activity logging, timeline, task management, email record tracking

## User Scenarios & Testing

### User Story 1 - Quick Activity Logging (Priority: P1)

As a **territory representative**, I want to log a visit, call, or demo against an account in under 60 seconds, so that I can record my activity immediately without it becoming a burden.

**Why this priority**: Activity logging is the core interaction reps perform daily. Every other feature (timeline, metrics, health score) depends on activity data existing. Without fast logging, reps won't bother and the system loses its primary data source.

**Independent Test**: Can be fully tested by creating an activity via the API with pre-populated fields and verifying it persists in under 2 seconds. Delivers immediate value as the foundation for all activity tracking.

**Acceptance Scenarios**:

1. **Given** a Rep is authenticated and has access to an account, **When** the Rep submits a quick-log form with activity type "Visit" and the pre-populated account, **Then** the system persists the activity record in under 2 seconds and returns the created activity with all fields. (AC-007a)
2. **Given** a Rep selects "Demo" activity type, **When** the activity is created, **Then** the system accepts associated demo details (product ID, quantity sampled, buyer feedback) and persists them linked to the activity. (AC-007b)
3. **Given** a Rep creates an activity, **When** the activity is less than 15 minutes old, **Then** the Rep can update the activity (e.g., change account, fix notes). After 15 minutes, only a Manager or Admin can edit.
4. **Given** a Rep submits an activity with type "Demo" but no product association, **When** validation runs, **Then** the system returns a 400 error: "Demo activities require at least one product."
5. **Given** an activity is created or updated, **When** the operation completes, **Then** an immutable audit trail record is written.

---

### User Story 2 - Activity Timeline (Priority: P1)

As a **territory representative**, I want to view a chronological timeline of all activities on an account, so that I can prepare for meetings and see the full engagement history at a glance.

**Why this priority**: The timeline is the primary way reps consume activity data. It surfaces logged activities, linked emails, and system events, making the account detail page the single source of truth for account engagement.

**Independent Test**: Can be tested by querying the timeline endpoint for an account with multiple activity types and verifying correct reverse-chronological ordering and pagination.

**Acceptance Scenarios**:

1. **Given** an account has 50 activity records, **When** a Rep requests the activity timeline, **Then** the system returns the first 20 items in reverse chronological order with cursor-based pagination metadata. (AC-008a)
2. **Given** a Rep requests the next page of the timeline using a cursor, **When** the API responds, **Then** it returns the next 20 items and responds within 500ms.
3. **Given** a Rep applies a filter for activity type "Visit," **When** the filtered timeline loads, **Then** only visit activities are returned and the response includes the filtered total count. (AC-008b)
4. **Given** a Rep filters by date range, **When** the timeline loads, **Then** only activities within the specified range are returned.
5. **Given** an account has zero activities, **When** the timeline is requested, **Then** an empty array is returned with total count 0.

---

### User Story 3 - Task Management (Priority: P1)

As a **territory representative**, I want to create and manage tasks with due dates, priorities, and account associations, so that I never miss a follow-up.

**Why this priority**: Task management directly supports the sales workflow. Reps need structured follow-up tracking to maintain account engagement. This is a P0 requirement in the PRD (US-012).

**Independent Test**: Can be tested by creating tasks with various priorities and associations, querying the task list with filters, and verifying sort order (overdue first, then by due date).

**Acceptance Scenarios**:

1. **Given** a Rep creates a task with due date, priority "High," and an account association, **When** the task is saved, **Then** the system persists the task with all fields and returns it with a generated ID.
2. **Given** a Rep views their task list, **When** tasks are returned, **Then** overdue tasks (due date in the past, status not "completed") appear first, sorted by due date ascending, followed by upcoming tasks sorted by due date ascending. (AC-009b)
3. **Given** a Manager creates a task assigned to a different Rep, **When** the task is saved, **Then** the assignee's task list includes the new task.
4. **Given** a Rep sets a due date in the past, **When** the task is created, **Then** the system allows it but marks it as immediately overdue (status remains "pending").
5. **Given** a Rep marks a task as completed, **When** the update is saved, **Then** the task status changes to "completed" with a completed_at timestamp and an audit trail record is written.
6. **Given** a task is associated with an account, **When** the account's activity timeline is queried, **Then** task events (created, completed) appear in the timeline.

---

### User Story 4 - Task Reminders (Priority: P2)

As a **territory representative**, I want to receive reminders before tasks are due, so that I can act on them in time.

**Why this priority**: Reminders are valuable but depend on task creation (US-3) existing first. The notification infrastructure (in-app + email) is a separate delivery mechanism; the core value is the reminder scheduling logic.

**Independent Test**: Can be tested by creating a task with a future due date, advancing time, and verifying that reminder jobs are enqueued at the correct offsets (24h and 1h before due).

**Acceptance Scenarios**:

1. **Given** a task is created with due date 2026-03-15T10:00Z, **When** the system processes the task, **Then** two reminder jobs are scheduled: one for 2026-03-14T10:00Z (24h before) and one for 2026-03-15T09:00Z (1h before). (AC-009a)
2. **Given** a reminder job fires, **When** the task is still pending, **Then** the system creates an in-app notification record for the assignee and enqueues an email notification.
3. **Given** a reminder job fires, **When** the task has already been completed, **Then** the reminder is skipped (no notification created).
4. **Given** a task's due date is updated, **When** the update is saved, **Then** existing reminder jobs are cancelled and new ones are scheduled for the updated due date.
5. **Given** a task's due date is less than 1 hour from now, **When** the task is created, **Then** only the 1-hour reminder is scheduled (24-hour reminder is skipped as it's already past).

---

### User Story 5 - Email Record Tracking (Priority: P2)

As a **territory representative**, I want emails sent to and received from contacts to appear in the account activity timeline, so that I have a complete communication history.

**Why this priority**: Email tracking completes the activity picture but depends on email infrastructure (Microsoft Graph API) that will be built in a later feature. This story covers the data model and auto-linking logic, not the email sending/receiving infrastructure.

**Independent Test**: Can be tested by creating email records via the API and verifying they auto-link to contacts/accounts by email address matching and appear in the timeline.

**Acceptance Scenarios**:

1. **Given** an outbound email record is created for "buyer@pacificbistro.com," **When** the system processes the email, **Then** it matches the recipient against Contact email fields and links the email to the matching Contact and its parent Account.
2. **Given** an inbound email arrives from an address not matching any Contact, **When** the system processes it, **Then** the email is stored with status "unmatched" and is queryable via an unmatched emails endpoint.
3. **Given** an email record is linked to a contact, **When** the account's activity timeline is queried, **Then** the email appears in the timeline with direction (inbound/outbound) and status.
4. **Given** an email open event is received (tracking pixel loaded), **When** the system processes it, **Then** the email record's status updates to "opened" with the opened_at timestamp.

---

### User Story 6 - Activity Metrics (Priority: P3)

As a **sales manager**, I want to see activity counts and trends per rep and per account, so that I can identify engagement patterns and coach underperforming reps.

**Why this priority**: Metrics are a read-only aggregation of existing data. They provide management value but are not required for daily rep workflows.

**Independent Test**: Can be tested by creating a set of activities across multiple reps/accounts, then querying the metrics endpoint and verifying correct aggregation.

**Acceptance Scenarios**:

1. **Given** a Manager requests activity metrics for a date range, **When** the API responds, **Then** it returns per-rep activity counts grouped by type (visit, call, email, demo, sampling).
2. **Given** a Manager requests account-level metrics, **When** the API responds, **Then** it returns activity counts per account with the most recent activity date.
3. **Given** no activities exist in the requested date range, **When** metrics are queried, **Then** the system returns zero counts (not an error).

---

### Edge Cases

- Activity with very long notes (>10,000 characters): System truncates at 10,000 characters and returns a validation warning.
- Task assigned to a deactivated user: System rejects the assignment with a 400 error "Cannot assign task to inactive user."
- Task assignee is deactivated after task creation: Task remains assigned; a background job reassigns open tasks from deactivated users to their manager.
- Concurrent activity edits within the 15-minute window: Optimistic concurrency via version field; second writer gets 409 Conflict.
- Activity created for a soft-deleted account: System returns 404 "Account not found."
- Email record with multiple matching contacts (same email on different contacts): System links to all matching contacts within the same tenant.
- Bulk activity creation (e.g., import): Rate limited to 100 activities per request.
- Reminder job processing delay: If the worker is behind, reminders are still sent but may be late. Reminders more than 1 hour past their scheduled time are logged but not sent (stale reminders).

## Requirements

### Functional Requirements

- **FR-007**: System MUST allow a Rep to log an activity (visit, call, email, demo, sampling) against an Account in under 60 seconds using a quick-log form with pre-populated fields and selectable activity type templates. Activities MUST be editable by the creator for 15 minutes; after that, only Manager or Admin can edit.
- **FR-008**: System MUST provide an activity timeline per Account showing all logged activities, linked emails, and task events in reverse chronological order with cursor-based pagination (20 items per page). Timeline MUST support filtering by activity type and date range.
- **FR-009**: System MUST support task creation with due date, priority (high, medium, low), assignee (any active user), and optional association to an Account, Contact, or Opportunity. Reminder notifications MUST be scheduled at 24 hours and 1 hour before due date. Overdue tasks MUST appear first in task lists.
- **FR-010**: System MUST store email records linked to Account and Contact records by matching email sender/recipient addresses against Contact email fields. Unmatched emails MUST be queryable separately. Email engagement events (open, click, bounce) MUST be tracked with timestamps.

### Key Entities

- **Activity**: A logged interaction (visit, call, email, demo, sampling) between a rep and an account. Contains type, notes, occurred_at timestamp, optional duration. Links to Account and User (logger).
- **Demo**: Extension of an activity of type "demo." Links to a Product with quantity sampled and buyer feedback.
- **Task**: A follow-up item with due date, priority, status, assignee. Optionally linked to Account, Contact, or Opportunity. Has reminder schedule.
- **TaskReminder**: Scheduled reminder for a task at a specific time (24h or 1h before due). Tracks whether it has been sent.
- **EmailRecord**: An email sent to or received from a contact. Stores subject, direction, status, engagement timestamps. Auto-linked to Contact and Account by email address matching.
- **Notification**: An in-app notification delivered to a user. Used for task reminders and system events.

## Clarifications

1. **Activity edit window**: The PRD states activities are editable for 15 minutes after creation, then only Manager can edit. Decision: Enforce this at the API level — the update endpoint checks `created_at + 15 min` against current time and the caller's role.

2. **Task entity not in PRD data model**: FR-009 defines task behavior but the PRD has no Task entity. Decision: Define Task with fields: id, tenant_id, title, description, due_date, priority (high/medium/low), status (pending/in_progress/completed/cancelled), assignee_id, creator_id, account_id (optional), contact_id (optional), opportunity_id (optional), completed_at, created_at, updated_at, deleted_at.

3. **Notification delivery**: FR-009 requires in-app notification AND email. Decision: This feature implements the in-app Notification entity and the reminder scheduling logic. Email sending uses Nodemailer (the existing fallback) with a simple transactional template. Full Microsoft Graph API integration is deferred to a later feature.

4. **Email auto-linking scope**: FR-010 references email auto-linking, but the full email sending/receiving infrastructure (Microsoft Graph API) is a separate feature. Decision: This feature builds the EmailRecord entity, auto-linking service (match email addresses to contacts), and engagement event tracking. The actual email ingestion pipeline (webhooks, Graph API polling) is out of scope.

5. **Activity types and templates**: FR-007 mentions "selectable activity type templates." Decision: Activity types are an enum (visit, call, email, demo, sampling). Templates are implicit — the "demo" type triggers additional required fields (product, quantity). No user-configurable templates in this feature; the template concept is the per-type field configuration.

6. **Timeline event sources**: FR-008 says timeline shows "all logged activities, linked emails, order events, and system-generated events." Decision: This feature implements activities, email records, and task events in the timeline. Order events will be added to the timeline when the Order feature is built (Feature 4). The timeline endpoint accepts a polymorphic approach — it queries activities, emails, and tasks separately, merges by timestamp.

7. **Reminder notification channels**: AC-009a says "in-app notification and an email reminder." Decision: Both are required. In-app notifications use a Notification table. Email notifications use a simple BullMQ job that calls Nodemailer. If email fails after 3 retries, the in-app notification alone suffices (graceful degradation per PRD error handling requirements).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Activity creation API responds in under 2 seconds (p95) for all activity types.
- **SC-002**: Activity timeline loads 20 items in under 500ms (p95) for accounts with up to 1,000 activities.
- **SC-003**: Task list query with filtering and sorting responds in under 200ms (p95).
- **SC-004**: Task reminders are scheduled within 5 seconds of task creation/update.
- **SC-005**: Email auto-linking correctly matches email addresses to contacts with 100% accuracy for exact email matches.
- **SC-006**: All create/update/delete operations on Activity, Task, and EmailRecord entities produce audit trail records.
- **SC-007**: All data queries enforce tenant_id filtering — no cross-tenant data access.
