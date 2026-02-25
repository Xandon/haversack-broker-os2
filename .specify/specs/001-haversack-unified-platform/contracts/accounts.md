# API Contract: Accounts

**Domain**: Account Management
**Base Path**: `/api/v1/accounts`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.

---

## POST /api/v1/accounts

Create a new Account with duplicate detection.

**Implements**: FR-001, FR-002, FR-003

**Auth Required**: Role `rep`, `manager`, or `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body**:
```typescript
{
  name: z.string().min(1).max(255),              // required — FR-002
  account_type: z.enum(['store', 'restaurant', 'distributor', 'other']),  // required
  address_line1: z.string().min(1).max(255),      // required
  address_line2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),               // required
  state: z.string().min(1).max(50),               // required
  zip_code: z.string().min(1).max(20),            // required
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  website: z.string().url().max(500).optional(),
  territory_id: z.string().uuid(),                // required — FR-001
  assigned_rep_id: z.string().uuid(),             // required
  parent_account_id: z.string().uuid().optional(),  // FR-005
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  force_create: z.boolean().default(false)        // skip duplicate warning — FR-003
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "account_type": "store",
    "address_line1": "string",
    "city": "string",
    "state": "string",
    "zip_code": "string",
    "territory_id": "uuid",
    "assigned_rep_id": "uuid",
    "health_score": null,
    "created_at": "2026-02-24T00:00:00Z",
    "updated_at": "2026-02-24T00:00:00Z"
  }
}
```

**Response 409 Conflict** (Duplicate Detected — FR-003):
```json
{
  "error": "DUPLICATE_DETECTED",
  "message": "Potential duplicate accounts found",
  "code": "ACCOUNT_DUPLICATE",
  "requestId": "uuid",
  "duplicates": [
    {
      "id": "uuid",
      "name": "Pacific Bistros",
      "confidence_pct": 85.5,
      "match_fields": ["name"]
    }
  ]
}
```

**Response 422 Unprocessable Entity** (Validation Error — FR-002):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Required field missing",
  "code": "VALIDATION_FAILED",
  "requestId": "uuid",
  "field_errors": [
    { "field": "name", "message": "Account name is required" }
  ]
}
```

---

## GET /api/v1/accounts/:id

Retrieve unified Account detail view with related data.

**Implements**: FR-004, FR-005, FR-006

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 60 requests/minute/user

**Path Params**:
```typescript
{
  id: z.string().uuid()  // Account ID
}
```

**Query Params**:
```typescript
{
  include: z.array(z.enum([
    'contacts', 'activities', 'orders', 'opportunities', 'children', 'health_score'
  ])).optional().default(['contacts', 'activities', 'orders', 'opportunities', 'health_score'])
}
```

**Response 200 OK** (FR-004 — loads within 2 seconds):
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "account_type": "store",
    "address_line1": "string",
    "city": "string",
    "state": "string",
    "zip_code": "string",
    "phone": "string",
    "territory_id": "uuid",
    "assigned_rep_id": "uuid",
    "parent_account_id": "uuid | null",
    "health_score": 72,
    "health_score_calculated_at": "2026-02-24T02:00:00Z",
    "contacts": [
      { "id": "uuid", "first_name": "string", "last_name": "string", "email": "string", "is_primary": true }
    ],
    "recent_activities": [
      { "id": "uuid", "activity_type": "visit", "subject": "string", "occurred_at": "timestamp", "user_id": "uuid" }
    ],
    "recent_orders": [
      { "id": "uuid", "order_number": "string", "status": "confirmed", "total": 1250.00, "created_at": "timestamp" }
    ],
    "open_opportunities": [
      { "id": "uuid", "name": "string", "stage": "qualified", "estimated_value": 5000.00 }
    ],
    "rollup_metrics": {
      "order_count": 42,
      "total_revenue": 125000.00,
      "last_activity_date": "2026-02-20T14:30:00Z",
      "child_count": 3
    },
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

---

## GET /api/v1/accounts

List accounts with filtering, pagination, and sorting.

**Implements**: FR-004

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 60 requests/minute/user

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
  sort_by: z.enum(['name', 'created_at', 'health_score', 'updated_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  territory_id: z.string().uuid().optional(),
  account_type: z.enum(['store', 'restaurant', 'distributor', 'other']).optional(),
  assigned_rep_id: z.string().uuid().optional(),
  health_score_min: z.number().int().min(0).max(100).optional(),
  health_score_max: z.number().int().min(0).max(100).optional(),
  is_active: z.boolean().default(true),
  parent_account_id: z.string().uuid().optional()
}
```

**Response 200 OK**:
```json
{
  "data": [ { "...account objects..." } ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_count": 342,
    "total_pages": 14
  }
}
```

---

## PATCH /api/v1/accounts/:id

Update an existing Account. Writes to audit trail.

**Implements**: FR-001, FR-005

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Path Params**:
```typescript
{
  id: z.string().uuid()
}
```

**Request Body** (partial update):
```typescript
{
  name: z.string().min(1).max(255).optional(),
  account_type: z.enum(['store', 'restaurant', 'distributor', 'other']).optional(),
  address_line1: z.string().max(255).optional(),
  address_line2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip_code: z.string().max(20).optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  territory_id: z.string().uuid().optional(),
  assigned_rep_id: z.string().uuid().optional(),
  parent_account_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated account object..." }
}
```

---

## DELETE /api/v1/accounts/:id

Soft-delete an Account. Sets deleted_at timestamp. Writes to audit trail.

**Implements**: FR-001

**Auth Required**: Role `admin`

**Rate Limit**: 10 requests/minute/user

**Response 200 OK**:
```json
{
  "data": { "id": "uuid", "deleted_at": "timestamp" },
  "message": "Account soft-deleted successfully"
}
```

---

## GET /api/v1/accounts/search

Full-text search across Account records.

**Implements**: FR-007

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 120 requests/minute/user

**Performance**: p95 < 200ms for up to 50,000 Account records (NFR-003)

**Query Params**:
```typescript
{
  q: z.string().min(3).max(200),  // search query — FR-007 requires 3+ chars
  limit: z.number().int().min(1).max(50).default(10),
  territory_id: z.string().uuid().optional(),
  account_type: z.enum(['store', 'restaurant', 'distributor', 'other']).optional()
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pacific Bistro",
      "account_type": "restaurant",
      "city": "Portland",
      "territory_name": "Portland Metro",
      "assigned_rep_name": "Jane Smith",
      "health_score": 72,
      "relevance_score": 0.95,
      "matched_fields": ["name"]
    }
  ],
  "query": "pacific",
  "total_count": 3
}
```

**Response 200 OK** (No results — FR-007):
```json
{
  "data": [],
  "query": "xyznonexistent",
  "total_count": 0,
  "message": "No accounts found for 'xyznonexistent'"
}
```

---

## GET /api/v1/accounts/:id/health-score

Retrieve Account health score details.

**Implements**: FR-006

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Response 200 OK**:
```json
{
  "data": {
    "account_id": "uuid",
    "health_score": 72,
    "calculated_at": "2026-02-24T02:00:00Z",
    "factors": {
      "days_since_last_activity": { "value": 5, "weight": 0.30, "score": 85 },
      "order_frequency_vs_average": { "value": 1.2, "weight": 0.25, "score": 75 },
      "order_value_trend": { "value": "increasing", "weight": 0.25, "score": 80 },
      "contact_engagement_recency": { "value": 3, "weight": 0.20, "score": 45 }
    }
  }
}
```

**Response 200 OK** (New Account — FR-006):
```json
{
  "data": {
    "account_id": "uuid",
    "health_score": null,
    "calculated_at": null,
    "message": "Health score calculating..."
  }
}
```

---

## GET /api/v1/accounts/:id/children

List child accounts in hierarchy.

**Implements**: FR-005

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pacific Bistro - Downtown",
      "order_count": 15,
      "total_revenue": 42000.00,
      "last_activity_date": "2026-02-20T14:30:00Z",
      "health_score": 68
    }
  ],
  "rollup": {
    "total_order_count": 42,
    "total_revenue": 125000.00,
    "last_activity_date": "2026-02-22T09:15:00Z"
  }
}
```

---

## POST /api/v1/accounts/:id/contacts

Add a Contact to an Account.

**Implements**: FR-001, FR-004

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body**:
```typescript
{
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  title: z.string().max(100).optional(),
  is_primary: z.boolean().default(false),
  notes: z.string().optional()
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "account_id": "uuid",
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "is_primary": true,
    "created_at": "timestamp"
  }
}
```

---

## GET /api/v1/accounts/:id/contacts

List contacts for an Account.

**Implements**: FR-004

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "string",
      "last_name": "string",
      "email": "string",
      "phone": "string",
      "title": "string",
      "is_primary": true
    }
  ]
}
```

---

## PATCH /api/v1/contacts/:id

Update a Contact.

**Implements**: FR-004

**Auth Required**: Role `rep`, `manager`, `admin`

**Request Body** (partial update):
```typescript
{
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  title: z.string().max(100).nullable().optional(),
  is_primary: z.boolean().optional(),
  opt_out_email: z.boolean().optional(),
  notes: z.string().nullable().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated contact object..." }
}
```

---

## DELETE /api/v1/contacts/:id

Soft-delete a Contact.

**Implements**: FR-004

**Auth Required**: Role `admin`

**Response 200 OK**:
```json
{
  "data": { "id": "uuid", "deleted_at": "timestamp" }
}
```
