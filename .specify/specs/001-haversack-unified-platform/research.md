# Technology Research: Haversack Unified Platform

**Feature Branch**: `001-haversack-unified-platform`
**Created**: 2026-02-24
**Status**: Final

This document provides the technology research and rationale for every component in the Haversack Unified Platform stack. Each technology was selected because it satisfies the constitutional mandates, meets the performance standards defined in the specification, and aligns with the 9-user, single-organization deployment scope.

---

## Technology Research

### React 18.3 + Next.js 14.2 (App Router)

- **Version**: React 18.3.x / Next.js 14.2.x
- **License**: MIT

**Rationale**: React with Next.js App Router was chosen because it provides the strongest combination of Server Components, Streaming SSR, and ecosystem maturity for a CRM-first application that must achieve First Contentful Paint under 2 seconds on a 4G connection (NFR-002). The App Router architecture was selected over the Pages Router because it enables per-component streaming, nested layouts for the multi-panel account detail view (US-2), and React Server Components that reduce client bundle size — critical for the mobile-first field rep experience on variable cellular connections.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Remix | Smaller ecosystem, fewer production examples at CRM-scale complexity. Remix's loader pattern is elegant but lacks the incremental adoption path of Server Components. Community and hiring pool are narrower compared to Next.js. |
| Astro | Content-site oriented. Astro's island architecture is an advantage for static sites but a disadvantage for the highly interactive kanban boards (FR-022), real-time search (FR-007), and drag-and-drop order entry (FR-013) this platform requires. |
| SvelteKit | Svelte's compiled approach offers excellent performance but the ecosystem is immature for complex form handling (React Hook Form + Zod has no Svelte equivalent of comparable depth). Hiring and community support are significantly smaller. |

**Key features used**:
- **Server Components**: Reduce client JS for data-heavy pages like account detail (FR-004) and dashboards (FR-026, FR-027). Server Components pre-render the account timeline and order history on the server, sending only the interactive pieces (search bar, quick-log form) as client components.
- **App Router with Nested Layouts**: The CRM shell (sidebar, header, global search) persists across navigation. Nested layouts allow the account detail view to swap tab content without re-rendering the shell.
- **Streaming SSR**: The account detail page (US-2) streams the core account data first, then progressively loads activities, orders, and health score — achieving the 2-second render target even when downstream data is slow.
- **Route Handlers**: Used for lightweight BFF (backend-for-frontend) endpoints that aggregate Fastify API calls for dashboard data.

**Risk/concern**: Server Components introduce complexity in the client/server boundary. Developers must understand which components can use hooks (client only) vs. which can do async data fetching (server only). Mitigated by clear naming conventions (`*.client.tsx` / `*.server.tsx`) and ESLint rules preventing hook usage in server components.

---

### Tailwind CSS 3.4 + shadcn/ui

- **Version**: Tailwind CSS 3.4.x / shadcn/ui (latest)
- **License**: MIT

**Rationale**: Tailwind CSS was selected over component-library alternatives because it provides utility-first styling with zero runtime CSS-in-JS overhead, which is an advantage for mobile field performance. The utility-first approach enables rapid iteration on the mobile-first responsive design (320px breakpoint first, 44px touch targets per NFR-012) without fighting component library abstractions. shadcn/ui was chosen because it provides accessible, unstyled Radix UI primitives with Tailwind classes — giving full design control compared to opinionated libraries.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Material UI (MUI) | Heavy runtime CSS-in-JS (Emotion). MUI's Material Design aesthetic is Google-specific and hard to customize for a food-industry brand. Bundle size is significantly larger — the full MUI package exceeds 300KB gzipped vs. Tailwind's purged output under 15KB. |
| Chakra UI | Also uses runtime CSS-in-JS (Emotion). Chakra's theming system is powerful but adds unnecessary abstraction when Tailwind's design tokens achieve the same result with better performance. |
| Ant Design | Enterprise-oriented design language that is difficult to make mobile-first. Ant Design's 600KB+ bundle and CJK-first documentation are disadvantages for this project. |

**Key features**:
- **Design tokens via Tailwind config**: Brand colors, spacing scale, and typography defined once in `tailwind.config.ts` and used everywhere — ensuring WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text per NFR-011).
- **Responsive utilities**: `sm:`, `md:`, `lg:` breakpoints enable the mobile-first layout strategy required for field reps using phones and tablets.
- **shadcn/ui accessible primitives**: Dialog, Dropdown, Select, Combobox components built on Radix UI with ARIA attributes, keyboard navigation, and screen reader compatibility (NFR-011, NFR-012).
- **Purged production CSS**: Tailwind's JIT compiler produces only the classes actually used, keeping the CSS bundle small for 4G performance targets.

**Risk/concern**: Tailwind's utility classes can reduce HTML readability. Mitigated by extracting reusable components and using `@apply` sparingly for repeated patterns.

---

### TanStack Query 5

- **Version**: 5.x
- **License**: MIT

**Rationale**: TanStack Query was chosen because it is the constitutionally mandated server state management solution (Constitution Section I). It was preferred over alternatives because of its mature cache invalidation strategy, optimistic updates for the quick-log flow (US-4), and built-in stale-while-revalidate pattern that keeps dashboard data fresh without full page reloads.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| SWR (Vercel) | SWR is lighter but lacks TanStack Query's mutation pipeline, infinite query support (needed for activity timeline infinite scroll per FR-009), and devtools. SWR's cache invalidation is less granular. |
| Apollo Client | Apollo is GraphQL-specific. The Haversack API is REST-over-Fastify with JSON Schema validation — introducing GraphQL would add unnecessary complexity for a 9-user system. |
| Redux Toolkit Query | Redux is constitutionally prohibited (Constitution Section I). RTK Query would require Redux as a dependency. |

**Key features**:
- **Cache invalidation**: When a Rep logs an activity (FR-008), the mutation invalidates the account detail query, account timeline query, and dashboard KPI query — ensuring all views reflect the new data within seconds.
- **Optimistic updates**: The quick-log form (US-4) updates the local activity timeline immediately on submit, then reconciles with the server response. If the server rejects, the optimistic update rolls back with a toast notification.
- **Infinite queries**: The activity timeline (FR-009) uses `useInfiniteQuery` with cursor-based pagination (20 items per page) — TanStack Query handles page merging and deduplication automatically.
- **Prefetching**: When a Rep hovers over an account in search results, the account detail data is prefetched, making the subsequent navigation feel instant.

**Risk/concern**: Cache staleness across multiple browser tabs. Mitigated by setting `refetchOnWindowFocus: true` for critical queries (dashboard, pipeline board).

---

### React Hook Form 7 + Zod 3

- **Version**: React Hook Form 7.x / Zod 3.x
- **License**: MIT (both)

**Rationale**: React Hook Form with Zod was chosen because the constitution mandates this combination (Constitution Section I). The selection reason is that React Hook Form's uncontrolled input strategy minimizes re-renders — critical for the complex order entry form (US-6) with 10+ dynamic line items. Zod provides TypeScript-first schema validation that is shared between frontend forms and backend API validation, ensuring a single source of truth for all data shapes.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Formik | Formik uses controlled inputs with frequent re-renders, causing noticeable lag on the 10-line order entry form. Formik's bundle size (12.7KB) is larger than React Hook Form (8.5KB). Formik's Yup dependency adds another validation library vs. Zod's unified approach. |
| Final Form | Smaller community, less TypeScript support, and no Zod integration out of the box. |

**Key features**:
- **Schema validation with Zod**: Every form (account creation, order entry, commission rules) validates against a Zod schema that is also used by the Fastify backend. This eliminates validation drift between client and server.
- **Type inference**: `z.infer<typeof accountSchema>` generates TypeScript types from Zod schemas, removing manual type definitions and preventing type/validation mismatches.
- **Dynamic field arrays**: `useFieldArray` handles the multi-line order entry form (FR-013) where Reps add/remove product line items dynamically.
- **Form-level and field-level validation**: Field-level errors display inline (FR-002 requires field-level validation errors), while form-level errors handle cross-field rules (e.g., order total >= $5,000 triggers approval warning).

**Risk/concern**: Complex nested Zod schemas (e.g., order with line items with product references) can produce hard-to-read error messages. Mitigated by custom error maps and field-level error formatting.

---

### Fastify 4.28

- **Version**: 4.28.x
- **License**: MIT

**Rationale**: Fastify was selected because the constitution mandates it over Express (Constitution Section I). The core reason for this selection is Fastify's 2-3x throughput advantage over Express: Fastify handles 30,000+ requests per second vs. Express's approximately 10,000 requests per second in benchmarks. For the Haversack platform, this headroom ensures the API meets p95 < 200ms (NFR-001) even during peak activity — such as when all 9 reps submit orders and log activities simultaneously during a Monday morning sync.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Express | Express's middleware chain has higher per-request overhead. Express lacks built-in schema validation — every endpoint requires manual middleware for input validation. Express's TypeScript support is bolt-on (via `@types/express`) rather than first-class. |
| Hono | Hono is optimized for edge/serverless runtimes. The Haversack platform runs in Docker containers on a traditional server, where Hono's edge advantages are irrelevant and its ecosystem is less mature. |
| Koa | Koa's minimalist approach requires assembling middleware for every concern (body parsing, validation, error handling). Fastify provides these out of the box with better performance. |
| NestJS | NestJS adds unnecessary abstraction (decorators, dependency injection containers) for a 9-user application. Its Angular-inspired architecture increases learning curve without proportional benefit at this scale. |

**Key features**:
- **JSON Schema validation**: Fastify validates request body, querystring, params, and headers against JSON Schema at the framework level — requests that fail schema validation never reach the handler. This enforces the constitutional mandate that all API endpoints validate input (Constitution Section V).
- **Hooks lifecycle**: `onRequest` hooks handle JWT verification and RBAC checks. `preSerialization` hooks strip sensitive fields. `onError` hooks format structured error responses with `requestId` (Constitution Section VI).
- **Encapsulation and decorators**: `fastify.decorate('prisma', prismaClient)` makes the Prisma client available in all routes without global imports. Encapsulated plugins prevent scope leakage between domain modules (accounts, orders, commissions).
- **Serialization performance**: Fastify uses `fast-json-stringify` for response serialization, which is 2-5x faster than `JSON.stringify` — contributing to the sub-200ms p95 target.

**Performance**: Fastify's architecture (radix tree router, pre-compiled serializers, schema-based validation) supports 30,000+ req/s on a single core. For the Haversack platform with 9 users and up to 100 concurrent requests (NFR-001), this provides a 300x safety margin.

**Risk/concern**: Fastify's plugin system requires understanding encapsulation scoping. Plugins registered in a child context are not visible in sibling contexts. Mitigated by a flat plugin registration strategy and clear documentation of the plugin dependency tree.

---

### Prisma 5.22

- **Version**: 5.22.x
- **License**: Apache 2.0

**Rationale**: Prisma was chosen because the constitution mandates Prisma 5+ in strict TypeScript mode (Constitution Section I). Prisma was selected over other ORMs because its type-safe query API generates TypeScript types directly from the database schema, eliminating an entire class of runtime errors where queries reference non-existent columns or return unexpected shapes. For a CRM with 15+ entity types (Account, Contact, Order, OrderItem, Product, Brand, Commission, Opportunity, Activity, EmailRecord, etc.), type-safe queries prevent the data integrity issues that plague raw SQL or loosely-typed ORMs.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| TypeORM | TypeORM's decorator-based approach has poor TypeScript inference — relation types are often `any`. TypeORM's query builder is less ergonomic than Prisma's nested include/select API. Migration tooling is less reliable. |
| Drizzle | Drizzle offers excellent TypeScript support and closer-to-SQL semantics, but its migration tooling is newer and less battle-tested. Drizzle's relational query API was in beta at evaluation time. Prisma's Prisma Studio and extensive documentation are advantages for a team transitioning from FileMaker. |
| Knex | Knex is a query builder, not an ORM. It provides no type generation from schema, requiring manual type definitions for every table. The maintenance burden grows linearly with entity count. |
| Sequelize | Sequelize's TypeScript support is poor (bolted-on types rather than type-safe-by-design). Its API is JavaScript-first with TypeScript as an afterthought. |

**Key features**:
- **Type-safe queries**: `prisma.account.findMany({ include: { contacts: true, orders: true } })` returns a fully typed object including all nested relations. Changing a column name in the schema immediately surfaces type errors across the codebase.
- **Prisma Migrate**: Schema changes are version-controlled as SQL migration files. The `prisma migrate dev` workflow generates migrations from schema diff, which is reviewable before application — critical for the data integrity requirements (NFR-013).
- **`$queryRaw` for edge cases**: Complex queries (fuzzy search with `pg_trgm`, commission calculations with CTEs) use `$queryRaw` with parameterized inputs as permitted by the constitution. This covers the 5-10% of queries where Prisma's query builder is insufficient.
- **Prisma Client extensions**: Custom model methods (e.g., `prisma.account.findWithHealthScore()`) encapsulate domain logic while preserving type safety.

**Risk/concern**: N+1 query potential when using nested `include`. Mitigated by using `findMany` with explicit `include` declarations, avoiding lazy loading, and monitoring query counts with Prisma's query event logging. For the account detail page (US-2), a single query with nested includes replaces what would be 5-6 separate queries.

---

### PostgreSQL 16.x

- **Version**: 16.1 or later 16.x release
- **License**: PostgreSQL License (permissive, BSD-like)

**Rationale**: PostgreSQL 16 was selected because the constitution mandates PostgreSQL 16+ with Row-Level Security (Constitution Section I). PostgreSQL was chosen over alternatives because it uniquely combines RLS for tenant/territory isolation, JSONB for flexible fields, full-text search with `pg_trgm` for fuzzy matching, and GiST indexes for geographic territory queries — all within a single database engine. This eliminates the need for separate search (Elasticsearch) or document (MongoDB) databases, reducing operational complexity for a 9-user deployment.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| MySQL 8 | MySQL lacks Row-Level Security, which is constitutionally required for territory-scoped data isolation. MySQL's JSON support is less mature than PostgreSQL's JSONB (no GIN indexes on JSON). MySQL's full-text search is less capable than PostgreSQL's `tsvector` + `pg_trgm`. |
| MongoDB | MongoDB's document model is a poor fit for the highly relational data in a CRM (accounts -> contacts -> activities -> orders -> line items -> products -> brands). Enforcing referential integrity across documents requires application-level logic, increasing bug surface. MongoDB lacks ACID transactions across collections in the way PostgreSQL provides them natively. |
| SQLite | SQLite is single-writer and lacks RLS, concurrent connection support, and the full-text search capabilities required. Not suitable for a multi-user web application. |

**Key features**:
- **Row-Level Security (RLS)**: Policies enforce territory-scoped data access at the database level. Even if application code has a bug that omits a `WHERE territory_id = ?` clause, RLS prevents cross-territory data leakage. This satisfies NFR-008 and Constitution Section V.
- **`pg_trgm` for fuzzy search**: The duplicate detection feature (FR-003) uses trigram similarity to find accounts with names within Levenshtein distance 3. The global search (FR-007) uses `pg_trgm` GIN indexes for sub-200ms fuzzy search across 50,000 accounts (NFR-003).
- **JSONB columns**: Flexible fields for business rule conditions (FR-034), email tracking metadata (FR-010), and audit trail old/new values (NFR-014) are stored as JSONB — queryable and indexable without schema migrations.
- **GiST indexes**: Territory boundary queries use GiST indexes on geometry columns for the territory heat map (FR-027).
- **Full-text search with `tsvector`**: Weighted full-text search across account name (weight A), contact name (weight B), and address (weight C) provides relevance-ranked results for global search (FR-007).

**Performance**: PostgreSQL 16 supports p95 < 50ms for well-indexed queries (NFR-004). The query planner improvements in PostgreSQL 16 (incremental sort, parallel hash join) benefit the complex dashboard aggregation queries (FR-026, FR-027). Connection pooling via PgBouncer ensures stable performance under 100 concurrent connections.

**Risk/concern**: RLS policies add overhead to every query. Mitigated by ensuring RLS policies reference indexed columns (tenant_id, territory_id) and benchmarking query plans with `EXPLAIN ANALYZE` during development.

---

### Redis 7.4 + Bull 5

- **Version**: Redis 7.4.x / Bull 5.x
- **License**: Redis — SSPL (server) / MIT (client libraries) / Bull — MIT

**Rationale**: Redis with Bull was chosen because the constitution mandates Redis 7+ with Bull for background processing (Constitution Section I). Redis was selected because of its sub-millisecond latency for session cache and pub/sub, combined with Bull's mature job queue implementation for asynchronous processing. The Haversack platform requires background jobs for commission calculations (FR-023), health score recalculation (FR-006), email tracking (FR-010), data quality scoring (FR-033), and business rule execution (FR-034) — all of which must complete without blocking the user's session.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| RabbitMQ | RabbitMQ is overkill for this scale. A 9-user application does not need a dedicated message broker with exchange routing, dead letter queues, and cluster management. Redis + Bull provides equivalent job queue functionality with far less operational overhead. |
| Memcached | Memcached lacks pub/sub, persistence, and data structures (sorted sets, hashes) that Redis provides. Bull requires Redis specifically — Memcached cannot back a job queue. |
| BullMQ | BullMQ is the successor to Bull with improved TypeScript support, but Bull 5 has a larger ecosystem of monitoring tools (Arena, Bull Board) and more production battle-testing. BullMQ was considered but Bull's maturity and simpler API were preferred for this project. |
| AWS SQS | Introducing a cloud-managed queue service conflicts with the Docker Compose self-hosted architecture. SQS adds vendor lock-in and network latency that Redis's co-located deployment avoids. |

**Key features**:
- **Session cache**: JWT refresh tokens and user session data stored in Redis with TTL-based expiration. Session invalidation (FR-030: deactivated user sessions invalidated within 15 seconds) uses Redis key deletion — immediate and atomic.
- **Bull job queues**: Separate queues for each background concern:
  - `commission-calc` — processes confirmed orders, applies rate rules, generates commission records (FR-023)
  - `health-score` — nightly batch recalculation at 02:00 UTC for all accounts (FR-006)
  - `email-tracking` — processes webhook events from email provider, updates engagement status (FR-010)
  - `data-quality` — nightly data quality scorecard generation (FR-033)
  - `business-rules` — evaluates triggered rules within 30 seconds (FR-034)
  - `notifications` — sends email and in-app reminders for tasks (FR-012) and order approvals (FR-017)
- **Pub/sub**: Real-time notifications for order approval requests (FR-017: manager notified within 30 seconds) use Redis pub/sub to push events to connected WebSocket clients.
- **Rate limiting**: Auth endpoint rate limiting (NFR-007: 10 requests/minute/IP) uses Redis sorted sets with sliding window counters.

**Performance**: Redis 7.4 delivers sub-millisecond read/write latency. Bull job processing adds approximately 5-10ms overhead per job. For the commission calculation queue, a month's worth of orders (estimated 500-1000 line items) processes in under 30 seconds.

**Risk/concern**: Redis is single-threaded and stores all data in memory. For the Haversack platform's scale (9 users, estimated < 100MB cache), this is not a concern. Redis persistence (RDB snapshots + AOF) prevents data loss on restart.

---

### Docker + Docker Compose

- **Version**: Docker 25.x / Docker Compose 2.x
- **License**: Apache 2.0

**Rationale**: Docker with Docker Compose was chosen because the constitution mandates a Dockerized monorepo with separate containers per service (Constitution Section II). Docker Compose was selected over more complex orchestration because it provides standardized, reproducible deployment for a 9-user application without the operational overhead of Kubernetes. The development, staging, and production environments use identical container configurations, eliminating "works on my machine" issues during the FileMaker migration.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Kubernetes | Kubernetes is dramatically over-engineered for a 9-user, single-organization application. The operational complexity (cluster management, RBAC, networking, Helm charts) would consume development time better spent on CRM features. Kubernetes becomes relevant at 100+ users or multi-region deployment — neither is in scope. |
| Bare metal / PM2 | Running Node.js processes directly on a server sacrifices reproducibility and isolation. Dependency conflicts between services, inconsistent environments, and manual process management increase operational risk during the 120-day FileMaker decommission timeline. |
| Docker Swarm | Docker Swarm adds multi-node orchestration that is unnecessary for a single-server deployment. Swarm's overlay networking and service mesh add latency compared to Docker Compose's bridge network. |

**Services defined in `docker-compose.yml`**:
- **frontend** — Next.js 14 application serving the CRM UI. Port 3000.
- **backend** — Fastify API server handling all business logic. Port 3001.
- **worker** — Bull queue processor for background jobs (commissions, health scores, emails, notifications). Shares code with backend but runs as a separate process.
- **postgres** — PostgreSQL 16 with RLS policies, persistent volume for data.
- **redis** — Redis 7.4 for cache, sessions, and Bull queues.

**Key features**:
- **Multi-stage builds**: Frontend and backend Dockerfiles use multi-stage builds — `node:18-alpine` for build, `node:18-alpine` for runtime — keeping production images under 200MB.
- **Health checks**: Each container defines a health check (HTTP GET for frontend/backend, `pg_isready` for postgres, `redis-cli ping` for redis) enabling Docker Compose restart policies.
- **Volume mounts**: Development uses bind mounts for live reload. Production uses named volumes for PostgreSQL data persistence and Redis AOF.
- **Environment variable management**: `.env` files per environment (`.env.development`, `.env.production`) injected via Docker Compose `env_file` directive. Secrets never baked into images.

**Risk/concern**: Docker Compose lacks auto-scaling and zero-downtime deployment. For 9 users, manual deployment with a brief maintenance window (< 5 minutes) is acceptable. If scaling needs increase, migration to Docker Swarm or Kubernetes is straightforward from a Compose-based starting point.

---

### Vitest + Playwright

- **Version**: Vitest 1.x / Playwright 1.x
- **License**: MIT (both)

**Rationale**: Vitest was chosen because the constitution mandates it for unit and integration tests (Constitution Section IV). Vitest was preferred over Jest because it is ESM-native, has faster test execution (2-5x in typical projects), and provides first-class TypeScript support without requiring `ts-jest` or `babel-jest` transformations. Playwright was chosen over Cypress for end-to-end tests because it supports multi-browser testing (Chromium, Firefox, WebKit) and has faster execution through browser context isolation.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| Jest | Jest's CommonJS-first architecture requires ESM transformation plugins. Jest's TypeScript support depends on `ts-jest` which adds configuration complexity and slows test execution. Jest's watch mode is slower than Vitest's Vite-powered HMR-based watch. |
| Cypress | Cypress only supports Chromium-based browsers (Chrome, Edge) and experimentally Firefox. Cypress's architecture (running inside the browser) makes it slower than Playwright's CDP-based approach. Cypress's paid dashboard is unnecessary for a 9-user project. |
| Testing Library + jsdom | Testing Library is used alongside Vitest (via `@testing-library/react`), not as a replacement. jsdom is the default environment for Vitest component tests. |

**Key features**:
- **ESM-native**: Vitest runs TypeScript and ESM modules without transformation, matching the project's module system exactly. No `moduleNameMapper` or `transform` configuration needed.
- **Workspace support**: Vitest workspaces run frontend and backend tests in a single command with different configurations (jsdom for frontend, node for backend).
- **Acceptance criteria mapping**: Test names reference FR and AC identifiers per constitutional mandate (e.g., `test("FR-001: creates account with required fields")`).
- **Playwright multi-browser**: E2E tests validate the CRM flows (account creation, order entry, commission review) across Chromium, Firefox, and WebKit — ensuring field reps on different devices have consistent experiences.

---

### bcrypt (Cost Factor 12)

- **Version**: bcrypt 5.x (via `bcryptjs` for pure JS or `bcrypt` native binding)
- **License**: MIT

**Rationale**: bcrypt at cost factor 12 is constitutionally mandated for password hashing (Constitution Section V, NFR-007). bcrypt was chosen because it is battle-tested with over 25 years of production use and is the most widely recommended password hashing algorithm in the Node.js ecosystem. Cost factor 12 provides approximately 250ms hash time on modern hardware, balancing security against the rate-limiting requirement (10 requests/minute/IP per NFR-007).

**Alternative considered**: Argon2 (argon2id) is theoretically superior (memory-hard, resistant to GPU attacks) but has less ecosystem support in Node.js — the `argon2` npm package requires native compilation and has occasional build issues on Alpine Linux (our Docker base image). bcrypt's reliability and ubiquity were preferred for a project where password hashing correctness is more important than marginal security gains.

---

### jose (JWT Library)

- **Version**: jose 5.x
- **License**: MIT

**Rationale**: `jose` was selected over `jsonwebtoken` because `jose` is ESM-first, actively maintained, and supports the full JOSE specification (JWS, JWE, JWT, JWK). The `jsonwebtoken` package is CommonJS-only and has had extended periods without maintenance. `jose` is also dependency-free, reducing supply chain risk.

**Key features**: Handles 15-minute access token signing/verification and 7-day refresh token management as required by NFR-007. Supports `RS256` for asymmetric JWT signing, enabling token verification without sharing the private key.

---

### Sentry (Error Tracking)

- **Version**: Sentry SDK 7.x
- **License**: MIT (SDK) / BSL 1.1 (Server)

**Rationale**: Sentry was chosen because it provides real-time error tracking with source maps, performance monitoring, and session replay. For a 9-user CRM where downtime must be detected and resolved quickly (99.5% uptime target per NFR-006), Sentry's alerting ensures the development team is notified within minutes of production errors. Sentry integrates natively with both Next.js (frontend) and Fastify (backend).

---

### PostHog (Product Analytics)

- **Version**: PostHog JS SDK 1.x
- **License**: MIT (SDK) / PostHog Open Source License (Server)

**Rationale**: PostHog was selected because it provides self-hostable product analytics — important for a food broker handling potentially sensitive account and order data. PostHog tracks feature adoption (are reps using AI meeting briefs?), identifies UX friction (where do reps abandon the order entry flow?), and measures success criteria (SC-001: 9 of 9 reps actively using the platform).

---

### Anthropic Claude API

- **Version**: Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
- **License**: Commercial API (usage-based pricing)

**Rationale**: The Anthropic Claude API was selected because of its structured output capability, tool use support, and 200k context window. For the Haversack platform's AI features — reorder suggestions (FR-018), meeting briefs (FR-035), email drafts (FR-035), and activity summaries (FR-035) — Claude's structured output ensures reliable JSON parsing of AI responses, while tool use enables the AI to query account data through defined function interfaces rather than requiring all context in the prompt.

**Alternatives rejected**:

| Alternative | Reason Rejected |
|-------------|----------------|
| OpenAI GPT-4 | GPT-4 is retained as a fallback provider (per CLAUDE.md), but Claude was preferred as primary because of more reliable structured output (JSON mode), native tool use without function calling workarounds, and competitive pricing for the expected volume (< 1000 AI requests/day). |
| Google Gemini | Gemini's API stability and structured output support were less mature at evaluation time compared to Claude. |
| Local LLMs (Llama, Mistral) | Running local models requires GPU infrastructure that conflicts with the Docker Compose deployment model. Quality of structured output and tool use is significantly lower than Claude 3.5 Sonnet. |

**Key features**:
- **Structured output**: AI responses for reorder suggestions return validated JSON matching the order draft schema — no regex parsing or fragile text extraction.
- **Tool use**: Meeting brief generation uses tool calls to fetch account history, recent orders, and contact details — keeping the prompt small and the context accurate.
- **200k context window**: For accounts with extensive histories (100+ activities, 50+ orders), the full context fits in a single request without summarization loss.
- **Provider abstraction layer**: Per CLAUDE.md, the AI module uses a provider abstraction that can switch between Anthropic (primary) and OpenAI (fallback) without changing business logic.

**Risk/concern**: AI service unavailability. Mitigated by the constitutional requirement (Constitution Section VI) that external service failures degrade gracefully. The AI timeout is 5 seconds with a 10-second hard cutoff (NFR-005). On failure, the UI shows "AI service temporarily unavailable" per FR-036.

---

## Additional Libraries

| Library | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `bcrypt` | 5.x | Password hashing | Chosen because battle-tested; preferred over argon2 for ecosystem reliability |
| `jose` | 5.x | JWT signing/verification | Selected over jsonwebtoken because ESM-first, maintained, zero dependencies |
| `vitest` | 1.x | Unit + integration testing | Preferred over Jest because faster, ESM-native, better TypeScript support |
| `playwright` | 1.x | E2E testing | Chosen over Cypress because multi-browser, faster, no paid dashboard needed |
| `@sentry/nextjs` + `@sentry/node` | 7.x | Error tracking | Real-time error alerting for 99.5% uptime target |
| `posthog-js` + `posthog-node` | 1.x | Product analytics | Self-hostable analytics for feature adoption tracking |
| `zod` | 3.x | Schema validation | Shared between frontend (React Hook Form) and backend (Fastify) — single source of truth |
| `@tanstack/react-query` | 5.x | Server state management | Constitutional mandate; cache invalidation, optimistic updates, infinite queries |
| `react-hook-form` | 7.x | Form management | Constitutional mandate; uncontrolled inputs for performance |
| `@radix-ui/*` | latest | Accessible primitives | Foundation of shadcn/ui; WCAG 2.1 AA compliant components |
| `nodemailer` | 6.x | Email fallback | Fallback email transport when Microsoft Graph API is unavailable |
| `exceljs` | 4.x | XLSX export/import | Commission statement export (FR-025) and data import (FR-031) |
| `puppeteer` or `@react-pdf/renderer` | latest | PDF generation | Brand line card PDF generation (FR-020) within 10-second target |

---

## Decision Log

| Decision | Chosen | Rejected | Rationale |
|----------|--------|----------|-----------|
| Frontend framework | Next.js 14.2 App Router | Remix, SvelteKit, Astro | Chosen because Server Components reduce client bundle for mobile-first CRM; ecosystem maturity and hiring pool are significantly larger vs. alternatives |
| Styling | Tailwind CSS 3.4 + shadcn/ui | Material UI, Chakra UI, Ant Design | Selected because zero runtime CSS-in-JS overhead is an advantage for 4G performance; utility-first approach enables rapid mobile-first iteration |
| Server state | TanStack Query 5 | SWR, Apollo Client, Redux Toolkit Query | Preferred because of mature cache invalidation, optimistic updates for quick-log, and infinite query support for activity timeline |
| Form handling | React Hook Form 7 + Zod 3 | Formik + Yup | Chosen because uncontrolled inputs eliminate re-renders on 10+ line item order forms; Zod shared with backend validation |
| Backend framework | Fastify 4.28 | Express, Hono, Koa, NestJS | Selected because of 3x throughput advantage over Express (30,000+ vs. 10,000 req/s), built-in schema validation, TypeScript-first design |
| ORM | Prisma 5.22 | TypeORM, Drizzle, Knex, Sequelize | Chosen because type-safe query generation prevents runtime errors across 15+ entity types; migration tooling is most mature |
| Database | PostgreSQL 16.1 | MySQL 8, MongoDB, SQLite | Selected because RLS provides constitutionally-mandated tenant isolation; JSONB, pg_trgm, and full-text search eliminate need for separate search/document databases |
| Cache + Queue | Redis 7.4 + Bull 5 | Memcached, RabbitMQ, BullMQ, AWS SQS | Chosen because sub-ms latency for sessions, pub/sub for real-time notifications, and Bull's mature job queue API; RabbitMQ rejected as overkill for 9-user scale |
| Container orchestration | Docker Compose 2.x | Kubernetes, Docker Swarm, bare metal | Selected because Kubernetes is over-engineered for 9-user single-server deployment compared to Compose's simplicity; bare metal rejected for reproducibility concerns |
| Unit testing | Vitest 1.x | Jest | Preferred because ESM-native execution is faster (2-5x), first-class TypeScript without ts-jest, Vite-powered watch mode |
| E2E testing | Playwright 1.x | Cypress | Chosen because multi-browser support (Chromium, Firefox, WebKit) vs. Cypress's Chromium-only; faster execution via CDP |
| Password hashing | bcrypt (cost 12) | argon2 | Chosen because battle-tested with 25+ years of production use; argon2 has native compilation issues on Alpine Linux |
| JWT library | jose 5.x | jsonwebtoken | Selected because ESM-first, actively maintained, zero dependencies vs. jsonwebtoken's CommonJS-only, sporadic maintenance |
| AI provider | Anthropic Claude 3.5 Sonnet | OpenAI GPT-4, Google Gemini, local LLMs | Selected because structured output reliability, native tool use, and 200k context window; OpenAI retained as fallback provider |
| Error tracking | Sentry | Datadog, New Relic | Chosen because native Next.js + Fastify integration, source map support, and free tier sufficient for 9-user scale |
| Analytics | PostHog | Mixpanel, Amplitude, Google Analytics | Selected because self-hostable (data sovereignty for food broker account data), open-source SDK |

---

## Compatibility Matrix

| Technology | Node.js 18+ | TypeScript 5+ | Docker Alpine | License |
|------------|-------------|---------------|---------------|---------|
| React 18.3 | Yes | Yes | Yes | MIT |
| Next.js 14.2 | Yes | Yes | Yes | MIT |
| Tailwind CSS 3.4 | Yes | Yes | Yes | MIT |
| TanStack Query 5 | N/A (browser) | Yes | N/A | MIT |
| React Hook Form 7 | N/A (browser) | Yes | N/A | MIT |
| Zod 3 | Yes | Yes | Yes | MIT |
| Fastify 4.28 | Yes | Yes | Yes | MIT |
| Prisma 5.22 | Yes | Yes | Yes | Apache 2.0 |
| PostgreSQL 16.1 | N/A | N/A | Yes (official image) | PostgreSQL |
| Redis 7.4 | N/A | N/A | Yes (official image) | SSPL / MIT |
| Bull 5 | Yes | Yes | Yes | MIT |
| Docker 25.x | N/A | N/A | N/A | Apache 2.0 |
| Vitest 1.x | Yes | Yes | Yes | MIT |
| Playwright 1.x | Yes | Yes | Yes | Apache 2.0 |

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Prisma N+1 queries degrade dashboard performance | High | Medium | Use `findMany` with explicit `include`; monitor with Prisma query logging; set p95 alerting at 50ms |
| Redis memory exhaustion | Medium | Low | Estimated < 100MB for 9 users; set `maxmemory` policy to `allkeys-lru`; monitor with Redis INFO |
| AI provider outage blocks reorder/brief features | Medium | Medium | Provider abstraction layer with OpenAI fallback; 5-second timeout; graceful degradation per FR-036 |
| RLS policies add query overhead | Medium | Low | Index all RLS filter columns (tenant_id, territory_id); benchmark with EXPLAIN ANALYZE; target < 5ms overhead |
| Next.js App Router breaking changes in minor versions | Medium | Low | Pin exact versions in `package.json`; test upgrades in staging; follow Next.js release notes |
| Bull job queue stalls during commission batch | High | Low | Set job timeout to 60 seconds; implement dead letter queue; alert on queue depth > 100 |

---

**Version**: 1.0.0 | **Researched**: 2026-02-24
