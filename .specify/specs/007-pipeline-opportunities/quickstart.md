# Quickstart: Pipeline & Opportunities Validation

## Key Validation Scenarios

### 1. Opportunity Lifecycle
1. Create Opportunity with stage "prospect" → verify probability auto-set to 10%
2. Transition to "qualified" → verify probability changes to 40%
3. Transition to "proposal" with custom probability 65% → verify 65% preserved
4. Transition to "negotiation" → verify probability resets to 75% (stage changed)
5. Transition to "closed_won" with closeReason → verify probability=100%, closedAt set
6. Attempt to reopen → verify rejection

### 2. Pipeline Summary
1. Create 5 Opportunities across 3 stages
2. GET /api/pipeline/summary → verify grouping and forecast math
3. Filter by repId → verify only that rep's Opportunities appear
4. Verify weightedTotal = SUM(estimatedValue * probability / 100)

### 3. RBAC Enforcement
1. Rep creates own Opportunity → 201
2. Rep reads other rep's Opportunity → 200 (read is open)
3. Rep updates other rep's Opportunity → 403
4. Manager updates any Opportunity → 200
5. Viewer reads pipeline → 200
6. Viewer creates Opportunity → 403
7. Logistics reads pipeline → 200

### 4. Tenant Isolation
1. Create Opportunity in tenant A
2. Query from tenant B → not visible
3. Pipeline summary → only tenant's Opportunities

### 5. Win/Loss Analytics
1. Create mix of closed_won and closed_lost Opportunities
2. GET /api/pipeline/analytics → verify win rate, avg deal size, avg cycle
3. Rep sees only own data; Manager sees all
