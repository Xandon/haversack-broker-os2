# Research — 002-foundation

**Date**: 2026-02-26
**Reference Domain**: None (first domain; patterns established by this feature)

## Key Findings

### Entity Definitions (from 001 data-model.md)

**User**: id, tenant_id, email (unique per tenant), password_hash, first_name, last_name, role (enum), territory_id (FK, nullable), is_active, avatar_url, last_login_at, refresh_token_hash, created_at, updated_at, deleted_at.
- Indexes: (tenant_id, email) UNIQUE, (tenant_id, role), (territory_id), (tenant_id, is_active)

**Territory**: id, tenant_id, name, region, zip_codes (TEXT[]), boundary (JSONB), assigned_rep_id (FK→User), commission_modifier (DECIMAL 0.80-1.20), is_active, created_at, updated_at.
- Indexes: (tenant_id, name) UNIQUE, (assigned_rep_id), (tenant_id, region)

**AuditTrail**: id, tenant_id, actor_id, actor_email (denormalized), entity_type, entity_id, action (enum), field_name, old_value, new_value, change_summary (JSONB), ip_address, user_agent, request_id, created_at.
- INSERT-ONLY (no UPDATE/DELETE). Partitioned by created_at (monthly). 3-year retention.
- Indexes: (entity_type, entity_id, created_at DESC), (actor_id, created_at DESC), (tenant_id, created_at DESC), (request_id)

### Dependencies Available

All required packages already installed in backend/package.json:
- `@prisma/client@^5.10.0`, `prisma@^5.10.0` — ORM
- `bcrypt@^5.1.0`, `@types/bcrypt@^5.0.0` — Password hashing
- `jsonwebtoken@^9.0.0`, `@types/jsonwebtoken@^9.0.0` — JWT
- `fastify@^4.26.0`, `@fastify/cors@^9.0.0`, `@fastify/helmet@^11.0.0`, `@fastify/rate-limit@^9.0.0` — API + security
- `pino@^8.19.0` — Structured logging
- `zod@^3.22.0` — Validation
- `ioredis@^5.3.0` — Redis client
- `supertest@^6.3.0`, `@types/supertest@^6.0.0` — API testing

### Environment Variables

Pre-configured in .env.example:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/haversack_dev`
- `REDIS_URL=redis://localhost:6379`
- `JWT_ACCESS_SECRET=change-me-in-production`
- `JWT_REFRESH_SECRET=change-me-in-production`
- `NODE_ENV=development`, `PORT=3001`

### Test Configuration

- Vitest with 80% coverage threshold (branches, functions, lines, statements)
- Test files: `src/**/*.test.ts` (co-located)
- Test names must reference FR/AC identifiers
- Database tests use isolated transactions with rollback

### Domain Module Pattern (established by this feature)

```
backend/src/auth/
├── auth.routes.ts        # Fastify route handlers
├── auth.service.ts       # Business logic (login, refresh, logout)
├── auth.routes.test.ts   # Route integration tests
└── auth.service.test.ts  # Service unit tests
```

## Decisions

### D1: Prisma Schema Location
- **Decision**: `prisma/schema.prisma` at repo root (monorepo standard)
- **Rationale**: CLAUDE.md specifies `prisma/` at root level; Prisma migration commands reference this path
- **Alternatives**: Per-workspace schema (rejected — adds complexity for a single-database system)

### D2: Auth Route Prefix
- **Decision**: `/api/auth/*` prefix for all auth routes
- **Rationale**: CLAUDE.md patterns show `/api/` prefix; auth is a cross-cutting concern, not a domain resource
- **Alternatives**: `/auth/*` without prefix (rejected — inconsistent with other routes)

### D3: RLS Implementation Strategy
- **Decision**: Prisma `$executeRawUnsafe` in middleware to set session variables before each query
- **Rationale**: Prisma 5 doesn't natively support PostgreSQL session variables; raw SQL is the standard pattern
- **Alternatives**: Prisma Client Extensions (viable but less mature), separate database users per role (too complex)

### D4: Audit Trail Implementation
- **Decision**: Prisma middleware that intercepts create/update/delete operations and writes AuditLog in the same transaction
- **Rationale**: Ensures atomicity (audit write fails = main operation fails). Data model specifies INSERT-ONLY table.
- **Alternatives**: PostgreSQL triggers (harder to maintain with Prisma), application-level after-commit hooks (not atomic)

### D5: Token Storage
- **Decision**: Refresh token hash stored in RefreshToken table (not in User.refresh_token_hash as data model suggests)
- **Rationale**: Separate table supports token rotation and multiple device sessions cleanly. Data model shows refresh_token_hash on User, but a RefreshToken table is more robust for rotation.
- **Alternatives**: User.refresh_token_hash (single-device limitation)

### D6: Rate Limiting Store
- **Decision**: Redis-backed @fastify/rate-limit
- **Rationale**: Redis 7+ already in stack; in-memory limits don't persist across restarts or scale across instances
- **Alternatives**: In-memory (rejected — doesn't survive restarts)

### D7: File Naming Convention
- **Decision**: `kebab-case.ts` for all files (e.g., `auth.routes.ts`, `error-handler.ts`, `request-id.ts`)
- **Rationale**: CLAUDE.md mandates kebab-case for files/directories
- **Alternatives**: camelCase (rejected by CLAUDE.md rules)
