# API Contracts — F-001: Global Search

## Existing Endpoints (No Changes)

### GET /api/accounts?search={query}&limit=5

**Auth**: JWT required
**Query Params**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| search | string | yes | — | Search query (ILIKE across name, city, contact fields, territory) |
| limit | number | no | 20 | Max results (use 5 for command palette) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Pacific Foods NW",
      "territoryId": "uuid",
      "accountType": "retail",
      "healthScore": 85,
      ...
    }
  ],
  "pagination": {
    "cursor": "uuid|null",
    "hasMore": false,
    "total": 3
  }
}
```

### GET /api/products/search?q={query}&limit=5

**Auth**: JWT required, roles: rep, manager
**Query Params**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | yes | — | Search query (name, SKU, brand name) |
| limit | number | no | 20 | Max results (use 5 for command palette) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Artisan Sourdough Bread",
      "sku": "ASB-001",
      "brandId": "uuid",
      "brandName": "Baker's Choice",
      ...
    }
  ]
}
```

## New Endpoint

### GET /api/contacts/search?q={query}&limit=5

**Auth**: JWT required
**Query Params**:
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| q | string | yes | — | Search query (ILIKE across first_name, last_name, email, phone) |
| limit | number | no | 5 | Max results |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@pacificfoods.com",
      "phone": "503-555-0123",
      "accountId": "uuid",
      "accountName": "Pacific Foods NW"
    }
  ]
}
```

**Response 400** (missing q param):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Search query is required",
  "code": "VALIDATION_ERROR",
  "requestId": "uuid"
}
```

**Zod Schema** (`packages/shared/src/schemas/search.schema.ts`):
```typescript
const contactSearchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

const contactSearchResultSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  accountId: z.string().uuid(),
  accountName: z.string(),
});
```
