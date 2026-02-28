# API Contracts — Task Management

All endpoints require authentication. Backend already implemented.

## GET /api/tasks

**Query Parameters** (all optional):
- `status`: pending | in_progress | completed | cancelled
- `priority`: high | medium | low
- `overdue`: "true" | "false"
- `assigneeId`: UUID
- `accountId`: UUID
- `cursor`: UUID (for pagination)
- `limit`: 1-100 (default 20)
- `sortBy`: dueDate | priority | createdAt (default dueDate)
- `sortOrder`: asc | desc (default asc)

**Response 200**:
```json
{
  "data": [TaskResponse],
  "pagination": { "cursor": "uuid | null", "hasMore": true, "total": 42 }
}
```

## POST /api/tasks

**Body** (Zod validated):
```json
{
  "title": "Follow up with Pacific Bistro",
  "description": "Check on sample order status",
  "dueDate": "2026-03-01T10:00:00.000Z",
  "priority": "high",
  "assigneeId": "uuid",
  "accountId": "uuid (optional)"
}
```

**Response 201**: TaskResponse

## PUT /api/tasks/:id

**Body** (all fields optional, Zod validated):
```json
{
  "title": "Updated title",
  "status": "completed",
  "priority": "low"
}
```

**Response 200**: TaskResponse

## DELETE /api/tasks/:id

**Response 200**: `{ "id": "uuid", "deletedAt": "ISO8601" }`

## TaskResponse Shape

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "title": "string",
  "description": "string | null",
  "dueDate": "ISO8601",
  "priority": "high | medium | low",
  "status": "pending | in_progress | completed | cancelled",
  "assigneeId": "uuid",
  "creatorId": "uuid",
  "accountId": "uuid | null",
  "contactId": "uuid | null",
  "completedAt": "ISO8601 | null",
  "isOverdue": true,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```
