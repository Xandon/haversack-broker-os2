# Feature Specification: Foundation (Auth, RBAC, RLS, Audit Trail)

**Feature Branch**: `002-foundation`
**Created**: 2026-02-26
**Status**: Draft
**Input**: Foundation infrastructure — JWT authentication, RBAC (5 roles), PostgreSQL RLS policies for tenant/territory isolation, immutable audit trail, Prisma schema with core entities, structured error handling with correlation IDs.

## User Scenarios & Testing

### User Story 1 - Prisma Schema & Core Entity Migrations (Priority: P1)

The system needs a fully-typed database schema with core entities (User, Territory, AuditLog) before any feature can be built. This story establishes the Prisma schema, runs the initial migration, and seeds development data.

**Why this priority**: Every other feature depends on having the database schema and core entities in place. Without this, nothing else can be built.

**Independent Test**: Can be tested by running `npm run db:migrate` and verifying that all tables exist with correct columns, constraints, and indexes. Seed data populates test users across all 5 roles.

**Acceptance Scenarios**:

1. **Given** a fresh PostgreSQL 16+ database, **When** `npx prisma migrate deploy` is run, **Then** the migration creates User, Territory, UserTerritory, AuditLog, and RefreshToken tables with all columns matching the PRD data model definitions.
2. **Given** the schema is migrated, **When** `npm run db:seed` is run, **Then** the database contains at least: 1 admin, 1 manager, 2 reps (different territories), 1 logistics, 1 viewer user; and at least 2 territories.
3. **Given** the Prisma client is generated, **When** TypeScript code imports `PrismaClient`, **Then** all entity types are fully typed with strict mode and no `any` types.
4. **Given** a User record, **When** the `tenant_id` field is null, **Then** the database rejects the insert with a NOT NULL constraint violation.

---

### User Story 2 - JWT Authentication (Priority: P1)

A user (any role) can log in with email/password and receive JWT tokens. The access token expires in 15 minutes, the refresh token in 7 days. The user can refresh their access token without re-entering credentials. Login endpoints are rate-limited to 10 requests per minute per IP.

**Why this priority**: Authentication is the entry point for all user interactions. No feature can be accessed without authentication.

**Independent Test**: Can be tested by calling POST /api/auth/login with valid credentials and verifying token response, then using the token to access a protected route.

**Acceptance Scenarios**:

1. **Given** a registered user with email "rep@haversack.test" and a valid password, **When** the user sends POST /api/auth/login with correct credentials, **Then** the system returns HTTP 200 with `{ accessToken, refreshToken, user: { id, email, role, firstName, lastName } }` where accessToken expires in 15 minutes and refreshToken expires in 7 days.
2. **Given** a login request with an incorrect password, **When** the user sends POST /api/auth/login, **Then** the system returns HTTP 401 with `{ error: "UNAUTHORIZED", message: "Invalid email or password", code: "AUTH_INVALID_CREDENTIALS", requestId }` and does not reveal whether the email exists.
3. **Given** a valid refresh token, **When** the user sends POST /api/auth/refresh with the refresh token, **Then** the system returns HTTP 200 with a new accessToken (15-minute expiry) and the same refreshToken.
4. **Given** an expired refresh token, **When** the user sends POST /api/auth/refresh, **Then** the system returns HTTP 401 with `{ error: "UNAUTHORIZED", message: "Refresh token expired", code: "AUTH_TOKEN_EXPIRED", requestId }`.
5. **Given** 10 failed login attempts from the same IP within 1 minute, **When** the 11th request arrives, **Then** the system returns HTTP 429 with `{ error: "TOO_MANY_REQUESTS", message: "Rate limit exceeded. Try again in {seconds} seconds", code: "AUTH_RATE_LIMITED", requestId }`.
6. **Given** an authenticated user, **When** the user sends POST /api/auth/logout with a valid access token, **Then** the system invalidates the refresh token and returns HTTP 200.
7. **Given** a password "TestPassword123!", **When** the password is stored, **Then** it is hashed with bcrypt at cost factor 12 and the original password cannot be recovered from the hash.

---

### User Story 3 - RBAC Middleware (Priority: P1)

All API routes are protected by role-based access control. The system enforces 5 roles: Admin, Manager, Rep, Logistics, Viewer. Each role has a defined permission set. Routes declare their required role(s), and the middleware rejects requests from users without the required role.

**Why this priority**: RBAC is required by NFR-008 and must be enforced on every route before any feature endpoints are built.

**Independent Test**: Can be tested by sending requests to protected routes with tokens for different roles and verifying that access is granted or denied based on role.

**Acceptance Scenarios**:

1. **Given** a Rep user with a valid access token, **When** the Rep accesses GET /api/accounts (a route requiring Rep, Manager, or Admin role), **Then** the system allows the request and returns data.
2. **Given** a Viewer user with a valid access token, **When** the Viewer accesses POST /api/accounts (a route requiring Rep, Manager, or Admin role), **Then** the system returns HTTP 403 with `{ error: "FORBIDDEN", message: "Insufficient permissions", code: "AUTH_FORBIDDEN", requestId }`.
3. **Given** a request without an Authorization header, **When** the request hits any protected route, **Then** the system returns HTTP 401 with `{ error: "UNAUTHORIZED", message: "Authentication required", code: "AUTH_MISSING_TOKEN", requestId }`.
4. **Given** a request with an expired access token, **When** the request hits a protected route, **Then** the system returns HTTP 401 with `{ error: "UNAUTHORIZED", message: "Token expired", code: "AUTH_TOKEN_EXPIRED", requestId }`.
5. **Given** an Admin user, **When** the Admin accesses any route in the system, **Then** the Admin is granted access (Admin has full permissions).
6. **Given** a Logistics user, **When** the Logistics user accesses order fulfillment routes, **Then** access is granted; **When** the Logistics user accesses commission routes, **Then** access is denied with HTTP 403.

---

### User Story 4 - PostgreSQL RLS Policies (Priority: P1)

The database enforces row-level security so that Reps can only read/write data within their assigned territories. Managers can access all territories. Admins bypass RLS entirely. This is enforced at the database layer, not just the application layer, as defense-in-depth.

**Why this priority**: NFR-008 requires territory-scoped data access via PostgreSQL RLS. This prevents cross-tenant data leakage even if application code has bugs.

**Independent Test**: Can be tested by setting the PostgreSQL session variable `app.current_user_id` to different user IDs and querying tables to verify that only territory-scoped rows are returned.

**Acceptance Scenarios**:

1. **Given** a Rep assigned to Territory A, **When** the Rep's session queries the Account table, **Then** only accounts belonging to Territory A are returned.
2. **Given** a Rep assigned to Territory A, **When** the Rep's session attempts to INSERT an Account into Territory B, **Then** the database rejects the insert.
3. **Given** a Manager user, **When** the Manager's session queries the Account table, **Then** accounts from all territories are returned.
4. **Given** an Admin user, **When** the Admin's session queries any table, **Then** all rows are returned regardless of territory (RLS bypassed).
5. **Given** a Viewer user, **When** the Viewer's session attempts to UPDATE any row, **Then** the database rejects the write (Viewer has read-only RLS policy).
6. **Given** the Prisma middleware, **When** any query is executed, **Then** the middleware sets `app.current_user_id` and `app.current_tenant_id` as PostgreSQL session variables before the query runs.

---

### User Story 5 - Immutable Audit Trail (Priority: P1)

All create, update, and delete operations on Account, Order, Commission, and User entities automatically record an audit log entry. Audit records are immutable (no UPDATE/DELETE allowed on the audit table). Each entry records: actor user ID, timestamp (UTC), entity type, entity ID, operation type, field changed, old value, new value.

**Why this priority**: NFR-014 mandates audit trail for compliance (FSMA 204) and business accountability. This must be in place before any entity CRUD operations are built.

**Independent Test**: Can be tested by performing a CRUD operation on a User entity and verifying that an AuditLog row is created with correct field values.

**Acceptance Scenarios**:

1. **Given** a Rep creates a new Account, **When** the Account is persisted, **Then** the AuditLog table contains a row with `operation: "CREATE"`, `entity_type: "Account"`, `entity_id` matching the new account's ID, `actor_id` matching the Rep's ID, and `timestamp` within 1 second of the operation.
2. **Given** a Manager updates an Account's name from "Old Name" to "New Name", **When** the update is persisted, **Then** the AuditLog contains a row with `operation: "UPDATE"`, `field_changed: "name"`, `old_value: "Old Name"`, `new_value: "New Name"`.
3. **Given** an Admin deletes a User, **When** the soft-delete is persisted (setting `deleted_at`), **Then** the AuditLog contains a row with `operation: "DELETE"`, `entity_type: "User"`, `entity_id` matching the deleted user's ID.
4. **Given** an existing AuditLog record, **When** any SQL UPDATE or DELETE is attempted on the audit_logs table, **Then** the database rejects the operation (immutability enforced by PostgreSQL trigger).
5. **Given** an audit write operation, **When** measured under load, **Then** the write latency is under 10ms at p95.
6. **Given** a multi-field update (e.g., Account name and address both change), **When** the update is persisted, **Then** the AuditLog contains one row per changed field.

---

### User Story 6 - Structured Error Handling & Request Correlation (Priority: P2)

All API errors return a consistent JSON structure: `{ error, message, code, requestId }`. Every request is assigned a unique correlation ID (requestId) that appears in error responses and structured logs. Stack traces are never exposed in production.

**Why this priority**: Consistent error handling and correlation IDs are needed for debugging and operational support, but are not blocking for basic functionality.

**Independent Test**: Can be tested by triggering various error conditions (404, 400, 500) and verifying the response structure includes all required fields.

**Acceptance Scenarios**:

1. **Given** a request to a non-existent route, **When** the request is processed, **Then** the system returns HTTP 404 with `{ error: "NOT_FOUND", message: "Route not found", code: "ROUTE_NOT_FOUND", requestId: "<uuid>" }`.
2. **Given** a request with invalid JSON body, **When** the request is processed, **Then** the system returns HTTP 400 with `{ error: "BAD_REQUEST", message: "Invalid request body", code: "VALIDATION_ERROR", requestId }` and the response does not contain a stack trace.
3. **Given** an unhandled error in a route handler, **When** the error occurs in production mode, **Then** the system returns HTTP 500 with `{ error: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred", code: "INTERNAL_ERROR", requestId }` and logs the full stack trace with the requestId to Pino structured logs.
4. **Given** any API response, **When** the response is sent, **Then** the `X-Request-Id` header is present and matches the requestId in the response body (if error) and in the structured log entry.
5. **Given** a Zod validation failure on request body, **When** the validation fails, **Then** the system returns HTTP 400 with field-level error details: `{ error: "BAD_REQUEST", message: "Validation failed", code: "VALIDATION_ERROR", requestId, details: [{ field, message }] }`.

---

### Edge Cases

- What happens when a user's role is changed while they have an active session? The access token continues with the old role until it expires (15 min max), then the refresh returns a new token with the updated role.
- What happens when a Rep is reassigned to a different territory? The RLS policies use the current territory assignment, so the Rep immediately loses access to the old territory's data on next query.
- What happens when the database is unavailable during an audit write? The primary operation should fail (audit write is transactional with the main operation). The system returns a 500 error rather than silently dropping the audit entry.
- What happens during concurrent token refresh requests? Only one refresh succeeds; subsequent requests with the old refresh token receive 401 (refresh token rotation).
- What happens when bcrypt hashing takes too long under load? The login endpoint has a 5-second timeout. If bcrypt exceeds this, the request fails with 408 Request Timeout.

## Clarifications

1. **JWT signing algorithm**: HS256 with a server-side secret stored in `JWT_SECRET` environment variable. RS256 is unnecessary for a single-service architecture. In development, a default secret is used. In production, `JWT_SECRET` must be explicitly set.
2. **Tenant model**: Single-tenant deployment (one Haversack instance) with `tenant_id` on all entities for future multi-tenant readiness. Seed data creates one tenant "haversack-sales" with a fixed UUID.
3. **Rate limiting backend**: Redis-based using `@fastify/rate-limit` with Redis 7+ store. This is consistent with the tech stack (Redis already required for BullMQ).
4. **Deactivated user login**: Users with `is_active: false` receive the same "Invalid email or password" error as nonexistent users to prevent user enumeration attacks.
5. **Password validation rules**: Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number. Validated via Zod schema on registration/password-change endpoints.
6. **Frontend scope**: This feature is backend infrastructure only. No frontend login page or auth UI is included. Frontend authentication (login page, auth provider, token storage in httpOnly cookies) will be built as part of the Account Management feature (Feature 2).
7. **Audit trail for entities not yet created**: The audit trail middleware and immutability trigger are built now. The actual audit logging for Account, Order, and Commission entities will activate when those entities are added in subsequent features. For this feature, audit logging is verified using the User entity (which exists in the schema).

## Requirements

### Functional Requirements

- **FR-F001**: System MUST authenticate users via email/password with JWT tokens (15-minute access, 7-day refresh) per NFR-007.
- **FR-F002**: System MUST hash passwords with bcrypt at cost factor 12 per NFR-007.
- **FR-F003**: System MUST rate-limit authentication endpoints to 10 requests per minute per IP per NFR-007.
- **FR-F004**: System MUST enforce RBAC across 5 roles (Admin, Manager, Rep, Logistics, Viewer) on all API routes per NFR-008.
- **FR-F005**: System MUST enforce PostgreSQL RLS policies ensuring Reps access only their assigned territory's data per NFR-008.
- **FR-F006**: System MUST complete access control checks within 5ms per request per NFR-008.
- **FR-F007**: System MUST execute multi-table writes within ACID transactions and roll back on partial failure per NFR-013.
- **FR-F008**: System MUST record immutable audit trail entries for all CUD operations on Account, Order, Commission, and User entities per NFR-014.
- **FR-F009**: System MUST retain audit records for minimum 3 years with write latency under 10ms per NFR-014.
- **FR-F010**: System MUST return structured error responses `{ error, message, code, requestId }` on all API errors.
- **FR-F011**: System MUST generate and propagate a unique requestId (correlation ID) for every API request.
- **FR-F012**: System MUST NOT expose stack traces in production error responses.
- **FR-F013**: System MUST provide a Prisma schema with core entities (User, Territory, AuditLog) and generate typed client in strict TypeScript mode.
- **FR-F014**: System MUST provide seed data with users across all 5 roles and at least 2 territories.

### Key Entities

- **User**: Represents a platform user. Key attributes: id (UUID), email (unique), password_hash, first_name, last_name, role (enum: admin/manager/rep/logistics/viewer), is_active, tenant_id, last_login_at, created_at, updated_at, deleted_at.
- **Territory**: Represents a geographic sales territory. Key attributes: id (UUID), name, description, tenant_id, is_active, created_at, updated_at.
- **UserTerritory**: Junction table linking users to territories (a Rep can be assigned to one or more territories). Key attributes: user_id, territory_id, assigned_at.
- **AuditLog**: Immutable record of all data changes. Key attributes: id (UUID), actor_id (references User), entity_type, entity_id, operation (CREATE/UPDATE/DELETE), field_changed, old_value, new_value, timestamp (UTC), tenant_id.
- **RefreshToken**: Stores active refresh tokens for token rotation. Key attributes: id (UUID), user_id, token_hash, expires_at, created_at, revoked_at.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can authenticate and receive tokens in under 500ms at p95.
- **SC-002**: Access control checks (RBAC middleware) complete in under 5ms at p95.
- **SC-003**: RLS policies correctly isolate 100% of territory-scoped queries (verified by integration tests).
- **SC-004**: Audit trail writes complete in under 10ms at p95.
- **SC-005**: 0% of production error responses contain stack traces.
- **SC-006**: All test users across 5 roles can authenticate and access only their permitted routes (verified by integration tests).
- **SC-007**: Rate limiting correctly blocks the 11th request within a 1-minute window (verified by integration test).
- **SC-008**: Prisma schema generates with 0 TypeScript errors in strict mode.
