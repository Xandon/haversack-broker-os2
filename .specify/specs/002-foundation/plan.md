# Implementation Plan — 002-foundation

**Created**: 2026-02-26
**Feature**: Foundation (Auth, RBAC, RLS, Audit Trail)

## File Structure

### prisma/ (NEW directory)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `prisma/schema.prisma` | NEW | root | Core entities: User, Territory, UserTerritory, AuditLog, RefreshToken |
| `prisma/migrations/001_foundation/migration.sql` | NEW | root | Initial migration with tables, indexes, enums, RLS policies, audit trigger |
| `prisma/seed.ts` | NEW | root | Development seed data (users across 5 roles, 2 territories, 1 tenant) |

### packages/shared/src/ (NEW files)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `packages/shared/src/index.ts` | NEW | shared | Barrel export for all shared modules |
| `packages/shared/src/schemas/auth.schema.ts` | NEW | shared | Zod schemas: LoginRequest, RefreshRequest, TokenResponse |
| `packages/shared/src/schemas/user.schema.ts` | NEW | shared | Zod schemas: UserCreate, UserUpdate, UserResponse |
| `packages/shared/src/schemas/error.schema.ts` | NEW | shared | Zod schemas: ErrorResponse, ValidationErrorResponse |
| `packages/shared/src/types/roles.ts` | NEW | shared | Role enum, permission matrix, role hierarchy |
| `packages/shared/src/types/index.ts` | NEW | shared | Barrel export for types |
| `packages/shared/src/constants/index.ts` | NEW | shared | AUTH_CONFIG (token TTLs, bcrypt cost), TENANT_ID |

### backend/src/shared/ (NEW files)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `backend/src/shared/plugins/prisma.plugin.ts` | NEW | backend | Fastify plugin: PrismaClient singleton with RLS session variable middleware |
| `backend/src/shared/plugins/redis.plugin.ts` | NEW | backend | Fastify plugin: ioredis singleton |
| `backend/src/shared/plugins/rate-limit.plugin.ts` | NEW | backend | Fastify plugin: @fastify/rate-limit with Redis store |
| `backend/src/shared/plugins/cors.plugin.ts` | NEW | backend | Fastify plugin: @fastify/cors configuration |
| `backend/src/shared/plugins/helmet.plugin.ts` | NEW | backend | Fastify plugin: @fastify/helmet security headers |
| `backend/src/shared/plugins/request-id.plugin.ts` | NEW | backend | Fastify plugin: UUID request ID generation, X-Request-Id header |
| `backend/src/shared/middleware/authenticate.ts` | NEW | backend | Fastify preHandler: JWT verification, user context injection |
| `backend/src/shared/middleware/authorize.ts` | NEW | backend | Fastify preHandler: RBAC role check factory |
| `backend/src/shared/middleware/error-handler.ts` | NEW | backend | Fastify error handler: structured JSON responses, no stack traces in prod |
| `backend/src/shared/services/jwt.service.ts` | NEW | backend | JWT sign/verify for access + refresh tokens |
| `backend/src/shared/services/password.service.ts` | NEW | backend | bcrypt hash + compare, cost factor 12 |
| `backend/src/shared/services/audit.service.ts` | NEW | backend | Audit trail write function (used by Prisma middleware) |
| `backend/src/shared/types/fastify.d.ts` | NEW | backend | Fastify type augmentation: request.user, request.requestId |

### backend/src/auth/ (NEW domain)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `backend/src/auth/auth.routes.ts` | NEW | backend | POST /api/auth/login, /refresh, /logout |
| `backend/src/auth/auth.service.ts` | NEW | backend | Login logic, token management, refresh rotation |
| `backend/src/auth/auth.routes.test.ts` | NEW | backend | Integration tests: login, refresh, logout, rate limiting |
| `backend/src/auth/auth.service.test.ts` | NEW | backend | Unit tests: password verification, token generation |

### backend/src/ (NEW bootstrap files)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `backend/src/app.ts` | NEW | backend | Fastify app bootstrap: plugin registration, route registration, error handler |
| `backend/src/server.ts` | NEW | backend | Server entry point: listen on PORT |

### backend/src/shared/ (NEW test helpers)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `backend/src/shared/test-helpers/app.ts` | NEW | backend | Test app factory: builds Fastify instance for Supertest |
| `backend/src/shared/test-helpers/auth.ts` | NEW | backend | Test token generator: create tokens for different roles |
| `backend/src/shared/test-helpers/db.ts` | NEW | backend | Test database helpers: transaction isolation, cleanup |

## File Count Summary

- **NEW files**: 28
- **MODIFIED files**: 0
- **Total**: 28

## Dependency Graph

```
prisma/schema.prisma
  └── prisma/seed.ts
  └── packages/shared/src/types/roles.ts
       └── packages/shared/src/schemas/*.ts
            └── backend/src/shared/services/jwt.service.ts
            └── backend/src/shared/services/password.service.ts
            └── backend/src/shared/services/audit.service.ts
                 └── backend/src/shared/plugins/prisma.plugin.ts
                 └── backend/src/shared/middleware/authenticate.ts
                 └── backend/src/shared/middleware/authorize.ts
                 └── backend/src/shared/middleware/error-handler.ts
                      └── backend/src/app.ts
                           └── backend/src/auth/auth.service.ts
                                └── backend/src/auth/auth.routes.ts
                                     └── backend/src/server.ts
```

## Migration Strategy

### Initial Migration (001_foundation)

SQL migration will include:
1. Create enums: `user_role`, `audit_action`
2. Create tables: `users`, `territories`, `user_territories`, `audit_logs`, `refresh_tokens`
3. Create indexes per data model
4. Enable RLS on `users` and `territories` tables
5. Create RLS policies:
   - Rep: SELECT/INSERT/UPDATE/DELETE WHERE territory_id IN (user's territories)
   - Manager: SELECT/INSERT/UPDATE/DELETE all rows (same tenant)
   - Admin: BYPASSRLS (superuser or policy-exempt)
   - Viewer: SELECT only
   - Logistics: SELECT all + UPDATE on order-related fields
6. Create immutability trigger on `audit_logs` (reject UPDATE/DELETE)
7. Create audit partition function (monthly partitioning)

### RLS Session Variable Setup

The Prisma plugin will execute before each query:
```sql
SET LOCAL app.current_user_id = '{userId}';
SET LOCAL app.current_tenant_id = '{tenantId}';
SET LOCAL app.current_user_role = '{role}';
```

RLS policies reference these variables via `current_setting('app.current_user_id')`.
