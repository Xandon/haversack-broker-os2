# Research — Feature 5: Product Catalog & Line Cards

**Reference Domain:** products (existing) + accounts (CRUD pattern reference)
**Date:** 2026-02-26

## Decision 1: Extend Existing Product Domain vs. New Domain

**Decision:** Extend the existing `backend/src/domains/products/` domain with new service functions and routes. Create a new `backend/src/domains/brands/` domain for brand management and line card generation.

**Rationale:** The product domain already has `product.service.ts` with search and `product.routes.ts` with the search route. Adding CRUD operations follows naturally. Brands get their own domain because line card PDF generation is brand-centric and complex enough to warrant separation.

**Alternatives Considered:** Merging brands into the products domain — rejected because line card generation logic would bloat the product service.

## Decision 2: PDF Generation Library

**Decision:** Use PDFKit (`pdfkit` npm package) for server-side PDF generation.

**Rationale:** PDFKit is a mature, pure JavaScript PDF library with zero native dependencies. It runs in Node.js without headless browsers, supports tables, images via URL, and custom layouts. The line card format is a structured document (header + product table + footer) that PDFKit handles well.

**Alternatives Considered:**
- Puppeteer/Playwright for HTML-to-PDF — rejected, too heavy (headless browser dependency), slow startup, not suitable for <10s generation target.
- `pdf-lib` — lower-level, more manual layout work. PDFKit provides better high-level layout APIs.

## Decision 3: Route Pattern — Following Account CRUD Pattern

**Decision:** Follow the account routes pattern for product and brand CRUD:
- `getAuditContext(request)` helper for audit trail
- `handleXxxError()` for domain-specific error mapping
- `authenticate` + `authorize(roles)` preHandler chain
- Zod `parse()` on request body/query
- Structured error responses: `{ error, message, code, requestId }`

**Rationale:** Consistency with existing patterns (accounts: 9 routes, orders: 9 routes). The pattern is well-tested and follows CLAUDE.md conventions.

**Pattern Reference:**
```typescript
// From account.routes.ts - CRUD pattern
app.post('/api/products', { preHandler: [authenticate, authorize('admin', 'manager')] }, ...);
app.get('/api/products', { preHandler: [authenticate] }, ...);
app.get('/api/products/:id', { preHandler: [authenticate] }, ...);
app.put('/api/products/:id', { preHandler: [authenticate, authorize('admin', 'manager')] }, ...);
app.delete('/api/products/:id', { preHandler: [authenticate, authorize('admin', 'manager')] }, ...);
```

## Decision 4: Service Pattern — Following Account Service

**Decision:** Follow the account service pattern with:
- Domain-specific Error class extending Error (`ProductError`, `BrandError`)
- Tenant isolation via `tenantId` in all queries
- Optimistic concurrency via `updatedAt` / `If-Match` header
- Audit trail via `writeAuditLog()` from existing audit service
- Cursor-based pagination for list endpoints

**Rationale:** Direct extension of the pattern established in accounts and orders. Proven to pass all tests and follows CLAUDE.md data integrity requirements.

## Decision 5: Schema Extension Strategy for Product Model

**Decision:** Add new fields to the existing Product Prisma model via an additive migration. Array fields (certifications, allergens, dietaryAttributes) use PostgreSQL string arrays with `@default([])`. New fields are all either optional or have defaults to avoid breaking existing data.

**Rationale:** Additive-only migration preserves existing order data that references products. Default empty arrays for multi-value fields mean existing products remain valid.

**Migration approach:**
```prisma
// New fields on Product model
category         String?          @db.VarChar(50) @map("category")
subcategory      String?          @db.VarChar(100) @map("subcategory")
description      String?          @db.VarChar(2000) @map("description")
imageUrl         String?          @db.VarChar(500) @map("image_url")
certifications   String[]         @default([])
allergens        String[]         @default([])
dietaryAttributes String[]        @default([]) @map("dietary_attributes")
```

## Decision 6: Enhanced Search with Array Filters

**Decision:** Extend the existing `searchProducts` function with additional filter parameters. Use Prisma's `hasSome` operator for array field filtering (certifications, allergens, dietary attributes).

**Rationale:** Prisma supports PostgreSQL array operations natively. `hasSome` maps to PostgreSQL's `&&` (overlap) operator, which is efficient with GIN indexes.

**Pattern:**
```typescript
// Array filter example
where: {
  certifications: { hasSome: ['organic', 'non_gmo'] },
  category: 'condiments',
}
```

## Decision 7: Line Card PDF Response Pattern

**Decision:** The line card endpoint returns a PDF buffer directly with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="..."`. No intermediate storage or caching.

**Rationale:** On-demand generation is simpler and avoids file storage concerns. The 10-second timeout is generous for PDFKit generating a product table. For the email share endpoint, the same generation logic is reused internally.

**Pattern:**
```typescript
app.get('/api/brands/:id/line-card', async (request, reply) => {
  const pdfBuffer = await generateLineCard(prisma, tenantId, brandId);
  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(pdfBuffer);
});
```
