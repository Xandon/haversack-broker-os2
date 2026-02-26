# Implementation Plan: Product Catalog & Brand Line Cards

**Branch**: `006-product-catalog` | **Date**: 2026-02-26 | **Spec**: `006-product-catalog/spec.md`

## Summary

Extend the existing Product and Brand Prisma models with rich catalog fields (category, certifications, allergens, dietary attributes, images). Add full CRUD for products and brands with advanced multi-filter search. Implement brand line card PDF generation via PDFKit with email sharing capability. All changes are additive to existing models.

## Technical Context

**Language/Version**: TypeScript 5.4+ / Node.js 20 LTS
**Primary Dependencies**: Fastify 4+, Prisma 5+, Zod, PDFKit (new dependency)
**Storage**: PostgreSQL 16+ with array fields + GIN indexes
**Testing**: Vitest (unit + integration), Supertest
**Target Platform**: Docker containers (backend + worker)
**Performance Goals**: Product search <200ms p95, Line card PDF <10s
**Constraints**: Additive-only schema changes, tenant isolation, audit trail required

## Project Structure

### Source Code

```text
# MODIFIED files (existing)
prisma/schema.prisma                                    — MOD: Add fields to Product + Brand, new enum
packages/shared/src/schemas/product.schema.ts           — MOD: Extend with CRUD schemas + new filters
packages/shared/src/schemas/product.schema.test.ts      — MOD: Tests for new schemas
packages/shared/src/index.ts                            — MOD: Export new schemas
backend/src/domains/products/product.service.ts         — MOD: Add CRUD + enhanced search
backend/src/domains/products/product.service.test.ts    — MOD: Tests for new service functions
backend/src/domains/products/product.routes.ts          — MOD: Add CRUD routes + enhanced search params
backend/src/domains/products/product.routes.test.ts     — MOD: Tests for new routes
backend/src/domains/products/index.ts                   — MOD: Export new functions
backend/src/app.ts                                      — MOD: Register brand routes

# NEW files
packages/shared/src/schemas/brand.schema.ts             — NEW: Brand CRUD Zod schemas
packages/shared/src/schemas/brand.schema.test.ts        — NEW: Brand schema tests
backend/src/domains/brands/                             — NEW: Brand domain directory
backend/src/domains/brands/brand.service.ts             — NEW: Brand CRUD service
backend/src/domains/brands/brand.service.test.ts        — NEW: Brand service tests
backend/src/domains/brands/brand.routes.ts              — NEW: Brand API routes
backend/src/domains/brands/brand.routes.test.ts         — NEW: Brand route tests
backend/src/domains/brands/line-card.service.ts         — NEW: PDF generation service
backend/src/domains/brands/line-card.service.test.ts    — NEW: Line card service tests
backend/src/domains/brands/line-card-share.service.ts   — NEW: Email share service
backend/src/domains/brands/line-card-share.service.test.ts — NEW: Share service tests
backend/src/domains/brands/index.ts                     — NEW: Brand domain barrel export
```

**File count: 22 files (12 new, 10 modified)**

## Data Model Changes

### Product Model — ADDITIVE fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| category | String? (VarChar 50) | Optional | null | From ProductCategory enum |
| subcategory | String? (VarChar 100) | Optional | null | Freetext |
| description | String? (VarChar 2000) | Optional | null | Plain text |
| imageUrl | String? (VarChar 500) | Optional | null | External URL |
| certifications | String[] | No | [] | Validated enum values |
| allergens | String[] | No | [] | FDA Big 9 values |
| dietaryAttributes | String[] | No | [] | Validated enum values |

New indexes: `[tenantId, category]`

### Brand Model — ADDITIVE fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| description | String? (VarChar 2000) | Optional | null | Brand overview |
| logoUrl | String? (VarChar 500) | Optional | null | External URL |
| contactName | String? (VarChar 255) | Optional | null | Brand rep name |
| contactEmail | String? (VarChar 255) | Optional | null | Brand rep email |
| contactPhone | String? (VarChar 50) | Optional | null | Brand rep phone |
| website | String? (VarChar 255) | Optional | null | Brand website |

## API Contracts

### Product Endpoints

| Method | Path | Auth | Body/Query | Response |
|--------|------|------|-----------|----------|
| POST | /api/products | admin, manager | CreateProductSchema | 201 { data: Product } |
| GET | /api/products | all authed | ProductListQuerySchema | 200 { data: Product[], pagination } |
| GET | /api/products/search | rep, manager | ProductSearchQuerySchema (enhanced) | 200 { data: ProductSearchResult[] } |
| GET | /api/products/:id | all authed | — | 200 { data: Product } |
| PUT | /api/products/:id | admin, manager | UpdateProductSchema + If-Match | 200 { data: Product } |
| DELETE | /api/products/:id | admin, manager | — | 200 { data: { id, deleted } } |

### Brand Endpoints

| Method | Path | Auth | Body/Query | Response |
|--------|------|------|-----------|----------|
| POST | /api/brands | admin, manager | CreateBrandSchema | 201 { data: Brand } |
| GET | /api/brands | all authed | BrandListQuerySchema | 200 { data: Brand[], pagination } |
| GET | /api/brands/:id | all authed | — | 200 { data: Brand } |
| PUT | /api/brands/:id | admin, manager | UpdateBrandSchema + If-Match | 200 { data: Brand } |
| GET | /api/brands/:id/line-card | rep, manager, admin | — | 200 application/pdf |
| POST | /api/brands/:id/line-card/share | manager, admin | { accountId: uuid } | 200 { data: { sent } } |

## Quickstart Validation Scenarios

1. **Product CRUD:** Create product with all fields -> get by ID -> update category -> verify search returns updated data -> soft-delete -> verify excluded from active search
2. **Multi-filter search:** Seed 10 products across 3 brands, 4 categories, 3 certifications -> filter by brand+category+certification -> verify AND logic and result count
3. **Brand CRUD:** Create brand with all fields -> list brands with product counts -> update commission rate -> verify audit trail
4. **Line card PDF:** Create brand with 5 active products -> generate line card -> verify PDF contains all product names, prices, certifications
5. **Line card share:** Generate line card -> share via email with account -> verify email enqueued with PDF attachment and correct recipient
