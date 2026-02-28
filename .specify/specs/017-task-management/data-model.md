# Data Model — Task Management

## Entities

### Task (existing — no changes needed)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | Tenant isolation |
| title | string (1-255) | Yes | Trimmed |
| description | string (max 10000) | No | Nullable |
| dueDate | ISO 8601 datetime | Yes | When the task is due |
| priority | enum: high, medium, low | Yes | |
| status | enum: pending, in_progress, completed, cancelled | Yes | Default: pending |
| assigneeId | UUID | Yes | FK to User |
| creatorId | UUID | Yes | FK to User (set on create) |
| accountId | UUID | No | FK to Account (nullable) |
| contactId | UUID | No | FK to Contact (nullable) |
| completedAt | ISO 8601 datetime | No | Set when status → completed |
| isOverdue | boolean | Yes | Computed server-side (dueDate < now && status not completed/cancelled) |
| createdAt | ISO 8601 datetime | Yes | Auto |
| updatedAt | ISO 8601 datetime | Yes | Auto |

### Status Transitions

```
pending      → in_progress, completed, cancelled
in_progress  → pending, completed, cancelled
completed    → cancelled
cancelled    → pending
```

### Validation Rules

- title: min 1, max 255, trimmed
- description: max 10000, nullable
- dueDate: valid ISO 8601 datetime
- priority: one of high, medium, low
- assigneeId: must be active user UUID
- accountId: must be existing account UUID (if provided)

## Frontend Types

### TaskItem (list display)

```
id, title, status, priority, dueDate, isOverdue, assigneeId, accountId, createdAt
```

### TaskListResponse

```
{ data: TaskItem[], pagination: { cursor: string | null, hasMore: boolean, total: number } }
```

### CreateTaskInput

```
{ title, description?, dueDate, priority, assigneeId, accountId? }
```

### UpdateTaskInput

```
{ title?, description?, dueDate?, priority?, status?, assigneeId?, accountId? }
```
