# Implementation Plan: F-000 Design System & Component Library

**Branch**: `014-design-system` | **Date**: 2026-02-27 | **Spec**: specs/014-design-system/spec.md

## Summary

Implement the foundational design system for the Haversack frontend: extend CSS custom properties with semantic tokens (success, warning, info) and dark mode, install 15+ shadcn/ui primitives, build 12 composite patterns (data-table, empty-state, error-state, form-field, page-header, filter-bar, confirmation-dialog, status-badge, infinite-scroll, loading-overlay, search-combobox, file-dropzone), and implement 4 utility hooks (useDebounce, useInfiniteScroll, useMediaQuery, useConfirmDialog). All work is frontend-only.

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode)
**Primary Dependencies**: React 18, Next.js 14+ (App Router), Tailwind CSS 3.4+, shadcn/ui, @tanstack/react-table, cmdk, sonner, date-fns, react-day-picker, recharts, @dnd-kit/core, @dnd-kit/sortable, next-themes
**Storage**: N/A (no backend changes)
**Testing**: Vitest + @testing-library/react + jest-axe (a11y)
**Target Platform**: Web (320px–1440px responsive)
**Project Type**: Frontend component library
**Performance Goals**: FCP <2s on 4G, all components render <100ms
**Constraints**: WCAG 2.1 AA contrast ratios, 44px minimum touch targets
**Scale/Scope**: ~37 new components, 4 hooks, 4 modified files

## Project Structure

### Source Code

```text
frontend/src/
├── app/
│   ├── globals.css                      # MOD — add semantic tokens + dark mode + typography
│   └── layout.tsx                       # MOD — add ThemeProvider + Toaster
├── components/
│   ├── ui/                              # shadcn/ui primitives (15 NEW + 6 existing)
│   │   ├── badge.tsx                    # NEW
│   │   ├── checkbox.tsx                 # NEW
│   │   ├── command.tsx                  # NEW (cmdk wrapper)
│   │   ├── date-picker.tsx              # NEW (react-day-picker wrapper)
│   │   ├── dialog.tsx                   # NEW
│   │   ├── dropdown-menu.tsx            # NEW
│   │   ├── popover.tsx                  # NEW
│   │   ├── scroll-area.tsx              # NEW
│   │   ├── separator.tsx                # NEW
│   │   ├── switch.tsx                   # NEW
│   │   ├── table.tsx                    # NEW
│   │   ├── tabs.tsx                     # NEW
│   │   ├── textarea.tsx                 # NEW
│   │   ├── toaster.tsx                  # NEW (sonner wrapper)
│   │   └── tooltip.tsx                  # NEW
│   └── patterns/                        # Composite patterns (12 NEW)
│       ├── confirmation-dialog.tsx      # NEW
│       ├── data-table.tsx               # NEW (@tanstack/react-table wrapper)
│       ├── empty-state.tsx              # NEW
│       ├── error-state.tsx              # NEW
│       ├── file-dropzone.tsx            # NEW
│       ├── filter-bar.tsx               # NEW
│       ├── form-field.tsx               # NEW
│       ├── infinite-scroll.tsx          # NEW
│       ├── loading-overlay.tsx          # NEW
│       ├── page-header.tsx              # NEW
│       ├── search-combobox.tsx          # NEW
│       └── status-badge.tsx             # NEW
├── hooks/
│   ├── use-confirm-dialog.ts            # NEW
│   ├── use-debounce.ts                  # NEW
│   ├── use-infinite-scroll.ts           # NEW
│   └── use-media-query.ts              # NEW
├── tailwind.config.ts                   # MOD — add semantic colors + typography scale
└── package.json                         # MOD — add 10 new dependencies
```

### File Change Summary

| File | Status | Workspace | Changes |
|------|--------|-----------|---------|
| frontend/package.json | MOD | frontend | Add 10 dependencies (8 PRD + next-themes + tailwindcss-animate) |
| frontend/tailwind.config.ts | MOD | frontend | Add success, warning, info, popover, chart colors + animation plugin |
| frontend/src/app/globals.css | MOD | frontend | Add --success, --warning, --info tokens in :root and .dark; add typography utilities |
| frontend/src/app/layout.tsx | MOD | frontend | Wrap with ThemeProvider, add Toaster |
| frontend/src/components/ui/badge.tsx | NEW | frontend | shadcn/ui badge with variant support |
| frontend/src/components/ui/checkbox.tsx | NEW | frontend | shadcn/ui checkbox |
| frontend/src/components/ui/command.tsx | NEW | frontend | cmdk wrapper |
| frontend/src/components/ui/date-picker.tsx | NEW | frontend | react-day-picker + popover wrapper |
| frontend/src/components/ui/dialog.tsx | NEW | frontend | shadcn/ui dialog (Radix) |
| frontend/src/components/ui/dropdown-menu.tsx | NEW | frontend | shadcn/ui dropdown menu (Radix) |
| frontend/src/components/ui/popover.tsx | NEW | frontend | shadcn/ui popover (Radix) |
| frontend/src/components/ui/scroll-area.tsx | NEW | frontend | shadcn/ui scroll area (Radix) |
| frontend/src/components/ui/separator.tsx | NEW | frontend | shadcn/ui separator (Radix) |
| frontend/src/components/ui/switch.tsx | NEW | frontend | shadcn/ui switch (Radix) |
| frontend/src/components/ui/table.tsx | NEW | frontend | shadcn/ui table primitives |
| frontend/src/components/ui/tabs.tsx | NEW | frontend | shadcn/ui tabs (Radix) |
| frontend/src/components/ui/textarea.tsx | NEW | frontend | shadcn/ui textarea |
| frontend/src/components/ui/toaster.tsx | NEW | frontend | sonner Toaster wrapper |
| frontend/src/components/ui/tooltip.tsx | NEW | frontend | shadcn/ui tooltip (Radix) |
| frontend/src/components/patterns/confirmation-dialog.tsx | NEW | frontend | Destructive action confirmation |
| frontend/src/components/patterns/data-table.tsx | NEW | frontend | Generic TanStack Table wrapper |
| frontend/src/components/patterns/empty-state.tsx | NEW | frontend | Zero-record list pattern |
| frontend/src/components/patterns/error-state.tsx | NEW | frontend | Error with retry pattern |
| frontend/src/components/patterns/file-dropzone.tsx | NEW | frontend | Drag-and-drop file upload |
| frontend/src/components/patterns/filter-bar.tsx | NEW | frontend | Horizontal filter controls |
| frontend/src/components/patterns/form-field.tsx | NEW | frontend | Label + input + error wrapper |
| frontend/src/components/patterns/infinite-scroll.tsx | NEW | frontend | Intersection observer scroll trigger |
| frontend/src/components/patterns/loading-overlay.tsx | NEW | frontend | Semi-transparent overlay with spinner |
| frontend/src/components/patterns/page-header.tsx | NEW | frontend | Title + breadcrumb + actions |
| frontend/src/components/patterns/search-combobox.tsx | NEW | frontend | Async searchable dropdown |
| frontend/src/components/patterns/status-badge.tsx | NEW | frontend | Color-coded status indicator |
| frontend/src/hooks/use-confirm-dialog.ts | NEW | frontend | Dialog state management hook |
| frontend/src/hooks/use-debounce.ts | NEW | frontend | Value debounce hook |
| frontend/src/hooks/use-infinite-scroll.ts | NEW | frontend | Intersection observer hook |
| frontend/src/hooks/use-media-query.ts | NEW | frontend | Responsive breakpoint hook |

**Total: 35 files (31 new, 4 modified)**
