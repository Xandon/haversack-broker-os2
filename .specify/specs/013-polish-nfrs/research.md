# Research: Polish & NFRs

## Reference Patterns

### 1. Provider Composition Pattern
**Source:** `frontend/src/providers/providers.tsx`
**Pattern:** Providers nest cleanly: `QueryProvider > AuthProvider > children`
**Decision:** Add monitoring providers at the outermost level: `SentryProvider > PostHogProvider > QueryProvider > AuthProvider`
**Rationale:** Sentry needs to wrap everything to capture errors from any provider. PostHog wraps query/auth to track authenticated user context.

### 2. TanStack Query Hook Pattern
**Source:** `frontend/src/hooks/use-dashboard.ts`
**Pattern:** Hooks export typed `useQuery`/`useMutation` wrappers with `queryKey` arrays and `queryFn` calling `apiClient<T>`.
**Decision:** Tests will mock `apiClient` at the module level using `vi.mock('@/lib/api-client')` and verify query keys, loading states, error states, and data transformation.
**Rationale:** Mocking at the api-client boundary tests hook logic without network calls. Consistent with testing best practices for TanStack Query.

### 3. API Client Error Handling Pattern
**Source:** `frontend/src/lib/api-client.ts`
**Pattern:** `ApiClientError` class with `status`, `code`, `message`. Auto-refresh on 401. Throws on non-OK responses.
**Decision:** Error boundaries will catch `ApiClientError` and display the error code + message. The offline detection hook will use `navigator.onLine` + `window` events.
**Rationale:** The existing error class already carries structured error info that error boundaries can display.

### 4. Sidebar Navigation Pattern
**Source:** `frontend/src/components/layout/sidebar.tsx`
**Pattern:** Fixed `w-64` sidebar, role-filtered nav items, Lucide icons, `cn()` for conditional classes.
**Decision:** Add responsive behavior: `hidden md:flex` on desktop sidebar, hamburger button in TopBar for mobile, sheet/drawer overlay on mobile. Use `useState` for open/close state lifted to the authenticated layout.
**Rationale:** Standard responsive pattern. Sidebar items and role filtering remain unchanged.

### 5. Backend Error Handler Pattern
**Source:** `backend/src/shared/middleware/error-handler.ts`
**Pattern:** Switch on error type (ZodError, 429, 4xx, 5xx), structured JSON response with `requestId`.
**Decision:** Add optional Sentry capture in the 5xx branch: `Sentry.captureException(error, { tags: { requestId } })`. Conditional on `process.env.SENTRY_DSN`.
**Rationale:** Only unhandled/unexpected errors (5xx) need Sentry reporting. 4xx errors are expected client errors.

### 6. Next.js App Router Error Boundary Pattern
**Source:** Next.js 14 conventions
**Pattern:** `error.tsx` files at route segment boundaries automatically create error boundaries. Must be `'use client'` components.
**Decision:** Create `frontend/src/app/error.tsx` (root), `frontend/src/app/(authenticated)/error.tsx` (auth section), plus reusable `<ErrorBoundary>` component for widget-level isolation.
**Rationale:** Next.js built-in error boundaries handle route-level errors. Custom component handles widget-level errors (e.g., one KPI card failing).

### 7. Accessibility Pattern
**Source:** shadcn/ui components (button.tsx, input.tsx, etc.)
**Pattern:** shadcn/ui components already include basic accessibility (button types, input labels). Data tables and custom components need ARIA enhancement.
**Decision:** Add `role`, `aria-label`, `aria-describedby`, and `tabIndex` attributes to custom components. Add `<th scope="col">` to data tables. Verify focus indicators via ring-2 Tailwind classes.
**Rationale:** Building on existing shadcn/ui accessibility. Focus on custom components that shadcn doesn't cover.

## Test Infrastructure Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Test framework | Vitest (existing) | Already configured in frontend/vitest.config.ts |
| Component testing | @testing-library/react (existing) | Already in devDependencies |
| Hook testing | @testing-library/react renderHook | Standard pattern for TanStack Query hooks |
| Accessibility testing | jest-axe (new dep) | Automated WCAG checking in component tests |
| API mocking | vi.mock + MSW not needed | Mock apiClient at module level is simpler |
| Coverage target | 80% all thresholds | Matches NFR-014 and vitest.config.ts settings |
