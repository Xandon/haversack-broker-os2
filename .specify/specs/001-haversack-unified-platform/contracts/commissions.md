# API Contract: Commissions

**Domain**: Commission Calculation, Statements, Approval, Export
**Base Path**: `/api/v1/commissions`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.

---

## GET /api/v1/commissions/statements

List monthly commission statements for a rep.

**Implements**: FR-024

**Auth Required**: Role `rep` (own statements), `manager` (team statements), `admin` (all statements)

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  rep_id: z.string().uuid().optional(),           // required for manager/admin; defaults to self for rep
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),  // YYYY-MM format; defaults to current month
  status: z.enum(['pending', 'pending_approval', 'approved', 'exported', 'disputed']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25)
}
```

**Response 200 OK** (FR-024):
```json
{
  "data": {
    "rep": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
    "period": "2026-02",
    "summary": {
      "total_earned": 4250.75,
      "ytd_total": 12680.25,
      "line_item_count": 42,
      "status": "pending_approval"
    },
    "line_items": [
      {
        "id": "uuid",
        "order_number": "ORD-2026-001042",
        "account_name": "Pacific Bistro",
        "brand_name": "Bee's Best Honey",
        "line_total": 2040.00,
        "base_rate": 10.00,
        "territory_modifier": 1.00,
        "volume_tier": "Tier 2",
        "volume_tier_adjustment": 1.00,
        "effective_rate": 11.00,
        "commission_amount": 224.40,
        "order_confirmed_at": "2026-02-15T10:00:00Z",
        "status": "pending_approval"
      }
    ]
  },
  "pagination": { "page": 1, "per_page": 25, "total_count": 42 }
}
```

---

## GET /api/v1/commissions/:id

Retrieve a single commission record with calculation audit log.

**Implements**: FR-023, FR-024

**Auth Required**: Role `rep` (own), `manager`, `admin`

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "rep_id": "uuid",
    "order_id": "uuid",
    "order_item_id": "uuid",
    "brand_id": "uuid",
    "period": "2026-02",
    "line_total": 2040.00,
    "base_rate": 10.00,
    "territory_modifier": 1.00,
    "volume_tier": "Tier 2",
    "volume_tier_adjustment": 1.00,
    "effective_rate": 11.00,
    "amount": 224.40,
    "status": "pending_approval",
    "calculation_log": {
      "rule_id": "uuid",
      "brand_base_rate": 10.00,
      "territory_modifier": 1.00,
      "volume_tier_threshold": 10000.00,
      "volume_tier_adjustment": 1.00,
      "effective_date": "2026-01-01",
      "computed_rate": 11.00,
      "line_total_input": 2040.00,
      "commission_result": 224.40
    },
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

---

## POST /api/v1/commissions/calculate

Trigger commission calculation for a period. Processes all confirmed broker orders in the period.

**Implements**: FR-023

**Auth Required**: Role `admin`

**Rate Limit**: 5 requests/minute/user

**Request Body**:
```typescript
{
  period: z.string().regex(/^\d{4}-\d{2}$/),    // YYYY-MM format
  rep_id: z.string().uuid().optional(),           // optional: calculate for a specific rep only
  dry_run: z.boolean().default(false)            // preview without persisting
}
```

**Response 200 OK** (dry_run = true):
```json
{
  "data": {
    "period": "2026-02",
    "dry_run": true,
    "summary": {
      "reps_affected": 9,
      "orders_processed": 156,
      "line_items_processed": 482,
      "total_commission": 38500.75
    },
    "per_rep": [
      {
        "rep_id": "uuid",
        "rep_name": "Jane Smith",
        "order_count": 18,
        "line_item_count": 54,
        "total_commission": 4250.75
      }
    ]
  }
}
```

**Response 201 Created** (dry_run = false):
```json
{
  "data": {
    "period": "2026-02",
    "records_created": 482,
    "total_commission": 38500.75,
    "status": "pending_approval"
  }
}
```

**Calculation Rules** (FR-023):
- Only confirmed broker-model order items are included
- Rate = (base_rate + volume_tier_adjustment) * territory_modifier
- Commission = line_total * effective_rate / 100
- The rate effective on the order confirmation date is applied (not the current rate)
- Deterministic: same inputs always produce the same result

---

## POST /api/v1/commissions/statements/:period/approve

Approve a commission statement for a rep for a given period.

**Implements**: FR-024

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  rep_id: z.string().uuid(),
  notes: z.string().optional()
}
```

**Response 200 OK**:
```json
{
  "data": {
    "rep_id": "uuid",
    "period": "2026-02",
    "status": "approved",
    "approved_by": { "id": "uuid", "first_name": "Mike", "last_name": "Johnson" },
    "approved_at": "2026-02-24T17:00:00Z",
    "total_commission": 4250.75
  }
}
```

**Side Effects**: Audit trail entry (approver, timestamp). Rep notified via in-app + email. All commission records for this rep/period updated to "approved."

---

## POST /api/v1/commissions/export

Export approved commission data to the accounting system.

**Implements**: FR-025

**Auth Required**: Role `admin`

**Rate Limit**: 5 requests/minute/user

**Request Body**:
```typescript
{
  period: z.string().regex(/^\d{4}-\d{2}$/),
  rep_ids: z.array(z.string().uuid()).min(1),    // which reps to export
  format: z.enum(['csv', 'json']).default('csv')
}
```

**Response 200 OK**:
```json
{
  "data": {
    "export_id": "uuid",
    "period": "2026-02",
    "statements_exported": 5,
    "total_amount": 22500.00,
    "format": "csv",
    "download_url": "https://storage.../commission-export-2026-02.csv",
    "records": [
      {
        "rep_name": "Jane Smith",
        "rep_id": "uuid",
        "period": "2026-02",
        "total_commission": 4250.75,
        "line_item_count": 42,
        "status": "exported",
        "exported_at": "2026-02-24T18:00:00Z",
        "accounting_reference": "ACC-EXP-2026-02-001"
      }
    ]
  }
}
```

**Export Format** (FR-025 — accounting-compatible):
```csv
rep_name,rep_id,pay_period,total_commission,order_number,account_name,brand_name,line_total,rate,commission_amount
Jane Smith,uuid,2026-02,4250.75,ORD-2026-001042,Pacific Bistro,Bee's Best Honey,2040.00,11.00%,224.40
```

**Side Effects**: All exported commission records updated to "exported" status with timestamp and accounting reference.

---

## GET /api/v1/commissions/rules

List commission rules (brand rates, territory modifiers, volume tiers).

**Implements**: FR-023

**Auth Required**: Role `manager`, `admin`

**Query Params**:
```typescript
{
  brand_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(50)
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "brand": { "id": "uuid", "name": "Bee's Best Honey" },
      "territory": null,
      "base_rate": 10.00,
      "volume_tier_label": "Tier 2",
      "volume_threshold": 10000.00,
      "tier_adjustment": 1.00,
      "effective_date": "2026-01-01",
      "end_date": null,
      "is_active": true
    }
  ],
  "pagination": { "page": 1, "per_page": 50, "total_count": 24 }
}
```

---

## POST /api/v1/commissions/rules

Create a new commission rule.

**Implements**: FR-023

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  brand_id: z.string().uuid(),
  territory_id: z.string().uuid().optional(),     // null = applies to all territories
  base_rate: z.number().min(0).max(100),
  volume_tier_label: z.string().max(50).optional(),
  volume_threshold: z.number().min(0).optional(),
  tier_adjustment: z.number().default(0),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // must be current or future
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}
```

**Response 201 Created**:
```json
{
  "data": { "...commission rule object..." }
}
```

---

## PATCH /api/v1/commissions/rules/:id

Update a commission rule (e.g., change rate with new effective date).

**Implements**: FR-023

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body** (partial update):
```typescript
{
  base_rate: z.number().min(0).max(100).optional(),
  volume_tier_label: z.string().max(50).optional(),
  volume_threshold: z.number().min(0).optional(),
  tier_adjustment: z.number().optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_active: z.boolean().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated commission rule object..." }
}
```

**Note**: Rate changes apply only to orders confirmed on or after the effective date (FR-023). Existing commission records are never retroactively modified.

---

## POST /api/v1/commissions/:id/dispute

Flag a commission record as disputed.

**Implements**: FR-024

**Auth Required**: Role `rep`, `manager`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  reason: z.string().min(1).max(1000)
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "status": "disputed",
    "dispute_reason": "Incorrect rate applied — should be Tier 2"
  }
}
```
