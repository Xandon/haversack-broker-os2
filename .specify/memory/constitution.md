# Haversack Unified Platform Constitution

## Core Principles

### I. Technology Stack Enforcement

All application code MUST use the following stack without substitution:

- Frontend MUST use React 18+ with Next.js 14+ App Router. The Pages Router MUST NOT be used.
- Styling MUST use Tailwind CSS with shadcn/ui. No other CSS frameworks or component libraries SHALL be introduced.
- Server state management MUST use TanStack Query. Client UI state MUST use React Context. Redux, Zustand, MobX, and Jotai MUST NOT be used.
- Form handling MUST use React Hook Form with Zod validation schemas. All API payloads and form inputs MUST be validated through Zod.
- Backend MUST use Fastify 4+ on Node.js 18+. Express MUST NOT be used.
- ORM MUST be Prisma 5+ with strict TypeScript mode. Raw SQL MUST NOT be used except via Prisma `$queryRaw` with parameterized inputs.
- Database MUST be PostgreSQL 16+ with Row-Level Security (RLS) policies for tenant isolation.
- Cache, sessions, and job queues MUST use Redis 7+ with Bull for background processing.

### II. Architecture Boundaries

- The repository MUST follow a Dockerized monorepo structure with separate containers for frontend, backend, worker, and database services.
- Each container MUST have a single responsibility. Frontend MUST NOT contain business logic. Backend MUST NOT contain rendering logic.
- All inter-service communication MUST use documented API contracts. Direct database access from the frontend MUST NOT occur.
- Every module MUST have clearly defined boundaries. Circular dependencies between modules MUST NOT exist.
- Feature code MUST be organized by domain (accounts, orders, commissions, activities) rather than by technical layer.

### III. Code Quality and Style

- All source code MUST be written in TypeScript with strict mode enabled (`"strict": true`). JavaScript files MUST NOT be used for application code.
- All functions MUST have explicit return types. The `any` type MUST NOT be used; `unknown` with type narrowing MUST be used instead.
- All exports MUST use named exports. Default exports MUST NOT be used except for Next.js page components where required by the framework.
- All API route handlers MUST validate request input using Zod schemas before processing.
- Naming conventions MUST follow: `camelCase` for variables and functions, `PascalCase` for types, interfaces, React components, and classes, `SCREAMING_SNAKE_CASE` for constants, `kebab-case` for file names and directories.
- ESLint and Prettier MUST be configured and enforced. Code MUST NOT be committed with linting errors.

### IV. Testing Standards

- Every service function, API endpoint, and React component with business logic MUST have corresponding test coverage.
- Unit tests MUST use Vitest. Integration tests MUST use Vitest with Supertest for API endpoints. End-to-end tests MUST use Playwright.
- Test files MUST be co-located with their source files using the `.test.ts` or `.test.tsx` suffix, or placed in a parallel `__tests__/` directory.
- All database-dependent tests MUST use isolated test transactions that roll back after each test. Tests MUST NOT share mutable state.
- Acceptance criteria from the specification MUST map to at least one automated test. Test names MUST reference the FR or AC identifier they verify (e.g., `test("FR-001: creates account with required fields")`).
- Mock external services (AI APIs, email, S3) at the integration boundary. MUST NOT mock internal modules in unit tests.

### V. Security Posture

- Authentication MUST use JWT with 15-minute access tokens and 7-day refresh tokens. Passwords MUST be hashed with bcrypt at cost factor 12.
- RBAC MUST be enforced at both the application layer and the database layer via PostgreSQL RLS. Every API endpoint MUST verify the caller's role before executing.
- All data queries MUST include tenant_id filtering. Cross-tenant data access MUST NOT be possible.
- Input validation MUST occur on every API endpoint. Parameterized queries MUST be used for all database operations. SQL injection vectors MUST NOT exist.
- Sensitive data (API keys, tokens, passwords) MUST NOT appear in source code, logs, or error messages. Environment variables MUST be used for secrets.
- All HTTP traffic MUST use TLS 1.3. Data at rest MUST be encrypted with AES-256.

### VI. Error Handling and Observability

- All API errors MUST return structured JSON with fields: `error`, `message`, `code`, and `requestId`. Stack traces MUST NOT be exposed in production responses.
- All business operations MUST log structured events with correlation IDs. Logs MUST include: timestamp, level, service, operation, userId, tenantId, and duration.
- Failed operations MUST be retried with exponential backoff (max 3 retries) for transient errors (network, 5xx). Non-retryable errors MUST fail immediately with a descriptive message.
- All write operations spanning multiple tables MUST use database transactions. Partial writes MUST NOT be committed.
- External service failures (AI, email, Shopify) MUST degrade gracefully. The core application MUST NOT crash or block when an external dependency is unavailable.

### VII. Data Integrity and Compliance

- All create, update, and delete operations on Account, Order, Commission, and User entities MUST write immutable audit trail records with: actor, timestamp, entity, field, old value, new value.
- FSMA 204 traceability data (lot numbers, batch IDs, origin, dates) MUST be captured at order entry and MUST be retained for a minimum of 2 years.
- Email sending MUST comply with CAN-SPAM (unsubscribe link, physical address) and CCPA (right to access, right to delete). Opt-out status MUST be checked before every send.
- Commission calculations MUST produce deterministic results. Given the same inputs, the same commission amount MUST be calculated every time. Every calculation MUST be logged with the rule applied, rate used, and resulting amount.

## Performance Standards

- API endpoints MUST respond within 200ms at the 95th percentile under 100 concurrent users.
- Full-text search MUST return results within 200ms at the 95th percentile.
- Database queries MUST execute within 50ms at the 95th percentile.
- First Contentful Paint MUST occur within 2 seconds on a simulated 4G connection.
- AI-powered features MUST return results within 3 seconds at the 95th percentile.
- The system MUST maintain 99.5% monthly uptime.

## Governance

- This constitution supersedes all other development practices. If a code review reveals a constitutional violation, the violation MUST be resolved before merge.
- Amendments to this constitution MUST be documented with rationale, approved by the project lead, and reflected in CLAUDE.md.
- Complexity additions (new dependencies, new services, new patterns) MUST be justified against constitutional principles. If a simpler approach satisfies the requirement, the simpler approach MUST be chosen.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
