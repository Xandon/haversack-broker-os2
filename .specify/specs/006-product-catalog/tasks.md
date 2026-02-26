# Tasks — Feature 5: Product Catalog & Brand Line Cards

**Task range:** T093-T115
**Batches:** 3 (Batch 13-15)
**Global batch counter starts at:** 13

## Batch 13: Schema Extensions, Shared Schemas & Product CRUD (T093-T101)

Branch: `feature/batch-batch-13-product-catalog-schema`

### US-1: Product Catalog CRUD

**T093** — Extend Product Prisma model with catalog fields
- **Description:** Add category, subcategory, description, imageUrl, certifications, allergens, dietaryAttributes fields to the Product model. Add ProductCategory enum. Add index on [tenantId, category]. All new fields optional or with defaults.
- **Files:** prisma/schema.prisma (MOD)
- **Workspace:** prisma
- **Refs:** FR-018
- **Depends on:** none

**T094** — Extend Brand Prisma model with catalog and contact fields
- **Description:** Add description, logoUrl, contactName, contactEmail, contactPhone, website fields to the Brand model. All optional.
- **Files:** prisma/schema.prisma (MOD)
- **Workspace:** prisma
- **Refs:** FR-019c
- **Depends on:** none
- **[P]** Can run in parallel with T093

**T095** — Create brand Zod schemas in shared package
- **Description:** Create brand.schema.ts with: createBrandSchema, updateBrandSchema, brandListQuerySchema, brandResponseSchema, brandWithCountsResponseSchema, lineCardShareSchema. Include enum schemas for certifications, allergens, dietary attributes, product categories.
- **Files:** packages/shared/src/schemas/brand.schema.ts (NEW), packages/shared/src/schemas/brand.schema.test.ts (NEW), packages/shared/src/index.ts (MOD)
- **Workspace:** shared
- **Refs:** FR-019c
- **Depends on:** none
- **[P]** Can run in parallel with T093, T094

**T096** — Extend product Zod schemas for CRUD and enhanced search
- **Description:** Add to product.schema.ts: createProductSchema, updateProductSchema, productListQuerySchema, productDetailResponseSchema. Enhance productSearchQuerySchema with category, certification filters. Increase limit max to 100. Add certification, allergen, dietary attribute enum schemas.
- **Files:** packages/shared/src/schemas/product.schema.ts (MOD), packages/shared/src/schemas/product.schema.test.ts (MOD), packages/shared/src/index.ts (MOD)
- **Workspace:** shared
- **Refs:** FR-018, FR-018b
- **Depends on:** none
- **[P]** Can run in parallel with T093-T095

**T097** — Implement product CRUD service functions
- **Description:** Add to product.service.ts: createProduct, getProductById (enhanced with new fields), updateProduct (with optimistic concurrency), softDeleteProduct, listProducts (with cursor pagination and multi-filter: brand, category, certification, allergen, dietary, availability). Enhance searchProducts with new filter params.
- **Files:** backend/src/domains/products/product.service.ts (MOD), backend/src/domains/products/product.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-018a, FR-018b, FR-018c, FR-018d, FR-018e
- **Depends on:** T093, T096

**T098** — Implement product CRUD routes
- **Description:** Add to product.routes.ts: POST /api/products, GET /api/products, GET /api/products/:id, PUT /api/products/:id, DELETE /api/products/:id. Enhance existing GET /api/products/search with new query params. Add ProductError handler. Audit trail for create/update/delete.
- **Files:** backend/src/domains/products/product.routes.ts (MOD), backend/src/domains/products/product.routes.test.ts (MOD), backend/src/domains/products/index.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-018a, FR-018e, AC-018a, AC-018b
- **Depends on:** T097

**T099** — Implement brand CRUD service
- **Description:** Create brand.service.ts with: createBrand, getBrandById, updateBrand (optimistic concurrency), listBrands (with product counts: total + active). Audit trail for create/update.
- **Files:** backend/src/domains/brands/brand.service.ts (NEW), backend/src/domains/brands/brand.service.test.ts (NEW)
- **Workspace:** backend
- **Refs:** FR-019c
- **Depends on:** T094, T095

**T100** — Implement brand CRUD routes
- **Description:** Create brand.routes.ts with: POST /api/brands, GET /api/brands, GET /api/brands/:id, PUT /api/brands/:id. Register in app.ts. Add BrandError handler. RBAC: admin/manager for write, all authed for read.
- **Files:** backend/src/domains/brands/brand.routes.ts (NEW), backend/src/domains/brands/brand.routes.test.ts (NEW), backend/src/domains/brands/index.ts (NEW), backend/src/app.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-019c
- **Depends on:** T099

**T101** — Product + brand integration tests
- **Description:** Integration tests covering: product create with all fields -> search with filters -> update -> soft-delete flow. Brand create -> list with product counts. Cross-entity: create brand, create products under brand, verify list includes counts. Verify audit trail entries.
- **Files:** backend/src/domains/products/product.service.test.ts (MOD), backend/src/domains/brands/brand.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** SC-001, SC-002, SC-004
- **Depends on:** T098, T100

## Batch 14: Line Card PDF Generation & Share (T102-T108)

Branch: `feature/batch-batch-14-line-card-pdf`

### US-4: Brand Line Card PDF Generation

**T102** — Add PDFKit dependency
- **Description:** Install pdfkit package in backend workspace. Add @types/pdfkit if needed. Verify import works.
- **Files:** backend/package.json (MOD)
- **Workspace:** backend
- **Refs:** FR-019
- **Depends on:** T100

**T103** — Implement line card PDF generation service
- **Description:** Create line-card.service.ts with generateLineCard function. Takes prisma, tenantId, brandId. Fetches brand + all active products. Generates PDF with: header (brand name, logo URL, date), product table (name, SKU, description, unit price, wholesale price, case size, certifications, availability), footer (generated by + page numbers). US Letter size, Helvetica font. Returns Buffer.
- **Files:** backend/src/domains/brands/line-card.service.ts (NEW), backend/src/domains/brands/line-card.service.test.ts (NEW)
- **Workspace:** backend
- **Refs:** FR-019, FR-019a, AC-019a, SC-003, SC-006
- **Depends on:** T102

**T104** — Implement line card routes (generate + share)
- **Description:** Add to brand.routes.ts: GET /api/brands/:id/line-card (returns PDF buffer with Content-Type: application/pdf), POST /api/brands/:id/line-card/share (generates PDF, resolves account primary contact email, enqueues email notification). Handle: brand not found, no active products, account not found, no primary contact.
- **Files:** backend/src/domains/brands/brand.routes.ts (MOD), backend/src/domains/brands/brand.routes.test.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-019, FR-019b, AC-019a, AC-019b
- **Depends on:** T103

**T105** — Implement line card email share service
- **Description:** Create line-card-share.service.ts with shareLineCard function. Resolves account's primary contact email from the contacts table. Generates PDF. Enqueues email notification via the existing email notification queue with PDF attachment metadata.
- **Files:** backend/src/domains/brands/line-card-share.service.ts (NEW), backend/src/domains/brands/line-card-share.service.test.ts (NEW)
- **Workspace:** backend
- **Refs:** FR-019b, AC-019b
- **Depends on:** T103

**T106** — Line card integration tests
- **Description:** Integration tests: generate line card for brand with 5 products (verify non-empty PDF buffer, correct headers). Generate for brand with 0 active products (verify error). Share line card with valid account (verify email enqueued). Share with account missing primary contact (verify error).
- **Files:** backend/src/domains/brands/line-card.service.test.ts (MOD), backend/src/domains/brands/brand.routes.test.ts (MOD)
- **Workspace:** backend
- **Refs:** SC-003, SC-006
- **Depends on:** T104, T105

**T107** — Enhanced product search integration tests
- **Description:** Integration tests specifically for multi-filter search (AC-018b pattern): seed products with diverse categories/certifications, test AND logic for brand+category+certification+availability combos, verify result counts, verify empty results message.
- **Files:** backend/src/domains/products/product.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-018b, FR-018c, AC-018b, SC-002, SC-005
- **Depends on:** T098

**T108** — Verify existing order flow with extended product model
- **Description:** Regression test: create a product with new fields, create an order referencing it, verify order creation still works. Update product to discontinued, verify existing order unaffected. Run full order lifecycle with extended product.
- **Files:** backend/src/domains/products/product.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** US-1 AC-4 (backward compatibility)
- **Depends on:** T097

## Batch 15: RBAC, Audit & Polish (T109-T115)

Branch: `feature/batch-batch-15-product-rbac-polish`

### Cross-cutting: RBAC, audit, edge cases

**T109** — RBAC enforcement tests for product routes
- **Description:** Test all product routes with each role: admin (full access), manager (full access), rep (read + search only), logistics (read only), viewer (read only). Verify 403 for unauthorized operations.
- **Files:** backend/src/domains/products/product.routes.test.ts (MOD)
- **Workspace:** backend
- **Refs:** C9 (RBAC clarification)
- **Depends on:** T098

**T110** — RBAC enforcement tests for brand routes
- **Description:** Test all brand routes with each role: admin/manager (full CRUD + line card), rep (read + line card generate only), logistics/viewer (read only). Verify 403 for unauthorized operations.
- **Files:** backend/src/domains/brands/brand.routes.test.ts (MOD)
- **Workspace:** backend
- **Refs:** C9 (RBAC clarification)
- **Depends on:** T100, T104

**T111** — Audit trail verification tests
- **Description:** Verify audit trail records are created for: product create, product update, product soft-delete, brand create, brand update. Each audit record must include entity type, entity ID, action, changes, and actor info.
- **Files:** backend/src/domains/products/product.service.test.ts (MOD), backend/src/domains/brands/brand.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** SC-004, US-1 AC-3
- **Depends on:** T097, T099

**T112** — Optimistic concurrency tests for products and brands
- **Description:** Test concurrent update scenarios: two simultaneous updates to same product with stale updatedAt -> second update returns 409 Conflict. Same for brands. Verify correct updatedAt version check.
- **Files:** backend/src/domains/products/product.service.test.ts (MOD), backend/src/domains/brands/brand.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-018e, edge case (concurrent updates)
- **Depends on:** T097, T099

**T113** — Edge case tests: SKU uniqueness, brand deactivation cascade
- **Description:** Test: create product with duplicate SKU -> 409 error. Create brand, create products, deactivate brand -> products excluded from active search but still in database. Product with active orders -> soft-delete succeeds, orders unaffected.
- **Files:** backend/src/domains/products/product.service.test.ts (MOD), backend/src/domains/brands/brand.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-018d, edge cases section
- **Depends on:** T097, T099

**T114** — Product image URL handling tests
- **Description:** Test: create product with valid imageUrl -> persisted and returned. Create product without imageUrl -> null in response. Update product to add imageUrl. Verify imageUrl included in line card generation data.
- **Files:** backend/src/domains/products/product.service.test.ts (MOD)
- **Workspace:** backend
- **Refs:** US-5 (Product Image Management)
- **Depends on:** T097

**T115** — Line card PDF timeout and error handling tests
- **Description:** Test: line card generation with many products (verify completes within 10s mock). Brand with only discontinued products -> error. Invalid brand ID -> 404. Verify PDF filename format matches `{brand-name}-line-card-{YYYY-MM-DD}.pdf`.
- **Files:** backend/src/domains/brands/line-card.service.test.ts (MOD), backend/src/domains/brands/brand.routes.test.ts (MOD)
- **Workspace:** backend
- **Refs:** FR-019a, edge cases (timeout, no active products)
- **Depends on:** T103, T104

## Task Summary

| Batch | Tasks | Description | Est. Tests |
|-------|-------|-------------|-----------|
| 13 | T093-T101 | Schema, shared schemas, product + brand CRUD | ~50 |
| 14 | T102-T108 | Line card PDF, email share, search integration | ~30 |
| 15 | T109-T115 | RBAC, audit, concurrency, edge cases | ~30 |

**Total tasks:** 23 (T093-T115)
**Total batches:** 3 (Batch 13-15)
**Estimated tests:** ~110

## Dependency Graph

```
T093 (Product schema) ──────────┐
T094 (Brand schema) ───────────┐├── T097 (Product CRUD service) ── T098 (Product routes) ── T101 (Integration)
T095 (Brand Zod schemas) ──────┤│                                                           ├── T107 (Search tests)
T096 (Product Zod schemas) ────┘├── T099 (Brand CRUD service) ── T100 (Brand routes) ───── T101 (Integration)
                                │                                      │
                                │                               T102 (PDFKit dep)
                                │                                      │
                                │                               T103 (Line card service)
                                │                                      │
                                │                         ┌── T104 (Line card routes)
                                │                         │           │
                                │                         └── T105 (Share service)
                                │                                     │
                                │                               T106 (Line card tests)
                                │
                                └── T108 (Order regression)

Batch 15 (RBAC/Audit/Edge):
T109 depends on T098
T110 depends on T100, T104
T111 depends on T097, T099
T112 depends on T097, T099
T113 depends on T097, T099
T114 depends on T097
T115 depends on T103, T104
```
