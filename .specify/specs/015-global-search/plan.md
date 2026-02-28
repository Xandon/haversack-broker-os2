# Implementation Plan — F-001: Global Search (Cmd+K)

**Feature**: Global Search Command Palette
**PRD**: FR-032
**Created**: 2026-02-27

## Architecture Overview

The global search feature uses a fan-out pattern: the frontend `useGlobalSearch` hook fires 3 parallel API requests (accounts, contacts, products) and aggregates results into categories for the `CommandPalette` component. The palette uses the existing `cmdk` + shadcn/ui `CommandDialog` primitive.

## File Structure

### Backend (`backend/`)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `backend/src/domains/accounts/contact-search.service.ts` | NEW | backend | Contact search service — ILIKE across first_name, last_name, email, phone with tenant isolation |
| `backend/src/domains/accounts/contact-search.service.test.ts` | NEW | backend | Unit tests for contact search service |
| `backend/src/domains/accounts/account.routes.ts` | MODIFIED | backend | Add `GET /api/contacts/search` route (registered alongside account routes since contacts are account sub-entities) |
| `backend/src/domains/accounts/account.routes.test.ts` | MODIFIED | backend | Add tests for contact search route |

**Modifications to `account.routes.ts`:**
- Add import for `searchContacts` from `contact-search.service.ts`
- Add new route: `GET /api/contacts/search?q=&limit=5` with auth + Zod validation
- Register after existing contact CRUD routes

### Frontend (`frontend/`)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `frontend/src/hooks/use-global-search.ts` | NEW | frontend | TanStack Query hook — fires 3 parallel searches, debounced, returns categorized results |
| `frontend/src/hooks/use-global-search.test.ts` | NEW | frontend | Tests for the global search hook |
| `frontend/src/components/search/command-palette.tsx` | NEW | frontend | Main command palette component wrapping CommandDialog with search state, result rendering, keyboard shortcut |
| `frontend/src/components/search/command-palette.test.tsx` | NEW | frontend | Component tests for command palette |
| `frontend/src/components/search/search-trigger.tsx` | NEW | frontend | TopBar search trigger button with platform-aware shortcut hint |
| `frontend/src/components/search/search-trigger.test.tsx` | NEW | frontend | Tests for search trigger |
| `frontend/src/components/search/index.ts` | NEW | frontend | Barrel exports |
| `frontend/src/components/layout/top-bar.tsx` | MODIFIED | frontend | Add SearchTrigger import and render between mobile menu and user info |
| `frontend/src/app/(authenticated)/layout.tsx` | MODIFIED | frontend | Add CommandPalette component (rendered once, globally) |

**Modifications to `top-bar.tsx`:**
- Add import: `import { SearchTrigger } from '@/components/search'`
- Add `onOpenSearch` prop to TopBarProps
- Render `<SearchTrigger onClick={onOpenSearch} />` between left and right sections

**Modifications to `layout.tsx`:**
- Add import: `import { CommandPalette } from '@/components/search'`
- Render `<CommandPalette />` inside ProtectedRoute, after MobileNav
- CommandPalette manages its own open/close state including the Cmd+K shortcut

### Shared (`packages/shared/`)

| File | Status | Workspace | Description |
|------|--------|-----------|-------------|
| `packages/shared/src/schemas/search.schema.ts` | NEW | shared | Zod schemas for search query params and response types |
| `packages/shared/src/schemas/index.ts` | MODIFIED | shared | Add export for search schemas |

## Component Hierarchy

```
AuthenticatedLayout
├── Sidebar
├── TopBar
│   ├── MobileMenuToggle
│   ├── SearchTrigger (NEW) ── click ──┐
│   └── UserInfo + Logout              │
├── OfflineBanner                       │
├── main > {children}                   │
├── MobileNav                           │
└── CommandPalette (NEW) ◄──────────────┘
    ├── CommandDialog (existing ui/)
    │   ├── CommandInput
    │   ├── CommandList
    │   │   ├── CommandEmpty ("No results" / "Type 2+ chars")
    │   │   ├── CommandGroup heading="Accounts"
    │   │   │   └── CommandItem (×5 max)
    │   │   ├── CommandGroup heading="Contacts"
    │   │   │   └── CommandItem (×5 max)
    │   │   └── CommandGroup heading="Products"
    │   │       └── CommandItem (×5 max)
    │   └── Loading indicator
    └── useGlobalSearch(debouncedQuery)
```

## Data Flow

```
User types query
  → useState(query)
  → useDebounce(query, 300)
  → useGlobalSearch(debouncedQuery)
    → useQuery(['search', 'accounts', q]) → GET /api/accounts?search=q&limit=5
    → useQuery(['search', 'contacts', q]) → GET /api/contacts/search?q=q&limit=5
    → useQuery(['search', 'products', q]) → GET /api/products/search?q=q&limit=5
  → Render categorized results in CommandDialog
  → User selects result
  → router.push(result.url)
  → Palette closes
```

## Key Implementation Details

1. **Keyboard shortcut**: `useEffect` with `keydown` listener for `Cmd+K`/`Ctrl+K`. Calls `e.preventDefault()` to prevent browser default (e.g., Chrome's address bar focus). Toggle behavior on repeat press.

2. **Stale request cancellation**: TanStack Query's `AbortController` integration handles this automatically — when `queryKey` changes, the previous request is cancelled.

3. **Mobile responsive**: CommandDialog uses `DialogContent` which supports responsive sizing. Below 768px, add Tailwind class overrides for full-screen: `sm:max-w-[425px] max-sm:h-full max-sm:max-h-full max-sm:rounded-none`.

4. **Accessibility**: cmdk provides built-in ARIA attributes for combobox pattern. CommandGroup provides heading announcements. Active item is announced via `aria-selected`. Add `aria-label="Global search"` to the dialog.

5. **Focus management**: CommandDialog handles focus trap. On close, focus returns to the trigger element or the previously focused element via Radix Dialog's `onOpenChange`.
