# Tasks: Haversack Unified Platform

**Input**: Design documents from `/specs/001-haversack-unified-platform/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Setup and foundational tasks must complete before any user story work begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- All file paths are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Dockerized monorepo, CI pipeline, linting, and local development environment so all subsequent phases build on a consistent foundation.

- [ ] T001 [P] Initialize root workspace package.json with Turborepo config in turbo.json and base tsconfig.base.json with strict mode enabled
- [ ] T002 [P] Create Docker Compose development environment in docker/docker-compose.dev.yml with containers for PostgreSQL 16+, Redis 7+, frontend, backend, and worker
- [ ] T003 [P] Scaffold backend Fastify project with backend/package.json, backend/tsconfig.json, backend/Dockerfile, and backend/vitest.config.ts
- [ ] T004 [P] Scaffold frontend Next.js 14+ App Router project with frontend/package.json, frontend/tsconfig.json, frontend/Dockerfile, frontend/next.config.ts, and frontend/tailwind.config.ts
- [ ] T005 [P] Scaffold worker Bull processor project with worker/package.json, worker/tsconfig.json, worker/Dockerfile, and worker/vitest.config.ts
- [ ] T006 [P] Create shared packages workspace in packages/shared/src/ with initial Zod schemas in packages/shared/src/schemas/index.ts and types in packages/shared/src/types/index.ts
- [ ] T007 [P] Configure ESLint in .eslintrc.cjs enforcing no-any, explicit return types, named exports only, kebab-case files, and no circular dependencies
- [ ] T008 [P] Configure Prettier in .prettierrc with Husky pre-commit hooks and lint-staged
- [ ] T009 [P] Set up GitHub Actions CI pipeline in .github/workflows/ci.yml running lint, type-check, and test on every push
- [ ] T010 [P] Configure Playwright for end-to-end tests in frontend/playwright.config.ts and e2e/tests/ directory
- [ ] T011 [P] Create PWA manifest in frontend/public/manifest.json and service worker stub for offline support
- [ ] T012 Initialize Prisma 5+ with PostgreSQL connection in prisma/schema.prisma with initial empty schema and migration setup

**Checkpoint**: Infrastructure ready — Docker Compose starts all containers, CI pipeline passes, lint rules enforce constitutional standards, Prisma connects to PostgreSQL.

---

## Phase 2: Foundational Setup (Blocking Prerequisites)

**Purpose**: Implement the security and data foundation that all features depend on: JWT authentication, RBAC, complete Prisma schema, RLS policies, audit trail, and error handling.

- [ ] T013 Define complete Prisma schema for all 18 entities (Account, Contact, Territory, User, Activity, Order, OrderItem, Product, Brand, Commission, Opportunity, EmailRecord, EmailTemplate, LineCard, Organization, BusinessRule, Demo) in prisma/schema.prisma with relationships and indexes
- [ ] T014 Create RLS policy definitions for territory-scoped data isolation in prisma/rls-policies.sql and apply via migration script scripts/run-rls-policies.ts (NFR-008)
- [ ] T015 Create database seed data for development in prisma/seed.ts with sample users across all 5 roles, territories, brands, and accounts
- [ ] T016 [P] Implement JWT authentication service with 15-minute access tokens and 7-day refresh tokens in backend/src/auth/jwt.service.ts (NFR-007)
- [ ] T017 [P] Implement password hashing with bcrypt cost factor 12 in backend/src/auth/auth.service.ts (NFR-007)
- [ ] T018 Implement auth routes (login, refresh, logout) with Zod schema validation in backend/src/auth/auth.routes.ts and backend/src/auth/auth.schema.ts (NFR-007)
- [ ] T019 Implement rate limiting middleware at 10 requests/minute/IP on auth endpoints in backend/src/auth/rate-limit.middleware.ts (NFR-007)
- [ ] T020 Implement RBAC middleware enforcing 5 roles (Admin, Manager, Rep, Logistics, Viewer) in backend/src/auth/rbac.middleware.ts (NFR-008)
- [ ] T021 [P] Define shared role types and constants in packages/shared/src/types/roles.ts and packages/shared/src/constants/pipeline-stages.ts
- [ ] T022 [P] Implement structured JSON error handler returning { error, message, code, requestId } in backend/src/shared/middleware/error-handler.ts (NFR-013)
- [ ] T023 [P] Implement request ID correlation middleware in backend/src/shared/middleware/request-id.ts
- [ ] T024 [P] Configure Pino structured logging with correlation IDs in backend/src/shared/utils/logger.ts
- [ ] T025 Implement immutable audit trail middleware recording actor, timestamp, entity, field, old/new values in backend/src/shared/middleware/audit-trail.ts (NFR-014)
- [ ] T026 [P] Implement Prisma plugin with tenant_id filtering middleware in backend/src/shared/plugins/prisma.plugin.ts
- [ ] T027 [P] Implement Redis plugin for cache and session store in backend/src/shared/plugins/redis.plugin.ts
- [ ] T028 [P] Implement CORS plugin in backend/src/shared/plugins/cors.plugin.ts
- [ ] T029 Create Fastify app bootstrap wiring all plugins and middleware in backend/src/app.ts and backend/src/server.ts
- [ ] T030 [P] Implement Auth provider (React Context) and protected route wrapper in frontend/src/providers/auth-provider.tsx
- [ ] T031 [P] Implement login page with React Hook Form + Zod validation in frontend/src/app/(auth)/login/page.tsx
- [ ] T032 [P] Create API client with JWT token management in frontend/src/lib/api-client.ts
- [ ] T033 [P] Configure TanStack Query client and provider in frontend/src/lib/query-client.ts and frontend/src/providers/query-provider.tsx
- [ ] T034 [P] Implement app shell layout with sidebar, top bar, and mobile navigation in frontend/src/components/layout/app-shell.tsx, frontend/src/components/layout/sidebar.tsx, frontend/src/components/layout/top-bar.tsx, frontend/src/components/layout/mobile-nav.tsx
- [ ] T035 [P] Implement shared UI components: skeleton loader, empty state, notification bell in frontend/src/components/shared/skeleton-loader.tsx, frontend/src/components/shared/empty-state.tsx, frontend/src/components/shared/notification-bell.tsx
- [ ] T036 Write integration tests for auth flows in backend/src/auth/auth.service.test.ts verifying NFR-007 JWT tokens, bcrypt hashing, and rate limiting
- [ ] T037 Write integration tests for RBAC in backend/src/auth/rbac.middleware.test.ts verifying NFR-008 role enforcement and territory isolation

**Checkpoint**: Foundation ready — authentication works end-to-end, RBAC enforces all 5 roles, all 18 entity tables exist with RLS policies, audit trail captures mutations, structured errors and logging operational. User story implementation can now begin.

---

## Phase 3: User Story 1 - Account Creation with Duplicate Detection (Priority: P1)

**Goal**: A territory representative creates a new account from mobile with duplicate detection, field validation, and audit trail logging.

**Independent Test**: Create accounts in staging; verify persistence with required fields, validation error on blank fields, and duplicate warning for Levenshtein distance <= 3 matches.

- [ ] T038 [P] [US1] Define Account Zod schemas (create, update, response) in packages/shared/src/schemas/account.schema.ts and backend/src/domains/accounts/account.schema.ts (FR-001, FR-002)
- [ ] T039 [US1] Implement Account service with create and validation logic in backend/src/domains/accounts/account.service.ts (FR-001, FR-002)
- [ ] T040 [US1] Implement fuzzy duplicate detection using Levenshtein distance on name, phone, and address in backend/src/domains/accounts/duplicate-detection.service.ts (FR-003)
- [ ] T041 [US1] Implement fuzzy match utility with Levenshtein distance calculation in backend/src/shared/utils/fuzzy-match.ts (FR-003)
- [ ] T042 [US1] Implement Account routes (POST /accounts, GET /accounts/:id) with Zod validation and RBAC in backend/src/domains/accounts/account.routes.ts (FR-001, FR-002)
- [ ] T043 [P] [US1] Create account form with React Hook Form + Zod validation in frontend/src/components/forms/account-form.tsx (FR-001, FR-002)
- [ ] T044 [P] [US1] Create duplicate warning component displaying match confidence percentages in frontend/src/components/accounts/duplicate-warning.tsx (FR-003)
- [ ] T045 [US1] Create new account page wiring form, duplicate check, and save confirmation in frontend/src/app/(dashboard)/accounts/new/page.tsx (FR-001, FR-003)
- [ ] T046 [P] [US1] Implement useAccounts TanStack Query hook for account CRUD operations in frontend/src/hooks/use-accounts.ts (FR-001)
- [ ] T047 [US1] Write service tests for account creation and duplicate detection in backend/src/domains/accounts/account.service.test.ts verifying FR-001, FR-002, FR-003
- [ ] T048 [US1] Write route integration tests in backend/src/domains/accounts/account.routes.test.ts verifying FR-001 persistence within 3 seconds, FR-002 validation errors, FR-003 duplicate warning with confidence

**Checkpoint**: User Story 1 complete — accounts can be created with validation, duplicate detection warns on near-matches, audit trail logs duplicate overrides.

---

## Phase 4: User Story 2 - Account Detail and Parent-Child Hierarchy (Priority: P1)

**Goal**: A territory representative views everything about an account on one screen: contacts, timeline, orders, opportunities, health score, and parent-child roll-ups.

**Independent Test**: Load an account with parent, 5 children, 25 activities, 12 orders; verify all sections render within 2 seconds and roll-up metrics match sum of child values.

- [ ] T049 [US2] Implement Account detail endpoint returning unified view (contacts, activities, orders, opportunities, health score, notes) in backend/src/domains/accounts/account.service.ts (FR-004)
- [ ] T050 [US2] Implement parent-child hierarchy service with aggregated roll-up metrics (order count, total revenue, last activity date) in backend/src/domains/accounts/account.service.ts (FR-005)
- [ ] T051 [US2] Implement Account health score calculation (0-100) with weighted factors in backend/src/domains/accounts/health-score.service.ts (FR-006)
- [ ] T052 [US2] Create nightly health score recalculation Bull job running at 02:00 UTC in worker/src/jobs/health-score-recalc.job.ts (FR-006)
- [ ] T053 [P] [US2] Create account detail component displaying all sections with loading states in frontend/src/components/accounts/account-detail.tsx (FR-004)
- [ ] T054 [P] [US2] Create health badge component showing score with color coding and "calculating..." state for new accounts in frontend/src/components/accounts/health-badge.tsx (FR-006)
- [ ] T055 [US2] Create account detail page wiring unified view, parent-child hierarchy, and empty states in frontend/src/app/(dashboard)/accounts/[id]/page.tsx (FR-004, FR-005)
- [ ] T056 [US2] Write tests for health score calculation and parent-child roll-ups in backend/src/domains/accounts/health-score.service.test.ts verifying FR-005 aggregation and FR-006 weighted formula

**Checkpoint**: User Story 2 complete — account detail page renders unified view within 2 seconds, parent-child roll-ups are accurate, health scores calculate nightly.

---

## Phase 5: User Story 3 - Account Search and Discovery (Priority: P1)

**Goal**: A representative types a partial query and matching results appear ranked by relevance within 200ms.

**Independent Test**: With 50,000 accounts, run search queries and verify p95 response time under 200ms.

- [ ] T057 [US3] Create pg_trgm GIN index migration for full-text search across account name, contact name, phone, email, city, and territory in prisma/migrations/ (FR-007, NFR-003)
- [ ] T058 [US3] Implement search service with relevance ranking using pg_trgm in backend/src/domains/accounts/account.service.ts (FR-007)
- [ ] T059 [US3] Implement search route (GET /accounts/search) with 300ms debounce validation and min 3 character requirement in backend/src/domains/accounts/account.routes.ts (FR-007)
- [ ] T060 [P] [US3] Create global search bar component with keyboard navigation and 300ms debounce in frontend/src/components/shared/global-search.tsx (FR-007)
- [ ] T061 [P] [US3] Implement useSearch TanStack Query hook with debounce in frontend/src/hooks/use-search.ts (FR-007)
- [ ] T062 [US3] Write search performance tests verifying p95 under 200ms in backend/src/domains/accounts/account.routes.test.ts for FR-007

**Checkpoint**: User Story 3 complete — full-text search returns relevance-ranked results within 200ms, empty state shows "No accounts found" with suggestions.

---

## Phase 6: User Story 4 - Quick Activity Logging with Email Tracking (Priority: P1)

**Goal**: A Rep records an activity in under 60 seconds with pre-populated fields. Emails are auto-linked and engagement tracked.

**Independent Test**: Time the quick-log flow — form open to confirmation under 60 seconds. Send email, verify tracking events on timeline.

- [ ] T063 [P] [US4] Define Activity and EmailRecord Zod schemas in backend/src/domains/activities/activity.schema.ts (FR-008, FR-009)
- [ ] T064 [US4] Implement Activity service with quick-log creation and type templates (visit, call, email, demo, sampling) in backend/src/domains/activities/activity.service.ts (FR-008)
- [ ] T065 [US4] Implement Activity routes (POST /activities, GET /accounts/:id/activities) with infinite scroll pagination (20 items/page) in backend/src/domains/activities/activity.routes.ts (FR-008, FR-009)
- [ ] T066 [US4] Implement email tracking service for auto-linking emails to Contact/Account and tracking open/click/bounce events in backend/src/domains/activities/email-tracking.service.ts (FR-010)
- [ ] T067 [US4] Implement email tracking Bull job for processing engagement events within 60 seconds in worker/src/jobs/email-tracking.job.ts (FR-010)
- [ ] T068 [US4] Implement unmatched email queue endpoint visible to Rep and Manager roles in backend/src/domains/activities/activity.routes.ts (FR-011)
- [ ] T069 [P] [US4] Create quick-log activity form with pre-populated fields and type-specific templates in frontend/src/components/forms/activity-form.tsx (FR-008)
- [ ] T070 [P] [US4] Implement useActivities TanStack Query hook for activity CRUD and timeline in frontend/src/hooks/use-activities.ts (FR-009)
- [ ] T071 [US4] Create activity timeline component on account detail with reverse chronological infinite scroll in frontend/src/app/(dashboard)/activities/page.tsx (FR-009)
- [ ] T072 [US4] Write tests for activity creation, timeline pagination, and email tracking in backend/src/domains/activities/activity.service.test.ts verifying FR-008, FR-009, FR-010, FR-011

**Checkpoint**: User Story 4 complete — quick-log works in under 60 seconds, timeline displays with infinite scroll, email tracking events appear within 60 seconds, unmatched emails queue correctly.

---

## Phase 7: User Story 5 - Task Management with Reminders (Priority: P1)

**Goal**: A Rep creates tasks with due dates, priorities, and links. Automatic reminders fire at 24h and 1h before due date. Overdue tasks show red indicators.

**Independent Test**: Create task due in 25 hours; verify notification at 24h mark. Let it pass due date; verify red indicator.

- [ ] T073 [P] [US5] Define Task Zod schemas in backend/src/domains/tasks/task.schema.ts (FR-012)
- [ ] T074 [US5] Implement Task service with CRUD, priority levels (High/Medium/Low), and Account/Contact/Opportunity association in backend/src/domains/tasks/task.service.ts (FR-012)
- [ ] T075 [US5] Implement Task routes (POST/GET/PUT /tasks) with overdue sorting and filtering in backend/src/domains/tasks/task.routes.ts (FR-012)
- [ ] T076 [US5] Implement task reminder Bull job sending in-app and email notifications at 24h and 1h before due date in worker/src/jobs/task-reminder.job.ts (FR-012)
- [ ] T077 [P] [US5] Create task form with due date, priority, assignee, and entity association in frontend/src/components/forms/task-form.tsx (FR-012)
- [ ] T078 [US5] Create task dashboard page with overdue tasks at top (red indicators) sorted by due date in frontend/src/app/(dashboard)/tasks/page.tsx (FR-012)
- [ ] T079 [P] [US5] Implement notification provider for in-app notifications in frontend/src/providers/notification-provider.tsx (FR-012)
- [ ] T080 [US5] Write tests for task reminders and overdue detection in backend/src/domains/tasks/task.service.test.ts verifying FR-012

**Checkpoint**: User Story 5 complete — tasks created with reminders, notifications fire at correct times, overdue tasks surface with red indicators.

---

## Phase 8: User Story 6 - Order Entry with Multi-Vendor Splitting (Priority: P1)

**Goal**: A Rep builds a multi-line order mixing broker and wholesale items, system splits by vendor, orders >= $5,000 require manager approval.

**Independent Test**: Enter 10-line order across 3 brands with mixed revenue models; verify vendor sub-orders. Enter $5,200 order; verify Pending Approval status.

- [ ] T081 [P] [US6] Define Order and OrderItem Zod schemas in packages/shared/src/schemas/order.schema.ts and backend/src/domains/orders/order.schema.ts (FR-013)
- [ ] T082 [US6] Implement Order service with line item management and revenue model defaulting in backend/src/domains/orders/order.service.ts (FR-013)
- [ ] T083 [US6] Implement vendor auto-split service creating per-vendor sub-orders in backend/src/domains/orders/vendor-split.service.ts (FR-014)
- [ ] T084 [US6] Implement product search within order entry (name, SKU, brand, category) returning availability and pricing within 200ms in backend/src/domains/products/product.service.ts (FR-015)
- [ ] T085 [US6] Implement promotional pricing logic applying active promo price as default during promo window in backend/src/domains/orders/order.service.ts (FR-016)
- [ ] T086 [US6] Implement order approval service with $5,000 threshold, manager notification within 30 seconds, and rejection audit trail in backend/src/domains/orders/approval.service.ts (FR-017)
- [ ] T087 [US6] Implement Order routes (POST/GET/PUT /orders) with status state machine (Draft, Pending, Pending Approval, Confirmed, Rejected, Exported) in backend/src/domains/orders/order.routes.ts (FR-013, FR-017)
- [ ] T088 [P] [US6] Create product search component displaying availability (green/yellow/red), price, and promo pricing in frontend/src/components/orders/product-search.tsx (FR-015)
- [ ] T089 [P] [US6] Create order line item component with quantity, price, and revenue model selection in frontend/src/components/orders/order-line-item.tsx (FR-013)
- [ ] T090 [P] [US6] Create approval badge component showing order status in frontend/src/components/orders/approval-badge.tsx (FR-017)
- [ ] T091 [US6] Create order entry form with inline product search and multi-line items in frontend/src/components/forms/order-form.tsx (FR-013, FR-015)
- [ ] T092 [US6] Create new order page in frontend/src/app/(dashboard)/orders/new/page.tsx (FR-013)
- [ ] T093 [US6] Create order detail page showing line items, status, vendor sub-orders, and approval history in frontend/src/app/(dashboard)/orders/[id]/page.tsx (FR-014, FR-017)
- [ ] T094 [P] [US6] Implement useOrders TanStack Query hook for order operations in frontend/src/hooks/use-orders.ts (FR-013)
- [ ] T095 [US6] Write tests for vendor split, promotional pricing, and approval workflow in backend/src/domains/orders/order.service.test.ts verifying FR-013, FR-014, FR-015, FR-016, FR-017

**Checkpoint**: User Story 6 complete — orders created with multi-vendor split, promotional pricing applied, $5,000+ orders require approval, rejections logged in audit trail.

---

## Phase 9: User Story 12 - Data Import and User Management (Priority: P1)

**Goal**: Admin uploads CSV/XLSX files with validation preview, manages users with role assignment, and views data quality scorecard.

**Independent Test**: Upload 200-row CSV with 5 invalid rows; verify preview shows 195 valid, 5 errors. Import valid rows, verify 195 created.

- [ ] T096 [P] [US12] Define Import and User Zod schemas in backend/src/domains/imports/import.schema.ts and backend/src/domains/users/user.schema.ts (FR-031, FR-029)
- [ ] T097 [US12] Implement user management service with create, edit, deactivate, and role assignment across 5 roles in backend/src/domains/users/user.service.ts (FR-029)
- [ ] T098 [US12] Implement user routes (POST/GET/PUT /admin/users) with Admin-only RBAC in backend/src/domains/users/user.routes.ts (FR-029)
- [ ] T099 [US12] Implement session invalidation for deactivated users within 15 seconds in backend/src/auth/auth.service.ts (FR-030)
- [ ] T100 [US12] Implement CSV/XLSX import service with canonical field validation and pre-import preview in backend/src/domains/imports/import.service.ts (FR-031)
- [ ] T101 [US12] Implement 50 MB file size limit check with descriptive error in backend/src/domains/imports/import.routes.ts (FR-032)
- [ ] T102 [US12] Implement import processor Bull job for large file processing in worker/src/jobs/import-processor.job.ts (FR-031)
- [ ] T103 [US12] Implement data quality scorecard service measuring field completeness, email validity, image coverage, duplicate count, and stale accounts in backend/src/domains/imports/import.service.ts (FR-033)
- [ ] T104 [US12] Implement nightly data quality scorecard recalculation Bull job in worker/src/jobs/data-quality-scorecard.job.ts (FR-033)
- [ ] T105 [P] [US12] Create user management admin page with role assignment in frontend/src/app/(dashboard)/admin/users/page.tsx (FR-029)
- [ ] T106 [P] [US12] Create CSV/XLSX import page with upload, preview, and import buttons in frontend/src/app/(dashboard)/admin/imports/page.tsx (FR-031, FR-032)
- [ ] T107 [P] [US12] Create data quality scorecard dashboard in frontend/src/app/(dashboard)/admin/data-quality/page.tsx (FR-033)
- [ ] T108 [US12] Write tests for import validation, user management, and session invalidation in backend/src/domains/imports/import.service.test.ts and backend/src/domains/users/user.service.test.ts verifying FR-029, FR-030, FR-031, FR-032, FR-033

**Checkpoint**: User Story 12 complete — CSV/XLSX import works with validation preview, user management operational with role-based permissions, data quality scorecard recalculates nightly.

---

## Phase 10: User Story 7 - AI Reorder Suggestions (Priority: P2)

**Goal**: A Rep visiting a repeat account sees AI-generated reorder suggestions based on order history, modifiable and submittable as new orders.

**Independent Test**: Seed account with 8 orders; verify Suggested Reorder card within 3 seconds. Simulate AI outage; verify no stale content.

- [ ] T109 [US7] Implement AI provider abstraction layer with Anthropic Claude primary and timeout handling in backend/src/domains/ai/provider-abstraction.ts (FR-035, FR-036)
- [ ] T110 [US7] Implement AI reorder suggestion service analyzing 6+ orders in 12 months in backend/src/domains/ai/ai.service.ts (FR-018)
- [ ] T111 [US7] Implement AI routes (GET /accounts/:id/reorder-suggestion) with 5-second timeout and graceful degradation in backend/src/domains/ai/ai.routes.ts and backend/src/domains/ai/ai.schema.ts (FR-018, FR-036)
- [ ] T112 [P] [US7] Create AI label component for marking AI-generated content in frontend/src/components/shared/ai-label.tsx (FR-035)
- [ ] T113 [US7] Create reorder suggestion card component showing products, quantities, and estimated total with edit capability in frontend/src/app/(dashboard)/accounts/[id]/page.tsx (FR-018)
- [ ] T114 [US7] Write tests for reorder suggestions with mocked AI boundary in backend/src/domains/ai/ai.service.test.ts verifying FR-018 (6+ orders), FR-035 (AI labeling), FR-036 (outage handling)

**Checkpoint**: User Story 7 complete — AI reorder suggestions appear for eligible accounts within 3 seconds, graceful degradation on AI outage.

---

## Phase 11: User Story 8 - Product Catalog and Brand Line Cards (Priority: P2)

**Goal**: Admin maintains product catalog with certifications and allergens. Reps filter by certification. Managers generate and share brand line card PDFs.

**Independent Test**: Create product with Organic + Non-GMO; filter by Organic + Honey. Generate line card PDF; verify content.

- [ ] T115 [P] [US8] Define Product Zod schemas with certifications, allergens (Big 9), and dietary attributes in packages/shared/src/schemas/product.schema.ts and backend/src/domains/products/product.schema.ts (FR-019)
- [ ] T116 [US8] Implement Product catalog service with CRUD, certification filtering, and category search in backend/src/domains/products/product.service.ts (FR-019)
- [ ] T117 [US8] Implement Product routes (POST/GET/PUT /products) with filtering by certification AND category in backend/src/domains/products/product.routes.ts (FR-019)
- [ ] T118 [US8] Implement line card PDF generation service using PDFKit with product images, descriptions, pricing, and certifications in backend/src/domains/products/line-card.service.ts (FR-020)
- [ ] T119 [US8] Implement line card email sharing route with PDF attachment and pre-populated contact email in backend/src/domains/products/product.routes.ts (FR-020)
- [ ] T120 [P] [US8] Create product catalog page with certification and category filters in frontend/src/app/(dashboard)/products/page.tsx (FR-019)
- [ ] T121 [P] [US8] Create product detail page with certifications, allergens, and availability in frontend/src/app/(dashboard)/products/[id]/page.tsx (FR-019)
- [ ] T122 [US8] Write tests for product filtering and line card generation in backend/src/domains/products/product.service.test.ts verifying FR-019 and FR-020

**Checkpoint**: User Story 8 complete — product catalog searchable by certification/category, line card PDFs generated within 10 seconds and shareable via email.

---

## Phase 12: User Story 9 - Pipeline and Opportunity Management (Priority: P2)

**Goal**: Reps create Opportunities with pipeline stages. Managers view kanban board with weighted forecast. Drag-and-drop transitions log to timeline.

**Independent Test**: Create 15 opportunities across 4 stages; verify weighted forecast. Drag card between stages; verify updates.

- [ ] T123 [P] [US9] Define Opportunity Zod schemas in backend/src/domains/opportunities/opportunity.schema.ts (FR-021)
- [ ] T124 [US9] Implement Opportunity service with stage-based probability auto-population and close-reason handling in backend/src/domains/opportunities/opportunity.service.ts (FR-021)
- [ ] T125 [US9] Implement Opportunity routes (POST/GET/PUT /opportunities) with stage transitions and account timeline logging in backend/src/domains/opportunities/opportunity.routes.ts (FR-021, FR-022)
- [ ] T126 [P] [US9] Create kanban board component with drag-and-drop and weighted forecast summary in frontend/src/components/pipeline/kanban-board.tsx (FR-022)
- [ ] T127 [P] [US9] Create opportunity card component for kanban display in frontend/src/components/pipeline/opportunity-card.tsx (FR-022)
- [ ] T128 [P] [US9] Create opportunity form with stage, value, close date, and brand association in frontend/src/components/forms/opportunity-form.tsx (FR-021)
- [ ] T129 [US9] Create pipeline page wiring kanban board and forecast in frontend/src/app/(dashboard)/pipeline/page.tsx (FR-022)
- [ ] T130 [US9] Write tests for opportunity stage transitions and weighted forecast calculation in backend/src/domains/opportunities/opportunity.service.test.ts verifying FR-021 and FR-022

**Checkpoint**: User Story 9 complete — opportunities managed through pipeline stages, kanban drag-and-drop updates probability and forecast, transitions logged to account timeline.

---

## Phase 13: User Story 10 - Commission Calculation and Statements (Priority: P2)

**Goal**: Reps review monthly commission statements. Managers approve statements. Admins export to accounting. Rate changes apply prospectively.

**Independent Test**: Configure 10% base + tier 2 at +1%; confirm $12,000 line item commission of $1,320. Change rate effective next month; verify existing items use old rate.

- [ ] T131 [P] [US10] Define Commission Zod schemas in backend/src/domains/commissions/commission.schema.ts (FR-023)
- [ ] T132 [US10] Implement commission calculation engine with base rate per brand (8-15%), territory modifier (0.80-1.20x), and volume tier thresholds in backend/src/domains/commissions/commission-engine.ts (FR-023)
- [ ] T133 [US10] Implement rate effective date enforcement applying the rate on order confirmation date in backend/src/domains/commissions/commission.service.ts (FR-023)
- [ ] T134 [US10] Implement monthly commission statement generation with per-order breakdown in backend/src/domains/commissions/statement.service.ts (FR-024)
- [ ] T135 [US10] Implement commission Bull job for nightly calculation in worker/src/jobs/commission-calc.job.ts (FR-023)
- [ ] T136 [US10] Implement commission statement generation Bull job in worker/src/jobs/commission-statement.job.ts (FR-024)
- [ ] T137 [US10] Implement commission routes with statement approval workflow and accounting export in backend/src/domains/commissions/commission.routes.ts (FR-024, FR-025)
- [ ] T138 [US10] Implement accounting export in compatible format (Rep name, pay period, total, line-item detail) in backend/src/domains/commissions/commission.service.ts using ExcelJS in worker/src/jobs/order-export.job.ts (FR-025)
- [ ] T139 [US10] Create commission statements page with per-order breakdown and approval status in frontend/src/app/(dashboard)/commissions/page.tsx (FR-024)
- [ ] T140 [US10] Write tests for commission engine determinism and rate effective date enforcement in backend/src/domains/commissions/commission-engine.test.ts verifying FR-023, FR-024, FR-025

**Checkpoint**: User Story 10 complete — commissions calculated deterministically, statements generated with per-order breakdown, manager approval workflow operational, accounting export functional.

---

## Phase 14: User Story 11 - Dashboards (Priority: P2)

**Goal**: Rep sees personal KPI dashboard. Manager sees team aggregate dashboard. Custom reports exported to CSV/XLSX.

**Independent Test**: With seeded data verify each KPI matches direct queries. Click critical count; verify filtered list. Export custom report.

- [ ] T141 [US11] Implement Rep dashboard service aggregating current-month revenue, trailing-12-month, activities, pipeline, commission, and health distribution in backend/src/domains/dashboards/rep-dashboard.service.ts (FR-026)
- [ ] T142 [US11] Implement Manager team dashboard service with aggregate revenue, rep rankings, territory density, and pipeline forecast in backend/src/domains/dashboards/manager-dashboard.service.ts (FR-027)
- [ ] T143 [US11] Implement dashboard routes (GET /dashboards/rep, GET /dashboards/manager) loading within 3 seconds in backend/src/domains/dashboards/dashboard.routes.ts (FR-026, FR-027)
- [ ] T144 [US11] Implement custom report builder service with entity selection, filter application, column chooser, and CSV/XLSX export within 10 seconds in backend/src/domains/dashboards/dashboard.routes.ts (FR-028)
- [ ] T145 [P] [US11] Create Rep KPI dashboard component with health distribution and critical count navigation in frontend/src/components/dashboards/rep-kpi-dashboard.tsx (FR-026)
- [ ] T146 [P] [US11] Create Manager team dashboard component with rep rankings, revenue charts, and territory heat map in frontend/src/components/dashboards/manager-team-dashboard.tsx (FR-027)
- [ ] T147 [US11] Create dashboard page routing to Rep or Manager view based on role in frontend/src/app/(dashboard)/page.tsx (FR-026, FR-027)
- [ ] T148 [US11] Create custom reports page with entity/filter/column builder and export buttons in frontend/src/app/(dashboard)/reports/page.tsx (FR-028)
- [ ] T149 [P] [US11] Implement data table component for report display in frontend/src/components/shared/data-table.tsx (FR-028)
- [ ] T150 [US11] Write tests for dashboard aggregation accuracy and export in backend/src/domains/dashboards/rep-dashboard.service.test.ts verifying FR-026, FR-027, FR-028

**Checkpoint**: User Story 11 complete — Rep and Manager dashboards load within 3 seconds, KPIs match direct queries, custom reports export to CSV/XLSX within 10 seconds.

---

## Phase 15: User Story 13 - Business Rule Automation (Priority: P2)

**Goal**: Admin defines IF/THEN rules with AND/OR conditions, supporting notify/update/create task/send email actions, executing within 30 seconds.

**Independent Test**: Create rule for health score < 30; trigger it; verify task created within 30 seconds. Save rule with bad field; verify rejection.

- [ ] T151 [P] [US13] Define BusinessRule Zod schemas with condition and action validation in backend/src/domains/business-rules/rule.schema.ts (FR-034)
- [ ] T152 [US13] Implement business rule engine evaluating IF/THEN conditions with AND/OR operators on entity fields in backend/src/domains/business-rules/rule-engine.ts (FR-034)
- [ ] T153 [US13] Implement rule service with CRUD, field reference validation rejecting non-existent fields, and priority ordering in backend/src/domains/business-rules/rule.service.ts (FR-034)
- [ ] T154 [US13] Implement rule routes (POST/GET/PUT /admin/rules) with Admin-only RBAC in backend/src/domains/business-rules/rule.routes.ts (FR-034)
- [ ] T155 [US13] Implement rule engine Bull job executing rules within 30 seconds asynchronously without blocking user sessions in worker/src/jobs/rule-engine.job.ts (FR-034)
- [ ] T156 [US13] Create admin rule builder page with condition/action configuration in frontend/src/app/(dashboard)/admin/rules/page.tsx (FR-034)
- [ ] T157 [US13] Write tests for rule engine condition evaluation, invalid field rejection, and 30-second execution in backend/src/domains/business-rules/rule-engine.test.ts verifying FR-034

**Checkpoint**: User Story 13 complete — business rules execute within 30 seconds, invalid field references rejected, rules process asynchronously.

---

## Phase 16: User Story 14 - AI Meeting Briefs and Summaries (Priority: P3)

**Goal**: Rep gets AI meeting brief with contacts, activity summary, order trends, and talking points within 3 seconds. AI outage handled gracefully.

**Independent Test**: Seed account with 15 activities and 8 orders; click Prepare Meeting Brief; verify labeled output within 3 seconds. Simulate outage; verify error.

- [ ] T158 [US14] Implement AI meeting brief service generating structured briefs from account data in backend/src/domains/ai/ai.service.ts (FR-035)
- [ ] T159 [US14] Implement AI email draft and activity summary service in backend/src/domains/ai/ai.service.ts (FR-035)
- [ ] T160 [US14] Implement AI meeting brief route (GET /accounts/:id/meeting-brief) with 5-second timeout and 10-second hard cutoff in backend/src/domains/ai/ai.routes.ts (FR-035, FR-036)
- [ ] T161 [US14] Create meeting brief component with AI-Generated label and editable content on account detail page in frontend/src/app/(dashboard)/accounts/[id]/page.tsx (FR-035)
- [ ] T162 [US14] Write tests for meeting brief generation and AI outage handling in backend/src/domains/ai/ai.service.test.ts verifying FR-035 (labeling, 3-second response) and FR-036 (unavailable message, no stale content)

**Checkpoint**: User Story 14 complete — AI meeting briefs generated within 3 seconds, labeled as AI-Generated and editable, graceful degradation on AI service outage.

---

## Phase 17: Polish and Cross-Cutting Concerns

**Purpose**: Comprehensive quality assurance, performance optimization, accessibility compliance, security audit, and launch readiness.

- [ ] T163 [P] Optimize database queries with pg_stat_statements analysis and index tuning in prisma/schema.prisma (NFR-001, NFR-004)
- [ ] T164 [P] Configure TanStack Query cache policies and stale-while-revalidate strategies in frontend/src/lib/query-client.ts (NFR-001)
- [ ] T165 [P] Optimize Next.js bundle with code splitting and lazy loading in frontend/next.config.ts (NFR-002)
- [ ] T166 Run k6 load tests at 100 concurrent users confirming API p95 under 200ms in e2e/tests/ (NFR-001)
- [ ] T167 Run Lighthouse CI confirming First Contentful Paint under 2s on simulated 4G (NFR-002)
- [ ] T168 [P] Conduct WCAG 2.1 Level AA audit: contrast ratios (4.5:1 normal, 3:1 large), keyboard navigation, ARIA labels, 44x44px touch targets in frontend/src/ (NFR-011, NFR-012)
- [ ] T169 Run OWASP Top 10 security assessment with zero critical/high findings target (NFR-009)
- [ ] T170 [P] Verify TLS 1.3 for all traffic and AES-256 at rest in docker/docker-compose.yml and docker/nginx/nginx.conf (NFR-009)
- [ ] T171 Execute data migration rehearsal from FileMaker through import pipeline in e2e/tests/ (FR-031)
- [ ] T172 [P] Configure Sentry error monitoring and PostHog analytics integration in backend/src/app.ts and frontend/src/app/layout.tsx
- [ ] T173 [P] Configure uptime monitoring for 99.5% monthly target (NFR-006)
- [ ] T174 [P] Verify CAN-SPAM, CCPA, and FSMA 204 compliance in backend/src/domains/activities/email-tracking.service.ts (NFR-010)
- [ ] T175 Create production Docker Compose configuration with resource limits in docker/docker-compose.yml
- [ ] T176 Write end-to-end Playwright regression suite covering all 14 user stories in e2e/tests/account-crud.spec.ts, e2e/tests/order-entry.spec.ts, e2e/tests/search.spec.ts, e2e/tests/auth.spec.ts, e2e/tests/commission.spec.ts
- [ ] T177 Create development seed script for demo environment in scripts/seed-dev.ts

**Checkpoint**: Platform launch-ready — all NFRs verified, security audit passed, accessibility compliant, data migration rehearsed, monitoring operational.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3-16)**: All depend on Phase 2 completion
  - P1 stories (Phases 3-9) should complete before P2 stories (Phases 10-15)
  - P2 stories should complete before P3 stories (Phase 16)
  - Within same priority, stories can proceed in parallel if staffed
- **Polish (Phase 17)**: Depends on all user story phases being complete

### User Story Dependencies

- **US1 (Phase 3)**: After Phase 2 — no other story dependencies
- **US2 (Phase 4)**: After Phase 2 — uses Account from US1 but independently testable
- **US3 (Phase 5)**: After Phase 2 — uses Account from US1 but independently testable
- **US4 (Phase 6)**: After Phase 2 — uses Account from US1 but independently testable
- **US5 (Phase 7)**: After Phase 2 — independently testable
- **US6 (Phase 8)**: After Phase 2 — uses Account from US1, Product entities but independently testable
- **US12 (Phase 9)**: After Phase 2 — admin tools independently testable
- **US7 (Phase 10)**: After Phase 2 + Phase 8 (needs order history data) — uses AI abstraction
- **US8 (Phase 11)**: After Phase 2 — Product catalog independently testable
- **US9 (Phase 12)**: After Phase 2 — uses Account from US1 but independently testable
- **US10 (Phase 13)**: After Phase 2 + Phase 8 (needs confirmed orders) — commission depends on orders
- **US11 (Phase 14)**: After Phase 2 — aggregates data from other stories but independently testable with seed data
- **US13 (Phase 15)**: After Phase 2 — rule engine independently testable
- **US14 (Phase 16)**: After Phase 10 (reuses AI abstraction layer) — independently testable

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel within Phase 2
- US1, US2, US3, US4, US5 can start in parallel once Phase 2 completes
- US6 and US12 can run in parallel with the above
- Frontend and backend tasks within each story marked [P] can run in parallel
