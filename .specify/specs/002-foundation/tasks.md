# Tasks — 002-foundation

**Feature**: Foundation (Auth, RBAC, RLS, Audit Trail)
**Total Tasks**: 22
**Batches**: 3 (Batch 1-3, global counter starting at 1)
**Task IDs**: T001-T022

## Batch 1: Schema, Shared Types & Core Services (8 tasks)
**Branch**: `feature/batch-1-foundation-schema`
**Dependencies**: None (foundational)

### US1: Prisma Schema & Migrations

- [x] **T001** [P1] Create Prisma schema with core entities
  - Files: `prisma/schema.prisma` (NEW)
  - Workspace: root
  - Description: Define User, Territory, UserTerritory, AuditLog, RefreshToken models with all fields from data-model.md. Include enums (UserRole, AuditAction). Configure PostgreSQL provider.
  - Refs: FR-F013, US1-AC1
  - Depends on: --

- [x] **T002** [P1] Create initial migration with RLS policies and audit trigger
  - Files: `prisma/migrations/001_foundation/migration.sql` (NEW)
  - Workspace: root
  - Description: Run `prisma migrate dev`. Then add custom SQL: RLS policies for territory isolation (rep/manager/admin/viewer/logistics), immutability trigger on audit_logs, indexes per data model.
  - Refs: FR-F005, FR-F008, US4-AC4, US4-AC1-5
  - Depends on: T001

- [x] **T003** [P1] Create seed data script
  - Files: `prisma/seed.ts` (NEW)
  - Workspace: root
  - Description: Seed 1 tenant, 2 territories (Portland Metro, Seattle Metro), 6 users (1 per role + 1 extra rep in different territory). Hash passwords with bcrypt cost 12.
  - Refs: FR-F014, FR-F002, US1-AC2
  - Depends on: T002

### Shared Types & Schemas

- [x] **T004** [P1] Create shared role types and permission matrix
  - Files: `packages/shared/src/types/roles.ts` (NEW), `packages/shared/src/types/index.ts` (NEW)
  - Workspace: shared
  - Description: Define UserRole enum, Permission type, ROLE_PERMISSIONS matrix mapping each role to allowed actions. Export RoleGuard type for middleware.
  - Refs: FR-F004, US3
  - Depends on: --

- [x] **T005** [P1] Create shared Zod schemas for auth
  - Files: `packages/shared/src/schemas/auth.schema.ts` (NEW), `packages/shared/src/schemas/error.schema.ts` (NEW), `packages/shared/src/schemas/user.schema.ts` (NEW)
  - Workspace: shared
  - Description: LoginRequestSchema (email+password), RefreshRequestSchema, TokenResponseSchema, ErrorResponseSchema, ValidationErrorSchema, UserResponseSchema.
  - Refs: FR-F001, FR-F010, US2, US6
  - Depends on: T004

- [x] **T006** [P1] Create shared constants and barrel exports
  - Files: `packages/shared/src/constants/index.ts` (NEW), `packages/shared/src/index.ts` (NEW)
  - Workspace: shared
  - Description: AUTH_CONFIG (access token TTL 15min, refresh TTL 7d, bcrypt cost 12), DEFAULT_TENANT_ID, error code constants. Barrel export all schemas, types, constants.
  - Refs: FR-F001, FR-F002
  - Depends on: T004, T005

### Core Services

- [x] **T007** [P1] Create JWT service
  - Files: `backend/src/shared/services/jwt.service.ts` (NEW)
  - Workspace: backend
  - Description: signAccessToken(payload), signRefreshToken(payload), verifyAccessToken(token), verifyRefreshToken(token). Use HS256. Read secrets from env.
  - Refs: FR-F001, US2-AC1
  - Depends on: T006

- [x] **T008** [P1] Create password service
  - Files: `backend/src/shared/services/password.service.ts` (NEW)
  - Workspace: backend
  - Description: hashPassword(plain), comparePassword(plain, hash). Use bcrypt cost factor 12. Explicit return types.
  - Refs: FR-F002, US2-AC7
  - Depends on: T006

---

## Batch 2: Plugins, Middleware & Auth Routes (9 tasks)
**Branch**: `feature/batch-2-foundation-middleware`
**Dependencies**: Batch 1 complete

### Fastify Plugins

- [x] **T009** [P1] Create Prisma plugin with RLS session variable middleware
  - Files: `backend/src/shared/plugins/prisma.plugin.ts` (NEW)
  - Workspace: backend
  - Description: Fastify plugin that registers PrismaClient singleton. Add Prisma middleware that sets `app.current_user_id`, `app.current_tenant_id`, `app.current_user_role` via `SET LOCAL` before each query.
  - Refs: FR-F005, FR-F007, US4-AC6
  - Depends on: T001, T007

- [x] **T010** [P1] Create Redis, rate-limit, CORS, helmet, request-ID plugins
  - Files: `backend/src/shared/plugins/redis.plugin.ts` (NEW), `backend/src/shared/plugins/rate-limit.plugin.ts` (NEW), `backend/src/shared/plugins/cors.plugin.ts` (NEW), `backend/src/shared/plugins/helmet.plugin.ts` (NEW), `backend/src/shared/plugins/request-id.plugin.ts` (NEW)
  - Workspace: backend
  - Description: Redis singleton via ioredis. Rate limit: 10 req/min on auth routes via Redis store. CORS: allow FRONTEND_URL. Helmet: security headers. Request-ID: generate UUID, set X-Request-Id header.
  - Refs: FR-F003, FR-F011, US2-AC5, US6-AC4
  - Depends on: --

### Middleware

- [x] **T011** [P1] Create authentication middleware (JWT verification)
  - Files: `backend/src/shared/middleware/authenticate.ts` (NEW), `backend/src/shared/types/fastify.d.ts` (NEW)
  - Workspace: backend
  - Description: Fastify preHandler: extract Bearer token from Authorization header, verify JWT, attach user to request. Type-augment FastifyRequest with `user` and `requestId`.
  - Refs: FR-F001, US3-AC3, US3-AC4
  - Depends on: T007

- [x] **T012** [P1] Create authorization middleware (RBAC role check)
  - Files: `backend/src/shared/middleware/authorize.ts` (NEW)
  - Workspace: backend
  - Description: Factory function `authorize(...roles: UserRole[])` returns preHandler. Check request.user.role against allowed roles. Return 403 if unauthorized.
  - Refs: FR-F004, FR-F006, US3-AC1, US3-AC2, US3-AC5, US3-AC6
  - Depends on: T004, T011

- [x] **T013** [P1] Create error handler middleware
  - Files: `backend/src/shared/middleware/error-handler.ts` (NEW)
  - Workspace: backend
  - Description: Fastify setErrorHandler. Map Zod errors to 400 with field details. Map known errors to appropriate HTTP codes. Catch-all 500 with no stack trace in production. Include requestId in all error responses.
  - Refs: FR-F010, FR-F012, US6-AC1-5
  - Depends on: T005, T010

### Audit Service

- [x] **T014** [P1] Create audit trail service and Prisma middleware
  - Files: `backend/src/shared/services/audit.service.ts` (NEW)
  - Workspace: backend
  - Description: writeAuditLog(params) function. Prisma middleware that intercepts create/update/delete on audited entities and writes AuditLog in the same transaction. Diff detection for update operations (one row per changed field).
  - Refs: FR-F008, FR-F009, US5-AC1-6
  - Depends on: T001, T009

### Auth Routes

- [x] **T015** [P1] Create auth service (login, refresh, logout logic)
  - Files: `backend/src/auth/auth.service.ts` (NEW)
  - Workspace: backend
  - Description: login(email, password): verify credentials, create tokens, store refresh token hash. refresh(refreshToken): validate, rotate, return new access token. logout(userId): revoke all refresh tokens. Check is_active flag.
  - Refs: FR-F001, US2-AC1-7
  - Depends on: T007, T008, T009

- [x] **T016** [P1] Create auth routes
  - Files: `backend/src/auth/auth.routes.ts` (NEW)
  - Workspace: backend
  - Description: POST /api/auth/login (rate-limited), POST /api/auth/refresh, POST /api/auth/logout (authenticated). Zod validation on all request bodies.
  - Refs: FR-F001, FR-F003, US2
  - Depends on: T005, T010, T011, T015

- [x] **T017** [P1] Create Fastify app bootstrap and server entry point [P]
  - Files: `backend/src/app.ts` (NEW), `backend/src/server.ts` (NEW)
  - Workspace: backend
  - Description: Register all plugins (prisma, redis, rate-limit, cors, helmet, request-id), error handler, auth routes. Server.ts listens on PORT with graceful shutdown.
  - Refs: All FR-F*, all US
  - Depends on: T009, T010, T013, T016

---

## Batch 3: Test Helpers & Integration Tests (5 tasks)
**Branch**: `feature/batch-3-foundation-tests`
**Dependencies**: Batch 2 complete

- [x] **T018** [P1] Create test helpers (app factory, auth helpers, DB helpers)
  - Files: `backend/src/shared/test-helpers/app.ts` (NEW), `backend/src/shared/test-helpers/auth.ts` (NEW), `backend/src/shared/test-helpers/db.ts` (NEW)
  - Workspace: backend
  - Description: buildTestApp(): create Fastify instance for Supertest. generateTestToken(role): create JWT for test requests. setupTestDb/teardownTestDb: transaction isolation.
  - Refs: Testing requirements from CLAUDE.md
  - Depends on: T017

- [x] **T019** [P1] Write auth service unit tests
  - Files: `backend/src/auth/auth.service.test.ts` (NEW)
  - Workspace: backend
  - Description: Test login (valid/invalid creds, inactive user), refresh (valid/expired/revoked token), logout. Mock Prisma client. Reference FR-F001, FR-F002, US2-AC1-7.
  - Refs: FR-F001, FR-F002, US2
  - Depends on: T015, T018

- [x] **T020** [P1] Write auth route integration tests
  - Files: `backend/src/auth/auth.routes.test.ts` (NEW)
  - Workspace: backend
  - Description: Supertest tests: POST /api/auth/login (success, failure, rate limiting), POST /api/auth/refresh (success, expired), POST /api/auth/logout. Verify response shapes match contract.
  - Refs: FR-F001, FR-F003, US2, US6
  - Depends on: T016, T018

- [x] **T021** [P1] Write RBAC and error handling integration tests
  - Files: `backend/src/shared/middleware/authenticate.test.ts` (NEW), `backend/src/shared/middleware/authorize.test.ts` (NEW), `backend/src/shared/middleware/error-handler.test.ts` (NEW)
  - Workspace: backend
  - Description: Test: missing token → 401, expired token → 401, wrong role → 403, admin → pass all routes, validation error → 400 with details, 500 → no stack trace. Reference US3, US6.
  - Refs: FR-F004, FR-F010, FR-F012, US3, US6
  - Depends on: T011, T012, T013, T018

- [x] **T022** [P2] Write audit trail and JWT service unit tests
  - Files: `backend/src/shared/services/audit.service.test.ts` (NEW), `backend/src/shared/services/jwt.service.test.ts` (NEW), `backend/src/shared/services/password.service.test.ts` (NEW)
  - Workspace: backend
  - Description: Test audit log creation for create/update/delete. Test JWT sign/verify, expiry, invalid tokens. Test bcrypt hash/compare, cost factor verification. Reference US5, FR-F008.
  - Refs: FR-F001, FR-F002, FR-F008, US5
  - Depends on: T007, T008, T014, T018

---

## Summary

| Batch | Tasks | Branch Name | Description |
|-------|-------|-------------|-------------|
| 1 | T001-T008 (8 tasks) | `feature/batch-1-foundation-schema` | Schema, shared types, core services |
| 2 | T009-T017 (9 tasks) | `feature/batch-2-foundation-middleware` | Plugins, middleware, auth routes, app bootstrap |
| 3 | T018-T022 (5 tasks) | `feature/batch-3-foundation-tests` | Test helpers and all test files |

## Parallel Opportunities

- T004 + T001 can start in parallel (no dependency)
- T007 + T008 can run in parallel (both depend on T006 only)
- T010 has no dependencies — can start immediately
- T019 + T020 + T021 + T022 can run in parallel (all depend on T018)
