---
name: build-with-agent-team
description: Build a feature using Claude Code Agent Teams with tmux split panes. Takes a plan document path and optional team size. Adapted for the Haversack Broker OS monorepo (Fastify backend, Next.js 14 frontend, BullMQ worker, Prisma, PostgreSQL, shadcn/ui).
argument-hint: [plan-path] [num-agents]
disable-model-invocation: true
---

# Build with Agent Team — Haversack Broker OS

You are coordinating a build using Claude Code Agent Teams inside the **Haversack Broker OS** monorepo. Read the plan document, determine the right team structure, spawn teammates, and orchestrate the build.

## Project Context

This is a monorepo CRM platform for a specialty food broker/wholesaler. Key facts every agent needs:

- **Architecture**: Dockerized monorepo — separate frontend, backend, worker, and shared packages
- **Backend**: Fastify 4+ API server at `backend/src/` — domain-organized (accounts, orders, commissions, etc.)
- **Frontend**: Next.js 14+ App Router at `frontend/src/` — Tailwind CSS + shadcn/ui
- **Worker**: BullMQ job processor at `worker/src/` — background jobs (health scores, reminders, imports)
- **Shared**: `packages/shared/` — Zod schemas, TypeScript types, constants shared across all workspaces
- **ORM**: Prisma 5+ with schema at `prisma/schema.prisma` (root level)
- **Auth**: JWT (15-min access, 7-day refresh) with `extractUser` + `requireRole()` middleware
- **State**: TanStack Query v5 for server state, React Context for UI state (NO Redux/Zustand/MobX)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest (unit/integration), Supertest (API), Playwright (E2E)
- **Language**: TypeScript 5.4+ strict mode, Node.js 20 LTS

### File Structure

```
haversack-broker-os/
├── backend/
│   └── src/
│       ├── domains/              # Domain modules
│       │   └── {domain}/
│       │       ├── {domain}.routes.ts       # Fastify route handlers
│       │       ├── {domain}.service.ts      # Business logic (pure functions)
│       │       ├── {domain}.routes.test.ts  # Route tests
│       │       └── {domain}.service.test.ts # Service tests
│       ├── auth/
│       │   ├── jwt.service.ts               # JWT sign/verify
│       │   └── rbac.middleware.ts            # extractUser + requireRole
│       ├── shared/
│       │   ├── middleware/                   # Audit trail, error handler
│       │   └── plugins/                     # Prisma, Redis, CORS plugins
│       ├── app.ts                           # Fastify bootstrap
│       └── server.ts                        # Entry point
├── frontend/
│   └── src/
│       ├── app/                             # Next.js App Router pages
│       │   ├── (auth)/                      # Login pages
│       │   └── (dashboard)/                 # Protected pages
│       │       └── {domain}/
│       │           ├── page.tsx             # List page
│       │           ├── new/page.tsx         # Create page
│       │           └── [id]/page.tsx        # Detail page
│       ├── components/
│       │   ├── {domain}/                    # Domain-specific components
│       │   ├── forms/                       # Reusable form components
│       │   ├── layout/                      # Sidebar, nav, etc.
│       │   └── shared/                      # Skeleton loaders, etc.
│       ├── hooks/                           # TanStack Query hooks
│       │   └── use-{domain}.ts
│       ├── lib/
│       │   └── api-client.ts                # Axios wrapper with auth
│       ├── providers/                       # Auth, Query providers
│       └── types/
├── worker/
│   └── src/
│       ├── jobs/                            # Job processors
│       │   └── {job-name}.job.ts
│       ├── queues/                          # Queue definitions
│       │   └── {queue-name}.queue.ts
│       └── index.ts                         # Worker bootstrap
├── packages/shared/
│   └── src/
│       ├── schemas/                         # Zod schemas (used everywhere)
│       │   └── {domain}.schema.ts
│       ├── types/                           # Shared TypeScript types
│       ├── constants/                       # Business constants
│       └── index.ts                         # Package entry point
├── prisma/
│   ├── schema.prisma                        # Database schema
│   └── migrations/
├── scripts/                                 # Automation scripts
├── .specify/                                # Spec-kit artifacts
│   ├── specs/{NNN}-{feature}/               # Feature specs
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   ├── data-model.md
│   │   ├── contracts/
│   │   └── quickstart.md
│   ├── memory/constitution.md               # Project principles
│   └── templates/
└── CLAUDE.md                                # Project rules
```

### Development Commands

```bash
npm run dev                    # Start all services in dev mode
npm run build                  # Build all workspaces
npm test                       # Run unit tests (Vitest)
npm run lint                   # ESLint across all workspaces
npm run lint:fix               # Auto-fix lint issues
npm run db:migrate             # Run Prisma migrations
npm run db:seed                # Seed development data
npm run docker:up              # Start PostgreSQL + Redis
```

### Spec-Kit Artifacts

Features are planned in `.specify/specs/{NNN}-{feature}/` containing:
- `spec.md` — Requirements, user stories, acceptance criteria
- `plan.md` — Architecture, file structure, component breakdown
- `tasks.md` — Dependency-ordered tasks with file ownership
- `contracts/` — API endpoint contracts (accounts.md, orders.md, etc.)
- `data-model.md` — Prisma schema additions
- `quickstart.md` — Validation/testing flow
- `conflicts.md` — Conflict analysis (if generated)

## Arguments

- **Plan path**: `$ARGUMENTS[0]` - Path to a plan document (typically a spec-kit `plan.md` or `tasks.md`)
- **Team size**: `$ARGUMENTS[1]` - Number of agents (optional)

## Step 1: Read the Plan and Spec Artifacts

Read the plan document at `$ARGUMENTS[0]`. Then check the same directory for sibling artifacts:

```
# If plan is at .specify/specs/002-foo/plan.md, also read:
.specify/specs/002-foo/spec.md          # Requirements
.specify/specs/002-foo/tasks.md         # Task breakdown with file ownership
.specify/specs/002-foo/contracts/       # API contracts (all files)
.specify/specs/002-foo/data-model.md    # Schema changes
.specify/specs/002-foo/quickstart.md    # Validation flow
.specify/specs/002-foo/conflicts.md     # Conflict analysis
```

Also read these project-level files:
- `CLAUDE.md` — Project rules and patterns
- `.specify/memory/constitution.md` — Project principles

Understand:
- What are we building?
- What are the major components/layers?
- Which files are NEW vs MODIFIED?
- What are the dependencies between components?
- If `tasks.md` exists with team assignments, USE those assignments directly

## Step 2: Determine Team Structure

If team size is specified (`$ARGUMENTS[1]`), use that number of agents.

If `tasks.md` already has a "Team Assignment" section, use those roles directly.

If NEITHER is available, analyze the plan and determine optimal team size:

**Guidelines for Haversack features:**
- 2 agents: Backend domain (routes + service) + Frontend (pages + hooks) — most common
- 3 agents: Backend domain + Frontend + Worker jobs — features with async processing
- 4 agents: Backend domain + Frontend + Worker + Shared schemas — large features with new data models
- Max 4 agents recommended; lead handles schema, shared packages, and coordination

For each agent, define:
1. **Name**: Short, descriptive (e.g., "backend", "frontend", "worker")
2. **Ownership**: Exact files/directories they own
3. **Does NOT touch**: What's off-limits
4. **Key responsibilities**: What they're building

### Haversack Ownership Rules

These files are ALWAYS lead-owned (never assigned to teammates):
- `prisma/schema.prisma` — Schema changes are high-risk, lead applies them
- `packages/shared/src/` — Shared schemas and types, single owner prevents conflicts
- `package.json` / `package-lock.json` (all workspaces) — Dependency installs are lead-only
- `frontend/src/components/ui/*` — shadcn/ui primitives are never modified
- Root configs (`tsconfig.json`, `turbo.json`, `docker-compose.yml`)
- `backend/src/app.ts` — Route registration (lead adds new domain route imports)
- `backend/src/auth/` — Auth middleware is shared infrastructure

Typical agent ownership for a feature `{domain}`:

- **backend agent**: `backend/src/domains/{domain}/` (routes, services, tests)
- **frontend agent**: `frontend/src/app/(dashboard)/{domain}/`, `frontend/src/components/{domain}/`, `frontend/src/hooks/use-{domain}.ts`
- **worker agent** (if needed): `worker/src/jobs/{job-name}.job.ts`, `worker/src/queues/{queue-name}.queue.ts`

## Step 3: Set Up Agent Team

Enable tmux split panes:

```
teammateMode: "tmux"
```

Before spawning, enter **Delegate Mode** (Shift+Tab) to restrict yourself to coordination only. You should NOT implement code yourself.

## Step 4: Contract-First Spawning

**CRITICAL:** Agents building in parallel WILL diverge on interfaces unless they agree on contracts FIRST.

### Haversack Contract Chain

```
Lead (schema + shared)
  ├─ Prisma types flow to ─────────→ Backend Agent
  ├─ Zod schemas + TS types ────────→ Backend Agent + Frontend Agent
  │
Backend Agent
  └─ publishes endpoint contracts ──→ Frontend Agent
```

### Spawn Order

1. **Lead applies schema changes first** (if any):
   - Edit `prisma/schema.prisma`
   - Run `npm run db:migrate` (or `npx prisma migrate dev --name {feature}`)
   - Run `npx prisma generate`
   - Add Zod schemas to `packages/shared/src/schemas/{domain}.schema.ts`
   - Add shared types to `packages/shared/src/types/`
   - Export from `packages/shared/src/index.ts`
   - Register new domain routes in `backend/src/app.ts` (if new domain)

2. **Spawn backend agent** with:
   - The Prisma model names and fields they'll use
   - The Zod schemas from `@haversack/shared` they should import
   - The `contracts/{domain}.md` if it exists
   - Instructions to send their EXACT endpoint signatures before building

3. **Lead receives and verifies the API contract**, checking:
   - Exact route paths (e.g., `/api/accounts`, `/api/accounts/:id`)
   - Request/response JSON shapes matching the Zod schemas
   - Auth pattern: all routes use `{ preHandler: [extractUser, requireRole(...)] }`
   - Tenant isolation: all queries filter by `tenant_id` from `request.user.tenantId`
   - Error responses: structured `{ error, message, code, requestId }` format
   - 401 (no session), 403 (wrong role), 404 (not found), 400 (validation), 500 (server error)

4. **Forward verified contract to frontend agent** with spawn

5. **Spawn worker agent** (if needed) — worker usually depends on backend schemas but not API routes

### Auth Pattern (MUST be in every agent prompt)

Every authenticated backend route follows this pattern:
```typescript
import { extractUser, requireRole } from '../../auth/rbac.middleware.js';

app.post('/api/accounts',
  { preHandler: [extractUser, requireRole('rep', 'manager', 'admin')] },
  async (request, reply) => {
    const user = request.user!; // Set by extractUser — { userId, tenantId, role, email }
    const body = createAccountSchema.parse(request.body);
    const result = await createAccount(app.prisma, user.tenantId, body, user.userId, user.email);
    return reply.status(201).send({ data: result });
  }
);
```

### Tenant Isolation (MUST be in every agent prompt)

Every database query MUST include tenant isolation:
```typescript
const accounts = await prisma.account.findMany({
  where: {
    tenant_id: tenantId,  // ALWAYS filter by tenant
    deleted_at: null,      // ALWAYS respect soft deletes
  },
});
```

### Spawn Prompt Structure

```
You are the [ROLE] agent for the Haversack Broker OS feature build.

## Project Context
- Monorepo: Fastify 4+ backend + Next.js 14+ frontend + BullMQ worker + shared packages
- Backend routes: backend/src/domains/{domain}/{domain}.routes.ts
- Backend services: backend/src/domains/{domain}/{domain}.service.ts (pure functions, take prisma + tenantId as args)
- Frontend pages: frontend/src/app/(dashboard)/{domain}/ (App Router, 'use client' for interactive)
- Frontend hooks: frontend/src/hooks/use-{domain}.ts (TanStack Query v5)
- Frontend components: frontend/src/components/{domain}/ (shadcn/ui, do NOT modify ui/ primitives)
- Shared schemas: packages/shared/src/schemas/{domain}.schema.ts (Zod, imported as @haversack/shared)
- Auth: JWT with extractUser + requireRole() middleware on every route
- Tenant isolation: every query must filter by tenant_id from request.user.tenantId
- Audit trails: void createAuditEntry(...) on all create/update/delete operations
- Form handling: React Hook Form + Zod
- Naming: camelCase functions, PascalCase types, SCREAMING_SNAKE constants, kebab-case files

## Your Ownership
- You own: [exact files/directories]
- Do NOT touch: [other agents' files, prisma/schema.prisma, packages/shared/, frontend/src/components/ui/*, backend/src/auth/, backend/src/app.ts, any package.json]

## What You're Building
[Relevant section from plan/tasks.md]

## Mandatory Communication

### Before You Build
- Your FIRST deliverable is your [API contract / component interface]
- Send it to the lead via SendMessage BEFORE writing implementation code
- For backend routes: include exact URL paths, HTTP methods, Zod schema names for request bodies, response JSON shapes, all status codes, and which roles are authorized
- For frontend: include which hooks you'll create, which API endpoints you'll call, and component hierarchy
- Wait for the lead to confirm before proceeding

### The Contract You Must Conform To
[Include upstream agent's verified contract here]

### Patterns to Follow
[Include relevant examples from existing codebase — e.g., an existing domain's routes/service/hooks]

## Before Reporting Done
Run these validations and fix any failures:
1. npx tsc --noEmit (zero errors)
2. npm run lint (zero new errors in your files)
3. npm test (zero regressions)
4. [role-specific validations]

Do NOT report done until all validations pass.
```

## Step 5: Facilitate Collaboration

### Phase 1: Setup (Lead Only)
Lead handles all shared/foundational work:
- Schema migrations (`prisma/schema.prisma`)
- Shared Zod schemas (`packages/shared/src/schemas/`)
- Shared TypeScript types (`packages/shared/src/types/`)
- Route registration in `backend/src/app.ts`
- Any `package.json` changes (dependency installs)
- Any shadcn/ui component additions (via `npx shadcn-ui@latest add`)

### Phase 2: Contracts (Sequential, Lead-Orchestrated)
1. Backend agent publishes endpoint contracts -> lead verifies -> forwards to frontend
2. Frontend agent confirms the contract works for their UI needs
3. Worker agent publishes job interfaces (if applicable)

**Lead verification checklist for backend API contracts:**
- Route paths follow convention: `/api/{domain}`, `/api/{domain}/:id`
- Every route has `{ preHandler: [extractUser, requireRole(...)] }`
- Request bodies validated with Zod schemas from `@haversack/shared`
- Response shapes: `{ data: T }` for success, `{ data: T[], meta: { page, pageSize, total } }` for lists
- Error responses: `{ error: string, message: string, code: string, requestId: string }`
- Tenant isolation: every query includes `tenant_id: tenantId`
- Soft deletes: queries filter `deleted_at: null`
- Audit trail: `void createAuditEntry(...)` on all create/update/delete

**Lead verification checklist for frontend contracts:**
- Hook names follow `use{Domain}` / `useCreate{Entity}` / `useUpdate{Entity}` pattern
- Query keys use factory pattern: `{ all, lists, list(filters), details, detail(id) }`
- Mutations invalidate correct query keys on success
- Pages use `'use client'` directive when interactive
- No direct Prisma imports (all data via API client)
- Loading states use skeleton loaders (not spinners)

### Phase 3: Implementation (Parallel)
Once contracts are verified, agents build in parallel. They MUST:
- Message the lead if they discover a contract needs to change
- Never install packages themselves — message the lead
- Never modify files outside their ownership
- Follow existing patterns from the codebase (read a working domain first)

### Phase 4: Pre-Completion Contract Verification
Before any agent reports "done":
- "Backend agent: what exact curl commands test each endpoint?"
- "Frontend agent: what exact API URLs are you calling from your hooks?"
- Lead compares and flags mismatches

### Phase 5: Cross-Review
- Frontend agent reviews backend response shapes (are they convenient for the UI?)
- Backend agent reviews frontend API calls (do they match the contract?)

## Step 6: Validation

### Agent Validation

**Backend agent validates:**
- `npx tsc --noEmit` passes
- `npm run lint` — no new errors
- `npm test` — all tests pass (including new route + service tests)
- Each endpoint follows auth pattern (extractUser + requireRole)
- Every query includes tenant isolation (tenant_id filter)
- Audit trail entries for create/update/delete operations
- Test names reference FR/AC identifiers: `test("FR-XXX: ...")`

**Frontend agent validates:**
- `npx tsc --noEmit` passes
- `npm run lint` — no new errors
- `npm test` — all tests pass (including new hook + component tests)
- Pages use `'use client'` directive where needed
- No direct database/Prisma imports (all data via hooks -> api-client)
- Loading and error states are handled
- Forms use React Hook Form + Zod validation
- TanStack Query hooks invalidate caches correctly

**Worker agent validates (if applicable):**
- `npx tsc --noEmit` passes
- `npm run lint` — no new errors
- Job processors handle errors with exponential backoff
- Queue definitions include proper retry config (max 3 retries)
- Graceful shutdown handlers registered

### Lead Validation (End-to-End)

After ALL agents return, run:

1. **Type check**: `npx tsc --noEmit` (across all workspaces)
2. **Lint**: `npm run lint`
3. **Tests**: `npm test` (all workspaces)
4. **Build**: `npm run build` (verify production build succeeds)
5. **Dev server**: `npm run dev` — verify no startup errors
6. **Walk the feature**: Navigate through the new pages, test CRUD operations
7. **Check quickstart.md**: If a quickstart/validation doc exists in the spec, run through it

If validation fails:
- Identify which agent's domain contains the bug
- Re-spawn that agent with the specific issue
- Re-run validation after fix

## Common Pitfalls for Haversack Broker OS

1. **Missing tenant isolation**: Every database query MUST filter by `tenant_id`. Cross-tenant access is a security vulnerability.
2. **Missing auth middleware**: Every route needs `{ preHandler: [extractUser, requireRole(...)] }`
3. **Missing audit trail**: All create/update/delete on Account, Order, Commission, User entities must write audit entries
4. **Importing Prisma in frontend**: Frontend NEVER imports Prisma directly — all data flows through API client -> backend
5. **Forgetting `'use client'`**: Any component using hooks, event handlers, or browser APIs needs this directive
6. **shadcn/ui modifications**: Never modify files in `frontend/src/components/ui/` — compose around them
7. **Cross-domain service imports**: Domains must not import from each other's services — use shared schemas
8. **Using `any` type**: Must use `unknown` with type narrowing instead
9. **Default exports**: Only allowed for Next.js page/layout components — everything else uses named exports
10. **Shared schema ownership**: Only the lead modifies `packages/shared/` — agents import, never write
11. **Missing Zod validation**: All API request bodies must be validated with Zod schemas from `@haversack/shared`
12. **Financial amounts**: Commissions stored in cents (integers), formatted as dollars in the UI
13. **Soft deletes**: Always filter `deleted_at: null` — never use hard deletes
14. **Import path style**: Backend uses relative paths; frontend uses `@/` aliases
15. **Using Express**: Backend MUST use Fastify 4+. Express is explicitly forbidden.

## Task Management

Create a shared task list matching the `tasks.md` structure. Use TaskCreate for each task with:
- Clear ownership (which agent)
- Dependencies via `addBlockedBy`
- File creation status: [NEW] or [MOD]

Track progress and unblock agents when dependencies complete.

## Definition of Done

The build is complete when:
1. All agents report their work is done
2. `npx tsc --noEmit` passes across all workspaces
3. `npm run lint` passes with no new errors
4. `npm test` passes (all existing + new tests)
5. `npm run build` succeeds
6. Dev server starts without errors (`npm run dev`)
7. Feature works end-to-end (new pages render, CRUD operations work, tenant isolation verified)
8. The plan's acceptance criteria / spec's success criteria are met
9. Lead has run end-to-end validation
10. No cross-tenant data leakage possible

---

## Execute

Now read the plan at `$ARGUMENTS[0]` and begin:

1. Read and understand the plan + sibling spec artifacts
2. Determine team size (use `$ARGUMENTS[1]` if provided, `tasks.md` team assignments if present, otherwise decide)
3. Define agent roles, ownership, and validation requirements
4. Map the contract chain
5. Lead performs setup work: schema migrations, shared Zod schemas, shared types, route registration
6. Enter Delegate Mode
7. Spawn upstream agents first — their first task is publishing their contract
8. Receive and verify each contract
9. Forward verified contracts to downstream agents
10. Spawn downstream agents with verified contracts + validation checklist
11. Run contract diff before integration
12. When all agents return, run end-to-end validation yourself
13. If validation fails, re-spawn the relevant agent with the specific issue
14. Confirm the build meets the plan's requirements
