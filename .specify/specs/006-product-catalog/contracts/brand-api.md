# API Contract: Brand Endpoints

## POST /api/brands

**Auth:** admin, manager
**Request Body:**
```json
{
  "name": "string (1-255)",
  "commissionRate": "decimal (0-100)",
  "description": "string? (1-2000)",
  "logoUrl": "url?",
  "contactName": "string? (1-255)",
  "contactEmail": "email?",
  "contactPhone": "string? (1-50)",
  "website": "url?"
}
```
**Response 201:** `{ data: BrandDetail }`
**Errors:** 400 (validation), 409 (name conflict)

## GET /api/brands

**Auth:** all authenticated
**Query Params:**
- `isActive` — boolean, optional
- `cursor` — uuid, optional
- `limit` — integer 1-100, default 20
- `sortBy` — name | createdAt, default name
- `sortOrder` — asc | desc, default asc

**Response 200:**
```json
{
  "data": [BrandWithCounts],
  "pagination": { "cursor": "uuid?", "hasMore": "boolean" }
}
```

## GET /api/brands/:id

**Auth:** all authenticated
**Response 200:** `{ data: BrandDetail }`
**Errors:** 404

## PUT /api/brands/:id

**Auth:** admin, manager
**Headers:** `If-Match: <updatedAt>` (optional)
**Request Body:** Same as POST, all fields optional
**Response 200:** `{ data: BrandDetail }`
**Errors:** 404, 409 (concurrency conflict or name conflict)

## GET /api/brands/:id/line-card

**Auth:** rep, manager, admin
**Response 200:** Binary PDF
**Headers:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="{brand-name}-line-card-{YYYY-MM-DD}.pdf"`
**Errors:** 404 (brand), 400 (no active products)

## POST /api/brands/:id/line-card/share

**Auth:** manager, admin
**Request Body:**
```json
{
  "accountId": "uuid"
}
```
**Response 200:** `{ data: { sent: true, recipientEmail: "string" } }`
**Errors:** 404 (brand or account), 400 (no active products, no primary contact email)

## Response Shapes

### BrandDetail
```json
{
  "id": "uuid",
  "name": "string",
  "commissionRate": "number",
  "description": "string?",
  "logoUrl": "string?",
  "contactName": "string?",
  "contactEmail": "string?",
  "contactPhone": "string?",
  "website": "string?",
  "isActive": "boolean",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### BrandWithCounts (extends BrandDetail)
```json
{
  "...BrandDetail",
  "productCount": "integer",
  "activeProductCount": "integer"
}
```
