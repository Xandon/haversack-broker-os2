# Report API Contracts

## POST /api/reports

**Auth:** authenticate + authorize('manager')
**Description:** Save a new report definition

**Request Body:**
```json
{
  "name": "Q1 Portland Orders",
  "description": "All orders from Portland Metro in Q1 2026",
  "entityType": "ORDER",
  "filters": {
    "dateRange": { "start": "2026-01-01", "end": "2026-03-31" },
    "territoryId": "uuid"
  },
  "columns": ["orderNumber", "accountName", "totalAmount", "status", "createdAt"],
  "isShared": false
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Q1 Portland Orders",
    "description": "All orders from Portland Metro in Q1 2026",
    "entityType": "ORDER",
    "filters": { ... },
    "columns": ["orderNumber", "accountName", "totalAmount", "status", "createdAt"],
    "isShared": false,
    "lastRunAt": null,
    "createdAt": "2026-02-26T10:00:00Z"
  }
}
```

---

## GET /api/reports

**Auth:** authenticate + authorize('manager')
**Description:** List saved reports (own + shared)

**Query Parameters:**
| Param | Type | Required | Default |
|-------|------|----------|---------|
| cursor | UUID | No | - |
| limit | number | No | 20 |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Q1 Portland Orders",
      "entityType": "ORDER",
      "isShared": false,
      "createdByName": "Jane Manager",
      "lastRunAt": "2026-02-25T14:30:00Z",
      "createdAt": "2026-02-20T10:00:00Z"
    }
  ],
  "pagination": { "cursor": "uuid", "hasMore": false, "total": 5 }
}
```

---

## GET /api/reports/:id

**Auth:** authenticate + authorize('manager')
**Description:** Get full report definition

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Q1 Portland Orders",
    "description": "...",
    "entityType": "ORDER",
    "filters": { ... },
    "columns": [...],
    "isShared": false,
    "createdByName": "Jane Manager",
    "lastRunAt": "2026-02-25T14:30:00Z",
    "createdAt": "2026-02-20T10:00:00Z"
  }
}
```

**Response 404:** Report not found or not accessible

---

## DELETE /api/reports/:id

**Auth:** authenticate + authorize('manager')
**Description:** Soft-delete a report (owner or admin only)

**Response 200:**
```json
{ "message": "Report deleted" }
```

**Response 403:** Not the owner and not admin
**Response 404:** Report not found

---

## POST /api/reports/execute

**Auth:** authenticate + authorize('manager')
**Description:** Execute a report definition (inline or by saved ID)

**Request Body (inline):**
```json
{
  "entityType": "ORDER",
  "filters": {
    "dateRange": { "start": "2026-01-01", "end": "2026-03-31" },
    "territoryId": "uuid"
  },
  "columns": ["orderNumber", "accountName", "totalAmount", "status", "createdAt"],
  "cursor": null,
  "limit": 50
}
```

**Request Body (saved report):**
```json
{
  "reportId": "uuid",
  "cursor": null,
  "limit": 50
}
```

**Response 200:**
```json
{
  "data": [
    { "orderNumber": "ORD-2026-0001", "accountName": "Acme Deli", "totalAmount": 2500.00, "status": "confirmed", "createdAt": "2026-01-15T10:00:00Z" }
  ],
  "pagination": { "cursor": "uuid", "hasMore": true, "total": 500 },
  "truncated": false,
  "columns": [
    { "key": "orderNumber", "label": "Order Number", "type": "string" },
    { "key": "totalAmount", "label": "Total Amount", "type": "currency" }
  ]
}
```

**Response 429:** Too many concurrent report executions (3 limit)

---

## POST /api/reports/export

**Auth:** authenticate + authorize('manager')
**Description:** Export report results as CSV or XLSX

**Request Body:**
```json
{
  "entityType": "ORDER",
  "filters": { ... },
  "columns": [...],
  "format": "xlsx"
}
```

Or with saved report:
```json
{
  "reportId": "uuid",
  "format": "csv"
}
```

**Response 200:** Binary stream with appropriate Content-Type
- CSV: `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="report-ORDER-2026-02-26.csv"`
- XLSX: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Content-Disposition: attachment; filename="report-ORDER-2026-02-26.xlsx"`

**Response 429:** Too many concurrent report executions
