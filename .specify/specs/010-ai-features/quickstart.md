# Quickstart Validation: AI Features

## Key Validation Scenarios

### 1. Provider Failover
- Mock Anthropic timeout → verify OpenAI fallback → verify response within 10s total

### 2. Both Providers Down
- Mock both Anthropic and OpenAI failing → verify 503 with `AI_UNAVAILABLE` code

### 3. Meeting Brief Happy Path
- Seed account with 15 activities + 8 orders → request brief → verify response contains key_contacts, activity_summary, order_trends, talking_points, health_score

### 4. Email Draft with Products
- Seed contact with email + products → request draft with product_ids → verify products referenced in body

### 5. Activity Summary Empty Account
- Request summary for account with no activities → verify "No recorded activities" response

### 6. Rate Limiting
- Send 11 requests in <1 minute → verify 429 on 11th request

### 7. RBAC Enforcement
- Request AI endpoint as `viewer` role → verify 403
- Request AI endpoint as `logistics` role → verify 403
- Request AI endpoint as `rep` role → verify 200

### 8. Tenant Isolation
- Request meeting brief for account in different tenant → verify 404
