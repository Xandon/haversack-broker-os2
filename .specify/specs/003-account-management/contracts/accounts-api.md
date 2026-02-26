# API Contracts: Account Management

## POST /api/accounts

Create a new account.

**Auth:** Required (Rep, Manager, Admin)

**Request Body:**
```json
{
  "name": "Pacific Bistro",
  "accountType": "restaurant",
  "streetAddress": "123 Main St",
  "city": "Portland",
  "state": "OR",
  "zipCode": "97201",
  "territoryId": "uuid",
  "parentAccountId": "uuid | null",
  "primaryContact": {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@pacific.com",
    "phone": "503-555-1234",
    "title": "Owner"
  },
  "skipDuplicateCheck": false
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Pacific Bistro",
    "accountType": "restaurant",
    "streetAddress": "123 Main St",
    "city": "Portland",
    "state": "OR",
    "zipCode": "97201",
    "territoryId": "uuid",
    "parentAccountId": null,
    "healthScore": null,
    "healthScoreCalculatedAt": null,
    "isActive": true,
    "createdAt": "2026-02-26T00:00:00.000Z",
    "updatedAt": "2026-02-26T00:00:00.000Z"
  }
}
```

**Response 409 (Duplicate Detected):**
```json
{
  "error": "DUPLICATE_DETECTED",
  "message": "Potential duplicate accounts found",
  "code": "ACCOUNT_DUPLICATE_DETECTED",
  "requestId": "uuid",
  "duplicates": [
    {
      "id": "uuid",
      "name": "Pacific Bistros",
      "confidence": 85,
      "matchField": "name"
    }
  ]
}
```

**Response 400:** Validation error (missing/invalid fields)
**Response 401:** Not authenticated
**Response 403:** Insufficient permissions

---

## GET /api/accounts

List accounts with filtering and pagination.

**Auth:** Required (any role)

**Query Parameters:**
- `search` (string, min 3 chars) — full-text search
- `territoryId` (uuid) — filter by territory
- `accountType` (enum) — filter by type
- `healthScoreMin` (int) — minimum health score
- `healthScoreMax` (int) — maximum health score
- `parentAccountId` (uuid) — filter children of a parent
- `includeDeleted` (boolean, default false) — include soft-deleted (admin only)
- `cursor` (string) — pagination cursor
- `limit` (int, default 20, max 100) — page size
- `sortBy` (enum: name, createdAt, healthScore, updatedAt) — sort field
- `sortOrder` (enum: asc, desc) — sort direction

**Response 200:**
```json
{
  "data": [ /* Account objects */ ],
  "pagination": {
    "cursor": "next-cursor-string",
    "hasMore": true,
    "total": 150
  }
}
```

---

## GET /api/accounts/:id

Get account detail with related data.

**Auth:** Required (any role)

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Pacific Bistro",
    "accountType": "restaurant",
    "streetAddress": "123 Main St",
    "city": "Portland",
    "state": "OR",
    "zipCode": "97201",
    "territoryId": "uuid",
    "territory": { "id": "uuid", "name": "Portland Metro" },
    "parentAccountId": null,
    "parentAccount": null,
    "childAccounts": [],
    "rollUpMetrics": null,
    "contacts": [
      {
        "id": "uuid",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@pacific.com",
        "phone": "503-555-1234",
        "title": "Owner",
        "isPrimary": true
      }
    ],
    "healthScore": 72,
    "healthScoreCalculatedAt": "2026-02-26T02:00:00.000Z",
    "healthScoreBreakdown": {
      "daysSinceLastActivity": { "value": 15, "score": 72, "weight": 0.30 },
      "orderFrequency": { "value": 2.5, "score": 65, "weight": 0.25 },
      "orderValueTrend": { "value": 1.1, "score": 80, "weight": 0.25 },
      "contactEngagement": { "value": 7, "score": 85, "weight": 0.20 }
    },
    "isActive": true,
    "createdAt": "2026-02-26T00:00:00.000Z",
    "updatedAt": "2026-02-26T00:00:00.000Z"
  }
}
```

**Response 404:** Account not found (or cross-tenant)

---

## PUT /api/accounts/:id

Update account fields.

**Auth:** Required (Rep, Manager, Admin)

**Request Body:** (partial update — only include fields to change)
```json
{
  "name": "Pacific Bistro Updated",
  "territoryId": "new-uuid",
  "parentAccountId": "parent-uuid"
}
```

**Request Header:** `If-Match: "updated_at_value"` (optimistic concurrency)

**Response 200:** Updated account object
**Response 404:** Account not found
**Response 409:** Conflict (concurrent edit detected)

---

## DELETE /api/accounts/:id

Soft-delete an account.

**Auth:** Required (Rep, Manager, Admin)

**Response 200:**
```json
{
  "data": { "id": "uuid", "deletedAt": "2026-02-26T00:00:00.000Z" }
}
```

---

## GET /api/accounts/check-duplicates

Check for duplicate accounts before creation.

**Auth:** Required (Rep, Manager, Admin)

**Query Parameters:**
- `name` (string, required) — account name to check
- `phone` (string, optional) — phone to check
- `streetAddress` (string, optional) — address to check

**Response 200:**
```json
{
  "data": {
    "hasDuplicates": true,
    "duplicates": [
      {
        "id": "uuid",
        "name": "Pacific Bistros",
        "confidence": 85,
        "matchField": "name"
      }
    ]
  }
}
```

---

## POST /api/accounts/:id/contacts

Add a contact to an account.

**Auth:** Required (Rep, Manager, Admin)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john@example.com",
  "phone": "503-555-5678",
  "title": "Manager",
  "isPrimary": false
}
```

**Response 201:** Created contact object

---

## PUT /api/accounts/:id/contacts/:contactId

Update a contact.

**Auth:** Required (Rep, Manager, Admin)

**Request Body:** (partial update)
**Response 200:** Updated contact object

---

## DELETE /api/accounts/:id/contacts/:contactId

Soft-delete a contact.

**Auth:** Required (Rep, Manager, Admin)

**Response 200:** Deleted confirmation with deletedAt timestamp
