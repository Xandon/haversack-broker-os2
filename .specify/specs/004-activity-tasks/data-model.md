# Data Model: Activity & Task Management

## New Enums

### ActivityType
- `visit` — In-person account visit
- `call` — Phone call
- `email` — Email (logged manually or auto-linked)
- `demo` — Product demonstration
- `sampling` — Product sampling event

### TaskPriority
- `high`
- `medium`
- `low`

### TaskStatus
- `pending` — Not started
- `in_progress` — Actively being worked
- `completed` — Done
- `cancelled` — Cancelled

### EmailDirection
- `inbound` — Received from contact
- `outbound` — Sent to contact

### EmailStatus
- `sent` — Email sent
- `delivered` — Email delivered
- `opened` — Tracking pixel loaded
- `clicked` — Link clicked
- `bounced` — Delivery bounced
- `failed` — Send failed

### NotificationType
- `task_reminder` — Upcoming task due reminder
- `task_assigned` — New task assigned to user
- `task_overdue` — Task past due date

## New Entities

### Activity

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| account_id | UUID FK | Yes | References Account |
| user_id | UUID FK | Yes | References User (who logged it) |
| type | ActivityType | Yes | visit, call, email, demo, sampling |
| notes | TEXT | No | Max 10,000 characters |
| occurred_at | TIMESTAMPTZ | Yes | When the activity happened |
| duration_minutes | INTEGER | No | Duration in minutes |
| version | INTEGER | Yes | Default 1, optimistic concurrency |
| created_at | TIMESTAMPTZ | Yes | Auto-set on create |
| updated_at | TIMESTAMPTZ | Yes | Auto-set on update |
| deleted_at | TIMESTAMPTZ | No | Soft delete |

**Indexes:**
- `(tenant_id, account_id, occurred_at DESC)` — Timeline queries
- `(tenant_id, user_id, occurred_at DESC)` — User's activity list
- `(tenant_id, type, occurred_at DESC)` — Type filtering
- `(tenant_id, deleted_at)` — Soft-delete filtering

**Relations:**
- `account` → Account (many-to-one)
- `user` → User (many-to-one)
- `demos` → Demo[] (one-to-many)

### Demo

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| activity_id | UUID FK | Yes | References Activity |
| product_id | UUID FK | Yes | References Product (future, store as UUID) |
| quantity_sampled | INTEGER | No | Number of samples |
| buyer_feedback | TEXT | No | Free-form feedback |
| outcome | VARCHAR(20) | No | positive, neutral, negative |
| created_at | TIMESTAMPTZ | Yes | Auto-set |

**Indexes:**
- `(activity_id)` — Lookup demos for activity
- `(tenant_id, product_id)` — Product demo history

**Relations:**
- `activity` → Activity (many-to-one, cascade delete)

### Task

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| title | VARCHAR(255) | Yes | Task title |
| description | TEXT | No | Detailed description |
| due_date | TIMESTAMPTZ | Yes | When the task is due |
| priority | TaskPriority | Yes | high, medium, low |
| status | TaskStatus | Yes | Default: pending |
| assignee_id | UUID FK | Yes | References User (assigned to) |
| creator_id | UUID FK | Yes | References User (created by) |
| account_id | UUID FK | No | Optional Account association |
| contact_id | UUID FK | No | Optional Contact association |
| completed_at | TIMESTAMPTZ | No | When status changed to completed |
| created_at | TIMESTAMPTZ | Yes | Auto-set |
| updated_at | TIMESTAMPTZ | Yes | Auto-set |
| deleted_at | TIMESTAMPTZ | No | Soft delete |

**Indexes:**
- `(tenant_id, assignee_id, status, due_date)` — My tasks list (overdue first)
- `(tenant_id, account_id, created_at DESC)` — Account tasks
- `(tenant_id, status, due_date)` — Overdue task queries
- `(tenant_id, deleted_at)` — Soft-delete filtering

**Relations:**
- `assignee` → User (many-to-one)
- `creator` → User (many-to-one)
- `account` → Account (many-to-one, optional)
- `contact` → Contact (many-to-one, optional)
- `reminders` → TaskReminder[] (one-to-many)

### TaskReminder

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| task_id | UUID FK | Yes | References Task |
| remind_at | TIMESTAMPTZ | Yes | When to fire the reminder |
| reminder_type | VARCHAR(10) | Yes | '24h' or '1h' |
| is_sent | BOOLEAN | Yes | Default: false |
| sent_at | TIMESTAMPTZ | No | When notification was actually sent |
| bullmq_job_id | VARCHAR(100) | No | BullMQ job ID for cancellation |
| created_at | TIMESTAMPTZ | Yes | Auto-set |

**Indexes:**
- `(task_id)` — Lookup reminders for task
- `(tenant_id, is_sent, remind_at)` — Pending reminders

**Relations:**
- `task` → Task (many-to-one, cascade delete)

### EmailRecord

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| contact_id | UUID FK | No | References Contact (auto-linked) |
| account_id | UUID FK | No | References Account (auto-linked) |
| user_id | UUID FK | Yes | References User (sender for outbound) |
| subject | VARCHAR(500) | Yes | Email subject line |
| body_preview | VARCHAR(500) | No | First 500 chars of body (for timeline) |
| direction | EmailDirection | Yes | inbound or outbound |
| status | EmailStatus | Yes | Default: sent |
| recipient_email | VARCHAR(255) | Yes | The email address of the contact |
| opened_at | TIMESTAMPTZ | No | When email was opened |
| clicked_at | TIMESTAMPTZ | No | When a link was clicked |
| bounced_at | TIMESTAMPTZ | No | When email bounced |
| sent_at | TIMESTAMPTZ | Yes | When email was sent |
| created_at | TIMESTAMPTZ | Yes | Auto-set |

**Indexes:**
- `(tenant_id, account_id, sent_at DESC)` — Account email timeline
- `(tenant_id, contact_id, sent_at DESC)` — Contact email history
- `(tenant_id, status)` — Unmatched email queries (status filtering)
- `(tenant_id, recipient_email)` — Auto-linking lookups

**Relations:**
- `contact` → Contact (many-to-one, optional)
- `account` → Account (many-to-one, optional)
- `user` → User (many-to-one)

### Notification

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| user_id | UUID FK | Yes | References User (recipient) |
| type | NotificationType | Yes | task_reminder, task_assigned, task_overdue |
| title | VARCHAR(255) | Yes | Notification title |
| body | TEXT | No | Notification body |
| reference_id | UUID | No | ID of related entity (task_id, etc.) |
| reference_type | VARCHAR(50) | No | Entity type ('task', 'activity', etc.) |
| is_read | BOOLEAN | Yes | Default: false |
| read_at | TIMESTAMPTZ | No | When notification was read |
| created_at | TIMESTAMPTZ | Yes | Auto-set |

**Indexes:**
- `(tenant_id, user_id, is_read, created_at DESC)` — Unread notifications
- `(tenant_id, user_id, created_at DESC)` — All notifications

**Relations:**
- `user` → User (many-to-one)

## Modified Entities

### Account (ADDITIVE)
- Add relation: `activities Activity[]`
- Add relation: `tasks Task[]`
- Add relation: `emailRecords EmailRecord[]`

### Contact (ADDITIVE)
- Add relation: `emailRecords EmailRecord[]`

### User (ADDITIVE)
- Add relation: `loggedActivities Activity[]`
- Add relation: `createdTasks Task[]`
- Add relation: `assignedTasks Task[]`
- Add relation: `notifications Notification[]`
- Add relation: `emailRecords EmailRecord[]`

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| Activity | notes | Max 10,000 characters |
| Activity | type | Must be valid ActivityType enum value |
| Activity | occurred_at | Cannot be more than 24 hours in the future |
| Activity | duration_minutes | If provided, must be 1-1440 (1 min to 24 hours) |
| Demo | quantity_sampled | If provided, must be >= 0 |
| Demo | outcome | If provided, must be 'positive', 'neutral', or 'negative' |
| Task | title | 1-255 characters |
| Task | priority | Must be valid TaskPriority enum |
| Task | status | Valid transitions: pending→in_progress→completed, any→cancelled |
| Task | assignee_id | Must reference an active user |
| EmailRecord | subject | 1-500 characters |
| EmailRecord | recipient_email | Valid email format |
| Notification | title | 1-255 characters |
