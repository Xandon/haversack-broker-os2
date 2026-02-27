# Data Model: Admin & Data Import

## New Entities

### DataImport
- **Purpose:** Tracks each import operation from upload through completion
- **Relationships:** belongs to User (createdBy), belongs to Tenant
- **Lifecycle:** pending → validating → previewed → processing → completed/failed
- **Key constraint:** parsedData (JSON) is temporary — cleared after import completes or fails

### DataQualityScore
- **Purpose:** Nightly snapshot of data hygiene metrics
- **Relationships:** belongs to Tenant (one record per tenant per calculation)
- **Lifecycle:** created nightly at 03:00 UTC, read-only after creation
- **Key constraint:** compositeScore = average of 5 metrics (accountCompleteness, contactEmailValidity, productImages, inverseDuplicateRate, inverseStaleRate)

## Existing Entities (Referenced, Not Modified)

### User
- Already has: id, tenantId, email, passwordHash, firstName, lastName, role (UserRole enum), isActive, avatarUrl, lastLoginAt, territories, refreshTokens
- Admin feature adds CRUD management routes — no schema changes needed

### RefreshToken
- Used for session invalidation on deactivation — delete all tokens for deactivated user

## Enums

### DataImportStatus
`pending` | `validating` | `previewed` | `processing` | `completed` | `failed`

### DataImportEntityType
`account` | `contact` | `product` | `order`
