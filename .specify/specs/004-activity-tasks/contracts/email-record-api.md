# Email Record API Contract

## POST /api/email-records
Create an email record (used by email ingestion pipeline).

**Auth:** authenticate + authorize('rep', 'manager')

**Request Body:**
```json
{
  "subject": "string (1-500)",
  "bodyPreview": "string (optional, max 500)",
  "direction": "inbound | outbound",
  "recipientEmail": "string (valid email)",
  "sentAt": "ISO 8601 datetime"
}
```

**Side Effects:**
- Auto-links to Contact and Account by matching `recipientEmail` against Contact email fields
- If no match found, stores with `contactId: null, accountId: null` (status remains as provided)

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "contactId": "uuid | null",
    "accountId": "uuid | null",
    "userId": "uuid",
    "subject": "string",
    "bodyPreview": "string | null",
    "direction": "outbound",
    "status": "sent",
    "recipientEmail": "string",
    "openedAt": null,
    "clickedAt": null,
    "bouncedAt": null,
    "sentAt": "ISO 8601",
    "createdAt": "ISO 8601",
    "isLinked": true
  }
}
```

**Errors:** 400 (validation), 401, 403

---

## GET /api/email-records/unmatched
List email records that couldn't be auto-linked.

**Auth:** authenticate + authorize('rep', 'manager')

**Query Params:**
- `cursor` — pagination cursor (optional)
- `limit` — 1-100, default 20

**Response 200:**
```json
{
  "data": [ /* email record objects where contactId is null */ ],
  "pagination": {
    "cursor": "string | null",
    "hasMore": false,
    "total": 3
  }
}
```

---

## PUT /api/email-records/:id/engagement
Update engagement events on an email record.

**Auth:** authenticate

**Request Body:**
```json
{
  "event": "opened | clicked | bounced",
  "occurredAt": "ISO 8601 datetime"
}
```

**Side Effects:**
- Updates the corresponding timestamp field (openedAt, clickedAt, bouncedAt)
- Updates status to match the event

**Response 200:**
```json
{
  "data": { /* updated email record */ }
}
```

**Errors:** 400, 404
