# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Haversack Unified Platform — a CRM-first web application for Haversack Sales, a specialty food broker/wholesaler in the Pacific Northwest. Replaces an aging FileMaker system. 9 territory sales reps, ~50 artisan food brands, dual revenue model (broker at 8-15% commission + wholesale at 25-40% markup).

## Tech Stack

- **Frontend:** React 18+ / Next.js 14+ (App Router only) / Tailwind CSS + shadcn/ui / TanStack Query v5 + React Context / React Hook Form + Zod
- **Backend:** Node.js 20 LTS / Fastify 5+ / Prisma 6+ / BullMQ / Pino / Zod
- **Database:** PostgreSQL 16+ with RLS, pg_trgm / Redis 7+
- **Testing:** Vitest + Supertest + Playwright + @testing-library/react
- **Infra:** Docker Compose / Turborepo monorepo / GitHub Actions CI
- **AI:** Anthropic Claude SDK (primary), OpenAI (fallback), provider abstraction layer
- **Email:** Microsoft Graph API (service account, on-behalf-of) + Nodemailer fallback
- **Monitoring:** Sentry (errors) + PostHog (analytics)

## Architecture

Dockerized monorepo. All code lives in one repository with separate Docker containers per service.

- MUST use App Router exclusively. Pages Router MUST NOT be used.
- MUST organize code by domain (accounts, orders, commissions), NOT by technical layer.
- MUST use Fastify. Express MUST NOT be used.
- MUST use Prisma ORM. Raw SQL MUST NOT be used except `$queryRaw` with parameterized inputs.
- MUST use TanStack Query for server state, React Context for UI state. Redux/Zustand/MobX/Jotai MUST NOT be used.
- MUST use React Hook Form + Zod for forms. All API payloads MUST be Zod-validated.
- All TypeScript MUST use strict mode. `any` type MUST NOT be used. `unknown` with narrowing MUST be used instead.
- Named exports only. Default exports MUST NOT be used except Next.js page/layout components.
- MUST use `camelCase` for variables/functions, `PascalCase` for types/interfaces/components, `SCREAMING_SNAKE_CASE` for constants, `kebab-case` for files/directories.
- Each container has single responsibility. Frontend MUST NOT contain business logic. Backend MUST NOT contain rendering.
- No circular dependencies between modules.
- All inter-service communication MUST use documented API contracts.

## Key Commands

```bash
# Development
npm run dev              # Start all services (turbo)
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
npm run format           # Format with Prettier

# Testing
npm test                 # Run all unit/integration tests
npm run test:coverage    # Tests with coverage report
npm run test:e2e         # Playwright E2E tests

# Database
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Visual DB browser

# Docker
docker compose -f docker/docker-compose.dev.yml up -d    # Start PostgreSQL + Redis
docker compose -f docker/docker-compose.dev.yml down      # Stop services

# Validation
node scripts/validate-prd.js                              # PRD validation (30 tests across 7 categories)
node scripts/validate-speckit.js --all                    # Spec-kit full-chain validation (90 tests)
node scripts/validate-speckit.js --step constitution      # Per-step validation
node scripts/validate-speckit.js --step specify
node scripts/validate-speckit.js --step plan
node scripts/validate-speckit.js --step analyze
node scripts/validate-speckit.js --step tasks
node scripts/validate-speckit.js --step checklist
bash scripts/validate-scaffolding.sh --all                # Scaffolding validation

# Git automation
bash scripts/new-feature.sh <name>     # Create feature branch
bash scripts/push-feature.sh           # Lint + test + push
bash scripts/merge-feature.sh          # Test + merge to develop

# Pre-commit hook runs PRD and spec-kit validation automatically when artifacts are modified
```

## Project Structure

```
haversack-broker-os2/
├── backend/           # Fastify API server (port 4000)
│   ├── src/
│   │   ├── domains/   # Domain modules (accounts, orders, etc.)
│   │   ├── auth/      # JWT auth + RBAC
│   │   └── shared/    # Plugins, middleware, utils
│   └── vitest.config.ts
├── frontend/          # Next.js App Router (port 3000)
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/ # UI components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utilities
│   │   └── providers/ # Context providers
│   └── vitest.config.ts
├── worker/            # BullMQ background jobs
├── packages/shared/   # Shared Zod schemas, types, constants
├── prisma/            # Schema + migrations
├── docker/            # Docker Compose configs
├── e2e/               # Playwright E2E tests
├── scripts/           # Automation scripts
├── .specify/          # Spec-kit artifacts
├── docs/              # PRD and documentation
│   ├── prd.md         # Production PRD (30 FRs, 14 NFRs, 12 USs)
│   └── sections/      # Supplementary detailed user stories and UI/UX specs
└── research/          # Source research materials
```

## Testing Requirements

- MUST write tests for every service function, API endpoint, and business-logic component.
- MUST use Vitest for unit/integration, Supertest for API, Playwright for E2E.
- MUST co-locate test files with source (`.test.ts` / `.test.tsx` suffix).
- MUST use isolated test transactions that roll back. Tests MUST NOT share mutable state.
- MUST reference FR/AC identifiers in test names: `test("FR-001: creates account with required fields")`.
- MUST mock external services (AI, email) at integration boundary. MUST NOT mock internal modules.
- Coverage threshold: 80% statements, branches, functions, lines.

## Security

- MUST use JWT (15-min access token, 7-day refresh token) + bcrypt (cost 12).
- MUST enforce RBAC at app + DB layer (RLS). 5 roles: admin, manager, rep, logistics, viewer.
- MUST include tenant_id filtering on all queries.
- MUST validate all inputs with Zod. MUST use parameterized queries.
- Secrets MUST NOT appear in source, logs, or error messages.
- Orders >= $5,000 MUST require manager approval before confirmation.

## Performance Targets

- API p95: <200ms | FCP: <2s on 4G | Search: <200ms | DB query p95: <50ms | AI: <3s | Uptime: 99.5%

## Domain Concepts

- **Broker model:** Haversack represents a brand to retailers, earns 8-15% commission, does not hold inventory.
- **Wholesale model:** Haversack buys, warehouses, and resells at 25-40% markup.
- **Line Card:** Authorization matrix — which reps can sell which brands, with date ranges and restrictions.
- **Layout of Truth:** Master definition of all data field names, types, and validation rules (the data quality standard).
- **Multi-vendor split:** Orders automatically separate into broker vs. wholesale fulfillment streams per line item.
- **FSMA 204:** FDA food traceability regulation — Key Data Elements (KDEs) required at Critical Tracking Events (CTEs).
- **Health score:** 0-100 account engagement metric, recalculated nightly.
- **Mobile-first:** 320px breakpoint first. Touch targets minimum 44px. Key actions reachable in 2 taps.
- **Skeleton loaders:** MUST use skeleton loaders, NOT spinners. Optimistic UI updates. Search-as-you-type with 300ms debounce.
- **AI augmentative only:** All AI output MUST be labeled "AI-Generated" and editable. AI MUST NOT take autonomous action.
- **Commission rules:** Configurable per brand/territory/volume tier with full audit trail.

## Common Patterns

```typescript
// Domain route handler pattern (backend/src/domains/example/)
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(255),
});

export function exampleRoutes(fastify: FastifyInstance): void {
  fastify.post('/api/examples', async (request, reply) => {
    const body = createSchema.parse(request.body);
    // ... service call
    return reply.status(201).send({ data: result });
  });
}
```

## Git Conventions

- Branch naming: `feature/<name>`, `fix/<name>`, `chore/<name>`.
- MUST use git automation scripts in `scripts/` (`new-feature.sh`, `push-feature.sh`, `merge-feature.sh`).
- All feature branches MUST merge to develop, then develop merges to main.
- Pre-commit hooks run lint-staged (Prettier + ESLint).

## Visual Verification

- MUST verify UI in browser after every batch that produces UI components.
- MUST use `preview_start` to launch dev server for verification.
- MUST use `preview_screenshot` and `preview_snapshot` to verify page renders correctly.
- MUST NOT merge a batch with UI changes without visual verification.
- Visual verification failures block the batch just like test failures.

## PRD Conventions

Requirements use strict formatting parsed by the validator:

- `FR-XXX:` — functional requirements, sequential numbering.
- `NFR-XXX:` — non-functional requirements, sequential numbering.
- `AC-XXXx:` — acceptance criteria, MUST contain Given/When/Then.
- `US-XXX:` — user stories, MUST reference FRs and include Error/Edge Cases subsections.
- Subjective words (intuitive, fast, easy, simple, seamless, robust, scalable, flexible, modern, clean, nice, good, efficient) MUST NOT be used without a measurable qualifier within 20 words.
- Every FR MUST be referenced by at least one US; every US MUST reference at least one FR.
- AC/FR ratio MUST be >= 1.5.

## Reference Documents

- PRD: `docs/prd.md`
- Spec: `.specify/specs/001-haversack-unified-platform/spec.md`
- Plan: `.specify/specs/001-haversack-unified-platform/plan.md`
- Data Model: `.specify/specs/001-haversack-unified-platform/data-model.md`
- Tasks: `.specify/specs/001-haversack-unified-platform/tasks.md`
- Checklist: `.specify/specs/001-haversack-unified-platform/checklist.md`
- API Contracts: `.specify/specs/001-haversack-unified-platform/contracts/`
- Constitution: `.specify/memory/constitution.md`
- Research: `.specify/specs/001-haversack-unified-platform/research.md`
- Quickstart Scenarios: `.specify/specs/001-haversack-unified-platform/quickstart.md`
