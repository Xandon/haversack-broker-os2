# API Contracts: Admin & Data Import

## User Management

### POST /api/admin/users
**Auth:** admin only
**Request:**
```json
{
  "email": "rep3@haversack.test",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "rep",
  "territoryIds": ["uuid-1"],
  "temporaryPassword": "TempPass123!"
}
```
**Response 201:**
```json
{ "data": { "id": "uuid", "email": "...", "role": "rep", "isActive": true, ... } }
```

### GET /api/admin/users
**Auth:** admin only
**Query:** `?role=rep&isActive=true&page=1&limit=20`
**Response 200:**
```json
{ "data": [...], "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }
```

### GET /api/admin/users/:id
**Auth:** admin only
**Response 200:**
```json
{ "data": { "id": "uuid", "email": "...", "role": "rep", "territories": [...], ... } }
```

### PUT /api/admin/users/:id
**Auth:** admin only, If-Match header for optimistic concurrency
**Request:**
```json
{ "role": "manager", "territoryIds": ["uuid-1", "uuid-2"], "isActive": true }
```
**Response 200:**
```json
{ "data": { "id": "uuid", "role": "manager", ... } }
```

### DELETE /api/admin/users/:id
**Auth:** admin only
**Response 200:**
```json
{ "data": { "id": "uuid", "isActive": false, "deletedAt": "2026-02-27T..." } }
```

## Data Import

### POST /api/admin/imports/upload
**Auth:** admin only
**Request:** multipart/form-data with `file` and `entityType` fields
**Response 201:**
```json
{ "data": { "id": "import-uuid", "status": "previewed", "totalRows": 200, "validRows": 195, "errorRows": 5, "errors": [{ "row": 47, "field": "name", "error": "Required field is missing" }], "warnings": ["3 columns not recognized: foo, bar, baz"] } }
```

### POST /api/admin/imports/:id/confirm
**Auth:** admin only
**Request:**
```json
{ "skipErrors": true }
```
**Response 202:**
```json
{ "data": { "id": "import-uuid", "status": "processing" } }
```

### GET /api/admin/imports
**Auth:** admin only
**Query:** `?entityType=account&page=1&limit=20`
**Response 200:**
```json
{ "data": [...], "meta": { "total": 15, "page": 1, "limit": 20, "totalPages": 1 } }
```

### GET /api/admin/imports/:id
**Auth:** admin only
**Response 200:**
```json
{ "data": { "id": "...", "status": "completed", "totalRows": 200, "createdRows": 150, "updatedRows": 45, "skippedRows": 5, "errorLog": [...] } }
```

## Data Quality

### GET /api/admin/quality/scorecard
**Auth:** admin, manager
**Response 200:**
```json
{ "data": { "accountCompleteness": 0.68, "contactEmailValidity": 0.92, "productImages": 0.45, "duplicateAccountCount": 12, "staleAccountCount": 28, "compositeScore": 0.73, "calculatedAt": "2026-02-27T03:00:00Z" } }
```

### GET /api/admin/quality/drill-down
**Auth:** admin, manager
**Query:** `?metric=accountCompleteness&page=1&limit=50`
**Response 200:**
```json
{ "data": [{ "id": "account-uuid", "name": "Acme Foods", "missingFields": ["phone", "zipCode"] }], "meta": { "total": 64, "page": 1, "limit": 50 } }
```

## Layout of Truth

### GET /api/admin/layout-of-truth/:entityType
**Auth:** admin only
**Response 200:**
```json
{ "data": { "entityType": "account", "fields": [{ "name": "name", "type": "string", "required": true, "maxLength": 255 }, { "name": "accountType", "type": "enum", "required": true, "allowedValues": ["retail", "restaurant", "distributor"] }] } }
```
