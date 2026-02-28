# Data Model — 005-order-entry

## Entities

### Brand (stub — extended by Feature 5)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | required, FK→implicit | RLS isolation |
| name | VARCHAR(255) | required, unique per tenant | Brand/vendor name |
| commissionRate | DECIMAL(5,2) | required, 0.00-100.00 | Default broker commission % |
| isActive | BOOLEAN | default: true | |
| createdAt | TIMESTAMPTZ | auto | |
| updatedAt | TIMESTAMPTZ | auto | |

### Product (stub — extended by Feature 5)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | required | RLS isolation |
| brandId | UUID | required, FK→Brand | Vendor/brand reference |
| name | VARCHAR(255) | required | Product name |
| sku | VARCHAR(100) | required, unique per tenant | Stock keeping unit |
| unitPrice | DECIMAL(10,2) | required | Regular retail price |
| wholesalePrice | DECIMAL(10,2) | nullable | Wholesale markup price |
| promotionalPrice | DECIMAL(10,2) | nullable | Active promo price |
| promotionalPriceStart | TIMESTAMPTZ | nullable | Promo validity start |
| promotionalPriceEnd | TIMESTAMPTZ | nullable | Promo validity end |
| caseSize | INT | nullable | Units per case |
| revenueModelDefault | RevenueModel | required | Default: broker or wholesale |
| availabilityStatus | AvailabilityStatus | required | active, seasonal, discontinued |
| isActive | BOOLEAN | default: true | |
| createdAt | TIMESTAMPTZ | auto | |
| updatedAt | TIMESTAMPTZ | auto | |

**Indexes:** (tenantId, sku), (tenantId, brandId), (tenantId, availabilityStatus), pg_trgm on name for search

### Order

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | required | RLS isolation |
| orderNumber | VARCHAR(20) | required, unique per tenant | Auto-generated: ORD-YYYYMMDD-NNNN |
| accountId | UUID | required, FK→Account | Customer account |
| repId | UUID | required, FK→User | Rep who created order |
| status | OrderStatus | required, default: draft | draft, pending_approval, confirmed, rejected, cancelled |
| subtotal | DECIMAL(12,2) | required, default: 0 | Sum of line totals |
| tax | DECIMAL(10,2) | required, default: 0 | Tax amount |
| total | DECIMAL(12,2) | required, default: 0 | subtotal + tax |
| notes | TEXT | nullable | Order notes |
| submittedAt | TIMESTAMPTZ | nullable | When submitted |
| confirmedAt | TIMESTAMPTZ | nullable | When confirmed/approved |
| cancelledAt | TIMESTAMPTZ | nullable | When cancelled |
| exportStatus | ExportStatus | nullable | QB export: queued, exported, failed |
| version | INT | default: 1 | Optimistic concurrency |
| createdAt | TIMESTAMPTZ | auto | |
| updatedAt | TIMESTAMPTZ | auto | |

**Indexes:** (tenantId, accountId, createdAt DESC), (tenantId, repId, status), (tenantId, status, createdAt DESC), (tenantId, exportStatus)

### OrderLineItem

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | required | RLS isolation |
| orderId | UUID | required, FK→Order | Parent order |
| productId | UUID | required, FK→Product | Product reference |
| vendorSubOrderId | UUID | nullable, FK→VendorSubOrder | Set on submission |
| quantity | INT | required, min: 1 | |
| unitPrice | DECIMAL(10,2) | required | Price at time of order |
| revenueModel | RevenueModel | required | broker or wholesale |
| commissionRate | DECIMAL(5,2) | nullable | Broker commission % (if broker model) |
| discount | DECIMAL(10,2) | default: 0 | Line item discount |
| lineTotal | DECIMAL(12,2) | required | (unitPrice × quantity) - discount |
| promotionalPriceApplied | BOOLEAN | default: false | Whether promo price was used |
| createdAt | TIMESTAMPTZ | auto | |
| updatedAt | TIMESTAMPTZ | auto | |

**Indexes:** (orderId), (tenantId, productId)

### VendorSubOrder

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | required | RLS isolation |
| orderId | UUID | required, FK→Order | Parent order |
| brandId | UUID | required, FK→Brand | Vendor/brand for fulfillment |
| subtotal | DECIMAL(12,2) | required | Sum of line totals in sub-order |
| fulfillmentStatus | VARCHAR(20) | default: pending | pending, shipped, delivered |
| createdAt | TIMESTAMPTZ | auto | |
| updatedAt | TIMESTAMPTZ | auto | |

**Indexes:** (orderId), (tenantId, brandId)

### OrderApproval

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | required | RLS isolation |
| orderId | UUID | required, FK→Order | Order being reviewed |
| approverId | UUID | required, FK→User | Manager making decision |
| decision | ApprovalDecision | required | approved, rejected |
| reason | TEXT | nullable | Required for rejection |
| decidedAt | TIMESTAMPTZ | required | Decision timestamp |
| createdAt | TIMESTAMPTZ | auto | |

**Indexes:** (orderId), (tenantId, approverId, decidedAt DESC)

### QuickBooksExport

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | required | RLS isolation |
| orderId | UUID | required, FK→Order | Exported order |
| status | ExportStatus | required | queued, exported, failed |
| attemptCount | INT | default: 0 | Number of export attempts |
| lastAttemptAt | TIMESTAMPTZ | nullable | Last attempt timestamp |
| errorDetails | TEXT | nullable | Error message on failure |
| csvData | TEXT | nullable | Generated CSV content |
| createdAt | TIMESTAMPTZ | auto | |
| updatedAt | TIMESTAMPTZ | auto | |

**Indexes:** (orderId), (tenantId, status)

## Enums

- **OrderStatus:** draft, pending_approval, confirmed, rejected, cancelled
- **RevenueModel:** broker, wholesale
- **AvailabilityStatus:** active, seasonal, discontinued
- **ApprovalDecision:** approved, rejected
- **ExportStatus:** queued, exported, failed

## Relationships

```
Brand 1──N Product
Product 1──N OrderLineItem
Account 1──N Order
User 1──N Order (as rep)
User 1──N OrderApproval (as approver)
Order 1──N OrderLineItem
Order 1──N VendorSubOrder
Order 0──N OrderApproval
Order 0──1 QuickBooksExport
VendorSubOrder 1──N OrderLineItem
Brand 1──N VendorSubOrder
```

## Validation Rules

- Order must have at least 1 line item to be submitted
- Line item quantity must be >= 1
- Unit price must be >= 0
- Commission rate must be 0-100 (% for broker model)
- Order total = sum of all line item totals + tax
- Orders >= $5,000 total must go through approval before confirmation
- Rejection reason is required when rejecting an order
- Only draft orders can be edited (add/remove/modify line items)
- Vendor sub-orders are created atomically at submission time
- Export status transitions: null → queued → exported | failed
