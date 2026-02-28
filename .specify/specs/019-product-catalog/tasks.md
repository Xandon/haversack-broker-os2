# F-006: Product Catalog & Brands — Tasks

## Feature Reference
- **PRD:** FR-041
- **Spec Dir:** .specify/specs/019-product-catalog
- **Starting Task:** T349
- **Starting Batch:** 51

---

## Batch 51: Product Hooks & Product List Page (T349-T357)

**Goal**: Deliver /products page with grid/list toggle, filters, and product cards
**Visual**: Rep can browse products with filters, toggle grid/list views
**Depends on**: None
**Branch**: `feature/batch-51-product-list`

### Hooks

- [ ] T349 [P] Create `useProducts` hook — GET /api/products with cursor pagination, filters (brand, category, certification, availability), sort. Returns products array + pagination. (NEW)
- [ ] T350 [P] Create `useProduct` hook — GET /api/products/:id, returns product detail. (NEW)
- [ ] T351 [P] Create `useBrands` hook — GET /api/brands with cursor pagination, isActive filter. Returns brands array with counts. (NEW)
- [ ] T352 [P] Create `useBrand` hook — GET /api/brands/:id, returns brand detail. (NEW)
- [ ] T353 [P] Write tests for hooks (useProducts, useProduct, useBrands, useBrand). (NEW)

### Components & Pages

- [ ] T354 Create product-card component — shows name, brand, price, availability badge, certification badges, image placeholder. Grid and list variants. (NEW)
- [ ] T355 Create product-filters component — brand select, category select, certification select, availability select, view toggle (grid/list). (NEW)
- [ ] T356 Create /products page — PageHeader, ProductFilters, product grid/list with ProductCards, cursor pagination, loading/empty/error states. (NEW)
- [ ] T357 Write tests for product components and page. (NEW)

**Checkpoint**: Rep can view /products with filters, grid/list toggle, and pagination.

---

## Batch 52: Product Detail, Brand List, Brand Detail (T358-T365)

**Goal**: Deliver /products/[id], /brands, and /brands/[id] pages with line card actions
**Visual**: Rep can view product details, browse brands, view brand detail with line card PDF
**Depends on**: Batch 51
**Branch**: `feature/batch-52-product-brand-detail`

### Hooks

- [ ] T358 [P] Create `useGenerateLineCard` hook — GET /api/brands/:id/line-card, returns PDF blob for download. (NEW)
- [ ] T359 [P] Create `useShareLineCard` hook — POST /api/brands/:id/line-card/share with accountId. (NEW)
- [ ] T360 [P] Write tests for line card hooks. (NEW)

### Components & Pages

- [ ] T361 Create /products/[id] page — product detail with pricing, certifications, allergens, availability, brand link. Loading/error states. (NEW)
- [ ] T362 Create /brands page — brand list with data-table, product counts, active status. Loading/empty/error states. (NEW)
- [ ] T363 Create /brands/[id] page — brand detail with info, product list, line card download button, share dialog. Loading/error states. (NEW)
- [ ] T364 Write tests for product detail, brand list, brand detail pages. (NEW)
- [ ] T365 Add Products and Brands links to sidebar navigation. (NEW, MOD sidebar.tsx)

**Checkpoint**: Full product catalog and brand browsing with line card PDF generation and email sharing.

---

## Dependencies

- Batch 51: No dependencies
- Batch 52: Depends on Batch 51 (hooks)

### Parallel Opportunities
- T349, T350, T351, T352, T353 all parallel
- T358, T359, T360 all parallel
- T361, T362, T363 can be built in parallel after hooks
