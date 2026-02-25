# API Contract: Dashboards & Reports

**Domain**: Rep Dashboard, Manager Dashboard, Custom Reports
**Base Path**: `/api/v1/dashboards`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.

---

## GET /api/v1/dashboards/rep

Retrieve the Rep KPI dashboard.

**Implements**: FR-026

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Performance**: Loading within 3 seconds (FR-026)

**Query Params**:
```typescript
{
  rep_id: z.string().uuid().optional(),            // defaults to authenticated user; managers/admins can view any rep
  month: z.string().regex(/^\d{4}-\d{2}$/).optional()  // defaults to current month
}
```

**Response 200 OK** (FR-026):
```json
{
  "data": {
    "rep": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
    "period": "2026-02",
    "kpis": {
      "current_month_revenue": 42500.00,
      "trailing_12m_revenue": 385000.00,
      "account_count": 45,
      "activity_count_current_month": 28,
      "opportunity_count": 6,
      "weighted_pipeline_value": 42500.00,
      "commission_current_month": 4250.75,
      "commission_ytd": 8500.00
    },
    "health_distribution": {
      "healthy": 28,
      "at_risk": 12,
      "critical": 5,
      "new": 0
    },
    "recent_activities": [
      {
        "id": "uuid",
        "activity_type": "visit",
        "account_name": "Pacific Bistro",
        "occurred_at": "2026-02-24T14:30:00Z"
      }
    ],
    "upcoming_tasks": [
      {
        "id": "uuid",
        "title": "Follow up on honey samples",
        "due_date": "2026-02-26T14:00:00Z",
        "priority": "high",
        "account_name": "Pacific Bistro"
      }
    ],
    "generated_at": "2026-02-24T15:00:00Z"
  }
}
```

---

## GET /api/v1/dashboards/rep/health-accounts

List accounts filtered by health score range. Supports click-through from dashboard.

**Implements**: FR-026

**Auth Required**: Role `rep`, `manager`, `admin`

**Query Params**:
```typescript
{
  rep_id: z.string().uuid().optional(),
  health_category: z.enum(['healthy', 'at_risk', 'critical']),  // healthy: 70-100, at_risk: 40-69, critical: 0-39
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
  sort_by: z.enum(['health_score', 'name', 'last_activity_date']).default('health_score'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
}
```

**Response 200 OK** (FR-026 — click critical count navigates to filtered list):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mountain Coffee",
      "health_score": 28,
      "last_activity_date": "2025-12-10T10:00:00Z",
      "days_since_activity": 76,
      "territory_name": "Portland Metro",
      "order_count_12m": 2,
      "total_revenue_12m": 3200.00
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total_count": 5 },
  "health_range": { "min": 0, "max": 39 }
}
```

---

## GET /api/v1/dashboards/manager

Retrieve the Manager team dashboard.

**Implements**: FR-027

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Performance**: Updates within 2 seconds when date filters applied (FR-027)

**Query Params**:
```typescript
{
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),     // defaults to current month
  territory_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}
```

**Response 200 OK** (FR-027):
```json
{
  "data": {
    "period": "2026-02",
    "aggregate_metrics": {
      "total_monthly_revenue": 385000.00,
      "total_orders": 156,
      "total_activities": 245,
      "total_pipeline_value": 520000.00,
      "weighted_pipeline_value": 285000.00,
      "active_account_count": 342,
      "average_health_score": 68.5
    },
    "rep_rankings": [
      {
        "rank": 1,
        "rep": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
        "territory": "Portland Metro",
        "revenue": 52000.00,
        "order_count": 22,
        "activity_count": 35,
        "pipeline_value": 85000.00,
        "account_count": 45,
        "commission_earned": 5200.00
      },
      {
        "rank": 2,
        "rep": { "id": "uuid", "first_name": "Tom", "last_name": "Davis" },
        "territory": "Seattle Metro",
        "revenue": 48000.00,
        "order_count": 19,
        "activity_count": 28,
        "pipeline_value": 72000.00,
        "account_count": 38,
        "commission_earned": 4800.00
      }
    ],
    "territory_density": [
      {
        "territory_id": "uuid",
        "territory_name": "Portland Metro",
        "revenue": 52000.00,
        "account_count": 45,
        "revenue_per_account": 1155.56
      }
    ],
    "pipeline_forecast": {
      "by_stage": [
        { "stage": "prospecting", "count": 8, "total": 75000.00, "weighted": 7500.00 },
        { "stage": "qualified", "count": 12, "total": 120000.00, "weighted": 48000.00 },
        { "stage": "proposal", "count": 15, "total": 180000.00, "weighted": 108000.00 },
        { "stage": "negotiation", "count": 10, "total": 145000.00, "weighted": 108750.00 }
      ],
      "total_weighted": 272250.00
    },
    "generated_at": "2026-02-24T15:00:00Z"
  }
}
```

---

## GET /api/v1/dashboards/manager/territory-heatmap

Retrieve territory revenue density data for heat map visualization.

**Implements**: FR-027

**Auth Required**: Role `manager`, `admin`

**Query Params**:
```typescript
{
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  metric: z.enum(['revenue', 'order_count', 'activity_count', 'account_count']).default('revenue')
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "territory_id": "uuid",
      "territory_name": "Portland Metro",
      "boundary": { "type": "Polygon", "coordinates": [ "..." ] },
      "metric_value": 52000.00,
      "metric_name": "revenue",
      "assigned_rep_name": "Jane Smith",
      "account_count": 45
    }
  ]
}
```

---

## POST /api/v1/reports/custom

Create and execute a custom report.

**Implements**: FR-028

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Performance**: Export within 10 seconds for up to 500 records (FR-028)

**Request Body**:
```typescript
{
  name: z.string().max(255).optional(),             // optional report name for saving
  entity_type: z.enum(['account', 'contact', 'order', 'opportunity', 'activity', 'product', 'commission']),
  columns: z.array(z.string()).min(1),              // field names to include
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'between', 'in', 'is_null', 'is_not_null']),
    value: z.unknown()
  })).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().int().min(1).max(500).default(500),
  format: z.enum(['json', 'csv', 'xlsx']).default('json')
}
```

**Response 200 OK** (format = json):
```json
{
  "data": {
    "report_name": "High-Value Accounts Q1",
    "entity_type": "account",
    "columns": ["name", "territory", "total_revenue_12m", "health_score"],
    "rows": [
      {
        "name": "Pacific Bistro",
        "territory": "Portland Metro",
        "total_revenue_12m": 42500.00,
        "health_score": 72
      }
    ],
    "total_count": 45,
    "generated_at": "2026-02-24T15:00:00Z"
  }
}
```

**Response 200 OK** (format = csv or xlsx — FR-028):
```json
{
  "data": {
    "report_name": "High-Value Accounts Q1",
    "entity_type": "account",
    "total_count": 45,
    "download_url": "https://storage.../report-high-value-accounts-2026-02.xlsx",
    "format": "xlsx",
    "generated_at": "2026-02-24T15:00:00Z"
  }
}
```

---

## GET /api/v1/reports/saved

List saved custom reports.

**Implements**: FR-028

**Auth Required**: Role `manager`, `admin`

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20)
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "High-Value Accounts Q1",
      "entity_type": "account",
      "column_count": 4,
      "filter_count": 2,
      "created_by": "Mike Johnson",
      "last_run_at": "2026-02-24T15:00:00Z",
      "created_at": "timestamp"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 5 }
}
```

---

## POST /api/v1/reports/saved/:id/run

Re-execute a saved report.

**Implements**: FR-028

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Query Params**:
```typescript
{
  format: z.enum(['json', 'csv', 'xlsx']).default('json')
}
```

**Response 200 OK**: Same response shape as `POST /api/v1/reports/custom`.

---

## DELETE /api/v1/reports/saved/:id

Delete a saved report.

**Implements**: FR-028

**Auth Required**: Role `manager`, `admin`

**Response 200 OK**:
```json
{
  "message": "Report deleted successfully"
}
```

---

## GET /api/v1/dashboards/notifications

List notifications for the authenticated user.

**Implements**: FR-012, FR-017

**Auth Required**: All authenticated roles

**Rate Limit**: 60 requests/minute/user

**Query Params**:
```typescript
{
  is_read: z.boolean().optional(),
  type: z.enum(['task_reminder', 'approval_request', 'approval_result', 'commission_approved', 'rule_triggered', 'system', 'import_complete']).optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20)
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "task_reminder",
      "title": "Task due in 1 hour",
      "body": "Follow up on honey samples — Pacific Bistro",
      "reference_type": "task",
      "reference_id": "uuid",
      "is_read": false,
      "created_at": "2026-02-24T13:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 8 },
  "unread_count": 5
}
```

---

## PATCH /api/v1/dashboards/notifications/:id/read

Mark a notification as read.

**Implements**: FR-012

**Auth Required**: All authenticated roles

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "is_read": true,
    "read_at": "2026-02-24T15:30:00Z"
  }
}
```

---

## POST /api/v1/dashboards/notifications/read-all

Mark all notifications as read.

**Implements**: FR-012

**Auth Required**: All authenticated roles

**Response 200 OK**:
```json
{
  "data": {
    "marked_count": 5
  }
}
```
