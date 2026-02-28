# Data Model — F-002a: Account List & Search

## Entities

### Territory (existing — no changes)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | |
| tenantId | UUID | FK, NOT NULL | Tenant isolation |
| name | VARCHAR(255) | NOT NULL | Display name for filter dropdown |
| region | VARCHAR(100) | NOT NULL | Region grouping |
| isActive | BOOLEAN | DEFAULT true | Only active territories in dropdown |

### Account (existing — no changes)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, auto-generated | Cursor for pagination |
| tenantId | UUID | FK, NOT NULL | Tenant isolation |
| name | VARCHAR(255) | NOT NULL, UNIQUE(tenantId, name) | Table display + search |
| accountType | ENUM(retail, restaurant, distributor) | NOT NULL | Filter + display column |
| territoryId | UUID | FK to Territory | Filter + display (via relation) |
| healthScore | INT | NULLABLE, 0-100 | Filter (ranges) + badge display |
| updatedAt | TIMESTAMPTZ | Auto-updated | Sort + display column |
| deletedAt | TIMESTAMPTZ | NULLABLE | Soft delete, excluded by default |

### Indexes Used

- `@@index([tenantId, territoryId])` — territory filter queries
- Implicit index on `id` (PK) — cursor pagination
- Implicit index on `name` — sort by name

## Relationships

```
Territory 1──* Account (via territoryId)
```

## Validation Rules

| Field | Rule | Source |
|-------|------|--------|
| search | min 3 characters | accountListQuerySchema |
| territoryId | valid UUID | accountListQuerySchema |
| accountType | enum: retail, restaurant, distributor | accountListQuerySchema |
| healthScoreMin | integer 0-100 | accountListQuerySchema |
| healthScoreMax | integer 0-100 | accountListQuerySchema |
| limit | integer 1-100, default 20 | accountListQuerySchema |
| sortBy | enum: name, createdAt, healthScore, updatedAt | accountListQuerySchema |
| sortOrder | enum: asc, desc | accountListQuerySchema |
| cursor | valid account UUID | accountListQuerySchema |
