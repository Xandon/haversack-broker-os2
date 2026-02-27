# Data Model: Commissions (008)

## Entities

### CommissionRule

Defines commission parameters for a brand with optional territory-specific override.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| tenant_id | UUID | FK -> Tenant, NOT NULL | Tenant isolation |
| brand_id | UUID | FK -> Brand, NOT NULL | Brand this rule applies to |
| territory_id | UUID? | FK -> Territory, nullable | If set, overrides default for this territory |
| base_rate | Decimal(5,4) | NOT NULL, 0.0000-1.0000 | Base commission rate (e.g., 0.10 = 10%) |
| territory_modifier | Decimal(4,2) | NOT NULL, default 1.00 | Territory multiplier (0.80-1.20) |
| volume_tiers | Json | NOT NULL | Array of {minAmount, maxAmount?, bonusRate} |
| effective_date | DateTime | NOT NULL | Rule becomes active on this date |
| expires_at | DateTime? | nullable | Rule expires (null = no expiry) |
| is_active | Boolean | NOT NULL, default true | Soft delete flag |
| version | Int | NOT NULL, default 1 | Optimistic concurrency |
| created_by | UUID | FK -> User, NOT NULL | Admin who created the rule |
| created_at | DateTime | NOT NULL, default now() | Creation timestamp |
| updated_at | DateTime | NOT NULL, auto | Last modification |

**Indexes:** (tenant_id, brand_id, effective_date), (tenant_id, brand_id, territory_id, effective_date) UNIQUE where is_active=true

**Volume Tiers JSON Schema:**
```json
[
  { "minAmount": 0, "maxAmount": 10000, "bonusRate": 0.00 },
  { "minAmount": 10000, "maxAmount": 25000, "bonusRate": 0.01 },
  { "minAmount": 25000, "maxAmount": null, "bonusRate": 0.02 }
]
```

### CommissionEntry

Immutable record of a calculated commission for one order line item.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| tenant_id | UUID | FK -> Tenant, NOT NULL | Tenant isolation |
| order_id | UUID | FK -> Order, NOT NULL | Source order |
| order_line_item_id | UUID | FK -> OrderLineItem, NOT NULL | Source line item |
| rep_id | UUID | FK -> User, NOT NULL | Rep earning the commission |
| commission_rule_id | UUID | FK -> CommissionRule, NOT NULL | Rule used for calculation |
| statement_id | UUID? | FK -> CommissionStatement, nullable | Statement this entry belongs to (set during generation) |
| entry_type | CommissionEntryType | NOT NULL, default 'calculation' | calculation, reversal, or credit |
| base_rate | Decimal(5,4) | NOT NULL | Rate at time of calculation |
| territory_modifier | Decimal(4,2) | NOT NULL | Modifier at time of calculation |
| volume_tier_applied | String | NOT NULL | Description of tier matched |
| effective_rate | Decimal(5,4) | NOT NULL | Final rate (base + tier bonus) * modifier |
| line_item_total | Decimal(12,2) | NOT NULL | Line item amount |
| commission_amount | Decimal(12,2) | NOT NULL | Calculated commission |
| calculated_at | DateTime | NOT NULL | When calculation was performed |
| created_at | DateTime | NOT NULL, default now() | Creation timestamp |

**Indexes:** (tenant_id, rep_id, calculated_at), (tenant_id, order_id), (tenant_id, statement_id)

### CommissionStatement

Monthly aggregation of commission entries for a Rep.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| tenant_id | UUID | FK -> Tenant, NOT NULL | Tenant isolation |
| rep_id | UUID | FK -> User, NOT NULL | Rep this statement belongs to |
| month | Int | NOT NULL, 1-12 | Statement month |
| year | Int | NOT NULL | Statement year |
| status | CommissionStatementStatus | NOT NULL, default 'pending' | pending/approved/exported/paid |
| total_earned | Decimal(12,2) | NOT NULL, default 0 | Sum of commission entries |
| ytd_total | Decimal(12,2) | NOT NULL, default 0 | Year-to-date cumulative |
| approved_by | UUID? | FK -> User, nullable | Manager who approved |
| approved_at | DateTime? | nullable | Approval timestamp |
| exported_at | DateTime? | nullable | Export timestamp |
| version | Int | NOT NULL, default 1 | Optimistic concurrency |
| created_at | DateTime | NOT NULL, default now() | Creation timestamp |
| updated_at | DateTime | NOT NULL, auto | Last modification |

**Indexes:** (tenant_id, rep_id, year, month) UNIQUE, (tenant_id, status)

### CommissionDispute

Rep-initiated flag on a commission entry.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| tenant_id | UUID | FK -> Tenant, NOT NULL | Tenant isolation |
| statement_id | UUID | FK -> CommissionStatement, NOT NULL | Parent statement |
| commission_entry_id | UUID | FK -> CommissionEntry, NOT NULL | Disputed entry |
| filed_by | UUID | FK -> User, NOT NULL | Rep who filed dispute |
| reason | String | NOT NULL, max 1000 | Dispute reason |
| status | CommissionDisputeStatus | NOT NULL, default 'open' | open/resolved |
| original_amount | Decimal(12,2) | NOT NULL | Original commission amount |
| adjusted_amount | Decimal(12,2)? | nullable | Adjusted amount (if changed) |
| resolved_by | UUID? | FK -> User, nullable | Manager who resolved |
| resolved_at | DateTime? | nullable | Resolution timestamp |
| resolution_notes | String? | nullable, max 1000 | Resolution explanation |
| created_at | DateTime | NOT NULL, default now() | Creation timestamp |
| updated_at | DateTime | NOT NULL, auto | Last modification |

**Indexes:** (tenant_id, statement_id, status), (tenant_id, commission_entry_id) UNIQUE

### CommissionExport

Record of a QuickBooks export event.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| tenant_id | UUID | FK -> Tenant, NOT NULL | Tenant isolation |
| month | Int | NOT NULL, 1-12 | Export period month |
| year | Int | NOT NULL | Export period year |
| format | String | NOT NULL, default 'quickbooks_csv' | Export format |
| statement_ids | Json | NOT NULL | Array of statement UUIDs included |
| file_content | String | NOT NULL | Generated CSV content |
| reference_id | String | NOT NULL, unique | Export reference identifier |
| status | String | NOT NULL, default 'completed' | completed/failed |
| created_by | UUID | FK -> User, NOT NULL | Admin who triggered export |
| created_at | DateTime | NOT NULL, default now() | Creation timestamp |

**Indexes:** (tenant_id, year, month), (reference_id) UNIQUE

## Relationships

```
Brand 1──∞ CommissionRule
Territory 1──∞ CommissionRule (optional)
Order 1──∞ CommissionEntry
OrderLineItem 1──1 CommissionEntry
User (Rep) 1──∞ CommissionEntry
User (Rep) 1──∞ CommissionStatement
CommissionRule 1──∞ CommissionEntry
CommissionStatement 1──∞ CommissionEntry
CommissionStatement 1──∞ CommissionDispute
CommissionEntry 1──0..1 CommissionDispute
User (Manager) 1──∞ CommissionStatement (approved_by)
User (Admin) 1──∞ CommissionExport (created_by)
```

## Validation Rules

- `base_rate`: Must be between 0.00 and 1.00 (0% to 100%)
- `territory_modifier`: Must be between 0.50 and 2.00
- `volume_tiers`: Must be a valid JSON array; tiers must not overlap; maxAmount of last tier must be null
- `month`: Must be 1-12
- `year`: Must be >= 2020
- Statement (rep_id, month, year) combination must be unique per tenant
- Dispute (commission_entry_id) must be unique per tenant (one dispute per entry)
- Commission entries are immutable after creation (no updates, only reversals)
