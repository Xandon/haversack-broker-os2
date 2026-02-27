# Tasks: Polish & NFRs

**Feature:** 013-polish-nfrs
**Task IDs:** T220-T245
**Batches:** 32-34 (global counter continues from 31)
**Branch pattern:** `feature/batch-batch-{N}-{slug}`

## Batch 32: Error Handling, Loading States & Monitoring (T220-T228)

**Branch:** `feature/batch-batch-32-error-monitoring`
**Parent stories:** US-1 (Error Resilience), US-5 (Monitoring)
**Depends on:** None (foundation batch)

### T220: Create reusable error boundary component
- **FR-P001** | US-1 | P1
- **Files:** `frontend/src/components/error-boundary.tsx` (NEW)
- **Description:** React error boundary class component that catches render errors, displays contextual error message with retry button, and optionally reports to Sentry. Props: `fallback?`, `onError?`, `children`.
- **Test refs:** Error catch, error display, retry functionality, Sentry integration

### T221: Add Next.js route-level error boundaries
- **FR-P001** | US-1 | P1
- **Files:** `frontend/src/app/error.tsx` (NEW), `frontend/src/app/(authenticated)/error.tsx` (NEW)
- **Depends on:** T220
- **Description:** Next.js App Router `error.tsx` convention files. Root error boundary catches unhandled errors. Authenticated error boundary provides retry + navigation options within the app shell.

### T222: Create online status hook and offline banner
- **FR-P003** | US-1 | P1
- **Files:** `frontend/src/hooks/use-online-status.ts` (NEW), `frontend/src/components/layout/offline-banner.tsx` (NEW)
- **Description:** `useOnlineStatus()` hook using `navigator.onLine` + `online`/`offline` window events. `<OfflineBanner>` component renders persistent banner at viewport top when offline, auto-dismisses on reconnection.

### T223: Create reusable loading skeleton layouts
- **FR-P002** | US-1 | P1
- **Files:** `frontend/src/components/ui/loading-skeleton.tsx` (NEW)
- **Depends on:** Existing `skeleton.tsx` shadcn component
- **Description:** Composable skeleton layouts: `DashboardSkeleton`, `TableSkeleton`, `FormSkeleton`, `CardSkeleton`. Uses the existing shadcn `Skeleton` primitive. Animated placeholders matching actual layout structure.

### T224: Create monitoring provider (Sentry + PostHog)
- **FR-P006, FR-P007** | US-5 | P2
- **Files:** `frontend/src/providers/monitoring-provider.tsx` (NEW)
- **Description:** `<MonitoringProvider>` initializes Sentry and PostHog from environment variables (`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`). Graceful no-op when env vars not set. Page view tracking for PostHog on route changes.
- **Env vars:** `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

### T225: Integrate monitoring provider into app
- **FR-P006, FR-P007** | US-5 | P2
- **Files:** `frontend/src/providers/providers.tsx` (MOD)
- **Depends on:** T224
- **Description:** Wrap existing provider tree with `MonitoringProvider` at outermost level.

### T226: Create backend Sentry plugin
- **FR-P006** | US-5 | P2
- **Files:** `backend/src/shared/plugins/sentry.plugin.ts` (NEW), `backend/src/app.ts` (MOD)
- **Description:** Fastify plugin that initializes `@sentry/node` if `SENTRY_DSN` env var is set. Registers onRequest hook for transaction tracing. Plugin is no-op without DSN.

### T227: Add Sentry capture to backend error handler
- **FR-P006** | US-5 | P2
- **Files:** `backend/src/shared/middleware/error-handler.ts` (MOD)
- **Depends on:** T226
- **Description:** In the 5xx error branch, call `Sentry.captureException(error, { tags: { requestId } })` before sending response. Conditional on Sentry being initialized. No change to response format.

### T228: Integrate offline banner and error boundaries into authenticated layout
- **FR-P001, FR-P003** | US-1 | P1
- **Files:** `frontend/src/app/(authenticated)/layout.tsx` (MOD)
- **Depends on:** T221, T222
- **Description:** Add `<OfflineBanner>` below TopBar. Wrap main content area with error boundary. Add mobile sidebar state management (`isNavOpen` state for Batch 33).

---

## Batch 33: Accessibility, Mobile Responsiveness & Sidebar (T229-T238)

**Branch:** `feature/batch-batch-33-a11y-mobile`
**Parent stories:** US-2 (Accessibility), US-3 (Mobile Responsiveness)
**Depends on:** Batch 32 (error boundaries, loading skeletons)

### T229: Create mobile navigation drawer
- **FR-P010** | US-3 | P1
- **Files:** `frontend/src/components/layout/mobile-nav.tsx` (NEW)
- **Description:** Mobile navigation drawer/sheet that overlays the viewport. Shows same nav items as sidebar. Triggered by hamburger button. Close on navigation or backdrop click. 44px minimum touch targets on all nav items.

### T230: Make sidebar responsive
- **FR-P010, FR-P004** | US-2, US-3 | P1
- **Files:** `frontend/src/components/layout/sidebar.tsx` (MOD)
- **Depends on:** T229
- **Description:** Add `hidden md:flex` to desktop sidebar. Desktop sidebar unchanged above 768px. Below 768px, sidebar is hidden and mobile nav takes over. Add ARIA labels: `role="navigation"`, `aria-label="Main navigation"`. Add `aria-current="page"` to active nav item.

### T231: Add hamburger toggle to top bar
- **FR-P010** | US-3 | P1
- **Files:** `frontend/src/components/layout/top-bar.tsx` (MOD)
- **Depends on:** T229
- **Description:** Add hamburger menu button (visible below md breakpoint) that toggles mobile nav. Button: 44x44px touch target, `aria-label="Open navigation"`, `aria-expanded` state. Add `role="banner"` to top bar.

### T232: Update authenticated layout for mobile nav
- **FR-P010** | US-3 | P1
- **Files:** `frontend/src/app/(authenticated)/layout.tsx` (MOD)
- **Depends on:** T229, T230, T231
- **Description:** Lift mobile nav open/close state. Pass `isNavOpen` and `onToggleNav` to TopBar and MobileNav. Responsive main content padding.

### T233: Accessibility for dashboard components
- **FR-P004** | US-2 | P1
- **Files:** `frontend/src/components/dashboard/kpi-card.tsx` (MOD), `frontend/src/components/dashboard/critical-accounts-list.tsx` (MOD), `frontend/src/components/dashboard/period-selector.tsx` (MOD)
- **Description:** KPI card: `role="region"`, `aria-label` with metric name, text label alongside color indicators. Critical accounts list: semantic `<table>` with `<th scope="col">`, `aria-sort` for sortable columns. Period selector: `aria-label="Select dashboard period"`, keyboard-navigable options.

### T234: Accessibility for business rules components
- **FR-P004** | US-2 | P1
- **Files:** `frontend/src/components/business-rules/rule-list.tsx` (MOD), `frontend/src/components/business-rules/rule-form.tsx` (MOD), `frontend/src/components/business-rules/condition-builder.tsx` (MOD), `frontend/src/components/business-rules/action-builder.tsx` (MOD)
- **Description:** Rule list: semantic table with column headers. Rule form: label associations, fieldset grouping, error message `aria-describedby`. Condition/action builders: keyboard-navigable add/remove, `aria-label` on operator selects, 44px touch targets.

### T235: Accessibility for login page
- **FR-P004** | US-2 | P1
- **Files:** `frontend/src/app/login/page.tsx` (MOD)
- **Description:** Focus auto-set to email input on load. `aria-invalid` and `aria-describedby` for validation errors. `role="alert"` for login error messages. Submit button 44px touch target. Responsive layout for 320px.

### T236: Dashboard page loading skeletons and error wrapping
- **FR-P001, FR-P002** | US-1 | P1
- **Files:** `frontend/src/app/(authenticated)/dashboard/page.tsx` (MOD)
- **Depends on:** T220, T223
- **Description:** Wrap KPI cards in individual error boundaries. Show `DashboardSkeleton` while data loads. Replace spinner/null states with skeleton layouts.

### T237: Install new frontend dependencies
- US-2, US-5 | P1 [P]
- **Files:** `frontend/package.json` (MOD)
- **Description:** Add `@sentry/nextjs`, `posthog-js` as production deps. Add `jest-axe`, `@types/jest-axe` as dev deps. Run `npm install`.

### T238: Mobile responsive polish pass
- **FR-P005** | US-3 | P1
- **Files:** Multiple existing components (minor class additions)
- **Depends on:** T232
- **Description:** Verify and fix all pages at 320px, 375px, 768px viewports. Ensure: no horizontal overflow, 44px min touch targets on all interactive elements, readable text sizes, adequate spacing. Adjust padding/margins using responsive Tailwind prefixes.

---

## Batch 34: Frontend Tests & Final Quality (T239-T245)

**Branch:** `feature/batch-batch-34-frontend-tests`
**Parent stories:** US-4 (Test Coverage), US-6 (Performance)
**Depends on:** Batch 33 (all components finalized)

### T239: Tests for utilities and API client
- **FR-P008** | US-4 | P2
- **Files:** `frontend/src/lib/api-client.test.ts` (NEW), `frontend/src/lib/utils.test.ts` (NEW)
- **Description:** API client: successful fetch, auth header injection, 401 refresh flow, non-JSON error, ApiClientError construction. Utils: cn class merging, formatCurrency, formatNumber, formatDate with edge cases.

### T240: Tests for providers
- **FR-P008** | US-4 | P2
- **Files:** `frontend/src/providers/auth-provider.test.tsx` (NEW), `frontend/src/providers/query-provider.test.tsx` (NEW), `frontend/src/providers/monitoring-provider.test.tsx` (NEW)
- **Depends on:** T239
- **Description:** Auth provider: login flow, logout, token refresh, unauthenticated state, role exposure. Query provider: client configuration, stale time, retry settings. Monitoring provider: init with DSN, no-op without DSN.

### T241: Tests for custom hooks
- **FR-P008** | US-4 | P2
- **Files:** `frontend/src/hooks/use-dashboard.test.ts` (NEW), `frontend/src/hooks/use-business-rules.test.ts` (NEW), `frontend/src/hooks/use-online-status.test.ts` (NEW)
- **Depends on:** T239
- **Description:** Dashboard hooks: query key structure, loading state, data transformation, error state. Business rules hooks: list, get, create, update, delete mutations with invalidation. Online status: initial state, event listeners, cleanup.

### T242: Tests for layout components
- **FR-P008** | US-4 | P2
- **Files:** `frontend/src/components/layout/sidebar.test.tsx` (NEW), `frontend/src/components/layout/top-bar.test.tsx` (NEW), `frontend/src/components/layout/protected-route.test.tsx` (NEW), `frontend/src/components/layout/offline-banner.test.tsx` (NEW)
- **Depends on:** T240
- **Description:** Sidebar: nav item rendering, role filtering, active state, ARIA attributes. TopBar: user display, logout, hamburger toggle. Protected route: redirect when unauthenticated, render when authenticated. Offline banner: show/hide on connectivity.

### T243: Tests for dashboard components
- **FR-P008** | US-4 | P2
- **Files:** `frontend/src/components/dashboard/kpi-card.test.tsx` (NEW), `frontend/src/components/dashboard/period-selector.test.tsx` (NEW), `frontend/src/components/dashboard/critical-accounts-list.test.tsx` (NEW)
- **Description:** KPI card: rendering, ARIA region, formatting. Period selector: selection change, keyboard nav, ARIA. Critical accounts: table rendering, semantic HTML, empty state.

### T244: Tests for error boundary and business rules components
- **FR-P008** | US-4 | P2
- **Files:** `frontend/src/components/error-boundary.test.tsx` (NEW), `frontend/src/components/business-rules/rule-list.test.tsx` (NEW), `frontend/src/components/business-rules/rule-form.test.tsx` (NEW)
- **Description:** Error boundary: error catch, fallback render, retry, Sentry reporting. Rule list: table rendering, empty state, status display. Rule form: field validation, submission, edit mode.

### T245: Coverage verification and lint cleanup
- **FR-P008, FR-P009** | US-4, US-6 | P2
- **Depends on:** T239-T244
- **Description:** Run `npm run test:coverage` on frontend workspace. Verify 80% thresholds for branches, functions, lines, statements. Fix any gaps. Run `npm run lint` and `npm run format` across all workspaces. Ensure zero lint errors.

---

## Summary

| Batch | Tasks | Files | Focus |
|-------|-------|-------|-------|
| 32 | T220-T228 (9 tasks) | 12 files (7 new, 5 mod) | Error handling, loading states, monitoring |
| 33 | T229-T238 (10 tasks) | 15 files (2 new, 13 mod) | Accessibility, mobile, responsive |
| 34 | T239-T245 (7 tasks) | 18 files (18 new) | Frontend tests, coverage, quality |
| **Total** | **26 tasks** | **37 files unique** | |

## Task Dependencies

```
T220 ──→ T221 ──→ T228
T222 ──→ T228
T224 ──→ T225
T226 ──→ T227
T223 ──→ T236
T229 ──→ T230, T231 ──→ T232 ──→ T238
T237 is parallel [P] — can run anytime in batch 33
All batch 32-33 tasks ──→ T239-T244 ──→ T245
```
