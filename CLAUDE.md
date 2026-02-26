# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Haversack Unified Platform — a CRM-first web application for Haversack Sales, a specialty food broker/wholesaler in the Pacific Northwest. Replaces an aging FileMaker system. 9 territory sales reps, ~50 artisan food brands, dual revenue model (broker at 8-15% commission + wholesale at 25-40% markup). The platform delivers unified account management, mobile-first order entry with multi-vendor splitting, automated commission calculations, pipeline visibility, and AI-augmented productivity tools.

## Tech Stack

- **Runtime:** Node.js 20 LTS, TypeScript 5.4+ (strict mode)
- **Frontend:** React 18+ / Next.js 14+ (App Router only) / Tailwind CSS + shadcn/ui / TanStack Query v5 + React Context / React Hook Form + Zod
- **Backend:** Fastify 4+ (not Express) / Pino structured logging
- **ORM:** Prisma 5+ with strict TypeScript mode
- **Database:** PostgreSQL 16+ with Row-Level Security (RLS) for tenant isolation, pg_trgm for full-text search
- **Cache/Queue:** Redis 7+ / BullMQ for background jobs
- **Email:** Microsoft Graph API (service account, on-behalf-of) + Nodemailer fallback
- **AI:** Anthropic Claude API (primary), OpenAI (fallback), provider abstraction layer
- **Testing:** Vitest (unit/integration), Supertest (API endpoints), Playwright (E2E)
- **Build:** Turborepo for monorepo orchestration
- **Hosting:** Docker Compose — separate containers for frontend, backend, worker, PostgreSQL, Redis
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (errors) + PostHog (analytics)

## Architecture Rules

### Technology Enforcement

- Frontend MUST use Next.js 14+ App Router exclusively. The Pages Router MUST NOT be used.
- Styling MUST use Tailwind CSS with shadcn/ui. No other CSS frameworks MUST be introduced.
- Server state MUST use TanStack Query. Client UI state MUST use React Context. Redux, Zustand, MobX, and Jotai MUST NOT be used.
- Forms MUST use React Hook Form with Zod validation schemas. All API payloads MUST be validated through Zod.
- Backend MUST use Fastify 4+. Express MUST NOT be used.
- ORM MUST be Prisma 5+ with strict TypeScript. Raw SQL MUST NOT be used except via `$queryRaw` with parameterized inputs.
- Database MUST be PostgreSQL 16+ with RLS policies for tenant isolation.
- Cache, sessions, and job queues MUST use Redis 7+ with BullMQ.

### Architecture Boundaries

- The repository MUST follow a Dockerized monorepo structure with separate containers for frontend, backend, worker, and database.
- Each container MUST have a single responsibility. Frontend MUST NOT contain business logic. Backend MUST NOT contain rendering logic.
- All inter-service communication MUST use documented API contracts. Direct database access from frontend MUST NOT occur.
- Feature code MUST be organized by domain (accounts, orders, commissions, activities) rather than by technical layer.
- Circular dependencies between modules MUST NOT exist.

### Code Quality

- All source code MUST be written in TypeScript with strict mode enabled. JavaScript files MUST NOT be used for application code.
- All functions MUST have explicit return types. The `any` type MUST NOT be used; `unknown` with type narrowing MUST be used instead.
- All exports MUST use named exports. Default exports MUST NOT be used except for Next.js page/layout components.
- All API route handlers MUST validate request input using Zod schemas before processing.
- Naming conventions MUST follow: `camelCase` for variables/functions, `PascalCase` for types/interfaces/components, `SCREAMING_SNAKE_CASE` for constants, `kebab-case` for file/directory names.
- ESLint and Prettier MUST be configured and enforced. Code MUST NOT be committed with linting errors.

### Security

- Authentication MUST use JWT with 15-minute access tokens and 7-day refresh tokens. Passwords MUST be hashed with bcrypt at cost factor 12.
- RBAC MUST be enforced at both the application layer and the database layer via PostgreSQL RLS.
- All data queries MUST include tenant_id filtering. Cross-tenant data access MUST NOT be possible.
- Sensitive data (API keys, tokens, passwords) MUST NOT appear in source code, logs, or error messages.
- All write operations spanning multiple tables MUST use database transactions.

### Error Handling and Observability

- All API errors MUST return structured JSON: `{ error, message, code, requestId }`. Stack traces MUST NOT be exposed in production.
- All business operations MUST log structured events with correlation IDs.
- Failed operations MUST be retried with exponential backoff (max 3 retries) for transient errors.
- External service failures (AI, email, Shopify) MUST degrade gracefully. The core application MUST NOT crash when an external dependency is unavailable.

### Data Integrity

- All create, update, and delete operations on Account, Order, Commission, and User entities MUST write immutable audit trail records.
- FSMA 204 traceability data MUST be captured at order entry and retained for a minimum of 2 years.
- Commission calculations MUST produce deterministic results. Every calculation MUST be logged with the rule applied, rate used, and resulting amount.

## Code Style

- Linter: ESLint (`.eslintrc.cjs`) — enforces no-any, explicit return types, named exports, kebab-case files
- Formatter: Prettier (`.prettierrc`) — single quotes, trailing commas, 100 char width
- Run `npm run lint` to check, `npm run lint:fix` to auto-fix
- Run `npm run format` to format all files

## Testing Requirements

- **Unit/Integration:** `npm test` (runs Vitest across all workspaces via Turborepo)
- **Coverage:** `npm run test:coverage` — threshold is 80% branches, functions, lines, statements
- **Integration:** `npm run test:integration`
- **E2E:** `npm run test:e2e` (runs Playwright)
- Tests MUST be written for every service function, API endpoint, and React component with business logic.
- Test files MUST be co-located with source using `.test.ts` or `.test.tsx` suffix.
- Test names MUST reference FR/AC identifiers: `test("FR-001: creates account with required fields")`
- Database tests MUST use isolated test transactions that roll back after each test.
- Mock external services (AI APIs, email) at the integration boundary. MUST NOT mock internal modules in unit tests.
- Run `npm test` before every commit.

## Git Conventions

- **Branch naming:** `feature/<name>`, `fix/<name>`, `chore/<name>`
- **Integration branch:** `main`
- **Commit messages:** Descriptive, prefixed with type (feat:, fix:, chore:, test:, docs:, refactor:)
- **Feature workflow:**
  1. `bash scripts/new-feature.sh <name>` — creates branch and scaffolding
  2. Implement, write tests, verify passing
  3. `bash scripts/push-feature.sh` — runs lint + test, then pushes
  4. Create PR for review
  5. `bash scripts/merge-feature.sh` — runs tests, merges with `--no-ff`

## Common Patterns

### Fastify Route with Zod Validation

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  territory_id: z.string().uuid(),
  account_type: z.enum(['retail', 'restaurant', 'distributor']),
});

export function accountRoutes(app: FastifyInstance): void {
  app.post('/api/accounts', async (request, reply) => {
    const body = createAccountSchema.parse(request.body);
    // ... service call
    return reply.status(201).send({ data: account });
  });
}
```

### Prisma Data Access with Tenant Isolation

```typescript
import type { PrismaClient } from '@prisma/client';

export async function findAccountsByTerritory(
  prisma: PrismaClient,
  tenantId: string,
  territoryId: string,
): Promise<Account[]> {
  return prisma.account.findMany({
    where: {
      tenant_id: tenantId,
      territory_id: territoryId,
      deleted_at: null,
    },
    orderBy: { updated_at: 'desc' },
  });
}
```

### Structured Error Response

```typescript
export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
): { error: string; message: string; code: string; requestId: string } {
  return { error: code, message, code, requestId };
}
```

## Known Constraints

- Node.js 20 LTS required (not 22+)
- PostgreSQL RLS policies require careful migration management — test RLS changes in isolation
- BullMQ requires Redis 7+ (not Redis 6)
- Prisma migrations are additive — destructive schema changes require special handling
- AI API calls have a 5-second timeout with 10-second hard cutoff (NFR-005)
- File uploads limited to 50 MB (FR-032)

## Key Commands

```bash
# Development
npm run dev                    # Start all services in dev mode
npm run build                  # Build all workspaces
npm run lint                   # Run ESLint across all workspaces
npm run lint:fix               # Auto-fix lint issues
npm run format                 # Run Prettier

# Testing
npm test                       # Run unit tests (Vitest)
npm run test:coverage          # Tests with coverage report
npm run test:integration       # Integration tests
npm run test:e2e               # E2E tests (Playwright)

# Database
npm run db:migrate             # Run Prisma migrations
npm run db:seed                # Seed development data

# Docker
npm run docker:up              # Start PostgreSQL + Redis
npm run docker:down            # Stop Docker services

# Validation
node scripts/validate-prd.js                    # PRD validation
node scripts/validate-speckit.js --all          # Spec-kit validation
bash scripts/validate-scaffolding.sh --all      # Infrastructure validation

# Git automation
bash scripts/new-feature.sh <name>              # Create feature branch
bash scripts/push-feature.sh                    # Lint + test + push
bash scripts/merge-feature.sh                   # Test + merge to main
```

## Project Structure

```
haversack-broker-os/
├── backend/                 # Fastify API server
│   ├── src/
│   │   ├── domains/         # Domain modules (accounts, orders, commissions, etc.)
│   │   ├── auth/            # JWT auth, RBAC middleware
│   │   ├── shared/          # Plugins, middleware, utils, types
│   │   ├── app.ts           # Fastify app bootstrap
│   │   └── server.ts        # Server entry point
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   └── package.json
├── frontend/                # Next.js App Router frontend
│   ├── src/
│   │   ├── app/             # App Router pages and layouts
│   │   ├── components/      # UI components (shadcn/ui, forms, layout, domain)
│   │   ├── hooks/           # TanStack Query hooks
│   │   ├── lib/             # API client, query client, utils
│   │   ├── providers/       # Auth, Query, Notification providers
│   │   └── types/
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   └── package.json
├── worker/                  # BullMQ job processor
│   ├── src/
│   │   ├── jobs/            # Background job handlers
│   │   ├── queues/          # Queue registry
│   │   └── index.ts
│   ├── vitest.config.ts
│   └── package.json
├── packages/shared/         # Shared Zod schemas, types, constants
├── prisma/                  # Database schema and migrations
├── docker/                  # Docker Compose configurations
├── e2e/                     # End-to-end test suites
├── scripts/                 # Automation and validation scripts
├── docs/                    # PRD and documentation
│   └── prd.md
└── .specify/                # Spec-kit artifacts
```

## PRD Conventions

Requirements use strict formatting parsed by the validator:
- `FR-XXX:` — functional requirements, sequential numbering
- `NFR-XXX:` — non-functional requirements, sequential numbering
- `AC-XXXx:` — acceptance criteria, must contain Given/When/Then
- `US-XXX:` — user stories, must reference FRs and include Error/Edge Cases subsections
- No subjective words without measurable qualifiers within 20 words
- Every FR must be referenced by at least one US; every US must reference at least one FR
- AC/FR ratio must be >= 1.5

## Domain Concepts

- **Broker model:** Haversack represents a brand to retailers, earns 8-15% commission, does not hold inventory
- **Wholesale model:** Haversack buys, warehouses, and resells at 25-40% markup
- **Line Card:** Authorization matrix — which reps can sell which brands, with date ranges and restrictions
- **Layout of Truth:** Master definition of all data field names, types, and validation rules
- **Multi-vendor split:** Orders automatically separate into broker vs. wholesale fulfillment streams per line item
- **FSMA 204:** FDA food traceability regulation — Key Data Elements (KDEs) required at Critical Tracking Events (CTEs)
- **Health score:** 0-100 account engagement metric, recalculated nightly at 02:00 UTC

## Key Design Decisions

- Mobile-first, 320px breakpoint first. Touch targets minimum 44px. Key actions reachable in 2 taps.
- Skeleton loaders, not spinners. Optimistic UI updates. Search-as-you-type with 300ms debounce.
- AI is augmentative only — all AI output labeled "AI-Generated" and editable, never autonomous.
- RBAC: 5 roles (admin, manager, rep, logistics, viewer) with territory-scoped data access via PostgreSQL RLS.
- Orders >= $5,000 require manager approval before confirmation.
- Commission rules configurable per brand/territory/volume tier with full audit trail.

## Performance Targets

- API p95: <200ms | FCP: <2s on 4G | Search: <200ms | DB query p95: <50ms | AI responses: <3s | Uptime: 99.5%

## Reference Documents

- **PRD:** docs/prd.md
- **Specification:** .specify/specs/001-haversack-unified-platform/spec.md
- **Implementation Plan:** .specify/specs/001-haversack-unified-platform/plan.md
- **Data Model:** .specify/specs/001-haversack-unified-platform/data-model.md
- **Tasks:** .specify/specs/001-haversack-unified-platform/tasks.md
- **Constitution:** .specify/memory/constitution.md
- **Checklist:** .specify/specs/001-haversack-unified-platform/checklist.md
