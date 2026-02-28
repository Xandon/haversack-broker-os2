# Tasks: F-000 Design System & Component Library

**Spec**: specs/014-design-system/spec.md
**Plan**: specs/014-design-system/plan.md
**Task IDs**: T246–T270
**Batches**: 3 (Batch 35–37), continuing global counter from 34

## Batch 35: Theme Foundation & Dependencies

**Branch**: `feature/batch-35-design-system-foundation`
**Scope**: US1 (Theme Tokens) + dependency installation
**Tasks**: T246–T253 (8 tasks)

### T246: Install frontend dependencies
- **Description**: Install all new dependencies in the frontend workspace: @tanstack/react-table, cmdk, sonner, date-fns, react-day-picker, recharts, @dnd-kit/core, @dnd-kit/sortable, next-themes, tailwindcss-animate, @radix-ui/react-dialog, @radix-ui/react-popover, @radix-ui/react-dropdown-menu, @radix-ui/react-tabs, @radix-ui/react-tooltip, @radix-ui/react-switch, @radix-ui/react-checkbox, @radix-ui/react-separator, @radix-ui/react-scroll-area
- **Files**: frontend/package.json (MOD)
- **Workspace**: frontend
- **Depends on**: None
- **Refs**: FR-031, US1
- **Priority**: P1

### T247: Extend theme tokens and dark mode
- **Description**: Add semantic color tokens (--success, --warning, --info with foreground variants) to globals.css for both :root and .dark. Add typography scale CSS utilities. Update tailwind.config.ts with success, warning, info, popover, and chart color mappings. Add tailwindcss-animate plugin.
- **Files**: frontend/src/app/globals.css (MOD), frontend/tailwind.config.ts (MOD)
- **Workspace**: frontend
- **Depends on**: T246
- **Refs**: FR-031, AC-031a, US1
- **Priority**: P1

### T248: Add ThemeProvider and Toaster to root layout
- **Description**: Install next-themes ThemeProvider in layout.tsx with attribute="class" and defaultTheme="system". Add sonner Toaster component. Create toaster.tsx wrapper in components/ui/.
- **Files**: frontend/src/app/layout.tsx (MOD), frontend/src/components/ui/toaster.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T246, T247
- **Refs**: FR-031, US2, Clarification 3 (next-themes), Clarification 5 (sonner)
- **Priority**: P1

### T249: Add shadcn/ui primitives — Dialog, Popover, Tooltip
- **Description**: Create dialog.tsx, popover.tsx, tooltip.tsx using Radix UI primitives with theme token styling and forwardRef pattern.
- **Files**: frontend/src/components/ui/dialog.tsx (NEW), frontend/src/components/ui/popover.tsx (NEW), frontend/src/components/ui/tooltip.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247
- **Refs**: FR-031, AC-031a, US2
- **Priority**: P1

### T250: Add shadcn/ui primitives — Table, Tabs, Badge
- **Description**: Create table.tsx (Table, TableHeader, TableBody, TableRow, TableHead, TableCell), tabs.tsx (Tabs, TabsList, TabsTrigger, TabsContent), badge.tsx with variant support (default, secondary, destructive, outline, success, warning).
- **Files**: frontend/src/components/ui/table.tsx (NEW), frontend/src/components/ui/tabs.tsx (NEW), frontend/src/components/ui/badge.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247
- **Refs**: FR-031, AC-031a, US2
- **Priority**: P1
- **[P]**: Parallel with T249

### T251: Add shadcn/ui primitives — DropdownMenu, Command, ScrollArea
- **Description**: Create dropdown-menu.tsx, command.tsx (cmdk wrapper), scroll-area.tsx using Radix UI primitives.
- **Files**: frontend/src/components/ui/dropdown-menu.tsx (NEW), frontend/src/components/ui/command.tsx (NEW), frontend/src/components/ui/scroll-area.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247
- **Refs**: FR-031, AC-031a, US2
- **Priority**: P1
- **[P]**: Parallel with T249, T250

### T252: Add shadcn/ui primitives — Switch, Checkbox, Separator, Textarea
- **Description**: Create switch.tsx, checkbox.tsx, separator.tsx, textarea.tsx using Radix UI primitives and native elements with theme token styling.
- **Files**: frontend/src/components/ui/switch.tsx (NEW), frontend/src/components/ui/checkbox.tsx (NEW), frontend/src/components/ui/separator.tsx (NEW), frontend/src/components/ui/textarea.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247
- **Refs**: FR-031, AC-031a, US2
- **Priority**: P1
- **[P]**: Parallel with T249, T250, T251

### T253: Add shadcn/ui DatePicker primitive
- **Description**: Create date-picker.tsx wrapping react-day-picker inside a Popover, with Calendar component and date formatting via date-fns.
- **Files**: frontend/src/components/ui/date-picker.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T249 (popover), T246 (react-day-picker, date-fns)
- **Refs**: FR-031, AC-031a, US2
- **Priority**: P1

---

## Batch 36: Composite Patterns

**Branch**: `feature/batch-36-design-system-patterns`
**Scope**: US3 (Composite Patterns)
**Tasks**: T254–T265 (12 tasks)

### T254: Build data-table composite pattern
- **Description**: Create a generic DataTable<TData, TValue> component wrapping @tanstack/react-table with sorting, column visibility, cursor-based pagination, and configurable page size (default 20). Integrates with shadcn Table primitive.
- **Files**: frontend/src/components/patterns/data-table.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T250 (table primitive)
- **Refs**: FR-031, AC-031c, US3-AC3, US3-AC4
- **Priority**: P1

### T255: Build empty-state composite pattern
- **Description**: Create EmptyState component with props: title, description, icon (optional), actionLabel, onAction. CTA button uses 44x44px minimum touch target.
- **Files**: frontend/src/components/patterns/empty-state.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, AC-031b, US3-AC1
- **Priority**: P1
- **[P]**: Parallel with T254

### T256: Build error-state composite pattern
- **Description**: Create ErrorState component with props: title, message, onRetry (optional), requestId (optional). Shows error icon, message, retry button, and error reference ID.
- **Files**: frontend/src/components/patterns/error-state.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, US3-AC5
- **Priority**: P1
- **[P]**: Parallel with T254, T255

### T257: Build form-field composite pattern
- **Description**: Create FormField component wrapping Label + Input + error message + description. Compatible with React Hook Form's Controller pattern.
- **Files**: frontend/src/components/patterns/form-field.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, US3
- **Priority**: P1
- **[P]**: Parallel with T254–T256

### T258: Build page-header composite pattern
- **Description**: Create PageHeader component with props: title, description (optional), breadcrumbs (optional array), actions (optional ReactNode for buttons). Responsive layout.
- **Files**: frontend/src/components/patterns/page-header.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, US3
- **Priority**: P1
- **[P]**: Parallel with T254–T257

### T259: Build filter-bar composite pattern
- **Description**: Create FilterBar component with props: filters (array of filter configs), onFilterChange, onClearAll. Horizontal layout with responsive stacking on mobile.
- **Files**: frontend/src/components/patterns/filter-bar.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, US3
- **Priority**: P1
- **[P]**: Parallel with T254–T258

### T260: Build confirmation-dialog composite pattern
- **Description**: Create ConfirmationDialog component with props: title, description, confirmLabel, cancelLabel, variant (default/destructive), isOpen, onConfirm, onCancel. Uses Dialog primitive.
- **Files**: frontend/src/components/patterns/confirmation-dialog.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T249 (dialog primitive)
- **Refs**: FR-031, US3-AC6
- **Priority**: P1

### T261: Build status-badge composite pattern
- **Description**: Create StatusBadge component with props: status (string), variant map (maps status strings to badge variants/colors). Extends Badge primitive with domain-specific status rendering.
- **Files**: frontend/src/components/patterns/status-badge.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T250 (badge primitive)
- **Refs**: FR-031, US3
- **Priority**: P1
- **[P]**: Parallel with T260

### T262: Build infinite-scroll composite pattern
- **Description**: Create InfiniteScroll component using Intersection Observer API. Props: onLoadMore, hasMore, isLoading, threshold (default 200px). Shows loading indicator when fetching, "No more results" when exhausted.
- **Files**: frontend/src/components/patterns/infinite-scroll.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, US3-AC7
- **Priority**: P1

### T263: Build loading-overlay composite pattern
- **Description**: Create LoadingOverlay component with props: isLoading, children. Semi-transparent overlay with centered spinner, applied over the children content area.
- **Files**: frontend/src/components/patterns/loading-overlay.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, US3
- **Priority**: P1
- **[P]**: Parallel with T262

### T264: Build search-combobox composite pattern
- **Description**: Create SearchCombobox<T> component with props: onSearch (async callback), renderItem, onSelect, placeholder, maxResults (default 10). Uses useDebounce (300ms) internally. Dropdown shows results after debounce.
- **Files**: frontend/src/components/patterns/search-combobox.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T249 (popover), US4 hooks (T266 useDebounce)
- **Refs**: FR-031, US3-AC8, Clarification 1
- **Priority**: P1

### T265: Build file-dropzone composite pattern
- **Description**: Create FileDropzone component with props: onFileDrop, acceptedTypes, maxSizeBytes (default 50MB), label. Drag-and-drop + click-to-browse. Shows inline error for rejected files (too large, wrong type).
- **Files**: frontend/src/components/patterns/file-dropzone.tsx (NEW)
- **Workspace**: frontend
- **Depends on**: T247 (theme tokens)
- **Refs**: FR-031, Clarification 2
- **Priority**: P2

---

## Batch 37: Utility Hooks & Tests

**Branch**: `feature/batch-37-design-system-hooks-tests`
**Scope**: US4 (Utility Hooks) + test suite for all batches
**Tasks**: T266–T270 (5 tasks)

### T266: Implement useDebounce hook
- **Description**: Create useDebounce<T>(value: T, delay: number) hook that returns the debounced value. Cleans up timeout on unmount.
- **Files**: frontend/src/hooks/use-debounce.ts (NEW)
- **Workspace**: frontend
- **Depends on**: None
- **Refs**: FR-031, US4-AC1
- **Priority**: P2

### T267: Implement useInfiniteScroll hook
- **Description**: Create useInfiniteScroll({ onLoadMore, hasMore, threshold?, rootRef? }) hook using Intersection Observer. Returns sentinelRef to attach to the scroll trigger element.
- **Files**: frontend/src/hooks/use-infinite-scroll.ts (NEW)
- **Workspace**: frontend
- **Depends on**: None
- **Refs**: FR-031, US4-AC2
- **Priority**: P2
- **[P]**: Parallel with T266

### T268: Implement useMediaQuery hook
- **Description**: Create useMediaQuery(query: string) hook that returns boolean. Uses window.matchMedia with SSR safety (returns false on server).
- **Files**: frontend/src/hooks/use-media-query.ts (NEW)
- **Workspace**: frontend
- **Depends on**: None
- **Refs**: FR-031, US4-AC3
- **Priority**: P2
- **[P]**: Parallel with T266, T267

### T269: Implement useConfirmDialog hook
- **Description**: Create useConfirmDialog() hook returning { isOpen, open(options), onConfirm, onCancel, options }. Manages dialog open/close state and passes through title/description/variant.
- **Files**: frontend/src/hooks/use-confirm-dialog.ts (NEW)
- **Workspace**: frontend
- **Depends on**: None
- **Refs**: FR-031, US4-AC4
- **Priority**: P2
- **[P]**: Parallel with T266–T268

### T270: Write component and hook test suite
- **Description**: Write tests for all composite patterns and hooks: empty-state render + CTA size, error-state render + retry callback, data-table sorting + pagination, confirmation-dialog open/confirm/cancel, infinite-scroll trigger, search-combobox debounce, useDebounce timing, useInfiniteScroll observer, useMediaQuery SSR safety, useConfirmDialog state. Co-located .test.tsx files.
- **Files**: frontend/src/components/patterns/*.test.tsx (NEW), frontend/src/hooks/*.test.ts (NEW)
- **Workspace**: frontend
- **Depends on**: T254–T269 (all composites and hooks)
- **Refs**: FR-031, SC-006, all ACs
- **Priority**: P1

---

## Dependency Graph

```
T246 (deps) ──> T247 (theme) ──> T248 (layout)
                    │
                    ├──> T249 (dialog/popover/tooltip) ──> T253 (date-picker)
                    │         │                              │
                    │         ├──> T260 (confirmation-dialog)
                    │         └──> T264 (search-combobox) <── T266 (useDebounce)
                    │
                    ├──> T250 (table/tabs/badge) ──> T254 (data-table)
                    │         └──> T261 (status-badge)
                    │
                    ├──> T251 (dropdown/command/scroll)
                    ├──> T252 (switch/checkbox/separator/textarea)
                    │
                    ├──> T255 (empty-state)  [P]
                    ├──> T256 (error-state)  [P]
                    ├──> T257 (form-field)   [P]
                    ├──> T258 (page-header)  [P]
                    ├──> T259 (filter-bar)   [P]
                    ├──> T262 (infinite-scroll) [P]
                    ├──> T263 (loading-overlay) [P]
                    └──> T265 (file-dropzone) [P]

T266–T269 (hooks) ── all [P], no deps
T270 (tests) ── depends on all above
```
