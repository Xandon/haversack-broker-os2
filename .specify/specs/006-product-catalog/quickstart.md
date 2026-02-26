# Quickstart Validation — Feature 5: Product Catalog & Line Cards

## Scenario 1: Product Full Lifecycle

1. POST /api/brands — create "Mountain Meadow Farms" brand
2. POST /api/products — create product: category "honey", certifications ["organic", "non_gmo"]
3. GET /api/products/:id — verify all fields returned including new catalog fields
4. GET /api/products?category=honey&certification=organic — verify product found
5. PUT /api/products/:id — update category to "condiments"
6. GET /api/products?category=honey — verify product NOT found
7. GET /api/products?category=condiments — verify product found
8. DELETE /api/products/:id — soft-delete
9. GET /api/products?category=condiments — verify product NOT found in active results

## Scenario 2: Multi-Filter Search

1. Seed 10 products: 3 brands x 4 categories x assorted certifications
2. GET /api/products?brandId=X&category=honey — verify AND filter
3. GET /api/products?certification=organic&category=condiments — verify AND filter (AC-018b)
4. GET /api/products/search?q=meadow&category=honey&certification=organic — verify text + filter combo
5. Verify result counts match expected intersections

## Scenario 3: Brand CRUD with Product Counts

1. POST /api/brands — create brand with all fields
2. POST /api/products (x3) — create 3 products, 2 active, 1 discontinued
3. GET /api/brands — verify productCount=3, activeProductCount=2
4. PUT /api/brands/:id — update commissionRate, verify audit trail

## Scenario 4: Line Card PDF Generation

1. Create brand with logoUrl
2. Create 5 active products with certifications
3. GET /api/brands/:id/line-card — verify:
   - Response Content-Type is application/pdf
   - Response Content-Disposition has correct filename
   - PDF buffer is non-empty
   - PDF contains brand name and all 5 product names (via text extraction)

## Scenario 5: Line Card Email Share

1. Create brand + products + account with primary contact email
2. POST /api/brands/:id/line-card/share { accountId } — verify:
   - Response: { sent: true, recipientEmail: "..." }
   - Email notification enqueued with PDF attachment
