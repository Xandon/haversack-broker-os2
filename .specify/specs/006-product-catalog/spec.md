# Feature Specification: Product Catalog & Brand Line Cards

**Feature Branch**: `006-product-catalog`
**Created**: 2026-02-26
**Status**: Draft
**PRD References**: FR-018, FR-019 | US-005, US-007

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Product Catalog CRUD (Priority: P1)

As an Admin, I want to create, update, and manage products in the catalog with full attributes (category, certifications, allergens, dietary info, images), so that reps can browse and search an accurate, up-to-date product catalog.

**Implements:** FR-018
**Why this priority**: The product catalog is the foundation for order entry, line cards, and AI suggestions. Without rich product data, downstream features lack context.

**Independent Test**: Can be tested by creating a product with all FR-018 fields, then verifying it appears in search results filtered by category and certification.

**Acceptance Scenarios**:

1. **Given** an Admin is authenticated, **When** they create a new Product with brand "Mountain Meadow Farms," category "Honey," certifications ["Organic", "Non-GMO"], and availability "Active," **Then** the product is persisted with all fields and appears in search results when a Rep searches by brand name, category, or certification. (AC-018a)

2. **Given** a product exists with category "Condiments" and certification "Organic," **When** the Admin updates the product's category to "Spreads," **Then** the product no longer appears in "Condiments" filtered results and appears in "Spreads" filtered results.

3. **Given** an Admin creates a product, **When** the product is saved, **Then** an audit trail record is written capturing the create action, all field values, and the acting user.

4. **Given** a product has active orders referencing it, **When** an Admin sets its availability to "discontinued," **Then** the product is soft-deactivated (not deleted), existing orders are unaffected, and the product no longer appears in active catalog searches.

---

### User Story 2 — Product Catalog Search & Filtering (Priority: P1)

As a territory representative, I want to search and filter the product catalog by brand, category, certification, and availability status, so that I can quickly find products during order entry or buyer meetings.

**Implements:** FR-018
**Why this priority**: Search is the primary interaction point for reps — they need fast, filterable access to products during live buyer meetings.

**Independent Test**: Can be tested by seeding products with various categories and certifications, then verifying filter combinations return correct results with counts.

**Acceptance Scenarios**:

1. **Given** a Rep browses the product catalog filtered by certification "Organic" and category "Condiments," **When** results load, **Then** only products matching both "Organic" certification AND "Condiments" category are displayed, with a result count shown. (AC-018b)

2. **Given** the product catalog contains 50+ products, **When** a Rep types a search query, **Then** results are returned within 200ms matching by name, SKU, brand name, category, or certification.

3. **Given** a Rep applies multiple filters (brand + category + certification + availability), **When** the results load, **Then** all filters are applied as AND conditions and the result count reflects the intersection.

4. **Given** a Rep searches with no matching results, **When** results load, **Then** the system displays "No products found" with a suggestion to broaden the search criteria.

---

### User Story 3 — Brand Management (Priority: P1)

As an Admin, I want to create and manage brands with descriptions, logos, and contact information, so that the brand catalog is complete and line cards can be generated with rich brand data.

**Implements:** FR-018, FR-019
**Why this priority**: Brands are the organizational unit for products and line cards. Rich brand data enables meaningful line card PDFs.

**Independent Test**: Can be tested by creating a brand with all attributes, associating products, and verifying the brand detail API returns complete data.

**Acceptance Scenarios**:

1. **Given** an Admin is authenticated, **When** they create a new Brand with name, description, logo URL, and commission rate, **Then** the brand is persisted and available for product association.

2. **Given** a Brand has products associated, **When** the Admin updates the brand's commission rate, **Then** the new rate is used for future commission calculations and an audit trail records the change.

3. **Given** a Brand exists, **When** the Admin lists all brands, **Then** brands are returned with product counts and active/total product breakdowns.

---

### User Story 4 — Brand Line Card PDF Generation (Priority: P2)

As a Manager or Rep, I want to generate a professional PDF line card for a selected brand listing all active products with images, descriptions, pricing, certifications, and availability, so that I can share it with retail buyers during sales meetings.

**Implements:** FR-019
**Why this priority**: Line cards are a key sales tool. PDF generation enables offline sharing and professional presentation of product offerings.

**Independent Test**: Can be tested by generating a line card for a brand with multiple products and verifying the resulting PDF contains all required data fields.

**Acceptance Scenarios**:

1. **Given** a Manager selects brand "Mountain Meadow Farms" and requests a line card, **When** PDF generation completes (within 10 seconds), **Then** the resulting PDF contains all active products for that brand with product names, descriptions, unit prices, case sizes, and certification icons. (AC-019a)

2. **Given** a brand has 0 active products, **When** a user requests a line card, **Then** the system returns an error "No active products found for this brand — cannot generate line card."

3. **Given** a line card is generated, **When** the user requests it, **Then** the PDF filename follows the pattern `{brand-name}-line-card-{YYYY-MM-DD}.pdf` and is returned as a downloadable file.

4. **Given** a generated line card PDF is available, **When** the user clicks "Share via Email," **Then** the system attaches the PDF to a new email composition payload pre-populated with the selected Account's primary contact email address. (AC-019b)

---

### User Story 5 — Product Image Management (Priority: P3)

As an Admin, I want to upload and manage product images, so that products display visually in the catalog and on line card PDFs.

**Implements:** FR-018
**Why this priority**: Images enhance both the catalog browsing experience and line card quality, but the system is functional without them.

**Independent Test**: Can be tested by uploading an image URL for a product and verifying it appears in product detail responses and line card PDFs.

**Acceptance Scenarios**:

1. **Given** an Admin provides an image URL for a product, **When** the product is saved, **Then** the image URL is persisted and returned in product detail and search responses.

2. **Given** a product has no image, **When** the product appears in a line card, **Then** a placeholder image area is rendered with the text "No image available."

---

### Edge Cases

- What happens when a product SKU conflicts with an existing SKU? System rejects with "SKU already exists for this tenant" error.
- What happens when a brand referenced by a product is deactivated? Products remain but are excluded from active catalog searches. Existing orders are unaffected.
- What happens when PDF generation exceeds the 10-second timeout? System returns a 504 error with message "Line card generation timed out — please try again."
- What happens when a certification value is not in the allowed list? System rejects with a Zod validation error listing valid certifications.
- What happens when the product catalog has 1000+ products for a single brand? Line card generation paginates internally and includes all products. Search uses cursor pagination with a configurable limit (default 20, max 100).
- What happens when a product is updated concurrently by two admins? Optimistic concurrency via `updatedAt` version check — second update gets a 409 Conflict error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-018**: The system MUST maintain a Product catalog with fields: product name, SKU, brand, category, subcategory, unit price, wholesale price, case size, certifications (organic, non-GMO, gluten-free, kosher, vegan), allergens, dietary attributes, availability status (active, seasonal, discontinued), and a product image URL.
- **FR-018a**: The system MUST allow Admin users to create, read, update, and soft-delete products.
- **FR-018b**: The system MUST support filtering products by brand, category, subcategory, certification, allergen, dietary attribute, and availability status — all as AND conditions.
- **FR-018c**: The system MUST return product search results within 200ms at p95 for catalogs up to 10,000 products.
- **FR-018d**: The system MUST enforce unique SKU per tenant.
- **FR-018e**: The system MUST support optimistic concurrency control for product updates.
- **FR-019**: The system MUST allow a Manager or Admin to generate a Brand line card (PDF) for a selected Brand, listing all active products with names, descriptions, pricing, certifications, and availability, formatted for sharing with retail buyers.
- **FR-019a**: Line card PDF generation MUST complete within 10 seconds.
- **FR-019b**: The system MUST support sharing a generated line card via email, attaching the PDF and pre-populating the recipient from the Account's primary contact.
- **FR-019c**: The system MUST allow Admin users to create, update, and list brands with fields: name, description, logo URL, commission rate, and active status.

### Key Entities

- **Product**: A sellable item belonging to a Brand. Attributes: name, SKU, brand, category, subcategory, unit price, wholesale price, case size, certifications, allergens, dietary attributes, availability status, image URL, revenue model default.
- **Brand**: A supplier/manufacturer represented by Haversack. Attributes: name, description, logo URL, commission rate, active status, contact info.
- **LineCard**: A generated PDF document listing all active products for a brand, with pricing and certification details. Generated on-demand, not persisted as a database entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can create a product with all FR-018 fields and find it via filtered search within 200ms.
- **SC-002**: Product search supports combined brand + category + certification filters returning correct intersection results.
- **SC-003**: Line card PDF generation completes within 10 seconds for brands with up to 200 active products.
- **SC-004**: All product and brand CRUD operations produce audit trail records.
- **SC-005**: Product catalog search returns results within 200ms at p95.
- **SC-006**: Generated line card PDFs contain all required fields: product name, description, unit price, case size, certifications, and availability.

## Clarifications

### C1: Predefined Certification Values
**Ambiguity:** What are the allowed certification values?
**Resolution:** Per PRD FR-018, the allowed certifications are: `organic`, `non_gmo`, `gluten_free`, `kosher`, `vegan`. Stored as a string array on the Product model. Validated via Zod enum array.

### C2: Predefined Allergen Values
**Ambiguity:** What allergen values should the system support?
**Resolution:** Use the FDA Big 9 allergens required under FSMA labeling: `wheat`, `milk`, `eggs`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `soybeans`, `sesame`. Stored as a string array. This aligns with Haversack's specialty food domain and FSMA compliance requirements.

### C3: Predefined Dietary Attribute Values
**Ambiguity:** What dietary attributes should the system support?
**Resolution:** Common dietary attributes for specialty food: `vegetarian`, `vegan`, `keto`, `paleo`, `low_sodium`, `sugar_free`, `dairy_free`, `whole_grain`. Stored as a string array. Note: `vegan` appears in both certifications (third-party verified) and dietary attributes (self-declared) — these serve different purposes.

### C4: Product Category and Subcategory Values
**Ambiguity:** Should categories/subcategories be predefined enums or freetext?
**Resolution:** Categories use a predefined string enum for consistency and searchability. Initial set based on Haversack's specialty food portfolio: `honey`, `condiments`, `spreads`, `sauces`, `snacks`, `beverages`, `dairy`, `bakery`, `produce`, `meat`, `seafood`, `pantry`, `frozen`, `other`. Subcategory is freetext string (optional) since subcategories vary widely by category.

### C5: Brand Contact Information Fields
**Ambiguity:** What fields constitute "contact info" on the Brand entity?
**Resolution:** Brand contact info includes: `contactName` (varchar, optional), `contactEmail` (varchar, optional), `contactPhone` (varchar, optional), `website` (varchar, optional). These are simple flat fields on the Brand model — no separate contact entity needed.

### C6: Product Description Field
**Ambiguity:** Is product description required? What format?
**Resolution:** Product description is an optional plain text field (varchar 2000). Not required — many products may be imported from existing catalog data without descriptions. Used in line card PDFs when available.

### C7: Line Card Email Sharing API Design
**Ambiguity:** How does "share via email" work when it needs both a brandId (for the PDF) and an accountId (for the recipient)?
**Resolution:** Two-step API: (1) `GET /api/brands/:brandId/line-card` returns the PDF buffer. (2) `POST /api/brands/:brandId/line-card/share` with body `{ accountId }` generates the PDF, resolves the account's primary contact email, and enqueues an email with the PDF attachment. This keeps the generate and share operations independent.

### C8: Line Card PDF Layout
**Ambiguity:** What is the PDF layout structure?
**Resolution:** The line card PDF follows a standard trade document format:
- **Header:** Brand name, logo (if available), date generated
- **Product table:** Each product as a row with: name, SKU, description (truncated to 100 chars), unit price, wholesale price (if available), case size, certifications (as icon abbreviations: ORG, NGM, GF, K, V), availability status
- **Footer:** "Generated by Haversack Sales — {date}" with page numbers
- **Page size:** US Letter (8.5" x 11"), portrait orientation
- **Font:** Helvetica (built into PDFKit, no external font dependencies)

### C9: RBAC Permissions for Product and Brand Operations
**Ambiguity:** Which roles can perform which operations?
**Resolution:** Following existing RBAC patterns:
- **Admin/Manager:** Full CRUD on products and brands, generate + share line cards
- **Rep:** Read products, search catalog, generate line cards (read-only on catalog data)
- **Logistics/Viewer:** Read products only (no line card generation)

## Assumptions

- The existing Product and Brand Prisma models (from Feature 4) will be extended with ADDITIVE schema changes — no existing fields are removed or renamed.
- PDF generation will use a server-side library (e.g., PDFKit or similar Node.js PDF library) — no headless browser rendering required.
- Product images are stored as external URLs (not uploaded to the server). File upload support is out of scope for this feature.
- Line cards are generated on-demand and not cached or persisted. A background job approach is unnecessary given the 10-second timeout target.
- The email sharing capability for line cards integrates with the existing email notification infrastructure from Feature 3.
- Certifications, allergens, and dietary attributes use predefined enum values rather than free-text to ensure consistency and searchability.
