# API Contracts — Order Entry & Approval

## POST /api/orders

Create a new draft order.

**Auth:** rep, manager
**Request Body:**
```json
{
  "accountId": "uuid",
  "notes": "string | null",
  "lineItems": [
    {
      "productId": "uuid",
      "quantity": 1,
      "unitPrice": 10.00,
      "revenueModel": "broker | wholesale",
      "commissionRate": 12.00,
      "discount": 0.00
    }
  ]
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20260226-0001",
    "accountId": "uuid",
    "repId": "uuid",
    "status": "draft",
    "subtotal": 240.00,
    "tax": 0.00,
    "total": 240.00,
    "notes": null,
    "lineItems": [...],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

## GET /api/orders

List orders with cursor pagination and filters.

**Auth:** rep, manager
**Query Params:**
- `accountId` (uuid, optional)
- `status` (OrderStatus, optional)
- `cursor` (string, optional)
- `limit` (number, 1-100, default 20)
- `sortBy` (createdAt | total | orderNumber, default createdAt)
- `sortOrder` (asc | desc, default desc)

**Response 200:**
```json
{
  "data": [...],
  "pagination": { "cursor": "uuid | null", "hasMore": true, "total": 42 }
}
```

## GET /api/orders/:id

Get order detail with line items, sub-orders, and approval history.

**Auth:** rep, manager
**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20260226-0001",
    "account": { "id": "uuid", "name": "string" },
    "rep": { "id": "uuid", "firstName": "string", "lastName": "string" },
    "status": "draft",
    "subtotal": 240.00,
    "tax": 0.00,
    "total": 240.00,
    "notes": null,
    "lineItems": [
      {
        "id": "uuid",
        "product": { "id": "uuid", "name": "string", "sku": "string", "brand": "string" },
        "quantity": 24,
        "unitPrice": 10.00,
        "revenueModel": "broker",
        "commissionRate": 12.00,
        "discount": 0.00,
        "lineTotal": 240.00,
        "promotionalPriceApplied": false
      }
    ],
    "vendorSubOrders": [...],
    "approvals": [...],
    "exportStatus": null,
    "submittedAt": null,
    "confirmedAt": null,
    "version": 1,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

## PUT /api/orders/:id

Update a draft order (add/remove/modify line items, notes).

**Auth:** rep, manager
**Headers:** `if-match: ISO8601` (optimistic concurrency)
**Request Body:** Same as POST but all fields optional. Line items are replaced entirely.
**Response 200:** Updated order object.
**Error 409:** Order modified by another user (version conflict).
**Error 400:** Cannot edit non-draft order.

## POST /api/orders/:id/submit

Submit a draft order. If total >= $5,000, moves to pending_approval. Otherwise, moves to confirmed.

**Auth:** rep, manager
**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "status": "pending_approval | confirmed",
    "vendorSubOrders": [...],
    "submittedAt": "ISO8601"
  }
}
```
**Error 400:** Order has no line items / order is not in draft status.

## POST /api/orders/:id/approve

Approve a pending order (manager only).

**Auth:** manager
**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "status": "confirmed",
    "confirmedAt": "ISO8601",
    "approval": { "decision": "approved", "decidedAt": "ISO8601" }
  }
}
```
**Error 400:** Order not in pending_approval status.
**Error 403:** Only managers can approve orders.

## POST /api/orders/:id/reject

Reject a pending order (manager only).

**Auth:** manager
**Request Body:**
```json
{ "reason": "Pricing not approved by vendor" }
```
**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "status": "rejected",
    "approval": { "decision": "rejected", "reason": "...", "decidedAt": "ISO8601" }
  }
}
```
**Error 400:** Order not in pending_approval status / reason required.

## POST /api/orders/:id/cancel

Cancel an order.

**Auth:** rep (own orders), manager
**Response 200:**
```json
{
  "data": { "id": "uuid", "status": "cancelled", "cancelledAt": "ISO8601" }
}
```
**Error 400:** Cannot cancel confirmed/exported orders.

## GET /api/orders/approval-queue

List orders pending manager approval.

**Auth:** manager
**Query Params:** cursor, limit
**Response 200:** Paginated list of orders with status = pending_approval.

## GET /api/products/search

Search products for order entry.

**Auth:** rep, manager
**Query Params:**
- `q` (string, min 2 chars) — search by name, SKU, brand, category
- `brandId` (uuid, optional)
- `availabilityStatus` (optional)
- `limit` (number, 1-50, default 20)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Artisan Honey 12oz",
      "sku": "AH-12",
      "brand": { "id": "uuid", "name": "Pacific Honey Co" },
      "unitPrice": 10.00,
      "wholesalePrice": 7.50,
      "promotionalPrice": 8.50,
      "promotionalPriceEnd": "2026-04-01T00:00:00Z",
      "availabilityStatus": "active",
      "revenueModelDefault": "broker",
      "commissionRate": 12.00,
      "caseSize": 24
    }
  ]
}
```

## GET /api/accounts/:id/reorder-suggestion

Get AI-powered reorder suggestion for an account.

**Auth:** rep, manager
**Response 200:**
```json
{
  "data": {
    "accountId": "uuid",
    "suggestedProducts": [
      {
        "productId": "uuid",
        "productName": "string",
        "suggestedQuantity": 24,
        "lastOrderedQuantity": 20,
        "unitPrice": 10.00,
        "revenueModel": "broker"
      }
    ],
    "estimatedTotal": 540.00,
    "generatedAt": "ISO8601",
    "aiGenerated": true
  }
}
```
**Error 400:** Account has fewer than 6 orders in past 12 months.
**Error 503:** AI service unavailable — "Unable to generate suggestions at this time."
