# Data Model: Pipeline & Opportunities

## Entities

### PipelineStage (Enum)

| Value | Default Probability | Description |
|-------|-------------------|-------------|
| prospect | 10% | Initial identification |
| qualified | 40% | Needs confirmed, budget available |
| proposal | 60% | Proposal submitted |
| negotiation | 75% | Terms being negotiated |
| closed_won | 100% | Deal won |
| closed_lost | 0% | Deal lost |

### Opportunity

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key, auto-generated |
| tenantId | UUID | Yes | FK to implicit tenant, RLS boundary |
| accountId | UUID | Yes | FK to Account |
| repId | UUID | Yes | FK to User (opportunity owner) |
| name | VARCHAR(255) | Yes | Deal name |
| estimatedValue | DECIMAL(12,2) | Yes | >= 0 |
| probability | DECIMAL(5,2) | Yes | 0-100, auto-populated from stage |
| expectedCloseDate | DATE | Yes | Projected close date |
| stage | PipelineStage | Yes | Current pipeline stage |
| closeReason | TEXT | No | Required for closed_won/closed_lost |
| closedAt | TIMESTAMPTZ | No | Auto-set when stage becomes closed |
| isActive | BOOLEAN | Yes | Default true, false = soft-deleted |
| createdAt | TIMESTAMPTZ | Yes | Auto-set |
| updatedAt | TIMESTAMPTZ | Yes | Auto-updated |

**Relations:**
- `account` → Account (many-to-one)
- `rep` → User (many-to-one)
- `brands` → OpportunityBrand[] (one-to-many)

**Indexes:**
- `[tenantId, stage]` — pipeline summary grouping
- `[tenantId, repId]` — rep-scoped queries
- `[tenantId, accountId]` — account-scoped queries
- `[tenantId, expectedCloseDate]` — date range filtering

### OpportunityBrand (Join Table)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID | Yes | Primary key, auto-generated |
| opportunityId | UUID | Yes | FK to Opportunity |
| brandId | UUID | Yes | FK to Brand |

**Constraints:**
- `@@unique([opportunityId, brandId])` — no duplicate brand associations

## Computed Fields (Response Only)

| Field | Formula | Description |
|-------|---------|-------------|
| weightedValue | estimatedValue * probability / 100 | Individual opportunity weighted value |
| weightedTotal | SUM(weightedValue) across result set | Pipeline forecast total |

## Validation Rules

1. `name`: 1-255 chars, trimmed
2. `estimatedValue`: >= 0, max 12 digits + 2 decimal places
3. `probability`: 0-100, auto-populated from stage defaults; override allowed on non-closed stages
4. `expectedCloseDate`: valid date, no past-date restriction
5. `closeReason`: required when stage is closed_won or closed_lost; max 2000 chars
6. `stage` transitions: any open → any (including skip); closed → any = REJECTED
7. `brandIds`: array of valid UUIDs referencing existing Brands in the tenant
8. `repId`: must reference an active User in the tenant
9. `accountId`: must reference an active (non-deleted) Account in the tenant
