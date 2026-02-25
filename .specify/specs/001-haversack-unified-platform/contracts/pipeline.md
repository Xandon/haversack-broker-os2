# API Contract: Pipeline & Opportunities

**Domain**: Opportunity Management, Pipeline Kanban, Forecast
**Base Path**: `/api/v1`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.

---

## POST /api/v1/opportunities

Create a new Opportunity linked to an Account.

**Implements**: FR-021

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body**:
```typescript
{
  account_id: z.string().uuid(),                   // required
  name: z.string().min(1).max(255),                // required
  stage: z.enum(['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).default('prospecting'),
  probability: z.number().min(0).max(100).optional(),  // auto-populated from stage if not provided (FR-021)
  estimated_value: z.number().min(0),              // required
  close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // required
  assigned_rep_id: z.string().uuid().optional(),    // defaults to authenticated user
  associated_brand_ids: z.array(z.string().uuid()).optional(),  // FR-021
  notes: z.string().optional()
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "account_id": "uuid",
    "name": "Pacific Bistro - Honey Line Expansion",
    "stage": "qualified",
    "probability": 40.00,
    "estimated_value": 15000.00,
    "weighted_value": 6000.00,
    "close_date": "2026-04-15",
    "assigned_rep_id": "uuid",
    "associated_brand_ids": ["uuid"],
    "created_at": "timestamp"
  }
}
```

**Stage-Probability Auto-Population** (FR-021):
| Stage | Default Probability |
|-------|-------------------|
| prospecting | 10% |
| qualified | 40% |
| proposal | 60% |
| negotiation | 75% |
| closed_won | 100% |
| closed_lost | 0% |

---

## GET /api/v1/opportunities/:id

Retrieve opportunity details.

**Implements**: FR-021

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "account": { "id": "uuid", "name": "Pacific Bistro" },
    "name": "Pacific Bistro - Honey Line Expansion",
    "stage": "qualified",
    "probability": 40.00,
    "estimated_value": 15000.00,
    "weighted_value": 6000.00,
    "close_date": "2026-04-15",
    "close_reason": null,
    "assigned_rep": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
    "associated_brands": [
      { "id": "uuid", "name": "Bee's Best Honey" }
    ],
    "notes": "Buyer interested in expanding honey selection",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

---

## GET /api/v1/opportunities

List opportunities with filtering.

**Implements**: FR-021, FR-022

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 60 requests/minute/user

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
  account_id: z.string().uuid().optional(),
  assigned_rep_id: z.string().uuid().optional(),
  stage: z.enum(['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
  close_date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  close_date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  min_value: z.number().min(0).optional(),
  max_value: z.number().min(0).optional(),
  exclude_closed: z.boolean().default(false),
  sort_by: z.enum(['created_at', 'estimated_value', 'close_date', 'stage', 'probability']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}
```

**Response 200 OK**:
```json
{
  "data": [ { "...opportunity summary objects..." } ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_count": 45,
    "total_pages": 2
  }
}
```

---

## PATCH /api/v1/opportunities/:id

Update an opportunity (fields, stage transition).

**Implements**: FR-021, FR-022

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body** (partial update):
```typescript
{
  name: z.string().min(1).max(255).optional(),
  stage: z.enum(['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
  probability: z.number().min(0).max(100).optional(),
  estimated_value: z.number().min(0).optional(),
  close_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  close_reason: z.string().min(1).max(1000).optional(),  // required when stage = closed_won or closed_lost (FR-022)
  assigned_rep_id: z.string().uuid().optional(),
  associated_brand_ids: z.array(z.string().uuid()).optional(),
  notes: z.string().nullable().optional()
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "stage": "negotiation",
    "probability": 75.00,
    "weighted_value": 11250.00,
    "updated_at": "timestamp"
  }
}
```

**Response 422 Unprocessable Entity** (Missing close_reason — FR-022):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Close reason is required when moving to Closed Won",
  "code": "CLOSE_REASON_REQUIRED",
  "requestId": "uuid"
}
```

**Side Effects**: Stage transitions create Activity timeline events on the associated Account (FR-022). Probability auto-updates when stage changes unless manually overridden. Pipeline materialized view refreshed.

---

## DELETE /api/v1/opportunities/:id

Soft-delete an opportunity.

**Implements**: FR-021

**Auth Required**: Role `rep`, `manager`, `admin`

**Response 200 OK**:
```json
{
  "data": { "id": "uuid", "deleted_at": "timestamp" }
}
```

---

## GET /api/v1/pipeline/kanban

Retrieve pipeline kanban board data grouped by stage.

**Implements**: FR-022

**Auth Required**: Role `rep` (own opportunities), `manager` (team), `admin` (all)

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  assigned_rep_id: z.string().uuid().optional(),     // filter by rep
  territory_id: z.string().uuid().optional(),
  close_date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  close_date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}
```

**Response 200 OK** (FR-022):
```json
{
  "data": {
    "forecast_summary": {
      "total_weighted_value": 285000.00,
      "total_unweighted_value": 520000.00,
      "opportunity_count": 45
    },
    "stages": [
      {
        "stage": "prospecting",
        "default_probability": 10,
        "opportunities": [
          {
            "id": "uuid",
            "name": "New Restaurant Group",
            "account_name": "Downtown Eats",
            "estimated_value": 25000.00,
            "weighted_value": 2500.00,
            "probability": 10,
            "close_date": "2026-05-01",
            "assigned_rep_name": "Jane Smith",
            "brands": ["Bee's Best Honey"]
          }
        ],
        "stage_total": 75000.00,
        "stage_weighted": 7500.00,
        "count": 8
      },
      {
        "stage": "qualified",
        "default_probability": 40,
        "opportunities": [ "..." ],
        "stage_total": 120000.00,
        "stage_weighted": 48000.00,
        "count": 12
      },
      {
        "stage": "proposal",
        "default_probability": 60,
        "opportunities": [ "..." ],
        "stage_total": 180000.00,
        "stage_weighted": 108000.00,
        "count": 15
      },
      {
        "stage": "negotiation",
        "default_probability": 75,
        "opportunities": [ "..." ],
        "stage_total": 145000.00,
        "stage_weighted": 108750.00,
        "count": 10
      }
    ]
  }
}
```

---

## PATCH /api/v1/pipeline/kanban/move

Drag-and-drop stage transition on the kanban board.

**Implements**: FR-022

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body**:
```typescript
{
  opportunity_id: z.string().uuid(),
  from_stage: z.enum(['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  to_stage: z.enum(['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  close_reason: z.string().min(1).max(1000).optional()  // required when to_stage is closed_won or closed_lost
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "stage": "negotiation",
    "probability": 75.00,
    "weighted_value": 11250.00,
    "forecast_summary": {
      "total_weighted_value": 286250.00,
      "total_unweighted_value": 520000.00,
      "opportunity_count": 45
    }
  }
}
```

**Response 422 Unprocessable Entity** (Close reason required):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Close reason is required when moving to Closed Won",
  "code": "CLOSE_REASON_REQUIRED",
  "requestId": "uuid"
}
```

**Side Effects**: Probability auto-updates to stage default (unless manually overridden). Forecast recalculates. Activity timeline event logged on Account (FR-022).

---

## GET /api/v1/pipeline/forecast

Retrieve pipeline forecast summary.

**Implements**: FR-022, FR-027

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  assigned_rep_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  group_by: z.enum(['stage', 'rep', 'territory', 'month']).default('stage')
}
```

**Response 200 OK**:
```json
{
  "data": {
    "total_weighted": 285000.00,
    "total_unweighted": 520000.00,
    "by_stage": [
      { "stage": "prospecting", "count": 8, "total": 75000.00, "weighted": 7500.00 },
      { "stage": "qualified", "count": 12, "total": 120000.00, "weighted": 48000.00 },
      { "stage": "proposal", "count": 15, "total": 180000.00, "weighted": 108000.00 },
      { "stage": "negotiation", "count": 10, "total": 145000.00, "weighted": 108750.00 }
    ],
    "by_rep": [
      { "rep_id": "uuid", "rep_name": "Jane Smith", "count": 6, "total": 85000.00, "weighted": 42500.00 }
    ]
  }
}
```
