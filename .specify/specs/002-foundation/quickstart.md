# Quickstart Validation — 002-foundation

## Key Validation Scenarios

### 1. Authentication Flow
1. Start services: `npm run docker:up`
2. Run migration: `npm run db:migrate`
3. Seed data: `npm run db:seed`
4. Start backend: `cd backend && npm run dev`
5. Login: `curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"rep@haversack.test","password":"TestPassword1"}'`
6. Verify: response contains `accessToken` and `refreshToken`

### 2. RBAC Enforcement
1. Login as rep (above) — save accessToken
2. Access protected route: `curl http://localhost:3001/api/health -H "Authorization: Bearer {accessToken}"`
3. Verify: 200 OK
4. Try without token: `curl http://localhost:3001/api/health`
5. Verify: 401 Unauthorized

### 3. Rate Limiting
1. Send 11 rapid login requests (any credentials)
2. Verify: 11th request returns 429 with retry-after

### 4. Audit Trail
1. Login as admin
2. Update a user record
3. Query audit_logs table
4. Verify: audit entry exists with correct actor, entity, field, old/new values

### 5. RLS Isolation
1. Login as Rep assigned to Territory A
2. Query accounts (once Account feature exists; for now test with direct DB queries)
3. Verify: only Territory A data returned
4. Login as Manager
5. Verify: all territory data returned
