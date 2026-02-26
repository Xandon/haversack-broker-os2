# API Contract: Product Endpoints

## POST /api/products

**Auth:** admin, manager
**Request Body:**
```json
{
  "name": "string (1-255)",
  "sku": "string (1-100)",
  "brandId": "uuid",
  "category": "ProductCategory?",
  "subcategory": "string? (1-100)",
  "description": "string? (1-2000)",
  "unitPrice": "decimal (>0)",
  "wholesalePrice": "decimal? (>0)",
  "caseSize": "integer? (>0)",
  "revenueModelDefault": "broker | wholesale",
  "availabilityStatus": "active | seasonal | discontinued",
  "imageUrl": "url?",
  "certifications": "Certification[]",
  "allergens": "Allergen[]",
  "dietaryAttributes": "DietaryAttribute[]"
}
```
**Response 201:** `{ data: ProductDetail }`
**Errors:** 400 (validation), 409 (SKU conflict)

## GET /api/products

**Auth:** all authenticated
**Query Params:**
- `brandId` — uuid, optional
- `category` — ProductCategory, optional
- `certification` — Certification, optional (single value, filters products containing this cert)
- `allergen` — Allergen, optional
- `dietaryAttribute` — DietaryAttribute, optional
- `availabilityStatus` — AvailabilityStatus, optional
- `cursor` — uuid, optional
- `limit` — integer 1-100, default 20
- `sortBy` — name | sku | createdAt, default name
- `sortOrder` — asc | desc, default asc

**Response 200:**
```json
{
  "data": [ProductDetail],
  "pagination": { "cursor": "uuid?", "hasMore": "boolean" }
}
```

## GET /api/products/search (ENHANCED)

**Auth:** rep, manager
**Query Params (enhanced):**
- `q` — string min 2 (existing)
- `brandId` — uuid, optional (existing)
- `availabilityStatus` — AvailabilityStatus, optional (existing)
- `category` — ProductCategory, optional (NEW)
- `certification` — Certification, optional (NEW)
- `limit` — integer 1-100, default 20 (max increased from 50)

**Response 200:** `{ data: [ProductSearchResult] }`

## GET /api/products/:id

**Auth:** all authenticated
**Response 200:** `{ data: ProductDetail }`
**Errors:** 404

## PUT /api/products/:id

**Auth:** admin, manager
**Headers:** `If-Match: <updatedAt>` (optional, for optimistic concurrency)
**Request Body:** Same as POST, all fields optional
**Response 200:** `{ data: ProductDetail }`
**Errors:** 404, 409 (concurrency conflict or SKU conflict)

## DELETE /api/products/:id

**Auth:** admin, manager
**Response 200:** `{ data: { id: "uuid", deleted: true } }`
**Errors:** 404

## Response Shapes

### ProductDetail
```json
{
  "id": "uuid",
  "name": "string",
  "sku": "string",
  "brand": { "id": "uuid", "name": "string" },
  "category": "string?",
  "subcategory": "string?",
  "description": "string?",
  "unitPrice": "number",
  "wholesalePrice": "number?",
  "promotionalPrice": "number?",
  "promotionalPriceStart": "ISO8601?",
  "promotionalPriceEnd": "ISO8601?",
  "caseSize": "integer?",
  "revenueModelDefault": "string",
  "availabilityStatus": "string",
  "imageUrl": "string?",
  "certifications": ["string"],
  "allergens": ["string"],
  "dietaryAttributes": ["string"],
  "commissionRate": "number",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```
