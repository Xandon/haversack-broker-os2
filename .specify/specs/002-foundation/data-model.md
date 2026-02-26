# Data Model — 002-foundation

## Entities

### User

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key, default gen_random_uuid() |
| tenant_id | UUID | Yes | Tenant isolation |
| email | VARCHAR(255) | Yes | Unique per tenant |
| password_hash | VARCHAR(255) | Yes | bcrypt cost 12 |
| first_name | VARCHAR(100) | Yes | |
| last_name | VARCHAR(100) | Yes | |
| role | ENUM(admin,manager,rep,logistics,viewer) | Yes | |
| is_active | BOOLEAN | Yes | Default true |
| avatar_url | VARCHAR(500) | No | |
| last_login_at | TIMESTAMPTZ | No | |
| created_at | TIMESTAMPTZ | Yes | Default now() |
| updated_at | TIMESTAMPTZ | Yes | Default now(), auto-update |
| deleted_at | TIMESTAMPTZ | No | Soft delete |

**Indexes**: (tenant_id, email) UNIQUE, (tenant_id, role), (tenant_id, is_active)
**Audit**: All CUD operations logged

### Territory

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | Tenant isolation |
| name | VARCHAR(255) | Yes | Unique per tenant |
| region | VARCHAR(100) | Yes | |
| zip_codes | TEXT[] | No | Default {} |
| boundary | JSONB | No | GeoJSON polygon |
| commission_modifier | DECIMAL(4,2) | Yes | Default 1.00, range 0.80-1.20 |
| is_active | BOOLEAN | Yes | Default true |
| created_at | TIMESTAMPTZ | Yes | |
| updated_at | TIMESTAMPTZ | Yes | |

**Indexes**: (tenant_id, name) UNIQUE, (tenant_id, region)

### UserTerritory

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| user_id | UUID FK | Yes | References User |
| territory_id | UUID FK | Yes | References Territory |
| assigned_at | TIMESTAMPTZ | Yes | Default now() |

**Indexes**: (user_id, territory_id) PRIMARY KEY

### AuditLog

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| tenant_id | UUID | Yes | |
| actor_id | UUID | Yes | References User |
| actor_email | VARCHAR(255) | Yes | Denormalized for query performance |
| entity_type | VARCHAR(50) | Yes | account, order, commission, user |
| entity_id | UUID | Yes | |
| action | ENUM(create,update,delete) | Yes | |
| field_name | VARCHAR(100) | No | Null for CREATE/DELETE |
| old_value | TEXT | No | |
| new_value | TEXT | No | |
| change_summary | JSONB | No | Full diff for bulk updates |
| ip_address | VARCHAR(45) | No | |
| user_agent | VARCHAR(500) | No | |
| request_id | UUID | No | Correlation ID |
| created_at | TIMESTAMPTZ | Yes | |

**Constraints**: INSERT-ONLY (trigger rejects UPDATE/DELETE)
**Indexes**: (entity_type, entity_id, created_at DESC), (actor_id, created_at DESC), (tenant_id, created_at DESC), (request_id)
**Partitioning**: Monthly by created_at
**Retention**: 3 years minimum

### RefreshToken

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key |
| user_id | UUID FK | Yes | References User |
| token_hash | VARCHAR(255) | Yes | SHA-256 hash of token |
| expires_at | TIMESTAMPTZ | Yes | 7 days from creation |
| created_at | TIMESTAMPTZ | Yes | |
| revoked_at | TIMESTAMPTZ | No | Null = active |

**Indexes**: (user_id), (token_hash) UNIQUE, (expires_at)

## Relationships

```
User 1──N UserTerritory N──1 Territory
User 1──N RefreshToken
User 1──N AuditLog (as actor)
```

## Validation Rules

- email: valid email format, max 255 chars
- password: min 8 chars, 1 uppercase, 1 lowercase, 1 number
- first_name, last_name: 1-100 chars, trimmed
- territory.name: 1-255 chars, unique per tenant
- territory.commission_modifier: 0.80-1.20
- audit_log: immutable after creation
