# Task API Contract

## POST /api/tasks
Create a new task.

**Auth:** authenticate + authorize('rep', 'manager')

**Request Body:**
```json
{
  "title": "string (1-255)",
  "description": "string (optional)",
  "dueDate": "ISO 8601 datetime",
  "priority": "high | medium | low",
  "assigneeId": "uuid",
  "accountId": "uuid (optional)",
  "contactId": "uuid (optional)"
}
```

**Validation:**
- `assigneeId` must reference an active user in the tenant
- `accountId` if provided must reference an existing, non-deleted account in the tenant
- `contactId` if provided must reference an existing contact in the tenant

**Side Effects:**
- Schedules reminder jobs (24h and 1h before due date)

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "title": "string",
    "description": "string | null",
    "dueDate": "ISO 8601",
    "priority": "high",
    "status": "pending",
    "assigneeId": "uuid",
    "creatorId": "uuid",
    "accountId": "uuid | null",
    "contactId": "uuid | null",
    "completedAt": null,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601",
    "isOverdue": false
  }
}
```

**Errors:** 400 (validation), 401, 403

---

## GET /api/tasks
List tasks with filters.

**Auth:** authenticate

**Query Params:**
- `assigneeId` — filter by assignee (optional, defaults to current user)
- `status` — filter by status (optional)
- `priority` — filter by priority (optional)
- `accountId` — filter by account association (optional)
- `overdue` — 'true' to show only overdue (optional)
- `cursor` — pagination cursor (optional)
- `limit` — 1-100, default 20
- `sortBy` — 'dueDate' | 'priority' | 'createdAt' (default: 'dueDate')
- `sortOrder` — 'asc' | 'desc' (default: 'asc')

**Response 200:**
```json
{
  "data": [
    {
      /* task object with computed isOverdue field */
      "assignee": { "id": "uuid", "firstName": "string", "lastName": "string" },
      "account": { "id": "uuid", "name": "string" }
    }
  ],
  "pagination": {
    "cursor": "string | null",
    "hasMore": true,
    "total": 15
  }
}
```

**Sort behavior:** Overdue tasks (dueDate < now AND status != 'completed') always appear first, sorted by dueDate ascending. Then upcoming tasks sorted by the selected sortBy/sortOrder.

---

## GET /api/tasks/:id
Get a single task.

**Auth:** authenticate

**Response 200:**
```json
{
  "data": { /* task with relations */ }
}
```

**Errors:** 404

---

## PUT /api/tasks/:id
Update a task.

**Auth:** authenticate + authorize('rep', 'manager')

**Request Body:** All fields optional for partial update.

**Side Effects:**
- If `dueDate` changes: cancel existing reminders, schedule new ones
- If `status` changes to 'completed': set `completedAt`, cancel pending reminders

**Response 200:**
```json
{
  "data": { /* updated task */ }
}
```

**Errors:** 400, 404

---

## DELETE /api/tasks/:id
Soft-delete a task.

**Auth:** authenticate + authorize('rep', 'manager')

**Side Effects:**
- Cancel pending reminder jobs

**Response 200:**
```json
{
  "data": { "id": "uuid", "deletedAt": "ISO 8601" }
}
```

**Errors:** 404
