# Data Model — F-001: Global Search (Cmd+K)

## Entities

### SearchQuery (Frontend Only — no DB persistence)

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| query | string | min 2 chars | User-typed search text |
| debouncedQuery | string | derived | Query after 300ms debounce |

### SearchResult (API Response Shape)

| Field | Type | Description |
|-------|------|-------------|
| type | 'account' \| 'contact' \| 'product' | Entity category |
| id | string (UUID) | Entity primary key |
| name | string | Display name |
| secondaryText | string | Territory (accounts), email (contacts), SKU (products) |
| url | string | Navigation URL |
| parentId | string? | For contacts: parent account ID |

### AccountSearchResult (from existing GET /api/accounts?search=)

Maps from existing `Account` model:
| Source Field | Display Field | Notes |
|-------------|--------------|-------|
| account.id | id | UUID |
| account.name | name | Primary display |
| territory.name | secondaryText | Via territory_id join |
| `/accounts/${id}` | url | Constructed on frontend |

### ContactSearchResult (from new GET /api/contacts/search)

Maps from existing `Contact` model:
| Source Field | Display Field | Notes |
|-------------|--------------|-------|
| contact.id | id | UUID |
| `${firstName} ${lastName}` | name | Concatenated |
| contact.email | secondaryText | Falls back to phone if email is null |
| `/accounts/${accountId}?tab=contacts` | url | Constructed on frontend |
| contact.accountId | parentId | For URL construction |

### ProductSearchResult (from existing GET /api/products/search)

Maps from existing `Product` model:
| Source Field | Display Field | Notes |
|-------------|--------------|-------|
| product.id | id | UUID |
| product.name | name | Primary display |
| product.sku | secondaryText | Product SKU |
| `/products/${id}` | url | Constructed on frontend |

## Relationships

```
Account (1) ──── (N) Contact
   │
   └── has territory_id → Territory.name (for secondary text)

Product (standalone)
   └── has sku (for secondary text)
```

## Validation Rules

| Rule | Value | Enforced At |
|------|-------|-------------|
| Minimum query length | 2 characters | Frontend (hook `enabled` flag) |
| Maximum results per category | 5 | Backend (limit param) + Frontend (slice) |
| Debounce delay | 300ms | Frontend (useDebounce hook) |
| Search scope | name, city, contact fields | Backend (existing search services) |
| Tenant isolation | tenant_id filter | Backend (all queries) |
