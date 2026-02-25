# API Contract: Activities

**Domain**: Activity Logging, Timeline, Email Tracking, Tasks
**Base Path**: `/api/v1`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.

---

## POST /api/v1/activities

Log a new activity (quick-log). Pre-populated fields reduce entry time to under 60 seconds.

**Implements**: FR-008

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 60 requests/minute/user

**Request Body**:
```typescript
{
  account_id: z.string().uuid(),                 // required
  contact_id: z.string().uuid().optional(),
  activity_type: z.enum(['visit', 'call', 'email', 'demo', 'sampling', 'task', 'note']),  // required — FR-008
  subject: z.string().max(255).optional(),
  notes: z.string().optional(),
  occurred_at: z.string().datetime().default('now'),  // pre-populated with current time
  duration_minutes: z.number().int().min(0).optional(),
  metadata: z.object({}).passthrough().optional()     // type-specific extra fields
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "account_id": "uuid",
    "user_id": "uuid",
    "activity_type": "visit",
    "subject": "Store visit - product review",
    "occurred_at": "2026-02-24T14:30:00Z",
    "created_at": "2026-02-24T14:30:02Z"
  }
}
```

---

## POST /api/v1/activities/demo

Log a demo activity with product sampling details.

**Implements**: FR-008

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body**:
```typescript
{
  account_id: z.string().uuid(),
  contact_id: z.string().uuid().optional(),
  subject: z.string().max(255).optional(),
  notes: z.string().optional(),
  occurred_at: z.string().datetime().default('now'),
  demos: z.array(z.object({
    product_id: z.string().uuid(),               // product demoed
    quantity_sampled: z.number().int().min(1),    // quantity sampled
    buyer_feedback: z.string().optional(),        // buyer feedback
    outcome: z.enum(['interested', 'not_interested', 'order_placed', 'follow_up_needed']).default('follow_up_needed')
  })).min(1)
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "activity_type": "demo",
    "demos": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Organic Honey 12oz",
        "quantity_sampled": 3,
        "outcome": "interested"
      }
    ],
    "created_at": "timestamp"
  }
}
```

---

## GET /api/v1/accounts/:account_id/timeline

Retrieve activity timeline for an Account with infinite scroll.

**Implements**: FR-009

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 60 requests/minute/user

**Performance**: Loading within 500ms per page (FR-009)

**Query Params**:
```typescript
{
  cursor: z.string().optional(),        // cursor for infinite scroll pagination
  limit: z.number().int().min(1).max(50).default(20),   // 20 items per page — FR-009
  activity_type: z.enum(['visit', 'call', 'email', 'demo', 'sampling', 'task', 'note', 'system']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "activity_type": "visit",
      "subject": "Store visit",
      "notes": "Reviewed new product placement",
      "occurred_at": "2026-02-24T14:30:00Z",
      "user": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
      "contact": { "id": "uuid", "first_name": "Bob", "last_name": "Jones" },
      "demos": [],
      "created_at": "timestamp"
    },
    {
      "id": "uuid",
      "activity_type": "system",
      "subject": "Order #1042 confirmed",
      "occurred_at": "2026-02-23T10:00:00Z",
      "metadata": { "order_id": "uuid", "event": "order_confirmed" }
    }
  ],
  "pagination": {
    "next_cursor": "eyJvY2N1cnJlZF9hdCI6...",
    "has_more": true
  }
}
```

---

## GET /api/v1/activities/:id

Retrieve a single activity with full details.

**Implements**: FR-008, FR-009

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "account_id": "uuid",
    "user_id": "uuid",
    "contact_id": "uuid",
    "activity_type": "demo",
    "subject": "string",
    "notes": "string",
    "occurred_at": "timestamp",
    "duration_minutes": 45,
    "demos": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Organic Honey",
        "quantity_sampled": 3,
        "buyer_feedback": "Very interested, wants to order next week",
        "outcome": "interested"
      }
    ],
    "metadata": {},
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

---

## PATCH /api/v1/activities/:id

Update an existing activity.

**Implements**: FR-008

**Auth Required**: Role `rep`, `manager`, `admin`

**Request Body** (partial update):
```typescript
{
  subject: z.string().max(255).optional(),
  notes: z.string().optional(),
  occurred_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(0).optional(),
  metadata: z.object({}).passthrough().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated activity object..." }
}
```

---

## POST /api/v1/emails/track

Record an email send and initiate tracking.

**Implements**: FR-010

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body**:
```typescript
{
  account_id: z.string().uuid().optional(),      // auto-linked if contact matched
  contact_id: z.string().uuid().optional(),      // auto-linked by email address
  from_address: z.string().email(),
  to_addresses: z.array(z.string().email()).min(1),
  cc_addresses: z.array(z.string().email()).optional(),
  subject: z.string().max(500),
  body_preview: z.string().max(1000).optional(),
  direction: z.enum(['inbound', 'outbound']),
  message_id: z.string().max(500).optional(),
  thread_id: z.string().max(500).optional()
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "account_id": "uuid | null",
    "contact_id": "uuid | null",
    "is_matched": true,
    "engagement_status": "sent",
    "tracking_pixel_url": "https://...",
    "created_at": "timestamp"
  }
}
```

---

## POST /api/v1/emails/webhook/engagement

Receive email engagement events (opens, clicks, bounces).

**Implements**: FR-010

**Auth Required**: Webhook signature verification (not JWT)

**Rate Limit**: 1000 requests/minute (webhook)

**Request Body**:
```typescript
{
  message_id: z.string(),
  event_type: z.enum(['opened', 'clicked', 'bounced', 'unsubscribed']),
  timestamp: z.string().datetime(),
  metadata: z.object({
    click_url: z.string().url().optional(),
    bounce_reason: z.string().optional(),
    user_agent: z.string().optional()
  }).optional()
}
```

**Response 200 OK**:
```json
{
  "status": "processed"
}
```

**Side Effects**: Updates EmailRecord engagement_status, timestamps. Creates Activity timeline event on Account within 60 seconds (FR-010).

---

## GET /api/v1/emails/unmatched

List unmatched inbound emails.

**Implements**: FR-011

**Auth Required**: Role `rep`, `manager`

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20),
  sort_by: z.enum(['created_at', 'from_address']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "from_address": "unknown@example.com",
      "to_addresses": ["rep@haversack.com"],
      "subject": "Re: Product inquiry",
      "body_preview": "Thanks for the samples...",
      "direction": "inbound",
      "created_at": "timestamp"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 5 }
}
```

---

## PATCH /api/v1/emails/:id/match

Manually associate an unmatched email with a Contact and Account.

**Implements**: FR-011

**Auth Required**: Role `rep`, `manager`

**Request Body**:
```typescript
{
  contact_id: z.string().uuid(),
  account_id: z.string().uuid()
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "is_matched": true,
    "contact_id": "uuid",
    "account_id": "uuid"
  }
}
```

---

## POST /api/v1/tasks

Create a new task with reminders.

**Implements**: FR-012

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Request Body**:
```typescript
{
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  due_date: z.string().datetime(),              // required — FR-012
  priority: z.enum(['high', 'medium', 'low']),   // required — FR-012
  assigned_to_id: z.string().uuid(),             // required — FR-012
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional()
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "title": "Follow up on honey samples",
    "due_date": "2026-02-26T14:00:00Z",
    "priority": "high",
    "status": "pending",
    "assigned_to_id": "uuid",
    "created_at": "timestamp"
  }
}
```

**Response 200 OK with Warning** (past due date):
```json
{
  "data": { "...task..." },
  "warnings": [
    "Due date is in the past — this task will appear as overdue immediately"
  ]
}
```

---

## GET /api/v1/tasks

List tasks for the authenticated user.

**Implements**: FR-012

**Auth Required**: Role `rep`, `manager`, `admin`

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  assigned_to_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  overdue_only: z.boolean().default(false),
  sort_by: z.enum(['due_date', 'priority', 'created_at']).default('due_date'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Follow up on honey samples",
      "due_date": "2026-02-26T14:00:00Z",
      "priority": "high",
      "status": "pending",
      "is_overdue": false,
      "assigned_to": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
      "account": { "id": "uuid", "name": "Pacific Bistro" }
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total_count": 12 }
}
```

---

## PATCH /api/v1/tasks/:id

Update a task (status, priority, due date, etc.).

**Implements**: FR-012

**Auth Required**: Role `rep`, `manager`, `admin`

**Request Body** (partial update):
```typescript
{
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  assigned_to_id: z.string().uuid().optional()
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated task object..." }
}
```

---

## DELETE /api/v1/tasks/:id

Delete a task.

**Implements**: FR-012

**Auth Required**: Role `rep`, `manager`, `admin`

**Response 200 OK**:
```json
{
  "message": "Task deleted successfully"
}
```
