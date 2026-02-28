# Data Model: Account Forms and Contacts (F-002c)

**Feature**: 018-account-forms
**Date**: 2026-02-28

## Entities

All entities already exist in the Prisma schema. No migrations needed.

### Account (existing)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | Tenant isolation |
| name | String(255) | Yes | Unique per tenant, duplicate-checked |
| accountType | Enum | Yes | retail, restaurant, distributor |
| streetAddress | String(500) | Yes | |
| city | String(100) | Yes | |
| state | String(50) | Yes | |
| zipCode | String(20) | Yes | |
| territoryId | UUID | Yes | FK to Territory |
| parentAccountId | UUID | No | FK to Account (self-referential, max 2-level depth) |
| healthScore | Int(0-100) | No | Calculated nightly |
| isActive | Boolean | Yes | Default true |
| createdAt | DateTime | Yes | Auto |
| updatedAt | DateTime | Yes | Auto |
| deletedAt | DateTime | No | Soft delete |

### Contact (existing)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | Tenant isolation |
| accountId | UUID | Yes | FK to Account |
| firstName | String(100) | Yes | |
| lastName | String(100) | Yes | |
| email | String(255) | No | Validated format |
| phone | String(50) | No | |
| title | String(100) | No | |
| isPrimary | Boolean | Yes | One primary per account |
| createdAt | DateTime | Yes | Auto |
| updatedAt | DateTime | Yes | Auto |
| deletedAt | DateTime | No | Soft delete |

### Territory (existing)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| name | String | Yes | Display name |
| region | String | Yes | Geographic region |

## API Contracts (existing)

### POST /api/accounts
- **Input**: `CreateAccountInput` (name, accountType, streetAddress, city, state, zipCode, territoryId, parentAccountId?, primaryContact, skipDuplicateCheck?)
- **Output**: `{ data: Account }` with 201 status
- **Errors**: 400 (validation), 409 (duplicate detected)

### PUT /api/accounts/:id
- **Input**: `UpdateAccountInput` (all fields optional)
- **Output**: `{ data: Account }` with 200 status
- **Errors**: 400 (validation), 404 (not found), 409 (concurrency conflict)

### GET /api/accounts/check-duplicates
- **Query**: `{ name: string, phone?: string, streetAddress?: string }`
- **Output**: `{ data: { hasDuplicates: boolean, matches: DuplicateMatch[] } }`
- **DuplicateMatch**: `{ id, name, accountType, territory, confidence, matchType }`
