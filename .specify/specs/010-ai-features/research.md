# Research: AI Features

## Reference Domain: Activities + Orders

Studied `backend/src/domains/activities/activity.routes.ts` and `backend/src/domains/orders/order.routes.ts` as reference patterns.

## Patterns to Follow

### 1. Route Structure

**Decision:** Follow the established Fastify route pattern with separate error class, status code mapping, and preHandler middleware chain.

**Pattern:**
```typescript
export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/ai/meeting-brief', {
    preHandler: [authenticate, authorize('rep', 'manager', 'admin')]
  }, handler);
}
```

**Rationale:** Consistent with all existing route files. The `authorize` middleware already supports multiple roles.

### 2. Error Handling

**Decision:** Create `AIError` class extending Error with a `code` field, following the `ActivityError`/`OrderError`/`ReorderError` pattern.

**Pattern:**
```typescript
export class AIError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}
```

**Rationale:** All existing domain services use this exact pattern for typed error handling with status code mapping in routes.

### 3. Zod Validation

**Decision:** Define request/response schemas in `packages/shared/src/schemas/ai.schema.ts`, import via `@haversack/shared`.

**Rationale:** All existing schemas follow this pattern. Shared schemas are validated in both backend routes and can be reused by frontend.

### 4. Tenant Isolation

**Decision:** All database queries within AI services will include `tenantId` from `request.user!.tenantId`, following the same pattern as every existing domain service.

**Rationale:** Required by architecture rules. RLS enforced at application + database layer.

### 5. AI Provider Abstraction Architecture

**Decision:** Place the provider abstraction in `backend/src/shared/ai/` (not in a domain) since it's cross-cutting infrastructure similar to JWT, Redis, or audit services.

**Files:**
- `backend/src/shared/ai/ai-provider.ts` — Provider interface + factory
- `backend/src/shared/ai/anthropic-provider.ts` — Anthropic implementation
- `backend/src/shared/ai/openai-provider.ts` — OpenAI implementation
- `backend/src/shared/ai/ai-client.ts` — Orchestrator with failover logic
- `backend/src/shared/ai/prompts.ts` — Prompt templates
- `backend/src/shared/ai/types.ts` — Shared AI types

**Rationale:** Follows the `backend/src/shared/` pattern for cross-domain utilities (jwt.service, password.service, audit.service). Not domain-specific.

**Alternatives considered:**
- Fastify plugin (`ai.plugin.ts`): Rejected — plugins are for Fastify lifecycle hooks, not business logic. The provider layer is a utility, not a plugin.
- Domain service (`domains/ai/ai-provider.service.ts`): Rejected — the provider is infrastructure, not a domain. Domain services (meeting-brief, email-draft) live in `domains/ai/` and USE the shared provider.

### 6. Service Layer Architecture

**Decision:** AI domain services in `backend/src/domains/ai/` that aggregate data from multiple existing domains and call the shared AI provider.

**Files:**
- `backend/src/domains/ai/meeting-brief.service.ts` — Gathers account data + calls AI
- `backend/src/domains/ai/email-draft.service.ts` — Gathers contact/account data + calls AI
- `backend/src/domains/ai/activity-summary.service.ts` — Gathers activity data + calls AI
- `backend/src/domains/ai/ai.routes.ts` — Route definitions

**Rationale:** Each AI feature is a distinct service that reads from multiple existing domain tables and formats the data into an AI prompt. This is the same domain service pattern used everywhere else.

### 7. Testing Strategy

**Decision:** Mock the AI provider at the HTTP level using Vitest `vi.mock()` on the `@anthropic-ai/sdk` and `openai` modules. Never call actual AI APIs in tests.

**Pattern:**
```typescript
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() }
  }))
}));
```

**Rationale:** Per CLAUDE.md: "Mock external services (AI APIs, email) at the integration boundary." AI SDKs are external integration boundaries.
