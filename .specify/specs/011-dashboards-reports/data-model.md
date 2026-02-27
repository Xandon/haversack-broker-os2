# Data Model — Feature 10: Dashboards & Reports

## New Entities

### SavedReport

Persists a reusable report definition created by a Manager or Admin.

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| id | UUID | PK, default uuid | Unique report ID |
| tenant_id | UUID | FK → Tenant, NOT NULL, indexed | Tenant isolation |
| created_by_id | UUID | FK → User, NOT NULL | Report creator |
| name | String | NOT NULL, max 255 | Display name |
| description | String | nullable, max 1000 | Optional description |
| entity_type | ReportEntityType | NOT NULL | Target entity (Account, Order, Product, Commission, Activity) |
| filters | JSON | NOT NULL, default {} | Filter configuration (date range, territory, brand, rep, status) |
| columns | String[] | NOT NULL | Selected column names from column registry |
| is_shared | Boolean | NOT NULL, default false | Visible to other managers/admins in same tenant |
| last_run_at | DateTime | nullable | Timestamp of last execution |
| deleted_at | DateTime | nullable | Soft delete timestamp |
| created_at | DateTime | NOT NULL, default now | Creation timestamp |
| updated_at | DateTime | NOT NULL, auto-update | Last modification timestamp |

**Indexes:**
- `(tenant_id, created_by_id, deleted_at)` — list reports by creator
- `(tenant_id, is_shared, deleted_at)` — list shared reports

### ReportEntityType (Enum)

| Value | Description |
|-------|-------------|
| ACCOUNT | Account entity queries |
| ORDER | Order entity queries |
| PRODUCT | Product entity queries |
| COMMISSION | Commission entry queries |
| ACTIVITY | Activity entity queries |

## Existing Entities Used (Read-Only)

These entities are queried by dashboard and report services but not modified:

| Entity | Used By | Aggregation |
|--------|---------|-------------|
| Order | Rep dashboard (revenue), Team dashboard (revenue, rankings), Reports | SUM(total_amount), COUNT, GROUP BY month |
| CommissionEntry | Rep dashboard (commission), Reports | SUM(commission_amount) |
| CommissionStatement | Rep dashboard (YTD commission) | SUM(total_earned) |
| Opportunity | Rep dashboard (pipeline), Team dashboard (forecast), Reports | COUNT, SUM(estimated_value * probability) |
| Activity | Rep dashboard (count), Team dashboard (rankings), Reports | COUNT, GROUP BY type |
| Account | Rep dashboard (health distribution), Reports | COUNT by health score bucket |
| AccountHealthScore | Rep dashboard (critical accounts drill-down) | Filter score < 40 |
| Product | Reports | Direct query |
| User | Team dashboard (rep listing) | Filter by is_active, role |
| Brand | Reports (filter) | Join via Order line items |

## Filter Schema (JSON stored in SavedReport.filters)

```typescript
interface ReportFilters {
  dateRange?: {
    start: string;  // ISO 8601 date
    end: string;    // ISO 8601 date
  };
  territoryId?: string;    // UUID
  brandId?: string;        // UUID
  repId?: string;          // UUID
  status?: string;         // Entity-specific status value
}
```

## Validation Rules

- SavedReport.name: 1-255 characters, trimmed
- SavedReport.description: 0-1000 characters
- SavedReport.columns: At least 1 column, all must exist in column registry for the entity_type
- SavedReport.filters: Valid JSON matching the filter schema; all UUID references must be valid format
- Report execution: Max 10,000 rows returned in-app, max 50,000 rows for export
- Concurrent execution: Max 3 per tenant (Redis counter)
