# Conflict Analysis — Feature 5: Product Catalog & Line Cards

**Analyzed:** 2026-02-26

## Schema Conflicts (Prisma)

### Product Model — ADDITIVE
The existing `Product` model (prisma/schema.prisma:440-466) needs new fields:
- `category` — String enum field (new)
- `subcategory` — Optional String field (new)
- `description` — Optional String field (new)
- `imageUrl` — Optional String field (new)
- `certifications` — String array field (new)
- `allergens` — String array field (new)
- `dietaryAttributes` — String array field (new)

No existing fields are changed or removed. All new fields are either optional or have defaults.
New indexes needed: `[tenantId, category]`, `[tenantId, certifications]` (GIN for array).

**Classification: ADDITIVE**

### Brand Model — ADDITIVE
The existing `Brand` model (prisma/schema.prisma:423-438) needs new fields:
- `description` — Optional String field (new)
- `logoUrl` — Optional String field (new)
- `contactName` — Optional String field (new)
- `contactEmail` — Optional String field (new)
- `contactPhone` — Optional String field (new)
- `website` — Optional String field (new)

No existing fields are changed or removed. All new fields are optional.

**Classification: ADDITIVE**

### New Enum — SAFE
- `ProductCategory` enum (new) — does not modify any existing enum

**Classification: SAFE**

## Route Conflicts

### Existing: GET /api/products/search — ADDITIVE
The existing product search route (backend/src/domains/products/product.routes.ts) needs:
- Additional query parameters: `category`, `certification`, `allergen`, `dietaryAttribute`
- The search service needs filter logic for new array fields
- The response schema needs new fields

**Classification: ADDITIVE**

### New Routes — SAFE
All new routes use non-colliding paths:
- `POST /api/products` — create product (new)
- `GET /api/products/:id` — get product by ID (new)
- `PUT /api/products/:id` — update product (new)
- `DELETE /api/products/:id` — soft-delete product (new)
- `GET /api/products` — list products with filters (new)
- `POST /api/brands` — create brand (new)
- `GET /api/brands` — list brands (new)
- `GET /api/brands/:id` — get brand by ID (new)
- `PUT /api/brands/:id` — update brand (new)
- `GET /api/brands/:id/line-card` — generate line card PDF (new)
- `POST /api/brands/:id/line-card/share` — share line card via email (new)

**Classification: SAFE**

## Shared Schema Conflicts

### product.schema.ts — ADDITIVE
The existing shared product schema (packages/shared/src/schemas/product.schema.ts) needs:
- New enum schemas: `productCategorySchema`, `certificationSchema`, `allergenSchema`, `dietaryAttributeSchema`
- Extended `productSearchQuerySchema` with new filter fields
- Extended `productResponseSchema` with new fields
- New schemas: `createProductSchema`, `updateProductSchema`, `productListQuerySchema`

The existing `productSearchQuerySchema` and `productResponseSchema` need new optional fields added. No existing fields change shape or become required.

**Classification: ADDITIVE**

### New: brand.schema.ts — SAFE
Entirely new file for brand CRUD schemas.

**Classification: SAFE**

## Component/Hook Conflicts — SAFE
No frontend components or hooks exist for products/brands yet. All new.

**Classification: SAFE**

## app.ts Registration — ADDITIVE
`backend/src/app.ts` already imports and registers `productRoutes`. The existing registration can be kept; new brand routes need a new registration line.

New import needed: `import { brandRoutes } from './domains/brands/brand.routes';`
New registration: `await app.register(brandRoutes);`

**Classification: ADDITIVE**

## Summary

| Area | Classification | Details |
|------|---------------|---------|
| Product model (Prisma) | ADDITIVE | 7 new fields, 2 new indexes |
| Brand model (Prisma) | ADDITIVE | 6 new optional fields |
| ProductCategory enum | SAFE | New enum |
| GET /api/products/search | ADDITIVE | New query params + response fields |
| 11 new routes | SAFE | Non-colliding paths |
| product.schema.ts | ADDITIVE | New schemas + extended existing |
| brand.schema.ts | SAFE | New file |
| app.ts | ADDITIVE | New brand routes registration |

**Totals: 14 SAFE, 4 ADDITIVE, 0 BREAKING**

**GATE: PASS — No BREAKING conflicts. Proceeding.**
