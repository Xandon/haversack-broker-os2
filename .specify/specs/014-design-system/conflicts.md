# Conflict Analysis: F-000 Design System & Component Library

## Summary

| Classification | Count | Details |
|---------------|-------|---------|
| SAFE (new files only) | 28 | New primitives, composites, hooks, dependencies |
| ADDITIVE (extend existing) | 4 | globals.css, layout.tsx, package.json, tailwind.config |
| BREAKING | 0 | None |

## SAFE — New Files

1. **shadcn/ui primitives** (15 new files): dialog.tsx, table.tsx, tabs.tsx, badge.tsx, popover.tsx, dropdown-menu.tsx, tooltip.tsx, separator.tsx, switch.tsx, checkbox.tsx, textarea.tsx, scroll-area.tsx, command.tsx, date-picker.tsx, toast/sonner integration — all new in `frontend/src/components/ui/`
2. **Composite patterns** (12 new files): data-table.tsx, empty-state.tsx, error-state.tsx, form-field.tsx, page-header.tsx, filter-bar.tsx, confirmation-dialog.tsx, status-badge.tsx, infinite-scroll.tsx, loading-overlay.tsx, search-combobox.tsx, file-dropzone.tsx — new in `frontend/src/components/patterns/`
3. **Utility hooks** (4 new files): use-debounce.ts, use-infinite-scroll.ts, use-media-query.ts, use-confirm-dialog.ts — new in `frontend/src/hooks/`

## ADDITIVE — Modifications to Existing Files

1. **`frontend/src/app/globals.css`** — Add semantic tokens (--success, --warning, --info) to `:root` and `.dark` blocks. Add typography scale utilities. Existing tokens unchanged.
2. **`frontend/src/app/layout.tsx`** — Wrap with `ThemeProvider` (next-themes) for dark mode, add `<Toaster />` (sonner) component. Existing Providers component unchanged.
3. **`frontend/package.json`** — Add 8 new dependencies: @tanstack/react-table, cmdk, sonner, date-fns, react-day-picker, recharts, @dnd-kit/core, @dnd-kit/sortable. Plus next-themes. Existing dependencies unchanged.
4. **`frontend/tailwind.config.ts`** — Extend theme with semantic color mappings (success, warning, info), typography scale, and responsive breakpoints. Existing config preserved.

## No BREAKING Conflicts

- Existing 6 primitives (Button, Card, Input, Select, Label, Skeleton) are not modified — only new primitives are added.
- Existing loading-skeleton.tsx is preserved as-is — the new composites are in `components/patterns/`, not `components/ui/`.
- Existing hooks (use-dashboard, use-business-rules, use-online-status) are not modified.
- No Prisma schema changes, no backend route changes, no shared schema changes.

## GATE RESULT: PASS (0 BREAKING) — Proceed to Research
