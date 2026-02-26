# Timeline API Contract

## GET /api/accounts/:id/timeline
Get the aggregated activity timeline for an account.

**Auth:** authenticate

**Query Params:**
- `types` — comma-separated: 'activity', 'email', 'task' (optional, default: all)
- `activityType` — filter activities by type: visit, call, email, demo, sampling (optional)
- `startDate` — ISO 8601, filter by occurred_at >= (optional)
- `endDate` — ISO 8601, filter by occurred_at <= (optional)
- `cursor` — pagination cursor (optional)
- `limit` — 1-100, default 20

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "activity",
      "occurredAt": "ISO 8601",
      "data": {
        "id": "uuid",
        "type": "visit",
        "notes": "string",
        "durationMinutes": 30,
        "user": { "id": "uuid", "firstName": "string", "lastName": "string" },
        "demos": []
      }
    },
    {
      "id": "uuid",
      "type": "email",
      "occurredAt": "ISO 8601",
      "data": {
        "id": "uuid",
        "subject": "string",
        "direction": "outbound",
        "status": "opened",
        "recipientEmail": "string",
        "user": { "id": "uuid", "firstName": "string", "lastName": "string" }
      }
    },
    {
      "id": "uuid",
      "type": "task",
      "occurredAt": "ISO 8601",
      "data": {
        "id": "uuid",
        "title": "string",
        "status": "completed",
        "priority": "high",
        "assignee": { "id": "uuid", "firstName": "string", "lastName": "string" }
      }
    }
  ],
  "pagination": {
    "cursor": "string | null",
    "hasMore": true,
    "total": 50
  },
  "counts": {
    "activity": 35,
    "email": 10,
    "task": 5
  }
}
```

**Implementation Notes:**
- Queries activities, email records, and tasks in parallel using `Promise.all`
- Merges results by `occurredAt` descending
- Cursor encodes the timestamp + type + id for stable pagination
- `total` and `counts` come from separate COUNT queries (cached)
- `limit` applies to the merged result, not per-source

**Performance:**
- p95 < 500ms for accounts with up to 1,000 total timeline items
- Leverages composite indexes on (tenant_id, account_id, occurred_at/sent_at/created_at DESC)
