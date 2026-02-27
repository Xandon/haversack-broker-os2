# API Contracts: Pipeline & Opportunities

## POST /api/opportunities

**Auth:** authenticate + authorize('rep', 'manager')

**Request Body:**
```json
{
  "name": "Q3 Honey Expansion",
  "estimatedValue": 25000.00,
  "expectedCloseDate": "2026-06-30",
  "stage": "prospect",
  "accountId": "uuid",
  "repId": "uuid",
  "brandIds": ["uuid", "uuid"],
  "probability": 15
}
```
- `probability` is optional; auto-populated from stage defaults if omitted
- `brandIds` is optional; defaults to []
- `repId` is optional; defaults to authenticated user's ID

**Response:** 201
```json
{
  "data": {
    "id": "uuid",
    "name": "Q3 Honey Expansion",
    "estimatedValue": 25000.00,
    "probability": 15,
    "weightedValue": 3750.00,
    "expectedCloseDate": "2026-06-30",
    "stage": "prospect",
    "closeReason": null,
    "closedAt": null,
    "accountId": "uuid",
    "accountName": "Fresh Market PDX",
    "repId": "uuid",
    "repName": "Jane Smith",
    "brands": [{ "id": "uuid", "name": "Mountain Meadow Farms" }],
    "isActive": true,
    "createdAt": "2026-02-27T00:00:00.000Z",
    "updatedAt": "2026-02-27T00:00:00.000Z"
  }
}
```

## GET /api/opportunities

**Auth:** authenticate

**Query Parameters:**
- `stage` — filter by stage (optional)
- `accountId` — filter by account (optional)
- `repId` — filter by rep (optional)
- `dateFrom` — expectedCloseDate >= (optional)
- `dateTo` — expectedCloseDate <= (optional)
- `cursor` — pagination cursor (optional)
- `limit` — page size, default 20, max 100 (optional)
- `sortBy` — name | estimatedValue | expectedCloseDate | createdAt (default: createdAt)
- `sortOrder` — asc | desc (default: desc)

**Response:** 200
```json
{
  "data": [...opportunities],
  "pagination": { "cursor": "next-cursor", "hasMore": true }
}
```

## GET /api/opportunities/:id

**Auth:** authenticate

**Response:** 200 (same shape as create response)

## PUT /api/opportunities/:id

**Auth:** authenticate + authorize('rep', 'manager')
**Headers:** `If-Match: updatedAt` (optional, optimistic concurrency)

**Request Body:** (all optional)
```json
{
  "name": "Updated Name",
  "estimatedValue": 30000.00,
  "expectedCloseDate": "2026-07-15",
  "repId": "uuid",
  "brandIds": ["uuid"]
}
```

**Response:** 200

## DELETE /api/opportunities/:id

**Auth:** authenticate + authorize('rep', 'manager')

**Response:** 200
```json
{ "data": { "deleted": true } }
```

## POST /api/opportunities/:id/transition

**Auth:** authenticate + authorize('rep', 'manager')

**Request Body:**
```json
{
  "stage": "proposal",
  "probability": 65,
  "closeReason": "Won against competitor X"
}
```
- `probability` is optional; auto-populated from stage defaults if omitted
- `closeReason` is required for closed_won and closed_lost, ignored otherwise

**Response:** 200 (full opportunity response)

## GET /api/pipeline/summary

**Auth:** authenticate

**Query Parameters:**
- `repId` — filter by rep (optional; auto-applied for rep role)
- `accountId` — filter by account (optional)
- `dateFrom` — expectedCloseDate >= (optional)
- `dateTo` — expectedCloseDate <= (optional)

**Response:** 200
```json
{
  "data": {
    "stages": {
      "prospect": {
        "opportunities": [...],
        "count": 3,
        "totalValue": 75000.00
      },
      "qualified": { ... },
      "proposal": { ... },
      "negotiation": { ... }
    },
    "forecast": {
      "weightedTotal": 123456.78,
      "totalOpenValue": 234567.89,
      "opportunityCount": 15
    }
  }
}
```

## GET /api/pipeline/analytics

**Auth:** authenticate + authorize('rep', 'manager')

**Query Parameters:**
- `repId` — filter by rep (optional; auto-applied for rep role)
- `dateFrom` — required, start of date range
- `dateTo` — required, end of date range

**Response:** 200
```json
{
  "data": {
    "totalWon": 12,
    "totalLost": 5,
    "winRate": 70.59,
    "averageWonDealSize": 15000.00,
    "averageSalesCycleDays": 45,
    "topCloseReasons": [
      { "reason": "Price competitive", "count": 4, "percentage": 23.53 },
      { "reason": "Product quality", "count": 3, "percentage": 17.65 }
    ]
  }
}
```
