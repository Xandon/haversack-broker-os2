# API Contract: Orders

**Domain**: Order Entry, Product Search, Multi-Vendor Splitting, Approval
**Base Path**: `/api/v1`
**Auth**: All endpoints require JWT Bearer token. RLS enforced via tenant_id.

---

## POST /api/v1/orders

Create a new Order with line items. Automatically splits into vendor sub-orders when products span multiple brands.

**Implements**: FR-013, FR-014, FR-016, FR-017

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 20 requests/minute/user

**Request Body**:
```typescript
{
  account_id: z.string().uuid(),                 // required
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),               // required
    quantity: z.number().int().min(1),            // required
    unit_price: z.number().min(0).optional(),     // defaults to product price or promo price (FR-016)
    revenue_model: z.enum(['broker', 'wholesale']).optional(),  // defaults to product default (FR-013)
    lot_number: z.string().max(100).optional(),   // FSMA 204
    batch_id: z.string().max(100).optional(),     // FSMA 204
    notes: z.string().optional()
  })).min(1)
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORD-2026-001042",
    "account_id": "uuid",
    "rep_id": "uuid",
    "status": "pending",
    "subtotal": 4250.00,
    "total": 4250.00,
    "approval_required": false,
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Organic Honey 12oz",
        "quantity": 24,
        "unit_price": 8.50,
        "line_total": 204.00,
        "revenue_model": "broker",
        "promo_applied": false
      }
    ],
    "vendor_sub_orders": [],
    "created_at": "timestamp"
  }
}
```

**Response 201 Created** (Multi-vendor — creates sub-orders — FR-014):
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORD-2026-001043",
    "status": "pending",
    "total": 12500.00,
    "approval_required": true,
    "vendor_sub_orders": [
      {
        "id": "uuid",
        "order_number": "ORD-2026-001043-A",
        "vendor_brand": { "id": "uuid", "name": "Bee's Best Honey" },
        "subtotal": 5200.00,
        "item_count": 3
      },
      {
        "id": "uuid",
        "order_number": "ORD-2026-001043-B",
        "vendor_brand": { "id": "uuid", "name": "Pacific Preserves" },
        "subtotal": 4800.00,
        "item_count": 4
      },
      {
        "id": "uuid",
        "order_number": "ORD-2026-001043-C",
        "vendor_brand": { "id": "uuid", "name": "NW Spice Co" },
        "subtotal": 2500.00,
        "item_count": 3
      }
    ]
  }
}
```

**Note on Approval**: If total >= $5,000, status is set to "pending_approval" and a notification is sent to the assigned manager within 30 seconds (FR-017).

---

## GET /api/v1/orders/:id

Retrieve order details with all line items and sub-orders.

**Implements**: FR-013, FR-014

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 60 requests/minute/user

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORD-2026-001042",
    "account": { "id": "uuid", "name": "Pacific Bistro" },
    "rep": { "id": "uuid", "first_name": "Jane", "last_name": "Smith" },
    "status": "confirmed",
    "subtotal": 4250.00,
    "tax_amount": 0.00,
    "total": 4250.00,
    "approval_required": false,
    "approved_by": null,
    "approved_at": null,
    "confirmed_at": "2026-02-24T16:00:00Z",
    "exported_at": null,
    "items": [
      {
        "id": "uuid",
        "product": { "id": "uuid", "name": "Organic Honey 12oz", "sku": "BEE-HON-12" },
        "quantity": 24,
        "unit_price": 8.50,
        "line_total": 204.00,
        "revenue_model": "broker",
        "commission_rate": 10.00,
        "promo_applied": false,
        "lot_number": "LOT-2026-0142",
        "batch_id": "BATCH-A"
      }
    ],
    "vendor_sub_orders": [],
    "parent_order_id": null,
    "notes": "string",
    "fsma_lot_numbers": [],
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

---

## GET /api/v1/orders

List orders with filtering and pagination.

**Implements**: FR-013

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 60 requests/minute/user

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
  account_id: z.string().uuid().optional(),
  rep_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'pending', 'pending_approval', 'approved', 'confirmed', 'rejected', 'cancelled']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  min_total: z.number().min(0).optional(),
  max_total: z.number().min(0).optional(),
  sort_by: z.enum(['created_at', 'total', 'order_number', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  exclude_sub_orders: z.boolean().default(true)
}
```

**Response 200 OK**:
```json
{
  "data": [ { "...order summary objects..." } ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_count": 156,
    "total_pages": 7
  }
}
```

---

## PATCH /api/v1/orders/:id

Update an order (notes, status transitions for non-approval flows).

**Implements**: FR-013

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 20 requests/minute/user

**Request Body** (partial update):
```typescript
{
  notes: z.string().optional(),
  status: z.enum(['pending', 'cancelled']).optional()  // limited transitions; approval flows use dedicated endpoints
}
```

**Response 200 OK**:
```json
{
  "data": { "...updated order object..." }
}
```

---

## POST /api/v1/orders/:id/approve

Approve an order requiring manager approval.

**Implements**: FR-017

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 20 requests/minute/user

**Request Body**:
```typescript
{
  notes: z.string().optional()
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORD-2026-001043",
    "status": "approved",
    "approved_by": { "id": "uuid", "first_name": "Mike", "last_name": "Johnson" },
    "approved_at": "2026-02-24T16:30:00Z"
  }
}
```

**Side Effects**: Audit trail entry written. Rep notified via in-app + email.

---

## POST /api/v1/orders/:id/reject

Reject an order with reason.

**Implements**: FR-017

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 20 requests/minute/user

**Request Body**:
```typescript
{
  reason: z.string().min(1).max(1000)  // required — FR-017
}
```

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORD-2026-001043",
    "status": "rejected",
    "rejection_reason": "Total exceeds budget for this quarter"
  }
}
```

**Side Effects**: Audit trail entry with rejection reason. Rep notified with reason.

---

## POST /api/v1/orders/:id/confirm

Confirm an approved or non-approval-required order. Triggers commission calculation and accounting export queue.

**Implements**: FR-013, FR-023

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 20 requests/minute/user

**Response 200 OK**:
```json
{
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "confirmed_at": "2026-02-24T17:00:00Z"
  }
}
```

**Side Effects**: Commission records created for broker line items. Order queued for accounting export (within 1 hour). Audit trail entry.

---

## GET /api/v1/orders/pending-approval

List orders awaiting manager approval.

**Implements**: FR-017

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 30 requests/minute/user

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(20),
  rep_id: z.string().uuid().optional()
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-2026-001043",
      "account_name": "Pacific Bistro",
      "rep_name": "Jane Smith",
      "total": 12500.00,
      "item_count": 10,
      "submitted_at": "2026-02-24T15:00:00Z"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 3 }
}
```

---

## GET /api/v1/products/search

Search products for order entry.

**Implements**: FR-015, FR-016

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 120 requests/minute/user

**Performance**: Results within 200ms (FR-015)

**Query Params**:
```typescript
{
  q: z.string().min(1).max(200),                // search by name, SKU, brand, category — FR-015
  brand_id: z.string().uuid().optional(),
  category: z.string().optional(),
  certification: z.string().optional(),          // e.g., "Organic"
  availability: z.enum(['in_stock', 'limited', 'out_of_stock']).optional(),
  limit: z.number().int().min(1).max(50).default(20)
}
```

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Organic Wildflower Honey 12oz",
      "sku": "BEE-HON-12",
      "brand": { "id": "uuid", "name": "Bee's Best Honey" },
      "category": "Honey",
      "unit_price": 8.50,
      "wholesale_price": 6.25,
      "case_size": "12 x 12oz",
      "availability_status": "in_stock",
      "certifications": ["Organic", "Non-GMO"],
      "revenue_model": "broker",
      "promo_price": 7.25,
      "promo_active": true,
      "promo_end_date": "2026-03-15T23:59:59Z",
      "image_url": "https://..."
    }
  ],
  "total_count": 8
}
```

---

## GET /api/v1/products

List all products with filtering.

**Implements**: FR-019

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Rate Limit**: 60 requests/minute/user

**Query Params**:
```typescript
{
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
  brand_id: z.string().uuid().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  certification: z.string().optional(),
  allergen: z.string().optional(),
  dietary: z.string().optional(),
  availability: z.enum(['in_stock', 'limited', 'out_of_stock', 'discontinued']).optional(),
  revenue_model: z.enum(['broker', 'wholesale']).optional(),
  is_active: z.boolean().default(true),
  sort_by: z.enum(['name', 'sku', 'unit_price', 'created_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
}
```

**Response 200 OK**:
```json
{
  "data": [ { "...product objects..." } ],
  "pagination": { "page": 1, "per_page": 25, "total_count": 450, "total_pages": 18 }
}
```

---

## POST /api/v1/products

Create a new product in the catalog.

**Implements**: FR-019

**Auth Required**: Role `admin`

**Rate Limit**: 20 requests/minute/user

**Request Body**:
```typescript
{
  brand_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  subcategory: z.string().max(100).optional(),
  unit_price: z.number().min(0),
  wholesale_price: z.number().min(0).optional(),
  case_size: z.string().max(50).optional(),
  certifications: z.array(z.string()).optional(),
  allergens: z.array(z.enum(['Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soybeans', 'Sesame'])).optional(),
  dietary_attributes: z.array(z.string()).optional(),
  availability_status: z.enum(['in_stock', 'limited', 'out_of_stock', 'discontinued']).default('in_stock'),
  revenue_model: z.enum(['broker', 'wholesale']),
  image_url: z.string().url().optional(),
  description: z.string().optional(),
  lot_number: z.string().max(100).optional(),
  batch_id: z.string().max(100).optional(),
  origin: z.string().max(255).optional(),
  promo_price: z.number().min(0).optional(),
  promo_start_date: z.string().datetime().optional(),
  promo_end_date: z.string().datetime().optional()
}
```

**Response 201 Created**:
```json
{
  "data": { "...product object..." }
}
```

---

## PATCH /api/v1/products/:id

Update an existing product.

**Implements**: FR-019

**Auth Required**: Role `admin`

**Request Body** (partial update): Same fields as POST, all optional.

**Response 200 OK**:
```json
{
  "data": { "...updated product object..." }
}
```

---

## GET /api/v1/products/:id

Retrieve a single product with full details.

**Implements**: FR-019

**Auth Required**: Role `rep`, `manager`, `admin`, `viewer`

**Response 200 OK**:
```json
{
  "data": { "...full product object..." }
}
```

---

## POST /api/v1/line-cards/generate

Generate a brand line card PDF.

**Implements**: FR-020

**Auth Required**: Role `manager`, `admin`

**Rate Limit**: 5 requests/minute/user

**Performance**: Generation within 10 seconds (FR-020)

**Request Body**:
```typescript
{
  brand_id: z.string().uuid()
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "uuid",
    "brand": { "id": "uuid", "name": "Bee's Best Honey" },
    "document_url": "https://storage.../line-card-bees-best-2026-02.pdf",
    "product_count": 12,
    "generated_at": "2026-02-24T17:30:00Z"
  }
}
```

---

## POST /api/v1/line-cards/:id/share

Share a line card via email.

**Implements**: FR-020

**Auth Required**: Role `rep`, `manager`, `admin`

**Rate Limit**: 10 requests/minute/user

**Request Body**:
```typescript
{
  to_email: z.string().email(),              // pre-populated with account primary contact
  account_id: z.string().uuid().optional(),
  subject: z.string().max(500).optional(),
  body: z.string().optional(),
  template_id: z.string().uuid().optional()
}
```

**Response 200 OK**:
```json
{
  "data": {
    "email_record_id": "uuid",
    "sent_to": "buyer@restaurant.com",
    "status": "sent"
  }
}
```

---

## GET /api/v1/line-cards

List generated line cards.

**Implements**: FR-020

**Auth Required**: Role `rep`, `manager`, `admin`

**Query Params**:
```typescript
{
  brand_id: z.string().uuid().optional(),
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
      "brand_name": "Bee's Best Honey",
      "document_url": "https://...",
      "product_count": 12,
      "generated_at": "timestamp",
      "generated_by": "Jane Smith"
    }
  ],
  "pagination": { "page": 1, "per_page": 20, "total_count": 8 }
}
```
