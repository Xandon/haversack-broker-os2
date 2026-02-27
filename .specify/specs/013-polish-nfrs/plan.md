# Implementation Plan: Polish & NFRs

**Branch**: `013-polish-nfrs` | **Date**: 2026-02-27 | **Spec**: `013-polish-nfrs/spec.md`

## Summary

Harden the Haversack Unified Platform for production readiness across 6 areas: frontend error resilience (error boundaries, loading states, offline detection), WCAG 2.1 AA accessibility (keyboard nav, ARIA, contrast), mobile responsiveness (320px+, 44px touch targets), frontend test coverage (0% → 80%+), monitoring integration (Sentry + PostHog), and performance verification.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode), Node.js 20 LTS
**Primary Dependencies**: Next.js 14+ (App Router), React 18, Tailwind CSS, shadcn/ui, TanStack Query v5, Fastify 4+, @sentry/nextjs, posthog-js, jest-axe
**Testing**: Vitest, @testing-library/react, jest-axe (accessibility), Playwright (E2E)
**Target Platform**: Web (desktop + mobile 320px+)
**Performance Goals**: API p95 <200ms, FCP <2s on 4G, search <200ms, DB p95 <50ms
**Constraints**: 80% test coverage all thresholds, WCAG 2.1 AA, zero unhandled errors

## File Plan

### Batch 32: Error Handling, Loading States & Monitoring

| # | File | Status | Workspace | Description |
|---|------|--------|-----------|-------------|
| 1 | `frontend/src/components/error-boundary.tsx` | NEW | frontend | Reusable error boundary component with retry + Sentry reporting |
| 2 | `frontend/src/app/error.tsx` | NEW | frontend | Root error boundary (Next.js convention) |
| 3 | `frontend/src/app/(authenticated)/error.tsx` | NEW | frontend | Authenticated section error boundary |
| 4 | `frontend/src/hooks/use-online-status.ts` | NEW | frontend | Network connectivity detection hook |
| 5 | `frontend/src/components/layout/offline-banner.tsx` | NEW | frontend | Persistent offline notification banner |
| 6 | `frontend/src/components/ui/loading-skeleton.tsx` | NEW | frontend | Reusable data-loading skeleton layouts |
| 7 | `frontend/src/providers/monitoring-provider.tsx` | NEW | frontend | Sentry + PostHog initialization (conditional on env vars) |
| 8 | `frontend/src/providers/providers.tsx` | MOD | frontend | Wrap with monitoring provider |
| 9 | `backend/src/shared/plugins/sentry.plugin.ts` | NEW | backend | Fastify Sentry plugin (conditional on DSN) |
| 10 | `backend/src/shared/middleware/error-handler.ts` | MOD | backend | Add Sentry.captureException for 5xx errors |
| 11 | `backend/src/app.ts` | MOD | backend | Register Sentry plugin |
| 12 | `frontend/src/app/(authenticated)/layout.tsx` | MOD | frontend | Add offline banner + mobile sidebar state |

### Batch 33: Accessibility, Mobile Responsiveness & Sidebar

| # | File | Status | Workspace | Description |
|---|------|--------|-----------|-------------|
| 1 | `frontend/src/components/layout/sidebar.tsx` | MOD | frontend | Responsive: hidden md:flex, mobile drawer |
| 2 | `frontend/src/components/layout/top-bar.tsx` | MOD | frontend | Add hamburger menu button for mobile |
| 3 | `frontend/src/components/layout/mobile-nav.tsx` | NEW | frontend | Mobile navigation drawer/sheet |
| 4 | `frontend/src/app/(authenticated)/layout.tsx` | MOD | frontend | Mobile nav state management |
| 5 | `frontend/src/components/dashboard/kpi-card.tsx` | MOD | frontend | ARIA labels, focus indicators, responsive sizing |
| 6 | `frontend/src/components/dashboard/critical-accounts-list.tsx` | MOD | frontend | Semantic table, ARIA, responsive |
| 7 | `frontend/src/components/dashboard/period-selector.tsx` | MOD | frontend | ARIA labels, keyboard navigation |
| 8 | `frontend/src/components/business-rules/rule-list.tsx` | MOD | frontend | Semantic table, ARIA, mobile layout |
| 9 | `frontend/src/components/business-rules/rule-form.tsx` | MOD | frontend | ARIA labels, touch targets, responsive |
| 10 | `frontend/src/components/business-rules/condition-builder.tsx` | MOD | frontend | ARIA, keyboard nav, touch targets |
| 11 | `frontend/src/components/business-rules/action-builder.tsx` | MOD | frontend | ARIA, keyboard nav, touch targets |
| 12 | `frontend/src/app/login/page.tsx` | MOD | frontend | Accessibility, focus management, responsive |
| 13 | `frontend/src/app/(authenticated)/dashboard/page.tsx` | MOD | frontend | Error boundary wrapping, loading skeletons |

### Batch 34: Frontend Tests & Performance Verification

| # | File | Status | Workspace | Description |
|---|------|--------|-----------|-------------|
| 1 | `frontend/src/lib/api-client.test.ts` | NEW | frontend | API client tests: fetch, auth refresh, error handling |
| 2 | `frontend/src/lib/utils.test.ts` | NEW | frontend | Utility function tests: cn, formatCurrency, formatNumber, formatDate |
| 3 | `frontend/src/providers/auth-provider.test.tsx` | NEW | frontend | Auth provider: login, logout, token refresh, state management |
| 4 | `frontend/src/providers/query-provider.test.tsx` | NEW | frontend | Query provider configuration tests |
| 5 | `frontend/src/providers/monitoring-provider.test.tsx` | NEW | frontend | Monitoring: init with/without env vars |
| 6 | `frontend/src/hooks/use-dashboard.test.ts` | NEW | frontend | Dashboard hooks: loading, success, error states |
| 7 | `frontend/src/hooks/use-business-rules.test.ts` | NEW | frontend | Business rules hooks: CRUD operations |
| 8 | `frontend/src/hooks/use-online-status.test.ts` | NEW | frontend | Online status detection tests |
| 9 | `frontend/src/components/layout/sidebar.test.tsx` | NEW | frontend | Sidebar: role filtering, responsive, accessibility |
| 10 | `frontend/src/components/layout/top-bar.test.tsx` | NEW | frontend | TopBar: user info, logout, mobile toggle |
| 11 | `frontend/src/components/layout/protected-route.test.tsx` | NEW | frontend | Route protection: redirect, loading |
| 12 | `frontend/src/components/layout/offline-banner.test.tsx` | NEW | frontend | Offline banner: show/hide on connectivity |
| 13 | `frontend/src/components/dashboard/kpi-card.test.tsx` | NEW | frontend | KPI card: rendering, accessibility |
| 14 | `frontend/src/components/dashboard/period-selector.test.tsx` | NEW | frontend | Period selector: selection, accessibility |
| 15 | `frontend/src/components/dashboard/critical-accounts-list.test.tsx` | NEW | frontend | Critical accounts: table, accessibility |
| 16 | `frontend/src/components/error-boundary.test.tsx` | NEW | frontend | Error boundary: catch, display, retry |
| 17 | `frontend/src/components/business-rules/rule-list.test.tsx` | NEW | frontend | Rule list: rendering, accessibility |
| 18 | `frontend/src/components/business-rules/rule-form.test.tsx` | NEW | frontend | Rule form: validation, submission |

## Dependency Map

```
Batch 32 (Error + Monitoring) ──→ Batch 33 (A11y + Mobile) ──→ Batch 34 (Tests)
```

Batch 33 depends on Batch 32's error boundary and loading skeleton components. Batch 34 tests all code from batches 32-33.

## Total Files

- **NEW:** 27 files
- **MODIFIED:** 10 files (existing components getting a11y/responsive improvements)
- **Total:** 37 files across 3 batches
