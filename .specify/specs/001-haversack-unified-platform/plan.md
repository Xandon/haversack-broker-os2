# Implementation Plan: Haversack Unified Platform

**Branch**: `001-haversack-unified-platform` | **Date**: 2026-02-24 | **Spec**: `specs/001-haversack-unified-platform/spec.md`
**Input**: Feature specification from `/specs/001-haversack-unified-platform/spec.md`

## Summary

The Haversack Unified Platform replaces an aging FileMaker system with a CRM-first web application for a specialty food broker/wholesaler. The platform serves 9 territory sales representatives managing approximately 50 artisan food brands across the Pacific Northwest, supporting a dual revenue model (brokerage at 8-15% commission and wholesale at 25-40% markup). The technical approach uses a Dockerized monorepo with a Fastify API backend, Next.js App Router frontend, Bull-powered worker for background jobs, and PostgreSQL with Row-Level Security for territory-scoped data isolation. The system delivers unified account management, mobile-first order entry with multi-vendor splitting, automated commission calculations, pipeline visibility, AI-augmented productivity tools, and a business rule engine. Implementation proceeds across 11 phases from infrastructure setup through polish, prioritizing P1 user stories (account CRUD, activity logging, order entry, data import) before P2/P3 features (AI, pipeline, dashboards, business rules).

## Technical Context

**Language/Version**: TypeScript 5.4+ with strict mode enabled (`"strict": true`); Node.js 20 LTS runtime
**Primary Dependencies**: Next.js 14+ (App Router), React 18+, Fastify 4+, Prisma 5+, TanStack Query v5, React Hook Form, Zod, Tailwind CSS, shadcn/ui, Bull (Redis-backed job queue), Playwright, Vitest, Supertest, Nodemailer, Anthropic Claude SDK, ExcelJS, PDFKit
**Storage**: PostgreSQL 16+ (primary relational store with RLS policies, pg_trgm for full-text search), Redis 7+ (cache, session store, job queue backing)
**Testing**: Vitest for unit and integration tests, Supertest for API endpoint integration tests, Playwright for end-to-end tests, k6 for load testing; test files co-located with source using `.test.ts`/`.test.tsx` suffix; test names reference FR/AC identifiers; database tests use isolated transactions with rollback
**Target Platform**: Web application (PWA) — Docker Compose deployment with separate containers for frontend (Next.js), backend (Fastify), worker (Bull processor), PostgreSQL, and Redis; mobile-first responsive design (320px minimum breakpoint)
**Project Type**: Full-stack web application (monorepo with API backend, SSR frontend, background worker)
**Performance Goals**: API p95 latency under 200ms at 100 concurrent users (NFR-001), First Contentful Paint under 2s on 4G (NFR-002), full-text search under 200ms p95 for 50k accounts (NFR-003), database queries under 50ms p95 (NFR-004), AI responses under 3s p95 with 10s hard timeout (NFR-005), 99.5% monthly uptime (NFR-006)
**Constraints**: No raw SQL except Prisma `$queryRaw` with parameterized inputs; no Express; no Pages Router; no Redux/Zustand/MobX/Jotai; no JavaScript files for application code; no `any` type; no default exports (except Next.js page components); named exports only; FSMA 204 traceability data retained 2+ years; CAN-SPAM and CCPA compliance; OWASP Top 10 zero critical/high findings; WCAG 2.1 Level AA; immutable audit trail for Account, Order, Commission, and User mutations
**Scale/Scope**: 9 territory reps, 5 roles (Admin, Manager, Rep, Logistics, Viewer), approximately 50 brands, up to 50,000 accounts, 200,000 contacts, 10,000 products; 18 domain entities; 36 functional requirements; 14 non-functional requirements; 14 user stories across 50+ screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Principle | Compliance Status |
|---|---|
| **I. Tech Stack — Frontend**: React 18+ with Next.js 14+ App Router | Compliant. Next.js 14+ App Router exclusively. Pages Router is not used. |
| **I. Tech Stack — Styling**: Tailwind CSS with shadcn/ui | Compliant. Tailwind CSS and shadcn/ui are the sole styling solution. No other CSS frameworks. |
| **I. Tech Stack — State**: TanStack Query (server), React Context (client) | Compliant. TanStack Query v5 for server state, React Context for UI state. Redux, Zustand, MobX, and Jotai are excluded. |
| **I. Tech Stack — Forms**: React Hook Form with Zod | Compliant. All forms use React Hook Form; all validation schemas use Zod. All API payloads validated through Zod. |
| **I. Tech Stack — Backend**: Fastify 4+ on Node.js 18+ | Compliant. Fastify 4+ on Node.js 20 LTS. Express is not used. |
| **I. Tech Stack — ORM**: Prisma 5+ strict TypeScript | Compliant. Prisma 5+ with strict TypeScript. No raw SQL except `$queryRaw` with parameterized inputs. |
| **I. Tech Stack — Database**: PostgreSQL 16+ with RLS | Compliant. PostgreSQL 16+ with Row-Level Security policies for territory-scoped isolation. |
| **I. Tech Stack — Cache/Jobs**: Redis 7+ with Bull | Compliant. Redis 7+ for cache, sessions, and Bull job queues. |
| **II. Architecture — Dockerized monorepo** | Compliant. Separate containers for frontend, backend, worker, and database. |
| **II. Architecture — Single responsibility per container** | Compliant. Frontend handles rendering, backend handles business logic, worker handles async jobs. |
| **II. Architecture — Documented API contracts** | Compliant. OpenAPI/Zod-based contracts between frontend and backend. No direct DB access from frontend. |
| **II. Architecture — Domain-organized code** | Compliant. Feature code organized by domain (accounts, orders, commissions, activities), not by technical layer. |
| **II. Architecture — No circular dependencies** | Compliant. Enforced by ESLint import rules and modular domain boundaries. |
| **III. Code Quality — TypeScript strict mode** | Compliant. `"strict": true` in all tsconfig files. No JavaScript files for application code. |
| **III. Code Quality — Explicit return types, no `any`** | Compliant. All functions have explicit return types. `unknown` with type narrowing used instead of `any`. |
| **III. Code Quality — Named exports only** | Compliant. Named exports throughout. Default exports only for Next.js page/layout components as required by the framework. |
| **III. Code Quality — Zod schema validation on all routes** | Compliant. All Fastify route handlers validate input via Zod schemas before processing. |
| **III. Code Quality — Naming conventions** | Compliant. `camelCase` for variables/functions, `PascalCase` for types/interfaces/components, `SCREAMING_SNAKE_CASE` for constants, `kebab-case` for file/directory names. |
| **III. Code Quality — ESLint + Prettier enforced** | Compliant. ESLint and Prettier configured with pre-commit hooks. No code committed with linting errors. |
| **IV. Testing — Coverage for services, endpoints, components** | Compliant. Every service function, API endpoint, and business-logic component has corresponding test coverage. |
| **IV. Testing — Vitest + Supertest + Playwright** | Compliant. Vitest for unit/integration, Supertest for API integration, Playwright for end-to-end. |
| **IV. Testing — Co-located test files** | Compliant. Test files co-located with source using `.test.ts`/`.test.tsx` suffix. |
| **IV. Testing — Isolated test transactions** | Compliant. Database-dependent tests use isolated transactions with rollback. No shared mutable state. |
| **IV. Testing — Test names reference FR/AC identifiers** | Compliant. Test names follow pattern `test("FR-001: creates account with required fields")`. Acceptance criteria map to automated tests. |
| **IV. Testing — Mock external services at boundary** | Compliant. AI APIs, email, and S3 mocked at integration boundary. Internal modules not mocked in unit tests. |
| **V. Security — JWT with bcrypt** | Compliant. 15-minute access tokens, 7-day refresh tokens, bcrypt cost factor 12. |
| **V. Security — RBAC at app + DB layer** | Compliant. Application-layer RBAC middleware plus PostgreSQL RLS policies. Every endpoint verifies caller role. |
| **V. Security — Tenant filtering on all queries** | Compliant. All queries include territory/org scoping via Prisma middleware and RLS. |
| **V. Security — Input validation + parameterized queries** | Compliant. Zod validation on every endpoint. Prisma parameterized queries prevent SQL injection. |
| **V. Security — No secrets in source/logs** | Compliant. Environment variables for all secrets. Structured logging excludes sensitive data. |
| **V. Security — TLS 1.3 + AES-256** | Compliant. TLS 1.3 for transit, AES-256 for data at rest. |
| **VI. Error Handling — Structured JSON errors** | Compliant. All API errors return `{ error, message, code, requestId }`. No stack traces in production. |
| **VI. Error Handling — Structured logging with correlation IDs** | Compliant. Pino structured logging with correlation IDs, timestamp, level, service, operation, userId, tenantId, duration. |
| **VI. Error Handling — Exponential backoff retries** | Compliant. Transient errors retried with exponential backoff (max 3). Non-retryable errors fail immediately. |
| **VI. Error Handling — Database transactions for multi-table writes** | Compliant. Prisma `$transaction` for all multi-table writes. Partial writes rolled back. |
| **VI. Error Handling — Graceful external service degradation** | Compliant. AI, email, and export failures degrade gracefully without crashing core application. |
| **VII. Data Integrity — Immutable audit trail** | Compliant. Audit records for Account, Order, Commission, User mutations with actor, timestamp, entity, field, old/new values. 3-year retention. |
| **VII. Data Integrity — FSMA 204 traceability** | Compliant. Lot numbers, batch IDs, origin, dates captured at order entry. 2-year minimum retention. |
| **VII. Data Integrity — CAN-SPAM + CCPA** | Compliant. Unsubscribe links, physical address, opt-out checks before every send. Right to access/delete. |
| **VII. Data Integrity — Deterministic commission calculations** | Compliant. Same inputs produce same output. Every calculation logged with rule, rate, and amount. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/001-haversack-unified-platform/
├── plan.md              # This file
├── spec.md              # Feature specification (14 user stories, 36 FRs, 14 NFRs)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contract definitions)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
haversack-broker-os/
├── backend/
│   ├── src/
│   │   ├── domains/
│   │   │   ├── accounts/
│   │   │   │   ├── account.routes.ts
│   │   │   │   ├── account.service.ts
│   │   │   │   ├── account.schema.ts
│   │   │   │   ├── account.service.test.ts
│   │   │   │   ├── account.routes.test.ts
│   │   │   │   ├── duplicate-detection.service.ts
│   │   │   │   └── health-score.service.ts
│   │   │   ├── contacts/
│   │   │   │   ├── contact.routes.ts
│   │   │   │   ├── contact.service.ts
│   │   │   │   └── contact.schema.ts
│   │   │   ├── activities/
│   │   │   │   ├── activity.routes.ts
│   │   │   │   ├── activity.service.ts
│   │   │   │   ├── activity.schema.ts
│   │   │   │   └── email-tracking.service.ts
│   │   │   ├── orders/
│   │   │   │   ├── order.routes.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   ├── order.schema.ts
│   │   │   │   ├── vendor-split.service.ts
│   │   │   │   └── approval.service.ts
│   │   │   ├── products/
│   │   │   │   ├── product.routes.ts
│   │   │   │   ├── product.service.ts
│   │   │   │   ├── product.schema.ts
│   │   │   │   └── line-card.service.ts
│   │   │   ├── commissions/
│   │   │   │   ├── commission.routes.ts
│   │   │   │   ├── commission.service.ts
│   │   │   │   ├── commission.schema.ts
│   │   │   │   ├── commission-engine.ts
│   │   │   │   └── statement.service.ts
│   │   │   ├── opportunities/
│   │   │   │   ├── opportunity.routes.ts
│   │   │   │   ├── opportunity.service.ts
│   │   │   │   └── opportunity.schema.ts
│   │   │   ├── tasks/
│   │   │   │   ├── task.routes.ts
│   │   │   │   ├── task.service.ts
│   │   │   │   └── task.schema.ts
│   │   │   ├── dashboards/
│   │   │   │   ├── dashboard.routes.ts
│   │   │   │   ├── rep-dashboard.service.ts
│   │   │   │   └── manager-dashboard.service.ts
│   │   │   ├── imports/
│   │   │   │   ├── import.routes.ts
│   │   │   │   ├── import.service.ts
│   │   │   │   └── import.schema.ts
│   │   │   ├── users/
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   └── user.schema.ts
│   │   │   ├── business-rules/
│   │   │   │   ├── rule.routes.ts
│   │   │   │   ├── rule.service.ts
│   │   │   │   ├── rule-engine.ts
│   │   │   │   └── rule.schema.ts
│   │   │   └── ai/
│   │   │       ├── ai.routes.ts
│   │   │       ├── ai.service.ts
│   │   │       ├── provider-abstraction.ts
│   │   │       └── ai.schema.ts
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── jwt.service.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   └── rate-limit.middleware.ts
│   │   ├── shared/
│   │   │   ├── plugins/
│   │   │   │   ├── prisma.plugin.ts
│   │   │   │   ├── redis.plugin.ts
│   │   │   │   └── cors.plugin.ts
│   │   │   ├── middleware/
│   │   │   │   ├── error-handler.ts
│   │   │   │   ├── request-id.ts
│   │   │   │   └── audit-trail.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.ts
│   │   │   │   ├── pagination.ts
│   │   │   │   └── fuzzy-match.ts
│   │   │   └── types/
│   │   │       ├── roles.ts
│   │   │       └── errors.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── accounts/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── orders/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── activities/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── tasks/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── pipeline/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── commissions/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── products/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── admin/
│   │   │   │       ├── users/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── imports/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── rules/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── data-quality/
│   │   │   │           └── page.tsx
│   │   │   └── api/
│   │   │       └── health/
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── forms/
│   │   │   │   ├── account-form.tsx
│   │   │   │   ├── order-form.tsx
│   │   │   │   ├── activity-form.tsx
│   │   │   │   ├── task-form.tsx
│   │   │   │   └── opportunity-form.tsx
│   │   │   ├── layout/
│   │   │   │   ├── app-shell.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── top-bar.tsx
│   │   │   │   └── mobile-nav.tsx
│   │   │   ├── accounts/
│   │   │   │   ├── account-card.tsx
│   │   │   │   ├── account-detail.tsx
│   │   │   │   ├── duplicate-warning.tsx
│   │   │   │   └── health-badge.tsx
│   │   │   ├── orders/
│   │   │   │   ├── order-line-item.tsx
│   │   │   │   ├── product-search.tsx
│   │   │   │   └── approval-badge.tsx
│   │   │   ├── pipeline/
│   │   │   │   ├── kanban-board.tsx
│   │   │   │   └── opportunity-card.tsx
│   │   │   ├── dashboards/
│   │   │   │   ├── rep-kpi-dashboard.tsx
│   │   │   │   └── manager-team-dashboard.tsx
│   │   │   └── shared/
│   │   │       ├── global-search.tsx
│   │   │       ├── data-table.tsx
│   │   │       ├── skeleton-loader.tsx
│   │   │       ├── empty-state.tsx
│   │   │       ├── notification-bell.tsx
│   │   │       └── ai-label.tsx
│   │   ├── hooks/
│   │   │   ├── use-accounts.ts
│   │   │   ├── use-orders.ts
│   │   │   ├── use-activities.ts
│   │   │   ├── use-search.ts
│   │   │   ├── use-auth.ts
│   │   │   └── use-notifications.ts
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   ├── query-client.ts
│   │   │   └── utils.ts
│   │   ├── providers/
│   │   │   ├── auth-provider.tsx
│   │   │   ├── query-provider.tsx
│   │   │   └── notification-provider.tsx
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   │   └── manifest.json              # PWA manifest
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── worker/
│   ├── src/
│   │   ├── jobs/
│   │   │   ├── health-score-recalc.job.ts
│   │   │   ├── commission-calc.job.ts
│   │   │   ├── commission-statement.job.ts
│   │   │   ├── data-quality-scorecard.job.ts
│   │   │   ├── email-tracking.job.ts
│   │   │   ├── task-reminder.job.ts
│   │   │   ├── order-export.job.ts
│   │   │   ├── rule-engine.job.ts
│   │   │   └── import-processor.job.ts
│   │   ├── queues/
│   │   │   └── queue-registry.ts
│   │   └── index.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── Dockerfile
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   ├── seed.ts
│   └── rls-policies.sql               # RLS policy definitions applied via migration
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── docker-compose.test.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── postgres/
│       └── init.sql
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── schemas/               # Shared Zod schemas (API contracts)
│       │   │   ├── account.schema.ts
│       │   │   ├── order.schema.ts
│       │   │   ├── product.schema.ts
│       │   │   └── index.ts
│       │   ├── types/                  # Shared TypeScript types
│       │   │   ├── roles.ts
│       │   │   ├── entities.ts
│       │   │   └── index.ts
│       │   └── constants/
│       │       ├── pipeline-stages.ts
│       │       └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── e2e/
│   ├── tests/
│   │   ├── account-crud.spec.ts
│   │   ├── order-entry.spec.ts
│   │   ├── search.spec.ts
│   │   ├── auth.spec.ts
│   │   └── commission.spec.ts
│   └── fixtures/
│       └── seed-data.ts
├── scripts/
│   ├── validate-prd.js
│   ├── seed-dev.ts
│   └── run-rls-policies.ts
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── e2e.yml
│       └── deploy.yml
├── .eslintrc.cjs
├── .prettierrc
├── turbo.json                          # Turborepo config for monorepo orchestration
├── package.json                        # Root workspace package.json
├── tsconfig.base.json
├── CLAUDE.md
└── docs/
    └── prd.md
```

**Structure Decision**: Dockerized monorepo organized by service (backend, frontend, worker) with domain-based feature directories inside each service. A shared `packages/shared` workspace contains Zod schemas, TypeScript types, and constants used by both frontend and backend, enforcing a single source of truth for API contracts. Turborepo orchestrates builds and task dependencies across workspaces.

## Phase 1: Infrastructure and Developer Experience Setup

**Goal**: Establish the Dockerized monorepo, CI pipeline, linting, and local development environment so all subsequent phases build on a consistent foundation.

**Scope**: Project scaffolding, Docker Compose configuration, Turborepo workspace setup, ESLint/Prettier configuration, GitHub Actions CI, base TypeScript configuration, and Prisma initialization.

**Deliverables**:
- Docker Compose with containers for frontend (Next.js 14+ App Router), backend (Fastify 4+), worker (Bull), PostgreSQL 16+, and Redis 7+
- Turborepo workspace configuration linking `backend/`, `frontend/`, `worker/`, and `packages/shared/`
- ESLint configuration enforcing: no `any` type, explicit return types, named exports only, `kebab-case` file names, no circular dependencies
- Prettier configuration with pre-commit hook via Husky + lint-staged
- GitHub Actions CI running lint, type-check, and test on every push
- Base `tsconfig.json` with `"strict": true` across all workspaces
- Prisma 5+ initialized with PostgreSQL 16+ connection
- Vitest configuration for backend, frontend, and worker
- Playwright configuration for end-to-end tests
- PWA manifest and service worker stub

**References**: NFR-009 (TLS 1.3), NFR-011 (WCAG 2.1 AA foundation), NFR-012 (touch target standards)

**Testing approach**: Verify Docker Compose starts all services, CI pipeline passes on clean repo, lint rules catch violations (write a test file with `any` type and confirm ESLint rejects it), Prisma connects to PostgreSQL.

---

## Phase 2: Foundation — Authentication, RBAC, Database Schema, and Error Handling

**Goal**: Implement the security and data foundation that all features depend on: JWT authentication, RBAC with 5 roles, the complete Prisma schema for all 18 entities, PostgreSQL RLS policies, structured error handling, and the audit trail system.

**Scope**: Auth module, RBAC middleware, Prisma schema for all entities (Account, Contact, Territory, User, Activity, Order, OrderItem, Product, Brand, Commission, Opportunity, Pipeline, EmailRecord, EmailTemplate, LineCard, Organization, BusinessRule, Demo), RLS policies, audit trail middleware, structured logging with Pino, error handler plugin.

**Deliverables**:
- JWT authentication with 15-minute access tokens and 7-day refresh tokens (NFR-007)
- Password hashing with bcrypt cost factor 12 (NFR-007)
- Rate limiting on auth endpoints at 10 requests/minute/IP (NFR-007)
- RBAC middleware enforcing 5 roles: Admin, Manager, Rep, Logistics, Viewer (NFR-008)
- PostgreSQL RLS policies for territory-scoped data isolation (NFR-008, FR-029)
- Complete Prisma schema with all 18 entities and relationships
- Database migrations and seed data for development
- Immutable audit trail recording actor, timestamp, entity, field, old/new values for Account, Order, Commission, and User mutations (NFR-014)
- Structured JSON error responses: `{ error, message, code, requestId }` with no stack traces in production
- Pino structured logging with correlation IDs, timestamp, level, service, operation, userId, tenantId, duration
- Prisma middleware for automatic tenant_id filtering
- Auth provider (React Context) and protected route wrapper on frontend
- Login page with React Hook Form + Zod validation

**References**: FR-029 (user management RBAC), FR-030 (session invalidation), NFR-007, NFR-008, NFR-009, NFR-013, NFR-014

**Testing approach**: Write tests following the TDD pattern — tests are written before implementation for each auth flow. Test names reference FRs: `test("NFR-007: issues 15-min access token on login")`, `test("NFR-008: Rep cannot access Manager-only endpoint")`, `test("NFR-014: audit trail records field-level changes")`. Use isolated test transactions for all database tests.

---

## Phase 3: Account CRUD, Account Detail, and Account Search (User Story 1, User Story 2, User Story 3)

**Goal**: Deliver the core account management surface — creation with duplicate detection, unified detail view with health scores and parent-child hierarchies, and full-text search under 200ms.

**Scope**: Account CRUD endpoints, duplicate detection with Levenshtein fuzzy matching, account detail page with contacts/activities/orders/opportunities/health score, parent-child hierarchy with roll-up metrics, full-text search via pg_trgm, global search bar component.

**Deliverables**:
- Account create/read/update endpoints with Zod validation (FR-001, FR-002)
- Field-level validation errors for missing required fields (FR-002)
- Fuzzy duplicate detection on name (Levenshtein distance <= 3), phone, and address with confidence percentages (FR-003)
- Duplicate warning UI with "Create Anyway" option that logs override in audit trail (FR-003)
- Unified account detail page: contacts, 20 most recent activities, 10 most recent orders, open opportunities, health score, notes, photos (FR-004)
- Empty state displays ("No orders yet") for sections with zero records (FR-004)
- Parent-child account hierarchy with aggregated roll-up metrics: order count, total revenue, last activity date (FR-005)
- Account health score calculation (0-100): days since last activity (30%), order frequency (25%), order value trend (25%), contact engagement (20%), recalculated nightly at 02:00 UTC via Bull job (FR-006)
- "Health score calculating..." display for accounts created within 24 hours (FR-006)
- Full-text search across account name, contact name, phone, email, city, territory using pg_trgm GIN index (FR-007)
- Search results ranked by relevance, returned within 200ms at p95 (FR-007, NFR-003)
- 300ms debounce on search input, minimum 3 characters to trigger (FR-007)
- "No accounts found" empty state with spelling suggestions (FR-007)
- Global search bar component with keyboard navigation
- Mobile-first responsive design with skeleton loaders

**References**: US-1 (FR-001, FR-002, FR-003), US-2 (FR-004, FR-005, FR-006), US-3 (FR-007), NFR-001, NFR-002, NFR-003, NFR-004

**Testing approach**: TDD with test-first development. Tests reference spec identifiers: `test("FR-001: persists account with all required fields within 3 seconds")`, `test("FR-003: detects duplicate within Levenshtein distance 3")`, `test("FR-007: returns search results within 200ms at p95")`. Integration tests use Supertest against Fastify. E2E tests verify mobile account creation flow. Load test search with k6 against 50,000 account records.

---

## Phase 4: Activity Logging and Task Management (US-4, US-5)

**Goal**: Deliver the activity logging and task management workflows that drive health scores and proactive account management.

**Scope**: Quick-log activity form, activity type templates (visit, call, email, demo, sampling), activity timeline with infinite scroll, email tracking (auto-link, open/click/bounce), unmatched email queue, task CRUD with due dates/priorities/assignees, reminder notifications via Bull jobs.

**Deliverables**:
- Quick-log activity form with pre-populated fields (date, rep name, last-visited account), completable in under 60 seconds (FR-008)
- Activity type templates: visit, call, email, demo, sampling with type-specific fields (FR-008)
- Demo activity template with product demoed, quantity sampled, buyer feedback fields (FR-008)
- Activity timeline on account detail: reverse chronological, infinite scroll (20 items/page), loads within 500ms (FR-009)
- Timeline filter by activity type (FR-009)
- Email auto-linking by matching sender/recipient to Contact email fields (FR-010)
- Email engagement tracking: open, click, bounce events with timestamps on timeline within 60 seconds (FR-010)
- Unmatched email queue for emails with no Contact match, visible to Rep and Manager roles (FR-011)
- Task creation with due date, priority (High/Medium/Low), assignee, and Account/Contact/Opportunity association (FR-012)
- Automatic reminder notifications via in-app and email at 24 hours and 1 hour before due date, powered by Bull scheduled jobs (FR-012)
- Overdue task display with red indicators, sorted by due date ascending (FR-012)
- Warning when due date is set in the past (FR-012)
- Task dashboard with overdue tasks at top

**References**: US-4 (FR-008, FR-009, FR-010, FR-011), US-5 (FR-012), NFR-001

**Testing approach**: Test-first for each service function. `test("FR-008: quick-log completes in under 60 seconds")`, `test("FR-009: timeline loads 20 items within 500ms")`, `test("FR-010: email open event appears on timeline within 60s")`, `test("FR-012: reminder sent at 24h before due date")`. E2E test times the quick-log flow. Bull job tests verify reminder scheduling.

---

## Phase 5: Order Entry with Multi-Vendor Splitting (US-6)

**Goal**: Deliver the complete order entry workflow — the core revenue transaction — including product search, multi-vendor splitting, promotional pricing, and manager approval for orders >= $5,000.

**Scope**: Order create/read endpoints, line item management, product search within order entry, vendor auto-split, promotional price application, order approval workflow, approval notifications, order status transitions, audit trail for rejections.

**Deliverables**:
- Order creation with 1+ line items: product, quantity, unit price, revenue model (broker/wholesale) defaulting to product configuration (FR-013)
- Multi-vendor order auto-split into per-vendor sub-orders with correct line items (FR-014)
- Product search in order entry: name, SKU, brand, category within 200ms, showing availability (green/yellow/red), unit price, promotional pricing (FR-015)
- Active promotional pricing applied as default unit price during promotion window (FR-016)
- Manager approval gate for orders >= $5,000: status set to "Pending Approval," manager notified via in-app + email within 30 seconds (FR-017)
- Manager approval/rejection workflow with written rejection reason (FR-017)
- Rejection logged in audit trail, Rep notified with reason (FR-017)
- Order status state machine: Draft -> Pending -> Pending Approval -> Confirmed -> Exported; or Draft -> Pending -> Rejected
- FSMA 204 traceability fields captured at order entry (lot numbers, batch IDs, origin, dates)
- Mobile-first order entry form with inline product search
- Order detail page with line items, status, approval history

**References**: US-6 (FR-013, FR-014, FR-015, FR-016, FR-017), NFR-001, NFR-003, NFR-010, NFR-013

**Testing approach**: TDD for vendor split logic and approval state machine. `test("FR-013: creates order with broker/wholesale line items")`, `test("FR-014: splits 10 items across 3 vendors into 3 sub-orders")`, `test("FR-015: product search returns within 200ms")`, `test("FR-016: promotional price applied during promo window")`, `test("FR-017: order >= $5000 requires manager approval")`. Commission calculation determinism verified with snapshot tests.

---

## Phase 6: Data Import and User Management (US-12)

**Goal**: Deliver the admin tools required for go-live: CSV/XLSX import with validation, user management with role assignment, and the data quality scorecard.

**Scope**: CSV/XLSX import for Account, Contact, Product, Order entities; pre-import preview with validation; user CRUD with role assignment and session invalidation; data quality scorecard nightly job.

**Deliverables**:
- CSV/XLSX file upload with canonical field validation (FR-031)
- Pre-import preview: row count, per-row errors with field-level descriptions, change summary (FR-031)
- "Import Valid Rows" with error row skip and downloadable error log (FR-031)
- 50 MB file size limit with descriptive error on exceeds (FR-032)
- Import processor as Bull job for large files (FR-031)
- Admin user management: create, edit, deactivate, role assignment across 5 roles (FR-029)
- Permission changes effective within 60 seconds without re-authentication (FR-029)
- Session invalidation for deactivated users within 15 seconds, redirect to login (FR-030)
- Data quality scorecard: field completeness %, email validity %, image coverage %, duplicate count, stale account count (90+ days inactive), recalculated nightly (FR-033)
- Data quality dashboard with drill-down to incomplete records
- ExcelJS integration for XLSX parsing and export

**References**: US-12 (FR-029, FR-030, FR-031, FR-032, FR-033), NFR-007, NFR-008

**Testing approach**: Test-first development. `test("FR-031: 200-row CSV with 5 invalid rows shows 195 valid, 5 errors")`, `test("FR-032: rejects files exceeding 50 MB")`, `test("FR-029: role change takes effect within 60 seconds")`, `test("FR-030: deactivated user sessions invalidated within 15 seconds")`, `test("FR-033: scorecard recalculates nightly")`. Import tests use fixture CSV files with known validation errors.

---

## Phase 7: AI Reorder Suggestions and Product Catalog (US-7, US-8)

**Goal**: Deliver the AI-powered reorder suggestions and the full product catalog with certification filtering and brand line card PDF generation.

**Scope**: AI provider abstraction layer (Anthropic Claude primary, OpenAI fallback), reorder suggestion engine, product catalog CRUD with certification/allergen/dietary attributes, catalog filtering, line card PDF generation, email sharing.

**Deliverables**:
- AI provider abstraction layer with Anthropic Claude as primary, OpenAI as fallback (FR-035)
- AI reorder suggestions for accounts with 6+ orders in 12 months, presented within 3 seconds (FR-018)
- Modifiable reorder draft: remove products, adjust quantities, recalculate total, submit as new order (FR-018)
- "Not enough order history" message for accounts with < 6 orders (FR-018)
- "AI service temporarily unavailable" with no stale content on AI outage (FR-036)
- Product catalog CRUD: name, SKU, brand, category, subcategory, prices, case size, certifications, allergens (Big 9), dietary attributes, availability, image (FR-019)
- Catalog search and filtering by certification AND category (FR-019)
- Brand line card PDF generation within 10 seconds: all active products with images, descriptions, pricing, certifications (FR-020)
- "Share via Email" with PDF attachment and pre-populated primary contact email (FR-020)
- PDFKit integration for line card generation
- 5-second AI timeout with graceful error display

**References**: US-7 (FR-018, FR-035, FR-036), US-8 (FR-019, FR-020), NFR-005

**Testing approach**: TDD with mocked AI boundary. `test("FR-018: generates reorder suggestion within 3 seconds for 6+ order account")`, `test("FR-018: shows not-enough-history for < 6 orders")`, `test("FR-036: displays unavailable message on AI timeout")`, `test("FR-019: filters products by certification AND category")`, `test("FR-020: generates line card PDF within 10 seconds")`. AI service mocked at integration boundary per constitution.

---

## Phase 8: Pipeline and Opportunity Management, Commission Calculation (US-9, US-10)

**Goal**: Deliver pipeline visibility with kanban drag-and-drop and the complete commission calculation engine with monthly statements and accounting export.

**Scope**: Opportunity CRUD with pipeline stages, kanban board with drag-and-drop, weighted forecast, commission calculation engine (base rate, territory modifier, volume tiers), monthly statement generation, manager approval workflow, accounting export.

**Deliverables**:
- Opportunity CRUD: name, estimated value, close date, pipeline stage, probability (auto-populated by stage, user-overridable), associated brands (FR-021)
- Pipeline stages: Prospect (20%), Qualified (40%), Proposal (60%), Negotiation (75%), Closed Won (100%), Closed Lost (0%) (FR-021)
- Kanban board with drag-and-drop stage transitions (FR-022)
- Weighted forecast summary: sum of (value x probability) for all open opportunities (FR-022)
- Close-reason prompt on Closed Won transition; dismiss reverts card (FR-022)
- Stage change logged to account timeline (FR-022)
- Commission engine: base rate per brand (8-15%), territory modifier (0.80-1.20x), volume tier thresholds (FR-023)
- Rate effective date enforcement: rate on order confirmation date applies (FR-023)
- Deterministic commission calculation with full audit logging (FR-023)
- Monthly commission statements: per-order breakdown with order number, account, brand, line total, rate, commission amount, total earned, YTD total (FR-024)
- Statement approval workflow: Pending Approval -> Approved -> Exported (FR-024)
- Manager approval with timestamp and approver in audit trail, Rep notification (FR-024)
- Accounting export: Rep name, pay period, total, line-item detail in compatible format (FR-025)
- Commission dashboard for Reps and Managers

**References**: US-9 (FR-021, FR-022), US-10 (FR-023, FR-024, FR-025), NFR-001, NFR-013, NFR-014

**Testing approach**: TDD for commission engine with determinism verification. `test("FR-021: auto-populates probability by stage")`, `test("FR-022: weighted forecast equals sum of value x probability")`, `test("FR-023: calculates $1,320 commission for $12K at 10% base + 1% tier 2 x 1.0 modifier")`, `test("FR-023: rate change applies only to post-effective-date orders")`, `test("FR-024: monthly statement shows all confirmed broker orders")`. Snapshot tests confirm commission determinism.

---

## Phase 9: Dashboards and Reporting (US-11)

**Goal**: Deliver the Rep KPI dashboard, Manager team dashboard, and custom report builder with export capabilities.

**Scope**: Rep dashboard with KPIs, Manager dashboard with team metrics and territory heat map, custom report builder with entity/filter/column selection, CSV/XLSX export.

**Deliverables**:
- Rep KPI dashboard loading within 3 seconds: current-month revenue, trailing-12-month revenue, account count, activity count, opportunity count, weighted pipeline value, commission (current month + YTD), health distribution (healthy/at-risk/critical) (FR-026)
- Critical health count click navigates to filtered account list (FR-026)
- Manager team dashboard: aggregate monthly revenue (bar chart), Rep rankings by revenue, territory revenue density heat map, pipeline forecast by stage (FR-027)
- Date filter with 2-second refresh on team dashboard (FR-027)
- Rep ranking table: all 9 reps sorted by revenue with order count, activity count, pipeline value columns (FR-027)
- Custom report builder: entity type selection (Account, Order, Product, Commission, Activity), filter application (date, territory, brand, rep, status), column chooser (FR-028)
- CSV and XLSX export within 10 seconds for up to 500 records (FR-028)
- Dashboard components use TanStack Query with stale-while-revalidate for responsive loading
- Charts built with a lightweight charting library (Recharts or similar, chosen at implementation)

**References**: US-11 (FR-026, FR-027, FR-028), NFR-001, NFR-002

**Testing approach**: Test-first for dashboard data aggregation services. `test("FR-026: dashboard loads within 3 seconds")`, `test("FR-026: critical count click shows filtered accounts")`, `test("FR-027: rep rankings sorted by revenue with all 9 reps")`, `test("FR-028: XLSX export with 500 records downloads within 10 seconds")`. Seeded data tests verify KPI values match direct database queries.

---

## Phase 10: Business Rule Automation and AI Meeting Briefs (US-13, US-14)

**Goal**: Deliver the business rule engine for admin-defined automation and AI meeting preparation briefs.

**Scope**: Business rule engine with IF/THEN condition evaluation, AND/OR operators, entity field validation, async action execution; AI meeting briefs with structured output.

**Deliverables**:
- Business rule engine: IF/THEN rules with AND/OR conditions on entity fields (FR-034)
- Supported actions: notify, update field, create task, send email (FR-034)
- Rule execution within 30 seconds of trigger event, processed asynchronously via Bull job (FR-034)
- Invalid field reference rejection at save time with descriptive error (FR-034)
- Priority-ordered execution with 30-second maximum per triggering event (FR-034)
- Skipped rules logged when execution exceeds time limit (FR-034)
- Admin rule builder UI with condition/action configuration
- AI meeting briefs: key contacts, recent activity summary, order trends, talking points, returned within 3 seconds (FR-035)
- All AI content labeled "AI-Generated" and editable (FR-035)
- AI service unavailability handled: "AI service temporarily unavailable" with no stale content (FR-036)
- AI email drafts and activity summaries (FR-035)
- 5-second AI timeout with 10-second hard cutoff (NFR-005)

**References**: US-13 (FR-034), US-14 (FR-035, FR-036), NFR-005

**Testing approach**: TDD for rule engine condition evaluation and action dispatch. `test("FR-034: rule fires within 30 seconds of trigger")`, `test("FR-034: rejects rule referencing non-existent field")`, `test("FR-034: executes asynchronously without blocking user session")`, `test("FR-035: meeting brief returned within 3 seconds labeled AI-Generated")`, `test("FR-036: shows unavailable message on AI outage")`. Rule engine tested with boundary conditions (100 active rules, cascading triggers).

---

## Phase 11: Polish, Hardening, and Launch Preparation

**Goal**: Comprehensive quality assurance, performance optimization, accessibility compliance, security audit, and launch readiness.

**Scope**: Performance optimization, accessibility audit, security assessment, load testing, data migration rehearsal, documentation, PWA optimization, monitoring setup.

**Deliverables**:
- Performance optimization: query analysis with pg_stat_statements, index tuning, TanStack Query cache policies, Next.js bundle optimization (NFR-001, NFR-002, NFR-003, NFR-004)
- k6 load testing at 100 concurrent users confirming p95 under 200ms (NFR-001)
- Lighthouse CI confirming FCP under 2s on simulated 4G (NFR-002)
- WCAG 2.1 Level AA audit: contrast ratios (4.5:1 normal, 3:1 large), keyboard navigation, ARIA labels, 44x44px touch targets (NFR-011, NFR-012)
- OWASP Top 10 security assessment with zero critical/high findings (NFR-009)
- TLS 1.3 verification for all traffic, AES-256 at rest verification (NFR-009)
- Data migration rehearsal from FileMaker: full import of production data through import pipeline (FR-031)
- PWA optimization: offline queuing for account creation, service worker caching strategy
- Sentry error monitoring and PostHog analytics integration
- Uptime monitoring configuration (NFR-006)
- CAN-SPAM, CCPA, and FSMA 204 compliance verification (NFR-010)
- Production Docker Compose configuration with resource limits
- Runbook and deployment documentation

**References**: All NFRs (NFR-001 through NFR-014), SC-001 through SC-012

**Testing approach**: Full end-to-end regression suite via Playwright covering all 14 user stories. Load tests with k6 simulating 100 concurrent users. Accessibility automated tests with axe-core. Security scanning with OWASP ZAP. Data migration dry run with production-scale dataset. Smoke test suite for post-deployment validation.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|-----------|--------------------------------------|
| Bull worker as separate container | Background jobs (health scores, commissions, reminders, imports, rule engine) must execute without blocking API responses; nightly batch jobs require scheduled processing | Inline processing in API handlers would violate NFR-001 (200ms p95) and block user sessions during heavy computation |
| pg_trgm full-text search | FR-007 requires 200ms p95 search across 50,000 accounts with fuzzy matching on multiple fields | Application-level search would not meet p95 latency targets; external search engines (Elasticsearch) add infrastructure complexity that is not justified for this data scale |
| AI provider abstraction layer | FR-035/FR-036 require graceful degradation when primary AI service is unavailable; fallback to secondary provider maintains feature availability | Single-provider integration would fail the NFR-005 availability requirement when the primary provider has outages |
| Shared packages workspace | Frontend and backend must share Zod schemas, TypeScript types, and constants to enforce API contract consistency | Duplicating types across services creates drift risk and violates the single source of truth principle |
