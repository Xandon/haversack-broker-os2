# Quickstart: Account Management

## Key Validation Scenarios

### 1. Account CRUD (FR-001)
```
1. Create account with all required fields → 201 + persisted
2. Create account with blank name → 400 validation error
3. Create account with wrong territory → warning about mismatch
4. Update account name → 200 + audit trail written
5. Soft-delete account → 200 + deleted_at set, excluded from list
```

### 2. Duplicate Detection (FR-005)
```
1. Create "Pacific Bistro" then attempt "Pacific Bistros" → 409 duplicate warning
2. Create with skipDuplicateCheck=true after warning → 201 + audit log
3. Check duplicates endpoint with no matches → 200 + empty array
```

### 3. Full-Text Search (FR-003)
```
1. Search "pac" (3 chars) → results containing "Pacific" accounts
2. Search "503-555" → results with matching contact phone
3. Search "xx" (2 chars) → 400 validation error
4. Search with no matches → 200 + empty array + total: 0
```

### 4. Parent-Child Hierarchy (FR-004)
```
1. Set parentAccountId on child → child appears in parent's childAccounts
2. Get parent detail → rollUpMetrics includes child data
3. Attempt circular reference (A→B→A) → 400 validation error
```

### 5. Account Detail (FR-002)
```
1. Get account with contacts → contacts array populated
2. Get account with no orders → orders empty array (not null)
3. Get account with health score → score + breakdown included
4. Get new account → healthScore null, status "pending"
```

### 6. Health Score (FR-006)
```
1. Run calculation on account with 45+ days inactive → score decreases ≥15 points
2. Run calculation on new account → score = 50 (baseline)
3. Filter accounts by healthScore < 40 → only at-risk accounts returned
```

### 7. Contact Management
```
1. Add contact to account → appears in contact list
2. Update contact email → audit trail written
3. Remove contact → soft-deleted, excluded from active contacts
4. Remove primary contact → must designate new primary
```

### 8. Cross-Cutting
```
1. All mutations write audit trail → AuditLog records created
2. Cross-tenant request → 404 (not 403)
3. Unauthenticated request → 401
4. Viewer role attempt to create → 403
```
