# API Contract: Admin

**Domain**: User Management, Data Import, Business Rules, Data Quality
**Base Path**: `/api/v1/admin`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.

---

## POST /api/v1/admin/users

Create a new user account.

**Implements**: FR-029

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  email: z.string().email().max(255),                // required, unique per tenant
  first_name: z.string().min(1).max(100),            // required
  last_name: z.string().min(1).max(100),             // required
  password: z.string().min(12).max(128),             // required, hashed with bcrypt cost 12
  role: z.enum(['admin', 'manager', 'rep', 'logistics', 'viewer']),  // required — 5 roles (NFR-008)
  territory_id: z.string().uuid().optional(),         // required when role = 'rep'
  avatar_url: z.string().url().optional()
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "email": "jane@haversack.com",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "rep",
    "territory_id": "uuid",
    "is_active": true,
    "created_at": "timestamp"
  }
}
```

**Side Effects**: Audit trail entry (User created).

---

## GET /api/v1/admin/users

List all users.

**Implements**: FR-029

**Auth Required**: Role `admin`

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
  role: z.enum(['admin', 'manager', 'rep', 'logistics', 'viewer']).optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100).optional(),
  sort_by: z.enum(['first_name', 'last_name', 'email', 'role', 'created_at', 'last_login_at']).default('last_name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "jane@haversack.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "role": "rep",
      "territory": { "id": "uuid", "name": "Portland Metro" },
      "is_active": true,
      "last_login_at": "2026-02-24T09:00:00Z",
      "created_at": "timestamp"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total_count": 12 }
}
```

---

## PATCH /api/v1/admin/users/:id

Update a user account (role change, territory reassignment, etc.).

**Implements**: FR-029

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body** (partial update):
```typescript
{
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['admin', 'manager', 'rep', 'logistics', 'viewer']).optional(),
  territory_id: z.string().uuid().nullable().optional(),
  avatar_url: z.string().url().nullable().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated user object..." }
}
```

**Side Effects**: Permission changes take effect within 60 seconds without re-authentication (FR-029). Audit trail entry with old/new role values.

---

## POST /api/v1/admin/users/:id/deactivate

Deactivate a user account. Invalidates all sessions.

**Implements**: FR-030

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  reason: z.string().max(500).optional()
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "is_active": false,
    "deactivated_at": "2026-02-24T17:00:00Z"
  },
  "message": "User deactivated. All sessions invalidated."
}
```

**Side Effects**: All active sessions invalidated within 15 seconds (FR-030). User redirected to login on next request. Audit trail entry.

---

## POST /api/v1/admin/users/:id/reactivate

Reactivate a previously deactivated user.

**Implements**: FR-029

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "is_active": true,
    "reactivated_at": "2026-02-24T17:30:00Z"
  }
}
```

---

## POST /api/v1/admin/import/upload

Upload a CSV/XLSX file for import validation.

**Implements**: FR-031, FR-032

**Auth Required**: Role `admin`

**Rate Limit**: 5 requests/minute/user

**Request Body** (multipart/form-data):
```typescript
{
  file: File,                                       // CSV or XLSX, max 50MB (FR-032)
  entity_type: z.enum(['account', 'contact', 'product', 'order'])  // target entity (FR-031)
}
```

**Response 201 Created** (Upload successful, validation pending):
```json
{
  "data": {
    "import_job_id": "uuid",
    "file_name": "accounts-import.csv",
    "file_size_bytes": 1250000,
    "entity_type": "account",
    "status": "validating"
  }
}
```

**Response 413 Payload Too Large** (FR-032):
```json
{
  "error": "FILE_TOO_LARGE",
  "message": "Import file exceeds the 50 MB limit. Please reduce the file size and try again.",
  "code": "IMPORT_FILE_TOO_LARGE",
  "requestId": "uuid"
}
```

---

## GET /api/v1/admin/import/:job_id/preview

Retrieve pre-import preview with validation results.

**Implements**: FR-031

**Auth Required**: Role `admin`

**Response 200 OK** (FR-031):
```json
{
  "data": {
    "import_job_id": "uuid",
    "entity_type": "account",
    "status": "preview",
    "summary": {
      "total_rows": 200,
      "valid_rows": 195,
      "error_rows": 5
    },
    "errors": [
      {
        "row": 12,
        "field": "zip_code",
        "value": "ABC",
        "message": "Invalid ZIP code format"
      },
      {
        "row": 45,
        "field": "account_type",
        "value": "bakery",
        "message": "Must be one of: store, restaurant, distributor, other"
      }
    ],
    "preview_rows": [
      { "row": 1, "data": { "name": "Pacific Bistro", "city": "Portland" }, "valid": true },
      { "row": 2, "data": { "name": "Mountain Coffee", "city": "Bend" }, "valid": true }
    ],
    "unmapped_columns": ["custom_field_1", "notes_old"],
    "unmapped_warning": "2 columns not in canonical field definitions will be skipped: custom_field_1, notes_old"
  }
}
```

---

## POST /api/v1/admin/import/:job_id/execute

Execute the import for valid rows.

**Implements**: FR-031

**Auth Required**: Role `admin`

**Rate Limit**: 2 requests/minute/user

**Request Body**:
```typescript
{
  import_valid_only: z.boolean().default(true)    // skip error rows
}
```

**Response 200 OK**:
```json
{
  "data": {
    "import_job_id": "uuid",
    "status": "completed",
    "imported_rows": 195,
    "skipped_rows": 5,
    "error_log_url": "https://storage.../import-errors-uuid.csv",
    "completed_at": "2026-02-24T18:00:00Z"
  }
}
```

---

## GET /api/v1/admin/import

List import jobs.

**Implements**: FR-031

**Auth Required**: Role `admin`

**Query Params**:
```typescript
{
  entity_type: z.enum(['account', 'contact', 'product', 'order']).optional(),
  status: z.enum(['uploaded', 'validating', 'preview', 'importing', 'completed', 'failed']).optional(),
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
      "entity_type": "account",
      "file_name": "accounts-import.csv",
      "status": "completed",
      "total_rows": 200,
      "imported_rows": 195,
      "error_rows": 5,
      "uploaded_by": "Admin User",
      "created_at": "timestamp",
      "completed_at": "timestamp"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 8 }
}
```

---

## GET /api/v1/admin/business-rules

List business rules.

**Implements**: FR-034

**Auth Required**: Role `admin`

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  entity_type: z.enum(['account', 'contact', 'order', 'opportunity', 'activity', 'product']).optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25)
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Low Health Score Alert",
      "entity_type": "account",
      "trigger_event": "field_change",
      "conditions": [
        { "field": "health_score", "operator": "less_than", "value": 30, "logical": "AND" }
      ],
      "actions": [
        { "type": "create_task", "config": { "title": "Follow up on at-risk account", "priority": "high" } },
        { "type": "notify", "config": { "recipient": "assigned_rep", "message": "Account health critical" } }
      ],
      "priority": 10,
      "is_active": true,
      "last_triggered_at": "2026-02-24T02:15:00Z",
      "trigger_count": 42,
      "created_at": "timestamp"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total_count": 12 }
}
```

---

## POST /api/v1/admin/business-rules

Create a new business rule.

**Implements**: FR-034

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  entity_type: z.enum(['account', 'contact', 'order', 'opportunity', 'activity', 'product']),
  trigger_event: z.enum(['create', 'update', 'delete', 'schedule', 'field_change']),
  conditions: z.array(z.object({
    field: z.string().min(1),                    // must reference a valid entity field (FR-034)
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'in', 'not_in', 'is_null', 'is_not_null']),
    value: z.unknown(),                          // type depends on field
    logical: z.enum(['AND', 'OR']).default('AND')
  })).min(1),
  actions: z.array(z.object({
    type: z.enum(['notify', 'update_field', 'create_task', 'send_email']),
    config: z.object({}).passthrough()           // action-specific configuration
  })).min(1),
  priority: z.number().int().min(1).default(100),
  is_active: z.boolean().default(true)
}
```

**Response 201 Created**:
```json
{
  "data": { "...business rule object..." }
}
```

**Response 422 Unprocessable Entity** (Invalid field reference — FR-034):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Field 'Account.foobar' does not exist",
  "code": "INVALID_FIELD_REFERENCE",
  "requestId": "uuid",
  "field_errors": [
    { "field": "conditions[0].field", "message": "Field 'Account.foobar' does not exist in the Account entity" }
  ]
}
```

---

## PATCH /api/v1/admin/business-rules/:id

Update an existing business rule.

**Implements**: FR-034

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body** (partial update):
```typescript
{
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'in', 'not_in', 'is_null', 'is_not_null']),
    value: z.unknown(),
    logical: z.enum(['AND', 'OR']).default('AND')
  })).optional(),
  actions: z.array(z.object({
    type: z.enum(['notify', 'update_field', 'create_task', 'send_email']),
    config: z.object({}).passthrough()
  })).optional(),
  priority: z.number().int().min(1).optional(),
  is_active: z.boolean().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated business rule object..." }
}
```

---

## DELETE /api/v1/admin/business-rules/:id

Delete a business rule.

**Implements**: FR-034

**Auth Required**: Role `admin`

**Response 200 OK**:
```json
{
  "message": "Business rule deleted successfully"
}
```

---

## GET /api/v1/admin/data-quality

Retrieve the latest data quality scorecard.

**Implements**: FR-033

**Auth Required**: Role `admin`, `manager`

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}
```

**Response 200 OK** (FR-033):
```json
{
  "data": {
    "calculated_at": "2026-02-24T02:00:00Z",
    "overall_score": 87.5,
    "metrics": {
      "account_field_completeness_pct": 92.3,
      "contact_email_validity_pct": 88.7,
      "product_image_coverage_pct": 75.2,
      "duplicate_account_count": 8,
      "stale_account_count": 12
    },
    "trend": [
      { "date": "2026-02-23", "overall_score": 86.8 },
      { "date": "2026-02-22", "overall_score": 86.2 }
    ]
  }
}
```

---

## POST /api/v1/admin/data-quality/recalculate

Trigger an on-demand data quality recalculation.

**Implements**: FR-033

**Auth Required**: Role `admin`

**Rate Limit**: 1 request/hour/user

**Response 202 Accepted**:
```json
{
  "message": "Data quality recalculation queued",
  "data": {
    "job_id": "uuid",
    "estimated_completion": "2026-02-24T18:05:00Z"
  }
}
```

---

## GET /api/v1/admin/audit-trail

Query audit trail records.

**Implements**: NFR-014

**Auth Required**: Role `admin`

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  entity_type: z.enum(['account', 'order', 'commission', 'user']).optional(),
  entity_id: z.string().uuid().optional(),
  actor_id: z.string().uuid().optional(),
  action: z.enum(['create', 'update', 'delete']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
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
      "actor": { "id": "uuid", "email": "admin@haversack.com" },
      "entity_type": "account",
      "entity_id": "uuid",
      "action": "update",
      "field_name": "health_score",
      "old_value": "72",
      "new_value": "68",
      "created_at": "2026-02-24T02:00:00Z",
      "request_id": "uuid"
    }
  ],
  "pagination": { "page": 1, "per_page": 50, "total_count": 1250 }
}
```

---

## GET /api/v1/admin/territories

List territories.

**Implements**: FR-001

**Auth Required**: Role `admin`, `manager`

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Portland Metro",
      "region": "Pacific Northwest",
      "assigned_rep": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
      "commission_modifier": 1.00,
      "account_count": 45,
      "is_active": true
    }
  ]
}
```

---

## POST /api/v1/admin/territories

Create a new territory.

**Implements**: FR-001

**Auth Required**: Role `admin`

**Request Body**:
```typescript
{
  name: z.string().min(1).max(255),
  region: z.string().min(1).max(100),
  zip_codes: z.array(z.string()).default([]),
  boundary: z.object({}).passthrough().optional(),
  assigned_rep_id: z.string().uuid().optional(),
  commission_modifier: z.number().min(0.80).max(1.20).default(1.00)
}
```

**Response 201 Created**:
```json
{
  "data": { "...territory object..." }
}
```

---

## PATCH /api/v1/admin/territories/:id

Update a territory.

**Implements**: FR-001

**Auth Required**: Role `admin`

**Request Body** (partial update):
```typescript
{
  name: z.string().min(1).max(255).optional(),
  region: z.string().max(100).optional(),
  zip_codes: z.array(z.string()).optional(),
  boundary: z.object({}).passthrough().nullable().optional(),
  assigned_rep_id: z.string().uuid().nullable().optional(),
  commission_modifier: z.number().min(0.80).max(1.20).optional(),
  is_active: z.boolean().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated territory object..." }
}
```
