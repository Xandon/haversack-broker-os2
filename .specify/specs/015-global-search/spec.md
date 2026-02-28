# Feature Specification: Global Search Command Palette (Cmd+K)

**Feature Branch**: `015-global-search`
**Created**: 2026-02-27
**Status**: Draft
**PRD Reference**: FR-032
**Depends On**: F-000 (Design System), FR-003 (Account search), FR-012 (Product search)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Open and Search via Keyboard Shortcut (Priority: P1)

As a sales rep on any authenticated page, I want to press Cmd+K (macOS) or Ctrl+K (Windows/Linux) to instantly open a search palette so I can quickly find accounts, contacts, or products without navigating away from my current page.

**Why this priority**: This is the core interaction — keyboard-driven search is the primary way power users access the command palette. Without this, the feature has no value.

**Independent Test**: Can be fully tested by pressing Cmd+K on any page, typing a query, and verifying results appear within the debounce window. Delivers instant cross-entity search.

**Acceptance Scenarios**:

1. **Given** a user is on any authenticated page, **When** the user presses Cmd+K (macOS) or Ctrl+K (Windows/Linux), **Then** the command palette modal opens within 100 milliseconds with keyboard focus on the search input field and the previously typed query cleared. (AC-032a)
2. **Given** the command palette is open, **When** the user types "pacific" and 300 milliseconds elapse after the last keystroke, **Then** the palette displays matching results grouped under "Accounts," "Contacts," and "Products" headings with up to 5 results per category, each showing the entity name and a secondary identifier (territory for accounts, email for contacts, SKU for products). (AC-032b)
3. **Given** the command palette is open with results displayed, **When** the user presses Escape, **Then** the palette closes and keyboard focus returns to the previously focused element.
4. **Given** the command palette is open, **When** the user types a query that matches no results, **Then** the palette displays a "No results found" empty state message.

---

### User Story 2 — Navigate to Results via Keyboard (Priority: P1)

As a sales rep viewing search results in the command palette, I want to navigate results using arrow keys and press Enter to go to the selected item so I can stay in keyboard-only workflow without touching the mouse.

**Why this priority**: Keyboard navigation is essential for the command palette paradigm. Without it, the Cmd+K shortcut loses its speed advantage.

**Independent Test**: Can be tested by opening the palette, typing a query, using arrow keys to highlight results, and pressing Enter to navigate.

**Acceptance Scenarios**:

1. **Given** search results are displayed in the command palette, **When** the user presses the Down arrow key, **Then** the next result item is visually highlighted and announced to screen readers.
2. **Given** a result is highlighted in the command palette, **When** the user presses Enter, **Then** the system navigates to the corresponding detail page (/accounts/:id for accounts, /products/:id for products) and closes the palette. (AC-032c)
3. **Given** the first result is highlighted, **When** the user presses Up arrow, **Then** the highlight stays on the first result (no wrapping).
4. **Given** results span multiple categories, **When** the user arrows through them, **Then** navigation moves sequentially through all categories (Accounts first, then Contacts, then Products) without requiring extra keystrokes to cross category boundaries.

---

### User Story 3 — Click Search Trigger in Navigation Bar (Priority: P2)

As a sales rep who prefers mouse-based interaction, I want to click a search icon/button in the top navigation bar to open the same command palette so I have an alternative entry point to global search.

**Why this priority**: While keyboard shortcut is primary, a visible click target in the nav bar provides discoverability and supports mouse-first users. Lower priority because keyboard shortcut covers the core use case.

**Independent Test**: Can be tested by clicking the search trigger in the top nav and verifying the same palette opens with identical behavior.

**Acceptance Scenarios**:

1. **Given** a user is on any authenticated page, **When** the user clicks the search trigger in the top navigation bar, **Then** the command palette modal opens with keyboard focus on the search input field.
2. **Given** the search trigger is visible in the navigation bar, **When** the page loads, **Then** the trigger displays a search icon with a "Cmd+K" keyboard shortcut hint text visible on desktop viewports.

---

### User Story 4 — Click to Navigate from Results (Priority: P2)

As a sales rep viewing search results, I want to click any result to navigate to its detail page so I can use the palette with mouse interaction.

**Why this priority**: Complements keyboard navigation. Mouse click is the expected fallback interaction.

**Independent Test**: Can be tested by opening palette, typing a query, clicking a result, and verifying navigation.

**Acceptance Scenarios**:

1. **Given** search results are displayed in the command palette, **When** the user clicks a result, **Then** the system navigates to the corresponding detail page and closes the palette. (AC-032c)
2. **Given** results are displayed, **When** the user hovers over a result, **Then** the result shows a visual hover state indicating it is clickable.

---

### Edge Cases

- What happens when the search API returns an error? The palette displays an inline error message "Search unavailable. Please try again." with a retry action, and does not close the palette.
- What happens when the user types very quickly (faster than 300ms between keystrokes)? The debounce timer resets on each keystroke, only firing the search request after 300ms of inactivity.
- What happens when the user opens the palette while a previous search is still loading? The loading indicator persists until the new search results arrive; stale in-flight requests are cancelled.
- What happens when search returns results but the user clears the input? Results are cleared and the palette shows the default empty state (no results, just the search input).
- What happens when the palette is open and the user presses Cmd+K again? The palette closes (toggle behavior).
- What happens on mobile viewports (< 768px)? The palette renders as a full-screen overlay with a close button, and the keyboard shortcut hint is hidden. The search trigger in the nav bar remains visible.
- What happens if a result entity has been deleted between search and click? The application navigates to the detail page, which handles the 404 state with its own not-found UI.
- What happens when the search query is fewer than 2 characters? No search request is made; the palette shows a helper text "Type at least 2 characters to search."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-032-01**: System MUST provide a command palette modal accessible via Cmd+K (macOS) / Ctrl+K (Windows/Linux) keyboard shortcut from every authenticated page.
- **FR-032-02**: System MUST provide a clickable search trigger in the top navigation bar that opens the same command palette.
- **FR-032-03**: System MUST debounce search input with a 300-millisecond delay after the last keystroke before sending a search request.
- **FR-032-04**: System MUST display search results grouped under "Accounts," "Contacts," and "Products" category headings.
- **FR-032-05**: System MUST limit displayed results to a maximum of 5 per category.
- **FR-032-06**: Each result MUST show the entity name and a secondary identifier: territory name for accounts, email for contacts, SKU for products.
- **FR-032-07**: System MUST support keyboard navigation of results using Up/Down arrow keys with visual highlighting.
- **FR-032-08**: System MUST navigate to the corresponding detail page when a result is selected (Enter key or mouse click): /accounts/:id for accounts, /accounts/:accountId?tab=contacts for contacts, /products/:id for products.
- **FR-032-09**: System MUST close the palette when Escape is pressed or when a result is selected, returning focus to the previously focused element.
- **FR-032-10**: System MUST require a minimum of 2 characters before initiating a search request.
- **FR-032-11**: System MUST display a loading indicator while search results are being fetched.
- **FR-032-12**: System MUST cancel in-flight search requests when a new search query is submitted (stale request cancellation).
- **FR-032-13**: System MUST display an accessible "No results found" message when the query matches no entities.
- **FR-032-14**: System MUST render as a full-screen overlay on viewports below 768px width.

### Key Entities

- **Search Query**: User-typed text input, minimum 2 characters, used to search across multiple entity types.
- **Search Result**: An entity match containing: entity type (account/contact/product), entity ID, display name, secondary identifier, and navigation URL.
- **Search Category**: A grouping of results by entity type, with heading label and up to 5 results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Command palette opens within 100 milliseconds of keyboard shortcut or click trigger activation.
- **SC-002**: Search results appear within 200 milliseconds of the debounce completing (p95 API response time).
- **SC-003**: Users can navigate from palette open to result selection in under 3 seconds for common queries.
- **SC-004**: All keyboard interactions (open, navigate, select, close) work without requiring mouse input.
- **SC-005**: Search results are accurate — matching entities appear in the correct category with correct secondary identifiers.
- **SC-006**: The palette is fully functional on viewports from 320px to 1440px+ width.
- **SC-007**: Screen readers can announce result categories, individual results, and the currently highlighted item.

## Clarifications

1. **Contact navigation URL**: Contacts do not have standalone detail routes. Clicking a contact result navigates to `/accounts/:accountId?tab=contacts` — the parent account's detail page with the contacts tab pre-selected. Rationale: Contacts are a sub-entity of Accounts per the data model; no standalone /contacts/:id route exists.

2. **Backdrop click behavior**: Clicking outside the palette (on the backdrop overlay) closes the palette, consistent with standard modal behavior and the cmdk library defaults. Rationale: This matches user expectations for modal overlays and is the convention used by VS Code, GitHub, and Slack command palettes.

3. **Recent searches / empty state**: When the palette opens with no query text, it shows only the search input with placeholder text "Search accounts, contacts, products..." — no recent search history or suggestions. Rationale: Keeps the initial implementation simple; recent searches can be added as a future enhancement. The PRD does not require it.

4. **Keyboard shortcut hint display**: The nav bar trigger shows the platform-appropriate hint: "⌘K" on macOS, "Ctrl+K" on other platforms. Detection uses `navigator.platform` or `navigator.userAgentData.platform`. Rationale: Platform-native conventions improve discoverability.

5. **Arrow key wrapping**: Arrow key navigation does NOT wrap — pressing Up on the first item keeps focus on the first item; pressing Down on the last item keeps focus on the last item. Rationale: Non-wrapping behavior is the cmdk library default and reduces disorientation for users navigating long result lists.

6. **First result auto-highlight**: When results load, the first result in the first category is automatically highlighted (visually selected). Rationale: This is the cmdk library default and enables immediate Enter-to-navigate without requiring a Down arrow press first.

7. **Empty categories**: Category headings are only displayed if that category has at least one result. If a query matches only Accounts and Products but no Contacts, the "Contacts" heading is hidden entirely. Rationale: Showing empty category headings adds visual noise with no information value.

## Assumptions

- The backend already provides (or will provide) a unified search API endpoint that accepts a query string and returns categorized results for accounts, contacts, and products.
- The cmdk library (already installed in F-000 Design System) provides the command palette primitive with built-in keyboard navigation support.
- Contact detail pages do not exist as standalone routes; clicking a contact result navigates to the parent account's detail page with the contacts tab active.
- The command palette overlay uses a z-index above the main navigation and any open modals.
- Search is text-based only (no advanced filter syntax in the palette).
