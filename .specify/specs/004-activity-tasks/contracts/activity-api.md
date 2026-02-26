# Activity API Contract

## POST /api/activities
Create a new activity.

**Auth:** authenticate + authorize('rep', 'manager')

**Request Body:**
```json
{
  "accountId": "uuid",
  "type": "visit | call | email | demo | sampling",
  "notes": "string (optional, max 10000)",
  "occurredAt": "ISO 8601 datetime",
  "durationMinutes": "number (optional, 1-1440)",
  "demos": [
    {
      "productId": "uuid",
      "quantitySampled": "number (optional)",
      "buyerFeedback": "string (optional)",
      "outcome": "positive | neutral | negative (optional)"
    }
  ]
}
```

**Validation:**
- `type: "demo"` requires `demos` array with at least 1 item
- `occurredAt` cannot be more than 24h in the future
- `accountId` must reference an existing, non-deleted account in the tenant

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "accountId": "uuid",
    "userId": "uuid",
    "type": "visit",
    "notes": "string | null",
    "occurredAt": "ISO 8601",
    "durationMinutes": "number | null",
    "version": 1,
    "demos": [],
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**Errors:** 400 (validation), 404 (account not found), 401 (unauthenticated), 403 (unauthorized)

---

## GET /api/activities/:id
Get a single activity by ID.

**Auth:** authenticate

**Response 200:**
```json
{
  "data": { /* same as create response */ }
}
```

**Errors:** 404 (not found or wrong tenant)

---

## PUT /api/activities/:id
Update an activity.

**Auth:** authenticate + authorize('rep', 'manager')

**Headers:** `If-Match: "version"` (optional, for optimistic concurrency)

**Edit Window:** Creator can edit within 15 minutes of creation. After 15 minutes, only Manager or Admin can edit.

**Request Body:** Same as create (all fields optional for partial update).

**Response 200:**
```json
{
  "data": { /* updated activity */ }
}
```

**Errors:** 400, 403 (edit window expired for non-manager), 404, 409 (version conflict)

---

## DELETE /api/activities/:id
Soft-delete an activity.

**Auth:** authenticate + authorize('rep', 'manager')

**Response 200:**
```json
{
  "data": { "id": "uuid", "deletedAt": "ISO 8601" }
}
```

**Errors:** 404

---

## GET /api/accounts/:id/activities
List activities for an account with filtering.

**Auth:** authenticate

**Query Params:**
- `type` — filter by activity type (optional)
- `startDate` — ISO 8601, filter by occurred_at >= (optional)
- `endDate` — ISO 8601, filter by occurred_at <= (optional)
- `cursor` — pagination cursor (optional)
- `limit` — 1-100, default 20

**Response 200:**
```json
{
  "data": [ /* activity objects */ ],
  "pagination": {
    "cursor": "string | null",
    "hasMore": true,
    "total": 50
  }
}
```

---

## GET /api/activities/metrics
Get activity metrics (manager view).

**Auth:** authenticate + authorize('manager', 'admin')

**Query Params:**
- `startDate` — ISO 8601 (required)
- `endDate` — ISO 8601 (required)
- `groupBy` — 'rep' | 'account' | 'type' (default: 'rep')

**Response 200:**
```json
{
  "data": {
    "groups": [
      {
        "id": "uuid",
        "name": "string",
        "counts": {
          "visit": 10,
          "call": 5,
          "email": 3,
          "demo": 2,
          "sampling": 1
        },
        "total": 21,
        "lastActivityDate": "ISO 8601"
      }
    ],
    "totals": {
      "visit": 25,
      "call": 12,
      "email": 8,
      "demo": 5,
      "sampling": 3
    }
  }
}
```
