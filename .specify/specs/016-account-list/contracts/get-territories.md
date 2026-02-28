# GET /api/territories

**Method**: GET
**Auth**: JWT (any authenticated role)
**Rate Limit**: Standard

## Request

No query parameters.

## Response 200

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Portland Metro",
      "region": "Oregon"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Seattle Area",
      "region": "Washington"
    }
  ]
}
```

## Response 401

```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED",
  "requestId": "req-xxx"
}
```

## Notes

- Returns only active territories (is_active = true)
- Filtered by tenant_id from JWT
- Ordered by name ascending
- Cached aggressively on frontend (staleTime: 5 min) — territory data rarely changes
