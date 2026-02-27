# API Contracts: Commissions (008)

## Commission Rules

### POST /api/commissions/rules
**Auth:** admin
**Body:**
```json
{
  "brandId": "uuid",
  "territoryId": "uuid | null",
  "baseRate": 0.10,
  "territoryModifier": 1.00,
  "volumeTiers": [
    { "minAmount": 0, "maxAmount": 10000, "bonusRate": 0 },
    { "minAmount": 10000, "maxAmount": 25000, "bonusRate": 0.01 },
    { "minAmount": 25000, "maxAmount": null, "bonusRate": 0.02 }
  ],
  "effectiveDate": "2026-04-01T00:00:00Z",
  "expiresAt": "2027-03-31T23:59:59Z | null"
}
```
**Response:** `201 { data: CommissionRuleResponse }`

### GET /api/commissions/rules
**Auth:** authenticated
**Query:** `?brandId=uuid&territoryId=uuid&activeOnly=true&cursor=&limit=20`
**Response:** `200 { data: CommissionRuleResponse[], pagination: { cursor, hasMore, total } }`

### GET /api/commissions/rules/:id
**Auth:** authenticated
**Response:** `200 { data: CommissionRuleResponse }`

### PUT /api/commissions/rules/:id
**Auth:** admin
**Headers:** `If-Match: <updatedAt ISO string>`
**Body:** Same as POST (creates new version)
**Response:** `200 { data: CommissionRuleResponse }`

## Commission Statements

### GET /api/commissions/statements
**Auth:** authenticated (rep sees own, manager sees team)
**Query:** `?repId=uuid&month=3&year=2026&status=pending&cursor=&limit=20`
**Response:** `200 { data: CommissionStatementResponse[], pagination: { cursor, hasMore, total } }`

### GET /api/commissions/statements/:id
**Auth:** authenticated
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "repId": "uuid",
    "repName": "string",
    "month": 3,
    "year": 2026,
    "status": "pending",
    "totalEarned": 4250.00,
    "ytdTotal": 12750.00,
    "entries": [
      {
        "id": "uuid",
        "orderId": "uuid",
        "orderNumber": "ORD-2026-0042",
        "accountName": "Green Grocer Co",
        "brandName": "Mountain Meadow Farms",
        "lineItemTotal": 12000.00,
        "baseRate": 0.10,
        "tierBonus": 0.01,
        "territoryModifier": 1.00,
        "effectiveRate": 0.11,
        "commissionAmount": 1320.00,
        "entryType": "calculation",
        "disputeStatus": null
      }
    ],
    "disputes": [],
    "approvedBy": null,
    "approvedAt": null,
    "createdAt": "2026-04-01T02:00:00Z"
  }
}
```

### POST /api/commissions/statements/:id/approve
**Auth:** manager
**Headers:** `If-Match: <updatedAt ISO string>`
**Response:** `200 { data: CommissionStatementResponse }`
**Error:** `409 { error: "COMMISSION_STATEMENT_HAS_DISPUTES", message: "Cannot approve statement with unresolved disputes" }`

### POST /api/commissions/statements/:id/reject
**Auth:** manager
**Body:** `{ "reason": "string" }`
**Response:** `200 { data: CommissionStatementResponse }`

### POST /api/commissions/statements/generate
**Auth:** admin
**Body:** `{ "month": 3, "year": 2026 }`
**Response:** `202 { data: { jobId: "string", message: "Statement generation queued" } }`

## Commission Disputes

### POST /api/commissions/entries/:id/dispute
**Auth:** rep, manager
**Body:** `{ "reason": "string (max 1000 chars)" }`
**Response:** `201 { data: CommissionDisputeResponse }`

### POST /api/commissions/disputes/:id/resolve
**Auth:** manager, admin
**Body:** `{ "adjustedAmount": 1200.00 | null, "resolutionNotes": "string" }`
**Response:** `200 { data: CommissionDisputeResponse }`

## Commission Export

### POST /api/commissions/export
**Auth:** admin
**Body:** `{ "month": 3, "year": 2026, "forceReExport": false }`
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "referenceId": "QB-2026-03-001",
    "month": 3,
    "year": 2026,
    "statementsIncluded": 5,
    "statementsSkipped": 2,
    "totalAmount": 21500.00,
    "format": "quickbooks_csv",
    "createdAt": "2026-04-02T10:30:00Z"
  }
}
```

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| COMMISSION_RULE_NOT_FOUND | 404 | Rule ID does not exist |
| COMMISSION_RULE_CONFLICT | 409 | Active rule already exists for brand+territory+date range |
| COMMISSION_STATEMENT_NOT_FOUND | 404 | Statement ID does not exist |
| COMMISSION_STATEMENT_NOT_PENDING | 409 | Statement is not in "pending" status |
| COMMISSION_STATEMENT_HAS_DISPUTES | 409 | Statement has unresolved disputes |
| COMMISSION_STATEMENT_CONFLICT | 409 | Optimistic concurrency violation |
| COMMISSION_ENTRY_NOT_FOUND | 404 | Entry ID does not exist |
| COMMISSION_DISPUTE_NOT_FOUND | 404 | Dispute ID does not exist |
| COMMISSION_DISPUTE_ALREADY_EXISTS | 409 | Entry already has an open dispute |
| COMMISSION_EXPORT_ALREADY_EXISTS | 409 | Statements already exported (use forceReExport) |
