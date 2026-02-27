# Feature Specification: Polish & NFRs

**Feature Branch**: `013-polish-nfrs`
**Created**: 2026-02-27
**Status**: Draft
**Input**: NFR-001 through NFR-014 — performance, accessibility, mobile responsiveness, error handling, monitoring, code quality

## Scope

This feature hardens the existing application for production readiness. Many NFRs are already implemented in the backend (JWT auth, RBAC, RLS, audit trail, ACID transactions). This phase focuses on:

1. **Frontend test coverage** — currently 0%, target 80%
2. **Error handling UI** — error boundaries, loading skeletons, offline detection, retry patterns
3. **Accessibility (WCAG 2.1 AA)** — keyboard navigation, ARIA labels, contrast, semantic HTML
4. **Mobile responsiveness** — 320px breakpoint, 44px touch targets, responsive layouts
5. **Monitoring integration** — Sentry error tracking + PostHog analytics
6. **Performance verification** — API response benchmarks, FCP optimization, search latency

### Already Implemented (verified in Features 1-11)

- NFR-007: JWT auth (15m access, 7d refresh, bcrypt cost 12, rate limiting) ✓
- NFR-008: RBAC (5 roles) + PostgreSQL RLS policies ✓
- NFR-009: TLS/encryption (handled at infrastructure level) ✓
- NFR-010: FSMA 204 compliance (order traceability) ✓
- NFR-013: ACID transactions for multi-table writes ✓
- NFR-014: Immutable audit trail with full change tracking ✓
- NFR-005: AI timeout (5s per-provider, 10s hard cutoff, graceful fallback) ✓

## User Scenarios & Testing

### User Story 1 - Frontend Error Resilience (Priority: P1)

As a territory representative using the platform on a mobile device, I want the application to handle errors gracefully without full-page crashes, so that I can continue working even when individual components fail or my network is unstable.

**Why this priority**: Error resilience is the foundation for production use. A single unhandled error crashing the entire app is unacceptable for field reps.

**Independent Test**: Can be fully tested by triggering component errors, simulating network loss, and verifying the app remains usable. Delivers immediate production stability.

**Acceptance Scenarios**:

1. **Given** a React component throws an error during rendering, **When** the error propagates, **Then** the nearest error boundary catches it, displays a contextual error message with a retry action, and the rest of the application remains functional.
2. **Given** a network request fails with a 5xx error, **When** the response is received, **Then** the component displays an inline error message with the error reference ID and a "Retry" button, not a full-page error.
3. **Given** the user's device loses network connectivity, **When** the connection drops, **Then** a persistent banner appears at the top of the viewport reading "You are offline — some features may be unavailable" that auto-dismisses when connectivity restores.
4. **Given** data is being fetched for a dashboard or list view, **When** the fetch is in progress, **Then** the view displays animated skeleton placeholders matching the layout structure (not a spinner).
5. **Given** a long-running operation (report generation, data export) is in progress, **When** the user initiates the operation, **Then** a progress indicator is displayed with contextual messaging.

---

### User Story 2 - Accessibility Compliance (Priority: P1)

As a user who relies on keyboard navigation or screen readers, I want the application to be fully accessible per WCAG 2.1 Level AA, so that I can use all features without a mouse.

**Why this priority**: Accessibility is a legal and ethical requirement. WCAG 2.1 AA compliance is a hard gate for production.

**Independent Test**: Can be tested by navigating the entire application using only keyboard and verifying all interactive elements are operable, labeled, and have visible focus indicators.

**Acceptance Scenarios**:

1. **Given** any page in the application, **When** a user navigates using Tab/Shift+Tab, **Then** all interactive elements receive focus in a logical order with visible focus indicators (outline or ring).
2. **Given** a text element on any page, **When** the contrast ratio is measured, **Then** it meets or exceeds 4.5:1 for normal text and 3:1 for large text (18px+ or 14px+ bold).
3. **Given** a form input, button, or interactive element, **When** inspected by a screen reader, **Then** it has an appropriate ARIA label or visible text label.
4. **Given** a data table (accounts, orders, reports), **When** rendered, **Then** it uses semantic HTML (`<table>`, `<thead>`, `<th scope>`, `<tbody>`) with sortable column headers accessible via keyboard.
5. **Given** color-coded indicators (health scores, pipeline stages, status badges), **When** displayed, **Then** each has an accompanying text label or icon so color is never the sole conveyor of information.

---

### User Story 3 - Mobile Responsiveness (Priority: P1)

As a territory representative using my phone in the field, I want all pages to be fully usable on a 320px screen with appropriately sized touch targets, so that I can manage my accounts and log activities on mobile.

**Why this priority**: The platform is mobile-first. Field reps use their phones as the primary device.

**Independent Test**: Can be tested by loading every page at 320px, 375px, 768px viewports and verifying layouts are functional and touch targets are adequately sized.

**Acceptance Scenarios**:

1. **Given** any page in the application, **When** viewed at 320px viewport width, **Then** the layout is fully usable with no horizontal scrolling, no text truncation that hides critical data, and no overlapping elements.
2. **Given** any interactive element (button, link, form control), **When** measured, **Then** the touch target is at least 44x44 CSS pixels.
3. **Given** the sidebar navigation on a mobile device, **When** the viewport is less than 768px, **Then** the sidebar collapses to a hamburger menu or bottom navigation.
4. **Given** a data table on a mobile viewport, **When** the table has more columns than fit the screen, **Then** it either scrolls horizontally within its container or adapts to a stacked card layout.

---

### User Story 4 - Frontend Test Coverage (Priority: P2)

As a developer maintaining the platform, I want all frontend components, hooks, and utilities to have test coverage at 80%+ branches/functions/lines, so that regressions are caught before deployment.

**Why this priority**: Test coverage prevents regressions. The frontend currently has 0% coverage and needs comprehensive tests before production.

**Independent Test**: Can be verified by running `npm run test:coverage` on the frontend workspace and checking the coverage report meets thresholds.

**Acceptance Scenarios**:

1. **Given** the frontend workspace, **When** `npm run test:coverage` is executed, **Then** coverage meets 80% thresholds for branches, functions, lines, and statements.
2. **Given** each custom hook (use-dashboard, use-business-rules), **When** tested, **Then** all query/mutation behaviors are verified including loading states, error states, and successful data fetching.
3. **Given** each provider (auth-provider, query-provider), **When** tested, **Then** login/logout flows, token refresh, and provider composition are verified.
4. **Given** each UI component with business logic (dashboard, business rules), **When** tested, **Then** rendering, user interactions, and edge cases are verified.

---

### User Story 5 - Monitoring & Observability (Priority: P2)

As an operations team member, I want the application to report errors to Sentry and user analytics to PostHog, so that I can monitor application health and user behavior in production.

**Why this priority**: Monitoring is essential for production operations. Without it, errors and performance issues go undetected.

**Independent Test**: Can be verified by triggering errors and verifying Sentry captures them, and by navigating pages and verifying PostHog tracks events.

**Acceptance Scenarios**:

1. **Given** an unhandled error occurs in the frontend, **When** the error boundary catches it, **Then** the error is reported to Sentry with context (user role, current page, error stack).
2. **Given** an API endpoint returns a 5xx error, **When** the backend error handler processes it, **Then** the error is reported to Sentry with the request ID and correlation context.
3. **Given** a user navigates to a page, **When** the page loads, **Then** a page view event is sent to PostHog with the page path.
4. **Given** monitoring is configured, **When** the application starts, **Then** Sentry and PostHog initialize only if their respective DSN/API key environment variables are set (graceful no-op otherwise).

---

### User Story 6 - Performance Verification (Priority: P3)

As the platform team, I want all performance targets verified via automated benchmarks, so that the application meets NFR-001 through NFR-004 before production launch.

**Why this priority**: Performance targets are NFRs that must be met but can be verified last since the backend is already optimized.

**Independent Test**: Can be verified by running performance benchmarks against the API and frontend.

**Acceptance Scenarios**:

1. **Given** the backend API, **When** benchmarked with concurrent requests, **Then** p95 latency for CRUD endpoints is under 200ms.
2. **Given** the frontend dashboard page, **When** loaded on a simulated 4G connection, **Then** First Contentful Paint occurs within 2 seconds.
3. **Given** a search query across accounts, **When** the database contains test data at scale (1000+ records), **Then** results return within 200ms at p95.
4. **Given** database queries, **When** monitored via Prisma logging, **Then** p95 query latency is under 50ms.

---

### Edge Cases

- What happens when Sentry DSN is not configured? Application must start normally without monitoring.
- What happens when PostHog API key is not set? Analytics must be a no-op.
- What happens when a component error boundary catches an error during offline mode? Error must be queued for Sentry when connectivity restores.
- What happens when CSS custom properties for theming are overridden? Contrast ratios must still meet WCAG thresholds.
- What happens on extremely narrow viewports (<280px)? Application should degrade gracefully with scrolling rather than breaking.

## Requirements

### Functional Requirements

- **FR-P001**: System MUST render error boundaries around route segments and key components that display a contextual error message with retry capability.
- **FR-P002**: System MUST display animated skeleton loading states for all data-fetching views (dashboard, lists, detail pages).
- **FR-P003**: System MUST detect network connectivity changes and display/dismiss an offline banner automatically.
- **FR-P004**: System MUST meet WCAG 2.1 Level AA for all pages: keyboard navigation, visible focus indicators, ARIA labels, contrast ratios, semantic HTML.
- **FR-P005**: System MUST render all pages usably at 320px viewport width with 44px minimum touch targets on all interactive elements.
- **FR-P006**: System MUST integrate Sentry for frontend and backend error reporting, initialized conditionally on DSN availability.
- **FR-P007**: System MUST integrate PostHog for frontend page view tracking and key event analytics, initialized conditionally on API key availability.
- **FR-P008**: Frontend test coverage MUST reach 80% for branches, functions, lines, and statements.
- **FR-P009**: All API endpoints MUST meet p95 <200ms latency under load testing.
- **FR-P010**: The sidebar navigation MUST collapse to a mobile-friendly pattern below 768px viewport width.

### Key Entities

No new entities. This feature hardens existing entities and UI.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Frontend test coverage reaches 80%+ on all four thresholds (branches, functions, lines, statements).
- **SC-002**: Zero unhandled React errors propagate past error boundaries in component tests.
- **SC-003**: All interactive elements have visible keyboard focus indicators and ARIA labels verified by automated accessibility tests.
- **SC-004**: All pages render correctly at 320px, 375px, 768px, and 1440px viewport widths without layout breaks.
- **SC-005**: Sentry captures and reports test errors when DSN is configured.
- **SC-006**: PostHog sends page view events for all route navigations.
- **SC-007**: API benchmark suite confirms p95 <200ms for all CRUD endpoints.
- **SC-008**: Overall project test suite (1248+ tests) continues to pass with zero regressions.

## Clarifications

1. **Sentry vs self-hosted monitoring**: Using Sentry SaaS (cloud) with the `@sentry/nextjs` and `@sentry/node` SDKs. Configuration is environment-variable driven (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`). Rationale: Sentry SaaS provides the fastest path to production monitoring without infrastructure overhead.

2. **PostHog integration depth**: Phase 1 tracks page views and key business events (login, order creation, search). Custom dashboards and feature flags are deferred to post-launch. Rationale: Minimal viable analytics covers NFR requirements without scope creep.

3. **Offline capability scope**: Phase 1 implements online/offline detection with a banner UI. Full PWA service worker caching (offline-capable read access) is deferred to a future iteration. Rationale: The PRD requires PWA offline support but the current scope focuses on detection and graceful degradation.

4. **Performance benchmarking tool**: Using Vitest benchmarks for API latency verification rather than k6 load testing. k6 tests can be added post-launch. Rationale: Vitest benchmarks are integrated into the existing test infrastructure and provide p95 metrics without additional tooling.

5. **Mobile navigation pattern**: Using a collapsible sidebar (hamburger menu) rather than bottom tab navigation for mobile. Rationale: Consistent with the existing sidebar component; hamburger menu is the standard pattern for admin-heavy applications.

6. **Error boundary granularity**: Error boundaries placed at: (a) root layout level (catch-all), (b) each route segment in `(authenticated)` layout, (c) around dashboard KPI cards and data-fetching widgets. Rationale: Balances isolation (one failing widget doesn't crash others) with simplicity (not wrapping every tiny component).

7. **Accessibility testing approach**: Using `@testing-library/jest-dom` assertions for ARIA attributes + `axe-core` via `jest-axe` for automated WCAG checking in component tests. Manual screen reader testing deferred to QA phase. Rationale: Automated checks catch 30-50% of accessibility issues; combined with semantic HTML practices, this provides a strong baseline.

8. **Frontend test scope**: Tests cover all custom hooks (2), all providers (2), API client, utility functions, all components with business logic (dashboard, business rules), and layout components. Pure presentational shadcn/ui wrappers are excluded from test requirements. Rationale: Testing business logic and integration points provides the highest value per test.

9. **Dark mode**: Not in scope for Phase 1. The PRD does not require dark mode. Color contrast is validated against the light theme only. Rationale: Dark mode adds significant complexity across all components for no stated requirement.
