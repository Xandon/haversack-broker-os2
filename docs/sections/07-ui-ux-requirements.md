## 7. UI/UX Requirements

This section defines the interaction design, layout, loading behavior, error handling, empty state treatment, and accessibility standards for the Haversack Unified Platform. All specifications are measurable and reference concrete thresholds rather than subjective qualities.

### 7.1 Layout Descriptions

#### 7.1.1 Mobile Layout (320px - 767px)

- **Navigation:** Bottom tab bar fixed to the viewport bottom, 56px tall, containing 5 tabs: Dashboard (Home icon), Accounts (Building icon), Orders (ShoppingCart icon), Pipeline (TrendingUp icon), More (Menu icon). Each tab has an icon (24px) above a label (12px font). The active tab is indicated by a filled icon and a 2px top border in the brand primary color.
- **Content Area:** Single-column layout. Cards stack vertically with 12px gaps. Data tables are replaced with card-based list views — each row becomes a card showing the 3-4 most important fields with a chevron to expand or navigate to detail.
- **Floating Action Button (FAB):** 56px diameter, positioned 16px from the bottom-right corner (above the tab bar), in the brand accent color. Tap opens a radial or list menu of quick actions: Log Call, Log Visit, Log Demo, New Order, Search. The FAB is within the one-handed thumb zone (bottom-right quadrant of the screen).
- **Header:** 48px tall, containing the screen title (left-aligned, 18px semibold), and up to 2 action icons (right-aligned, 44px touch targets). The header scrolls out of view on downward scroll and reappears on upward scroll (auto-hide header pattern).
- **Forms:** Full-width inputs with 48px minimum height. Labels are positioned above inputs (not as floating labels) for clarity on small screens. Submit buttons are full-width and fixed to the bottom of the viewport when the keyboard is open.

#### 7.1.2 Tablet Layout (768px - 1023px)

- **Navigation:** Tab bar moves to the top of the screen (horizontal tabs below the header) or a collapsible left sidebar (hamburger toggle). When sidebar is collapsed, only icons are visible (56px wide); when expanded, icons + labels (240px wide).
- **Content Area:** Two-column layouts where appropriate — e.g., account list on the left (40% width) and account detail on the right (60% width) in a master-detail pattern. Cards arrange in a 2-column grid with 16px gaps.
- **Detail Views:** Side panel slides in from the right (400px wide) for detail views, allowing the list to remain visible. Panel can be dismissed by tapping outside or swiping right.
- **Pipeline Board:** Kanban columns are horizontally scrollable. Each column is 280px wide. Drag-and-drop is enabled for opportunity cards between columns.

#### 7.1.3 Desktop Layout (1024px+)

- **Navigation:** Persistent left sidebar, 240px wide, with app logo at top, navigation items with icons and labels, and a user avatar/menu at the bottom. Sidebar can be collapsed to 64px (icons only) via a toggle button.
- **Content Area:** Multi-panel layouts. The main content area occupies the remaining width (784px+ on a 1024px viewport). For screens with primary + secondary content (e.g., account list + detail), a 40/60 or 30/70 split is used.
- **Data Tables:** Full data tables with sortable column headers, row selection checkboxes, bulk action toolbar, and pagination controls (25/50/100 rows per page). Column widths are resizable. Sticky header row on scroll.
- **Pipeline Board:** Full kanban board with all stages visible simultaneously. Drag-and-drop enabled. Pipeline summary bar above the board shows total value per stage and the weighted forecast.
- **Modals and Drawers:** Complex forms (e.g., order entry, business rule configuration) open in a right-side drawer (480px wide) or a centered modal (max-width 640px), keeping the parent context visible.

#### 7.1.4 Responsive Breakpoints Behavior

| Breakpoint | Width | Nav Location | Content Columns | Tables | Pipeline |
|---|---|---|---|---|---|
| Mobile | 320-767px | Bottom tab bar | 1 | Card list | Tap-to-move |
| Tablet | 768-1023px | Top tabs or collapsible sidebar | 2 | Compact table or cards | Drag-and-drop, horizontal scroll |
| Desktop | 1024px+ | Persistent left sidebar | 2-3 | Full data table | Full kanban board |

All layout transitions use CSS media queries with no JavaScript-dependent layout shifts. The layout does not break at any viewport width between 320px and 2560px.

### 7.2 Interaction Patterns

#### 7.2.1 Swipe Actions

- **List Items (Mobile):** Swipe left on an account card to reveal action buttons: "Call" (green), "Email" (blue), "Log Visit" (purple). Swipe right to reveal "Quick Order" (orange). Swipe actions require a minimum 60px horizontal drag to activate. Each revealed button is 72px wide with a 44x44px touch target.
- **Notifications:** Swipe right on a notification to dismiss it. Swipe left to reveal "Snooze" (reschedule the reminder by 1 hour, 1 day, or 1 week).
- **Order Line Items:** Swipe left on a line item in the cart review to reveal "Remove" (red). Confirmation is required for removal ("Remove [Product Name]?").
- Swipe gestures include a subtle haptic feedback (if the device supports it) and a visual displacement animation (the card shifts to reveal the action panel).

#### 7.2.2 Pull-to-Refresh

- Available on all scrollable list views: account list, order list, activity timeline, pipeline board, dashboard.
- The pull-to-refresh indicator appears after pulling down 64px from the top of the scrollable area. The indicator is a circular spinner with the brand logo.
- On release, the spinner animates for the duration of the API call. If the API call completes within 300ms, the spinner shows for a minimum of 300ms to prevent a jarring flash.
- Pull-to-refresh updates only the data on the current screen; it does not trigger a full page reload.

#### 7.2.3 Drag-and-Drop

- **Pipeline Board (Tablet/Desktop):** Opportunity cards can be dragged between stage columns. During drag, the card elevates (4px shadow), the source column dims to 70% opacity, and valid drop target columns highlight with a 2px dashed border. On drop, the card animates to its new position within 200ms.
- **KPI Dashboard Widgets:** On the dashboard customization screen, KPI widgets can be reordered via drag-and-drop. Widgets show a grip handle (6 horizontal dots) on hover (desktop) or long-press (tablet).
- **Mobile Fallback:** On devices below 768px width, drag-and-drop is replaced with tap-to-select + tap-to-place or a bottom sheet menu listing available targets (e.g., "Move to: Qualified | Proposal | Negotiation").

#### 7.2.4 Search-as-You-Type

- **Global Search:** Available via a search icon in the header (mobile) or a persistent search bar in the sidebar (desktop). Typing triggers a search after a 150ms debounce. Results appear in a dropdown overlay grouped by entity type: Accounts, Contacts, Products, Orders. Each result group shows up to 5 items with a "View all [N] results" link.
- **Account Search:** On the Accounts screen, the search bar filters by name, city, phone, vendor, or product. Results update within 200ms of keystroke (after the 150ms debounce, the API responds within 50ms from cache or full-text search index).
- **Product Search (Order Entry):** In the "Add Products" step, search by name, SKU, brand, or certification. Results appear in a scrollable list below the search input with product cards showing name, brand, price, and availability. The search input retains focus during result display for continuous refinement.
- **Minimum Input:** Search requires at least 2 characters before triggering. Below 2 characters, the input shows a helper text: "Type 2+ characters to search."
- **Keyboard Navigation:** On desktop, search results are navigable with arrow keys, and Enter selects the highlighted result. Escape closes the search overlay.

#### 7.2.5 Touch Target Standards

- All interactive elements (buttons, links, checkboxes, radio buttons, dropdown triggers, icons) have a minimum touch target of 44x44px on mobile and tablet devices.
- Touch targets that are visually smaller than 44px (e.g., icon buttons) must have an expanded hit area achieved via padding or an invisible overlay.
- Adjacent touch targets have a minimum 8px gap to prevent accidental taps.

#### 7.2.6 Form Interactions

- **Autosave:** Long forms (activity logging, order entry) auto-save drafts to local storage every 10 seconds and on field blur. A "Draft saved" label appears next to the form title with a timestamp.
- **Inline Editing:** On account detail and contact cards, tapping a field value (e.g., phone number, email) converts it to an editable input in place. Pressing Enter or tapping away saves the change. Pressing Escape reverts.
- **Multi-Step Flows:** Order entry uses a 4-step progress indicator (horizontal stepper on mobile, vertical stepper in desktop drawer). Users can navigate backward to any completed step. Forward navigation requires the current step to pass validation.

### 7.3 Loading States

#### 7.3.1 Skeleton Loaders

- **Usage:** Skeleton loaders are used for all initial content loads and pagination loads. Spinners are not used for content loading.
- **Account List:** 6 skeleton cards, each matching the dimensions of a real account card (height: 88px on mobile) with animated placeholder bars for name (60% width), address (80% width), and health badge (24px circle).
- **Dashboard KPI Strip:** 4 skeleton rectangles matching KPI card dimensions (100px wide, 64px tall) with a shimmer animation from left to right.
- **Activity Timeline:** 5 skeleton timeline entries with a circle placeholder (36px, for activity type icon), two lines of text (70% and 50% width), and a date placeholder (30% width, right-aligned).
- **Data Tables (Desktop):** Skeleton rows matching the table header structure. 10 rows of placeholder cells with alternating widths (40%, 25%, 20%, 15%) and a shimmer animation.
- **Animation:** All skeleton loaders use a left-to-right shimmer animation with a gradient from #E0E0E0 to #F5F5F5 cycling every 1.5 seconds.

#### 7.3.2 Optimistic Updates

- **Pipeline Drag-and-Drop:** When a card is dropped into a new stage, the UI updates immediately. The API call runs in the background. If the API call fails, the card reverts to its original column within 500ms and a toast notification explains the failure.
- **Activity Quick-Log:** When a Rep taps "Save" on a quick-log form, the activity appears immediately in the timeline with a subtle "Syncing..." label. Once the API confirms, the label disappears. On failure, the activity card shows a "Retry" button.
- **Inline Field Edits:** When a user edits a field inline (e.g., account phone number), the new value displays immediately. If the API save fails, the field reverts to the original value and an inline error message appears.
- **Order Status Updates:** When Ops changes an order status, the status badge updates immediately in the UI. Background notification dispatch to the Rep does not block the status update display.

#### 7.3.3 Progress Indicators

- **File Upload (CSV/Excel Import):** A determinate progress bar showing percentage complete (e.g., "Uploading: 45%"). After upload completes, a second progress bar shows validation progress ("Validating row 500 of 2,000 - 25%").
- **Order Submission:** A full-screen overlay with a centered spinner and text: "Submitting order..." followed by "Order #[number] confirmed!" with a checkmark animation on success. The overlay auto-dismisses after 2 seconds.
- **AI Generation:** When an AI feature is processing (meeting brief, email draft, order suggestions), a pulsing animation with text: "Generating [feature name]..." appears inline where the result will display. The animation includes a progress dot sequence (3 dots cycling) to indicate active processing.
- **Background Jobs:** For long-running jobs (data import, batch rule execution), a toast notification appears when the job starts ("Import started. You'll be notified when complete.") and another when it finishes ("Import complete: 2,450 records imported, 23 errors."). The More > Jobs screen shows all background job statuses.

### 7.4 Error State Handling

#### 7.4.1 Inline Validation

- **When Validated:** Required field validation triggers on blur (when the user moves to the next field). Format validation (email, phone, URL) triggers on blur and on submit. Cross-field validation (e.g., end date must be after start date) triggers on submit.
- **Visual Treatment:** Invalid fields display a 2px red (#DC2626) border, a red exclamation icon (16px) to the right of the input, and an error message in red text (14px) directly below the field. Valid fields that were previously invalid display a 2px green (#16A34A) border and a green checkmark for 2 seconds before reverting to the default border.
- **Error Message Format:** Messages are specific and actionable: "Enter a valid email address (e.g., name@store.com)" rather than "Invalid input." For required fields: "[Field Name] is required." For format errors: "Enter a valid [field type] (e.g., [example])."
- **Form-Level Errors:** If a form submission fails server-side validation, a summary banner appears at the top of the form: "Please fix [N] errors below" with the page scrolled to the first error field.

#### 7.4.2 Toast Notifications

- **Position:** Bottom-center on mobile (16px from bottom, above the tab bar), bottom-right on desktop (16px from bottom and right edges).
- **Types:**
  - **Success** (green, #16A34A background): Auto-dismisses after 4 seconds. Example: "Activity saved."
  - **Error** (red, #DC2626 background): Persists until dismissed or action taken. Includes a "Retry" or "Dismiss" button. Example: "Failed to save order. Tap to retry."
  - **Warning** (amber, #D97706 background): Auto-dismisses after 6 seconds. Example: "Price data may be outdated."
  - **Info** (blue, #2563EB background): Auto-dismisses after 4 seconds. Example: "3 new notifications."
- **Stacking:** Up to 3 toasts can be visible simultaneously. Newer toasts appear below older ones. If a 4th toast triggers, the oldest auto-dismisses.
- **Accessibility:** Toasts are announced to screen readers via an aria-live="polite" region. Error toasts use aria-live="assertive."

#### 7.4.3 Retry Actions

- **Network Errors:** When an API call fails due to a network error (timeout, DNS failure, 5xx response), the UI displays a retry option. For card-level failures: a "Retry" button on the card. For page-level failures: a full-width error banner with "Something went wrong. Check your connection and try again" and a "Retry" button.
- **Automatic Retry:** API calls that fail with 5xx errors are automatically retried once after a 2-second delay before showing the error to the user. 4xx errors (client errors) are not retried.
- **Retry Behavior:** Each retry button attempts the original API call. If the retry also fails, the error message updates to: "Still unable to connect. Try again later or contact support." The retry button remains available.
- **Idempotency:** All write operations (create order, save activity, update status) use idempotency keys to prevent duplicate submissions when a user taps "Retry" after a timeout where the server may have already processed the request.

#### 7.4.4 Offline Indicators

- **Detection:** The application monitors navigator.onLine and uses a heartbeat ping to the API (every 30 seconds) to detect connectivity changes. When connectivity is lost:
  - A persistent amber banner appears at the top of the viewport: "You are offline. Changes will sync when you reconnect." The banner remains visible on all screens until connectivity is restored.
  - The FAB quick-log actions remain available; activities are queued in IndexedDB and synced on reconnection.
  - The search bar displays cached results only, with a label: "Showing cached results."
  - Create and edit actions that require server validation (e.g., order submission) show the offline banner and a disabled submit button with tooltip: "Cannot submit while offline."
- **Reconnection:** When connectivity is restored, the banner changes to green: "Back online. Syncing [N] pending changes..." and auto-dismisses after sync is complete. If sync conflicts occur (e.g., a record was modified by another user while offline), a conflict resolution dialog appears.

### 7.5 Empty State Handling

#### 7.5.1 First-Use Guidance

- **New Rep Dashboard:** On first login, the dashboard displays a welcome card: "Welcome to Haversack, [Name]! Here's how to get started:" followed by 3 action cards: (1) "Search your accounts" linking to the Accounts screen, (2) "Log your first visit" linking to the activity quick-log, (3) "Explore the product catalog" linking to Products. The welcome card can be dismissed and does not reappear.
- **Empty Account List:** If a Rep has no assigned accounts, the Accounts screen shows: an illustration placeholder (a building icon with a dotted outline, 120px), the message "No accounts assigned to your territory yet. Ask your manager to assign accounts, or create a new prospect." and a "Create Account" primary button.
- **Onboarding Checklist:** A progress checklist appears in the Dashboard sidebar (desktop) or as a collapsible card (mobile) for the first 7 days: "Complete your profile (0/1), Log your first activity (0/1), Create your first order (0/1), Review your pipeline (0/1)." Each item links to the relevant screen. The checklist disappears after all items are completed or after 7 days, whichever comes first.

#### 7.5.2 Contextual CTAs

- **Empty Activity Timeline:** "No activities logged for [Account Name]. Start building the relationship:" with buttons: "Log Call," "Log Visit," "Log Demo."
- **Empty Order History:** "No orders yet for [Account Name]. Create the first order:" with a "New Order" button.
- **Empty Pipeline:** "Your pipeline is empty. Start tracking opportunities:" with a "Create Opportunity" button.
- **Empty Commission Screen:** "No commissions calculated for this period. Commissions are calculated from confirmed orders." with a link to "View Orders."
- **Empty Email Tab:** "No emails sent to [Account Name]. Start the conversation:" with buttons: "Compose Email" and "Use a Template."
- **Empty Search Results:** "No results for '[search term]'. Try different keywords or check spelling." with suggestions: "Search by name, city, SKU, or brand."
- All contextual CTAs use the brand primary color for the action button and muted text (#6B7280) for the descriptive copy.

#### 7.5.3 Illustration Placeholders

- Each empty state includes a lightweight SVG illustration relevant to the context:
  - Accounts: Building with a "+" badge
  - Activities: Clock with a speech bubble
  - Orders: Shopping cart with a dotted outline
  - Pipeline: Funnel with an upward arrow
  - Products: Barcode with a magnifying glass
  - Commissions: Dollar sign with a checkmark
  - Emails: Envelope with a paper airplane
- Illustrations are 120x120px, use only 2 colors (brand primary and a neutral gray), and are inline SVGs (no external image requests) for sub-100ms render time.
- Illustrations are decorative and carry `aria-hidden="true"` to avoid confusing screen readers.

### 7.6 Accessibility

#### 7.6.1 WCAG 2.1 AA Compliance

The platform targets full WCAG 2.1 Level AA compliance across all screens and interaction flows. Compliance is verified through automated testing (axe-core in CI pipeline) and manual testing with screen readers (VoiceOver on iOS/macOS, NVDA on Windows) before each release.

#### 7.6.2 Color Contrast

- **Normal text** (below 18px / 14px bold): Minimum 4.5:1 contrast ratio against background.
- **Large text** (18px+ / 14px+ bold): Minimum 3:1 contrast ratio against background.
- **UI components and graphical objects** (icons, borders, focus indicators): Minimum 3:1 contrast ratio.
- **Color-coded indicators** (health score badges, order status badges, pipeline stages): Color is never the sole indicator. Every color-coded element includes an accompanying text label or icon. Examples:
  - Health score: Green badge with "Healthy" text, yellow badge with "At Risk" text, red badge with "Critical" text.
  - Order status: Each status has a unique icon in addition to color (checkmark for delivered, truck for shipped, clock for pending, X for cancelled).
- **Dark Mode:** Not included in Phase 1. A high-contrast mode toggle is available under More > Settings > Accessibility, which increases all contrast ratios to 7:1 minimum.

#### 7.6.3 Keyboard Navigation

- **Tab Order:** All interactive elements are reachable via Tab key in a logical, left-to-right, top-to-bottom order matching the visual layout. Tab order is validated per screen and does not skip or loop unexpectedly.
- **Focus Indicators:** All focusable elements display a visible focus ring: 2px solid outline in the brand primary color with a 2px offset. Focus indicators are never suppressed via `outline: none` without a visible replacement.
- **Keyboard Shortcuts (Desktop):**
  - `/` or `Ctrl+K`: Open global search
  - `N`: New activity (from Dashboard or Account Detail)
  - `O`: New order (from Dashboard or Account Detail)
  - `Esc`: Close modals, drawers, search overlays
  - `Arrow keys`: Navigate between kanban cards, search results, and table rows
  - `Enter`: Select/activate the focused element
  - `Space`: Toggle checkboxes and radio buttons
- **Skip Links:** A "Skip to main content" link is the first focusable element on every page, visible on focus, allowing keyboard users to bypass navigation.
- **Modal Focus Trapping:** When a modal or drawer opens, focus is trapped within it. Tab cycles through interactive elements inside the modal. Pressing Escape closes the modal and returns focus to the element that triggered it.

#### 7.6.4 Screen Reader Support

- **Semantic HTML:** All pages use semantic elements: `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<aside>`. Headings follow a logical hierarchy (`<h1>` through `<h4>`) with no skipped levels.
- **ARIA Labels:** Interactive elements without visible text labels (icon buttons, the FAB, status badges) include `aria-label` attributes. Examples:
  - FAB: `aria-label="Quick actions menu"`
  - Health score badge: `aria-label="Account health: Healthy"`
  - Sort column header: `aria-label="Sort by account name, currently sorted ascending"`
- **Live Regions:**
  - Toast notifications: `aria-live="polite"` for success/info, `aria-live="assertive"` for errors.
  - Search results count: `aria-live="polite"` announcement: "5 results found" or "No results found."
  - Pipeline stage change: `aria-live="polite"` announcement: "Opportunity moved to Proposal stage."
  - Form validation: `aria-live="polite"` announcement of error messages on blur.
- **Data Tables:** Tables use `<th>` with `scope="col"` for column headers and `scope="row"` for row headers. Sort state is announced via `aria-sort="ascending"` or `aria-sort="descending"`. Row selection state is announced via `aria-selected`.
- **Drag-and-Drop Alternatives:** All drag-and-drop interactions have a keyboard and screen-reader-accessible alternative. For pipeline cards: pressing Enter on a focused card opens a "Move to stage" action menu. The screen reader announces: "Opportunity [Name], currently in [Stage]. Press Enter to move."

#### 7.6.5 Touch Targets

- Minimum touch target size: 44x44px on all mobile and tablet views.
- Interactive elements that are visually smaller than 44px use padding or a transparent overlay to expand the tappable area.
- Adjacent interactive elements maintain a minimum 8px spacing to prevent mis-taps.
- The bottom tab bar tabs are each at least 64px wide (screen width / 5 on a 320px device = 64px) and 56px tall, exceeding the 44px minimum.
- Form inputs are a minimum of 48px in height on mobile.

#### 7.6.6 Motion and Animation

- All animations respect the `prefers-reduced-motion` media query. When `prefers-reduced-motion: reduce` is set:
  - Skeleton shimmer animations are replaced with a static gray placeholder.
  - Drag-and-drop card elevation animations are removed; cards move instantly.
  - Toast notifications appear and disappear without slide-in/slide-out transitions.
  - Pull-to-refresh uses a static indicator instead of a spinning animation.
- No animation exceeds 300ms duration in default mode. No animation auto-plays in a looping fashion (except skeleton loaders, which are replaced under reduced-motion).
