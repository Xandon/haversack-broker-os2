# API Contracts: Account Forms (F-002c)

All endpoints already exist and are tested. This document serves as a reference for frontend implementation.

## POST /api/accounts

**Purpose**: Create a new account with inline primary contact
**Auth**: Rep, Manager, Admin
**Request Body** (CreateAccountInput):
```json
{
  "name": "Acme Foods",
  "accountType": "retail",
  "streetAddress": "123 Main St",
  "city": "Portland",
  "state": "OR",
  "zipCode": "97201",
  "territoryId": "uuid",
  "parentAccountId": "uuid | null",
  "primaryContact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@acme.com",
    "phone": "503-555-1234",
    "title": "Buyer"
  },
  "skipDuplicateCheck": false
}
```
**Response 201**:
```json
{
  "data": { "id": "uuid", "name": "Acme Foods", ... }
}
```
**Error 400**: Validation errors
**Error 409**: Duplicate detected (when skipDuplicateCheck is false)

## PUT /api/accounts/:id

**Purpose**: Update an existing account
**Auth**: Rep, Manager, Admin
**Request Body** (UpdateAccountInput — all fields optional):
```json
{
  "name": "Acme Foods Inc.",
  "accountType": "restaurant",
  "streetAddress": "456 Oak Ave",
  "city": "Seattle",
  "state": "WA",
  "zipCode": "98101",
  "territoryId": "uuid",
  "parentAccountId": "uuid | null",
  "isActive": true
}
```
**Response 200**: `{ "data": { ... account } }`
**Error 404**: Account not found
**Error 409**: Optimistic concurrency conflict

## GET /api/accounts/check-duplicates

**Purpose**: Check for duplicate accounts by name similarity
**Auth**: Rep, Manager
**Query Params**:
- `name` (required): Account name to check
- `phone` (optional): Phone number for additional matching
- `streetAddress` (optional): Street address for additional matching
**Response 200**:
```json
{
  "data": {
    "hasDuplicates": true,
    "matches": [
      {
        "id": "uuid",
        "name": "Acme Food Co",
        "accountType": "retail",
        "territory": { "id": "uuid", "name": "Portland Metro" },
        "confidence": 90,
        "matchType": "name"
      }
    ]
  }
}
```
