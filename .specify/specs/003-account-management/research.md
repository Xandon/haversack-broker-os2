# Research: Account Management

**Feature:** 003-account-management
**Date:** 2026-02-26
**Reference Domain:** auth (backend/src/auth/)

## Pattern 1: Route Structure

**Decision:** Follow the auth routes pattern — async route registration function that receives FastifyInstance.

**Rationale:** The auth module (auth.routes.ts) establishes the pattern: export an async function that registers routes on the app instance. Routes use Zod schema parsing for request validation. Protected routes use `preHandler` array with `authenticate` and optionally `authorize`.

**Pattern:**
```typescript
export async function accountRoutes(app: FastifyInstance): Promise<void> {
  // All routes under /api/accounts
  app.post('/api/accounts', {
    preHandler: [authenticate, authorize('rep', 'manager')],
  }, async (request, reply) => {
    const body = createAccountSchema.parse(request.body);
    // ... service call
  });
}
```

**Alternatives Considered:** Fastify autoload plugin — rejected because the existing codebase uses explicit route registration in app.ts, and consistency is more important than convention.

## Pattern 2: Service Function Signatures

**Decision:** Service functions receive PrismaClient as first param, then domain params. Custom error class per domain.

**Rationale:** The auth service (auth.service.ts) pattern: functions like `login(prisma, email, password)` receive PrismaClient explicitly (not via DI container). Domain-specific error class (`AuthError`) for typed error handling in routes. This enables easy unit testing with mocked Prisma.

**Pattern:**
```typescript
export async function createAccount(
  prisma: PrismaClient,
  tenantId: string,
  data: CreateAccountInput,
): Promise<Account> { ... }

export class AccountError extends Error {
  code: string;
  constructor(message: string, code: string) { ... }
}
```

**Alternatives Considered:** Dependency injection container — rejected because the codebase uses explicit parameter passing for simplicity and testability.

## Pattern 3: Tenant Isolation

**Decision:** All service functions require tenantId parameter. All Prisma queries include `where: { tenantId }`.

**Rationale:** The auth service queries by `email` without explicit tenantId because login is pre-auth. Post-auth routes extract tenantId from `request.user.tenantId`. Account queries MUST always include tenantId for RLS enforcement.

**Pattern:**
```typescript
// Extract from authenticated request
const tenantId = request.user!.tenantId;
const account = await getAccount(app.prisma, tenantId, accountId);
```

## Pattern 4: Audit Trail Integration

**Decision:** Use the existing `writeAuditLog` and `writeUpdateAuditLogs` functions from audit.service.ts. Call after successful mutations.

**Rationale:** The audit service (audit.service.ts) provides: `writeAuditLog` for create/delete, `detectChanges` + `writeUpdateAuditLogs` for updates. This pattern logs per-field changes for update operations.

**Pattern:**
```typescript
// For creates
await writeAuditLog({
  prisma, tenantId, actorId, actorEmail,
  entityType: 'Account', entityId: account.id, action: 'create',
});

// For updates
const changes = detectChanges(oldAccount, newAccount);
await writeUpdateAuditLogs({ prisma, tenantId, actorId, actorEmail, entityType: 'Account', entityId }, changes);
```

## Pattern 5: Error Response Format

**Decision:** Structured JSON: `{ error, message, code, requestId }`. Domain errors caught in routes and mapped to appropriate HTTP status codes.

**Rationale:** The error handler (error-handler.ts) handles ZodError→400, rate limit→429, and generic→500. Domain-specific errors (AccountError) should be caught in routes and mapped to 400/404/409 status codes.

## Pattern 6: Zod Schema Location

**Decision:** Request/response Zod schemas go in `packages/shared/src/schemas/account.schema.ts`. Exported via `packages/shared/src/index.ts`.

**Rationale:** The auth schemas (auth.schema.ts) and user schema (user.schema.ts) follow this pattern. Shared schemas enable frontend validation reuse.

## Pattern 7: Request User Type Extension

**Decision:** Use `request.user` (set by authenticate middleware) for userId, email, role, tenantId.

**Rationale:** The authenticate middleware sets `request.user` with `{ userId, email, role, tenantId }`. This is available in all protected routes after the `authenticate` preHandler.

## Conflict-Aware Patterns

Per conflicts.md, the ADDITIVE changes are:
1. **Territory model**: Add `accounts Account[]` relation — this is a Prisma relation field, no schema logic change.
2. **app.ts**: Add `app.register(accountRoutes)` after `authRoutes` — follows the existing pattern.
3. **shared/index.ts**: Add exports for account schemas — follows existing export pattern.
4. **constants/index.ts**: Add error codes like `ACCOUNT_NOT_FOUND`, `ACCOUNT_DUPLICATE_DETECTED`, `ACCOUNT_TERRITORY_MISMATCH` — follows existing ERROR_CODES pattern.
