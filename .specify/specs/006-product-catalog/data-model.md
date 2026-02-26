# Data Model — Feature 5: Product Catalog & Brand Line Cards

## Entity: Product (MODIFIED)

Extends existing Product model with new catalog fields.

### New Fields

| Field | Type | Nullable | Default | Validation |
|-------|------|----------|---------|------------|
| category | varchar(50) | yes | null | ProductCategory enum values |
| subcategory | varchar(100) | yes | null | 1-100 chars |
| description | varchar(2000) | yes | null | 1-2000 chars |
| image_url | varchar(500) | yes | null | Valid URL format |
| certifications | text[] | no | {} | Array of Certification enum values |
| allergens | text[] | no | {} | Array of Allergen enum values |
| dietary_attributes | text[] | no | {} | Array of DietaryAttribute enum values |

### New Indexes

| Index | Columns | Type |
|-------|---------|------|
| idx_products_tenant_category | tenant_id, category | btree |

### Enum: ProductCategory

Values: `honey`, `condiments`, `spreads`, `sauces`, `snacks`, `beverages`, `dairy`, `bakery`, `produce`, `meat`, `seafood`, `pantry`, `frozen`, `other`

### Enum: Certification (validated at app layer, not DB enum)

Values: `organic`, `non_gmo`, `gluten_free`, `kosher`, `vegan`

### Enum: Allergen (validated at app layer, not DB enum)

Values: `wheat`, `milk`, `eggs`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `soybeans`, `sesame`

### Enum: DietaryAttribute (validated at app layer, not DB enum)

Values: `vegetarian`, `vegan`, `keto`, `paleo`, `low_sodium`, `sugar_free`, `dairy_free`, `whole_grain`

## Entity: Brand (MODIFIED)

Extends existing Brand model with catalog and contact fields.

### New Fields

| Field | Type | Nullable | Default | Validation |
|-------|------|----------|---------|------------|
| description | varchar(2000) | yes | null | 1-2000 chars |
| logo_url | varchar(500) | yes | null | Valid URL format |
| contact_name | varchar(255) | yes | null | 1-255 chars |
| contact_email | varchar(255) | yes | null | Valid email format |
| contact_phone | varchar(50) | yes | null | 1-50 chars |
| website | varchar(255) | yes | null | Valid URL format |

## Relationships

- Product.brandId -> Brand.id (existing, unchanged)
- Brand.products -> Product[] (existing, unchanged)

## Validation Rules

- Product SKU must be unique per tenant (existing constraint)
- Brand name must be unique per tenant (existing constraint)
- Certifications array values must all be valid Certification enum values
- Allergens array values must all be valid Allergen enum values
- DietaryAttributes array values must all be valid DietaryAttribute enum values
- Category must be a valid ProductCategory value when provided
- Image URL and logo URL must be valid URL format (https:// preferred) when provided
- Contact email must be valid email format when provided
