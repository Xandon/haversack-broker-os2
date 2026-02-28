# Tasks — F-001: Global Search (Cmd+K)

**Feature**: Global Search Command Palette
**PRD**: FR-032
**Task Range**: T271–T283
**Batch Range**: 38–39
**Created**: 2026-02-27

## Batch 38: Search Backend + Frontend Hook (Foundation)

**Branch**: `feature/batch-38-global-search-foundation`
**Tasks**: T271–T277 (7 tasks)

### T271: Create search Zod schemas in shared package
- **US**: US-1 (Open and Search)
- **Refs**: FR-032-03, FR-032-04, FR-032-05
- **Priority**: P1
- **Files**: `packages/shared/src/schemas/search.schema.ts` (NEW), `packages/shared/src/schemas/index.ts` (MOD)
- **Workspace**: shared
- **Dependencies**: None
- **Description**: Create Zod schemas for contact search query params (`contactSearchQuerySchema`), contact search result (`contactSearchResultSchema`), and a unified `GlobalSearchResult` type used by the frontend. Export from index.ts.

### T272: Implement contact search service
- **US**: US-1 (Open and Search)
- **Refs**: FR-032-04, FR-032-06
- **Priority**: P1
- **Files**: `backend/src/domains/accounts/contact-search.service.ts` (NEW), `backend/src/domains/accounts/contact-search.service.test.ts` (NEW)
- **Workspace**: backend
- **Dependencies**: T271
- **Description**: Create `searchContacts(prisma, tenantId, { query, limit })` function. ILIKE search across first_name, last_name, email, phone fields. Returns contacts with parent account ID and name (JOIN on accounts table). Tenant isolation via tenant_id. Test: search matches, no results, tenant isolation.

### T273: Add contact search route
- **US**: US-1 (Open and Search)
- **Refs**: FR-032-04, FR-032-06
- **Priority**: P1
- **Files**: `backend/src/domains/accounts/account.routes.ts` (MOD), `backend/src/domains/accounts/account.routes.test.ts` (MOD)
- **Workspace**: backend
- **Dependencies**: T271, T272
- **Description**: Add `GET /api/contacts/search?q=&limit=5` route to account routes. Auth middleware required. Validate query params with `contactSearchQuerySchema`. Call `searchContacts`. Return `{ data: ContactSearchResult[] }`. Test: valid search, empty results, auth required, Zod validation.

### T274: Create useGlobalSearch hook
- **US**: US-1 (Open and Search), US-2 (Navigate via Keyboard)
- **Refs**: FR-032-03, FR-032-04, FR-032-05, FR-032-10, FR-032-11, FR-032-12
- **Priority**: P1
- **Files**: `frontend/src/hooks/use-global-search.ts` (NEW), `frontend/src/hooks/use-global-search.test.ts` (NEW)
- **Workspace**: frontend
- **Dependencies**: T271
- **Description**: Hook accepts `query: string`. Uses `useDebounce(query, 300)`. Fires 3 parallel `useQuery` calls for accounts, contacts, products (enabled when debounced query >= 2 chars). Maps API responses to `GlobalSearchResult[]` per category. Returns `{ accounts, contacts, products, isLoading, isError, error }`. Test: debounce behavior, query key structure, enabled flag, result mapping, error handling.
- **[P]** — Can be developed in parallel with T272/T273 using mocked API responses

### T275: Create SearchTrigger component
- **US**: US-3 (Click Search Trigger)
- **Refs**: FR-032-02
- **Priority**: P2
- **Files**: `frontend/src/components/search/search-trigger.tsx` (NEW), `frontend/src/components/search/search-trigger.test.tsx` (NEW)
- **Workspace**: frontend
- **Dependencies**: None
- **Description**: Button component showing search icon + "Search..." text + platform-aware shortcut hint (⌘K / Ctrl+K). Accepts `onClick` prop. Hide shortcut hint on mobile (< 768px). Uses existing Button from ui/button. Test: renders search icon, shows correct platform hint, fires onClick, hides hint on mobile.

### T276: Create CommandPalette component
- **US**: US-1 (Open and Search), US-2 (Navigate via Keyboard), US-4 (Click to Navigate)
- **Refs**: FR-032-01, FR-032-04, FR-032-05, FR-032-06, FR-032-07, FR-032-08, FR-032-09, FR-032-10, FR-032-11, FR-032-13, FR-032-14
- **Priority**: P1
- **Files**: `frontend/src/components/search/command-palette.tsx` (NEW), `frontend/src/components/search/command-palette.test.tsx` (NEW), `frontend/src/components/search/index.ts` (NEW)
- **Workspace**: frontend
- **Dependencies**: T274, T275
- **Description**: Main component wrapping CommandDialog. Manages open/close state. Registers Cmd+K/Ctrl+K global keydown handler (toggle). Uses `useGlobalSearch` for results. Renders results in CommandGroup per category (only categories with results). CommandItem per result with name + secondary text. On item select: `router.push(result.url)`, close palette. Loading spinner during fetch. Empty states: "Type at least 2 characters" (< 2 chars), "No results found" (0 results), error message with retry. Mobile: full-screen overlay below 768px. Barrel export from index.ts. Test: keyboard shortcut opens/closes, search input renders, results grouped by category, empty categories hidden, navigation on select, escape closes, loading state, error state, mobile styling.

### T277: Integrate into layout and TopBar
- **US**: US-1, US-2, US-3, US-4
- **Refs**: FR-032-01, FR-032-02
- **Priority**: P1
- **Files**: `frontend/src/app/(authenticated)/layout.tsx` (MOD), `frontend/src/components/layout/top-bar.tsx` (MOD)
- **Workspace**: frontend
- **Dependencies**: T275, T276
- **Description**: Add `<CommandPalette />` to authenticated layout (after MobileNav, inside ProtectedRoute). Add `<SearchTrigger />` to TopBar between mobile menu and user info sections. SearchTrigger click opens the command palette. Test: palette renders in layout, trigger appears in top bar.

## Batch 39: Polish & Edge Cases

**Branch**: `feature/batch-39-global-search-polish`
**Tasks**: T278–T283 (6 tasks)

### T278: Implement backdrop click to close
- **US**: US-1 (Open and Search)
- **Refs**: FR-032-09
- **Priority**: P1
- **Files**: `frontend/src/components/search/command-palette.tsx` (MOD), `frontend/src/components/search/command-palette.test.tsx` (MOD)
- **Workspace**: frontend
- **Dependencies**: T276
- **Description**: Ensure clicking the overlay backdrop closes the palette. CommandDialog (via Radix Dialog) handles this by default — verify behavior and add test. Also verify Cmd+K toggle behavior (pressing Cmd+K while open closes it). Test: backdrop click closes, Cmd+K toggle behavior.

### T279: Implement error state with retry
- **US**: US-1 (Open and Search)
- **Refs**: FR-032-11, FR-032-12
- **Priority**: P2
- **Files**: `frontend/src/components/search/command-palette.tsx` (MOD), `frontend/src/components/search/command-palette.test.tsx` (MOD)
- **Workspace**: frontend
- **Dependencies**: T276
- **[P]** — Can be developed in parallel with T278
- **Description**: When all 3 search queries error, display "Search unavailable. Please try again." with a retry button. Retry calls `refetch()` on all 3 queries. If only some queries error, show available results and hide errored categories. Test: all-error state shows message, retry button triggers refetch, partial error shows partial results.

### T280: Mobile full-screen overlay
- **US**: US-3 (Click Search Trigger)
- **Refs**: FR-032-14
- **Priority**: P2
- **Files**: `frontend/src/components/search/command-palette.tsx` (MOD), `frontend/src/components/search/command-palette.test.tsx` (MOD)
- **Workspace**: frontend
- **Dependencies**: T276
- **[P]** — Can be developed in parallel with T278, T279
- **Description**: Below 768px viewport, CommandDialog renders as full-screen overlay (100vh, 100vw, no rounded corners). Add a visible close button (X) in the top-right corner for mobile. Adjust CommandList max-height for mobile viewport. Test: mobile viewport shows full-screen, close button visible, desktop viewport shows standard modal.

### T281: Accessibility enhancements
- **US**: US-2 (Navigate via Keyboard)
- **Refs**: FR-032-07
- **Priority**: P2
- **Files**: `frontend/src/components/search/command-palette.tsx` (MOD), `frontend/src/components/search/command-palette.test.tsx` (MOD)
- **Workspace**: frontend
- **Dependencies**: T276
- **[P]** — Can be developed in parallel with T278-T280
- **Description**: Add `aria-label="Global search"` to dialog. Ensure result count is announced via live region ("5 accounts, 3 contacts, 2 products found"). Verify screen reader announces highlighted item. Verify focus returns to previously focused element on close. Test: aria attributes present, live region updates, focus management on close.

### T282: Contact search result display refinement
- **US**: US-1 (Open and Search)
- **Refs**: FR-032-06, FR-032-08
- **Priority**: P2
- **Files**: `frontend/src/components/search/command-palette.tsx` (MOD)
- **Workspace**: frontend
- **Dependencies**: T276, T273
- **Description**: Ensure contact results display correctly: show full name, email as secondary text (fallback to phone if email is null). Show parent account name as tertiary text. On click, navigate to `/accounts/${accountId}?tab=contacts`. Test: contact display format, fallback to phone, navigation URL includes tab param.

### T283: Integration test — full search flow
- **US**: US-1, US-2, US-3, US-4
- **Refs**: FR-032-01 through FR-032-14
- **Priority**: P1
- **Files**: `frontend/src/components/search/command-palette.test.tsx` (MOD)
- **Workspace**: frontend
- **Dependencies**: T277, T278, T279, T280, T281, T282
- **Description**: Comprehensive integration test covering the full search flow: open via Cmd+K, type query, verify debounce, verify categorized results, navigate via keyboard, navigate via click, close via Escape, close via backdrop, error state, empty state, mobile viewport. Serves as the feature's acceptance test.

## Dependency Graph

```
T271 (schemas) ─────────────┬── T272 (contact service) ── T273 (contact route)
                            │
                            └── T274 (useGlobalSearch hook) ──┐
                                                               │
T275 (SearchTrigger) ──────────────────────────────────────────┼── T276 (CommandPalette)
                                                               │        │
                                                               │        ├── T278 (backdrop close)    ─┐
                                                               │        ├── T279 (error/retry)       ─┤ [P]
                                                               │        ├── T280 (mobile overlay)    ─┤ [P]
                                                               │        ├── T281 (accessibility)     ─┤ [P]
                                                               │        └── T282 (contact display)   ─┘
                                                               │
                                                               └── T277 (layout integration)
                                                                        │
                                                                        └── T283 (integration test)
```

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 13 (T271–T283) |
| Batches | 2 (38–39) |
| Batch 38 | 7 tasks — foundation (schemas, backend, hook, components, integration) |
| Batch 39 | 6 tasks — polish (edge cases, a11y, mobile, integration test) |
| New files | 12 |
| Modified files | 4 |
| Parallel opportunities | T274 [P] with T272/T273; T278-T282 [P] within batch 39 |
