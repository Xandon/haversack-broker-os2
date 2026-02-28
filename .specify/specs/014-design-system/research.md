# Research: F-000 Design System & Component Library

## Reference Patterns Analyzed

- `frontend/src/components/ui/button.tsx` — shadcn/ui primitive pattern
- `frontend/src/components/ui/loading-skeleton.tsx` — existing composite skeleton pattern
- `frontend/src/hooks/use-dashboard.ts` — TanStack Query hook pattern
- `frontend/src/app/globals.css` — CSS custom property theme
- `frontend/tailwind.config.ts` — Tailwind theme extension
- `frontend/src/lib/utils.ts` — cn() utility and formatters

## Decisions

### D1: Component File Structure

**Decision**: shadcn/ui primitives in `components/ui/`, composite patterns in `components/patterns/`.
**Rationale**: Existing primitives (button, card, input, select, label, skeleton) are already in `components/ui/`. New primitives follow the same convention. Composite patterns go in a separate `patterns/` directory to distinguish building blocks from composed behaviors.
**Alternatives**: Flat in `components/ui/` (rejected — too many files, hard to distinguish primitive vs composite).

### D2: Component Export Pattern

**Decision**: All components use named exports with `React.forwardRef` where applicable. Match existing Button pattern: cva variants, cn() merging, displayName.
**Rationale**: Consistency with existing button.tsx pattern. forwardRef enables parent ref access for focus management and tooltip anchoring.
**Alternatives**: Default exports (rejected — CLAUDE.md requires named exports).

### D3: Theme Token Architecture

**Decision**: Extend existing globals.css `:root` block with `--success`, `--warning`, `--info` tokens. Add `.dark` block for dark mode values. Extend tailwind.config.ts to map these tokens.
**Rationale**: Existing architecture uses HSL custom properties in `:root`. Adding semantic tokens follows the same pattern. Tailwind config already maps `hsl(var(--tokenName))`.
**Alternatives**: Separate theme file (rejected — fragments the single source of truth).

### D4: Dark Mode Implementation

**Decision**: Use `next-themes` ThemeProvider wrapping the app. Set `attribute="class"` and `defaultTheme="system"` to follow OS preference. Prevents FOUC by injecting script before hydration.
**Rationale**: Tailwind config already has `darkMode: 'class'`. next-themes is the standard class-based dark mode solution for Next.js.
**Alternatives**: Manual cookie-based toggle (rejected — next-themes handles SSR, localStorage, and system preference matching out of the box).

### D5: Toast System

**Decision**: Install `sonner` and mount `<Toaster />` in root layout.tsx. Create a `toast` utility that wraps sonner's API for consistent project usage (success, error, info, warning).
**Rationale**: PRD specifies sonner. Mount in layout ensures toasts work from any page. Wrapper enables consistent styling and duration defaults.
**Alternatives**: react-hot-toast (rejected — PRD mandates sonner).

### D6: Data Table Architecture

**Decision**: Create a generic `DataTable<TData, TValue>` component wrapping `@tanstack/react-table`. Accept `columns` (ColumnDef[]), `data`, `pageSize`, `onPageChange`, `sorting`/`onSortingChange` as props. Internal state for column visibility, filtering.
**Rationale**: TanStack Table is headless — needs a consistent wrapper. Generic component enables reuse across accounts, orders, tasks, products, etc.
**Alternatives**: Per-page inline table setup (rejected — violates DRY across 8+ list pages).

### D7: Dependency Installation Strategy

**Decision**: Install all 8 frontend dependencies in a single batch (`npm install` in frontend workspace). Also install `next-themes` for dark mode. Install `tailwindcss-animate` for animation utilities used by shadcn/ui.
**Rationale**: All dependencies are needed by F-000. Single install avoids lock file churn.
**Alternatives**: Install per-task (rejected — unnecessary npm install overhead and lock file noise).

## Existing Patterns to Follow

| Pattern | Source | Applies To |
|---------|--------|-----------|
| cva + cn() variants | button.tsx | All primitives with variants (badge, status-badge) |
| React.forwardRef + displayName | button.tsx | All primitives |
| HSL custom properties | globals.css | Theme tokens |
| `hsl(var(--token))` in Tailwind | tailwind.config.ts | Color extensions |
| useQuery with queryKey/queryFn | use-dashboard.ts | Future data hooks (not in F-000) |
| Skeleton composition | loading-skeleton.tsx | Extend for data-table skeleton pattern |
