# Data Model: Account Management

**Feature:** 003-account-management
**Date:** 2026-02-26

## Entities

### Account

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | NOT NULL, indexed | Tenant isolation key |
| name | VARCHAR(255) | NOT NULL | Account/company name |
| account_type | ENUM(retail,restaurant,distributor) | NOT NULL | Business type |
| street_address | VARCHAR(500) | NOT NULL | Street address line |
| city | VARCHAR(100) | NOT NULL | City |
| state | VARCHAR(50) | NOT NULL | State/province |
| zip_code | VARCHAR(20) | NOT NULL | Postal code |
| territory_id | UUID | NOT NULL, FK→territories | Assigned territory |
| parent_account_id | UUID | NULLABLE, FK→accounts (self) | Parent account for hierarchy |
| health_score | INTEGER | NULLABLE, 0-100 | Current health score (null if not yet calculated) |
| health_score_calculated_at | TIMESTAMPTZ | NULLABLE | Last health score calculation time |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | Auto-updated | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | NULLABLE | Soft-delete timestamp |

**Indexes:**
- `(tenant_id, name)` — unique per tenant
- `(tenant_id, territory_id)` — territory-based queries
- `(tenant_id, account_type)` — type filtering
- `(tenant_id, health_score)` — health score filtering/sorting
- `(tenant_id, parent_account_id)` — child account lookups
- `(tenant_id, deleted_at)` — soft-delete filtering
- GIN index on `name` using pg_trgm — full-text search
- GIN index on `city` using pg_trgm — city search

**RLS Policy:** `tenant_id = current_setting('app.tenant_id')::uuid`

### Contact

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | NOT NULL, indexed | Tenant isolation key |
| account_id | UUID | NOT NULL, FK→accounts | Parent account |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| email | VARCHAR(255) | NULLABLE | Email address |
| phone | VARCHAR(50) | NULLABLE | Phone number |
| title | VARCHAR(100) | NULLABLE | Job title/role |
| is_primary | BOOLEAN | DEFAULT false | Primary contact designation |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | Auto-updated | Last modification timestamp |
| deleted_at | TIMESTAMPTZ | NULLABLE | Soft-delete timestamp |

**Indexes:**
- `(tenant_id, account_id)` — account-based lookups
- `(tenant_id, email)` — email search
- GIN index on `first_name, last_name` using pg_trgm — name search
- GIN index on `phone` using pg_trgm — phone search

**RLS Policy:** `tenant_id = current_setting('app.tenant_id')::uuid`

### AccountHealthScore (History)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| tenant_id | UUID | NOT NULL, indexed | Tenant isolation key |
| account_id | UUID | NOT NULL, FK→accounts | Target account |
| score | INTEGER | NOT NULL, 0-100 | Calculated score |
| factor_breakdown | JSONB | NOT NULL | Per-factor scores and weights |
| calculated_at | TIMESTAMPTZ | DEFAULT now() | Calculation timestamp |

**Indexes:**
- `(account_id, calculated_at DESC)` — latest score per account
- `(tenant_id, calculated_at DESC)` — batch query optimization

**factor_breakdown JSON shape:**
```json
{
  "daysSinceLastActivity": { "value": 15, "score": 72, "weight": 0.30 },
  "orderFrequency": { "value": 2.5, "score": 65, "weight": 0.25 },
  "orderValueTrend": { "value": 1.1, "score": 80, "weight": 0.25 },
  "contactEngagement": { "value": 7, "score": 85, "weight": 0.20 }
}
```

## Relationships

```
Territory 1───* Account (territory_id FK)
Account   1───* Account (parent_account_id self-ref, max 2 levels)
Account   1───* Contact (account_id FK)
Account   1───* AccountHealthScore (account_id FK)
```

## Validation Rules

### Account
- `name`: 1-255 chars, trimmed
- `account_type`: must be one of: retail, restaurant, distributor
- `street_address`: 1-500 chars
- `city`: 1-100 chars
- `state`: 1-50 chars
- `zip_code`: 1-20 chars, alphanumeric + hyphens
- `territory_id`: must be a valid UUID referencing an active territory in the same tenant
- `parent_account_id`: must be a valid UUID referencing an active account in the same tenant, must not create circular reference, max depth 2

### Contact
- `first_name`: 1-100 chars
- `last_name`: 1-100 chars
- `email`: valid email format (optional)
- `phone`: 1-50 chars (optional)
- `title`: 1-100 chars (optional)
- `is_primary`: only one primary contact per account (enforced in service layer)

### Search
- Query: minimum 3 alphanumeric characters
- Results: paginated, default 20, max 100
