# Feature Specification: Design System & Component Library

**Feature Branch**: `014-design-system`
**Created**: 2026-02-27
**Status**: Draft
**Input**: FR-031 from docs/prd-frontend.md — Theme tokens, shadcn/ui primitives, composite patterns

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Theme Token Foundation (Priority: P1)

As a frontend developer, I need a complete CSS custom property theme with semantic color tokens (success, warning, info), dark mode support, typography scale utilities, and responsive breakpoints so that all UI components render consistently across light and dark modes with WCAG 2.1 AA contrast ratios.

**Why this priority**: Every component and page depends on the theme. Without tokens, nothing can be styled consistently.

**Independent Test**: Render a sample page with all token categories in both light and dark modes. Verify each color pairing meets WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text).

**Acceptance Scenarios** (ref: AC-031a):

1. **Given** a component uses `--success` token, **When** rendered in light mode, **Then** the color is `hsl(142, 76%, 36%)` and meets 4.5:1 contrast against `--background`.
2. **Given** a component uses `--warning` token, **When** rendered in dark mode, **Then** the color is `hsl(38, 92%, 50%)` and meets 3:1 contrast against `--background`.
3. **Given** a page loads, **When** the user toggles dark mode, **Then** all themed elements transition to dark values without a flash of unstyled content.
4. **Given** a developer uses typography utility class `text-display`, **When** the element renders, **Then** it displays at 36px/2.25rem, font-weight 700, line-height 1.2.

---

### User Story 2 - shadcn/ui Primitive Components (Priority: P1)

As a frontend developer, I need at least 15 pre-configured shadcn/ui primitive components (dialog, table, tabs, badge, toast, command, date-picker, popover, dropdown-menu, tooltip, separator, switch, checkbox, textarea, scroll-area) installed and inheriting theme tokens so that I can compose pages without building primitives from scratch.

**Why this priority**: Primitives are the building blocks for all composite patterns and pages. They must exist before any feature UI can be built.

**Independent Test**: Import and render each primitive. Confirm it mounts, inherits theme tokens, and accepts standard props.

**Acceptance Scenarios** (ref: AC-031a):

1. **Given** a developer renders any shadcn/ui primitive, **When** the component mounts, **Then** it inherits theme tokens from CSS custom properties and renders in both light and dark modes.
2. **Given** a Dialog component is rendered, **When** opened, **Then** it traps focus within the dialog, returns focus on close, and closes on Escape key.
3. **Given** a Toast is triggered via sonner, **When** a success message fires, **Then** it appears in the top-right position and auto-dismisses after 3 seconds.
4. **Given** a DatePicker component is rendered, **When** the user selects a date, **Then** the component emits the selected date and formats display using date-fns.

---

### User Story 3 - Composite Patterns (Priority: P1)

As a frontend developer, I need at least 12 composite patterns (data-table, empty-state, error-state, form-field, page-header, filter-bar, confirmation-dialog, status-badge, infinite-scroll, loading-overlay, search-combobox, file-dropzone) so that feature pages have reusable, consistent UI patterns to compose.

**Why this priority**: Composite patterns are consumed by every feature page. They encapsulate complex behavior (data tables with sorting/pagination, infinite scroll, file upload) that would otherwise be duplicated.

**Independent Test**: Render each composite pattern with sample data. Verify it displays correctly, responds to user interaction, and handles edge cases (empty data, errors).

**Acceptance Scenarios** (ref: AC-031b, AC-031c):

1. **Given** a list has zero records, **When** the empty-state pattern renders, **Then** it displays a descriptive message, a primary CTA button (minimum 44x44px touch target), and an optional illustration.
2. **Given** a data-fetching view is loading, **When** the skeleton pattern renders, **Then** it displays animated placeholder elements matching the target layout structure (column count for tables, card dimensions for grids).
3. **Given** a data-table receives 100 rows with 5 columns, **When** the user clicks a column header, **Then** the table sorts ascending, and a second click sorts descending.
4. **Given** a data-table has cursor-based pagination, **When** the user clicks "Next Page," **Then** the table loads the next 20 rows and updates the URL query parameter `cursor`.
5. **Given** an error-state is rendered, **When** the user clicks "Retry," **Then** the data fetch is re-triggered and the error state is replaced with loading.
6. **Given** a confirmation-dialog is triggered for a destructive action, **When** the user clicks "Confirm," **Then** the dialog closes and the destructive callback fires. **When** the user clicks "Cancel," **Then** the dialog closes without side effects.
7. **Given** an infinite-scroll container has more data available, **When** the user scrolls to within 200px of the bottom, **Then** the next page of 20 items loads and appends to the list.
8. **Given** a search-combobox receives a query, **When** 300ms elapse after the last keystroke, **Then** async results are fetched and displayed.

---

### User Story 4 - Utility Hooks (Priority: P2)

As a frontend developer, I need utility hooks (useDebounce, useInfiniteScroll, useMediaQuery, useConfirmDialog) so that feature hooks and components can share common interaction logic.

**Why this priority**: Hooks enable DRY implementation of debounce, scroll detection, and responsive behavior across all features.

**Independent Test**: Call each hook in a test component and verify it returns the correct state/callback based on input.

**Acceptance Scenarios**:

1. **Given** useDebounce is called with a value and 300ms delay, **When** the value changes, **Then** the debounced value updates after 300ms and not before.
2. **Given** useInfiniteScroll is attached to a scroll container, **When** the user scrolls to within 200px of the bottom, **Then** the `loadMore` callback fires.
3. **Given** useMediaQuery is called with `(min-width: 1024px)`, **When** the viewport is 1200px, **Then** it returns `true`. **When** the viewport is 800px, **Then** it returns `false`.
4. **Given** useConfirmDialog is called, **When** `open()` is invoked, **Then** it returns `isOpen: true` and `onConfirm`/`onCancel` callbacks.

---

### Edge Cases

- What happens when the browser does not support CSS custom properties? The system degrades to hardcoded fallback values in the CSS.
- What happens when a composite pattern receives `null` or `undefined` data? It renders the empty-state or error-state pattern instead of crashing.
- What happens when dark mode toggle is unavailable (SSR)? The system defaults to light mode and applies dark mode on hydration if the user's system preference is dark.
- What happens when a toast is triggered while another is visible? Sonner stacks toasts vertically, showing up to 3 simultaneously.
- What happens when infinite scroll is triggered but there are no more items? The loadMore callback is not fired, and a "No more results" indicator is shown.
- What happens when file-dropzone receives a file larger than 50MB? It displays an inline error message and does not upload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-031**: System MUST provide a design system consisting of theme tokens (semantic colors, typography scale, spacing, border radii), a component library of at least 15 reusable shadcn/ui primitives (dialog, table, tabs, badge, toast, command, date-picker, popover, dropdown-menu, tooltip, separator, switch, checkbox, textarea, scroll-area), and at least 10 reusable composite patterns (data-table, empty-state, error-state, form-field, page-header, filter-bar, confirmation-dialog, status-badge, infinite-scroll, loading-overlay) that all other features consume.

### Acceptance Criteria

- **AC-031a**: Given a developer renders any shadcn/ui primitive component, when the component mounts, then it inherits theme tokens from CSS custom properties and renders consistently in both light and dark modes with contrast ratios meeting WCAG 2.1 AA (at least 4.5:1 for normal text, at least 3:1 for large text).
- **AC-031b**: Given a page displays a list with zero records, when the empty-state composite pattern renders, then it displays a descriptive message, a primary call-to-action button, and an optional illustration, with the CTA button having a minimum touch target of 44 by 44 CSS pixels.
- **AC-031c**: Given a data-fetching view is loading, when the skeleton composite pattern renders, then it displays animated placeholder elements that match the target layout structure (matching column count for tables, card dimensions for grids) rather than a generic spinner.

### Key Entities

- **Theme Token**: A CSS custom property (HSL format) categorized as background, foreground, primary, secondary, muted, accent, destructive, success, warning, or info with both light and dark values.
- **Primitive Component**: A shadcn/ui component that inherits theme tokens and provides accessible, keyboard-navigable UI primitives.
- **Composite Pattern**: A higher-order component composing primitives into reusable page-level patterns (data tables, empty states, dialogs, etc.).
- **Utility Hook**: A React hook encapsulating reusable interaction logic (debounce, scroll detection, media query, dialog state).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 15 shadcn/ui primitive components are installed and render correctly in both light and dark modes.
- **SC-002**: At least 12 composite patterns are implemented and export a documented API (props interface).
- **SC-003**: All color token pairings meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large text).
- **SC-004**: 4 utility hooks (useDebounce, useInfiniteScroll, useMediaQuery, useConfirmDialog) are implemented with unit tests.
- **SC-005**: All 8 new frontend dependencies are installed and tree-shakeable.
- **SC-006**: Component render tests pass for every primitive and composite pattern.

## Clarifications

1. **Search-combobox is generic**: The search-combobox composite accepts an `onSearch` async callback and `maxResults` prop (default 10). It is not tied to a specific entity — each feature page provides its own search function. Rationale: maximizes reuse across account picker, product search, user picker.

2. **File-dropzone is configurable**: The file-dropzone accepts `maxSizeBytes` (default 52428800 = 50MB), `acceptedTypes` (default all), and shows inline error on rejection. Rationale: PRD specifies 50MB but the pattern should be reusable.

3. **Dark mode uses next-themes**: Class-based toggle via `next-themes` ThemeProvider sets `.dark` on `<html>` before hydration, preventing FOUC. Rationale: standard Next.js + Tailwind dark mode pattern.

4. **Data-table supports dual pagination**: The data-table composite supports both cursor-based (default, for API-backed tables) and client-side pagination. Callers pass `pageSize` (default 20), `onPageChange` callback, and optional `cursor`/`hasNextPage` props. Rationale: PRD defaults to cursor-based but some views (e.g., small admin lists) may use client-side.

5. **Toast via sonner**: Toaster component mounted once in root layout. Success toasts auto-dismiss at 3s, error toasts persist until dismissed. Max 3 visible simultaneously. Position: top-right. Rationale: matches PRD Section 5 interaction patterns.

6. **Date formatting via date-fns**: All date display uses `date-fns` `format()` with `'en-US'` locale. No moment.js or dayjs. Rationale: PRD specifies date-fns, tree-shakeable.

7. **@dnd-kit installed but not used**: @dnd-kit/core and @dnd-kit/sortable are installed as dependencies in F-000 (per PRD Section 9) but the actual drag-and-drop kanban implementation is in F-007. Rationale: dependency setup is foundational; feature logic belongs to the consuming feature.

8. **Command vs search-combobox separation**: `cmdk` (command palette) is for global search (F-001). `search-combobox` is a field-level dropdown for entity pickers. Both are built in F-000 as primitives/composites; F-001 owns the full search integration. Rationale: different interaction models — modal vs inline.

9. **NFR integration boundaries**: F-000 builds the empty-state, error-state, loading-overlay, and toast patterns. Actual integration into specific pages (optimistic updates per NFR-015, URL state per NFR-016, form protection per NFR-017) is each consuming feature's responsibility. Rationale: F-000 provides the building blocks, not the wiring.

## Assumptions

- The existing frontend workspace (`frontend/`) has Next.js 14+ App Router, Tailwind CSS, and shadcn/ui CLI already configured.
- 6 shadcn/ui primitives already exist (Button, Card, Input, Select, Label, Skeleton) and only need theme token verification.
- The existing `globals.css` already has base HSL custom properties (--background, --foreground, --primary, etc.) that we extend with semantic tokens (--success, --warning, --info).
- Dark mode is implemented via Tailwind's `dark:` variant and a class-based toggle (`.dark` on `<html>`).
- No backend changes are required for this feature — it is purely frontend.
