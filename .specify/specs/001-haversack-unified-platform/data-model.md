# Data Model — Haversack Unified Platform

**Spec**: 001-haversack-unified-platform
**Created**: 2026-02-24
**Status**: Final

## Overview

This document defines the relational data model for the Haversack Unified Platform. All tables use PostgreSQL 16+ with Row-Level Security (RLS) for tenant isolation. The ORM layer is Prisma 5+ with strict TypeScript mode. Field types listed here map directly to Prisma/PostgreSQL types.

**Conventions**:
- Every table includes `id` (UUID, primary key), `created_at` (TIMESTAMP), `updated_at` (TIMESTAMP), and `tenant_id` (UUID, foreign key to Organization) for RLS isolation.
- All foreign keys use UUID type referencing the `id` column of the related table.
- Soft deletes use `deleted_at` (TIMESTAMP, nullable) where applicable.
- JSONB columns are used for flexible/extensible data where the schema may evolve.
- All ENUM types are defined as PostgreSQL enums and mirrored in Prisma.

---

## Entities

### Organization

The top-level tenant entity. Represents the company instance. All other entities reference `tenant_id` pointing to Organization.id for RLS isolation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(255) | NOT NULL, unique | Company name |
| address_line1 | VARCHAR(255) | NOT NULL | Street address |
| address_line2 | VARCHAR(255) | nullable | Suite, unit, etc. |
| city | VARCHAR(100) | NOT NULL | City |
| state | VARCHAR(50) | NOT NULL | State or province |
| zip_code | VARCHAR(20) | NOT NULL | ZIP or postal code |
| phone | VARCHAR(30) | nullable | Main phone number |
| website | VARCHAR(500) | nullable | Company website URL |
| logo_url | VARCHAR(500) | nullable | URL to company logo |
| configuration | JSONB | NOT NULL, DEFAULT '{}' | Org-level settings (timezone, currency, feature flags) |
| subscription_status | ENUM('active','suspended','cancelled') | NOT NULL, DEFAULT 'active' | Subscription state |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_organization_name` on (name)

---

### User

Authenticated platform user. Audit trail required for all mutations per NFR-014.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| email | VARCHAR(255) | NOT NULL, unique per tenant | Login email address |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash at cost factor 12 (NFR-007) |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| role | ENUM('admin','manager','rep','logistics','viewer') | NOT NULL | RBAC role (NFR-008) |
| territory_id | UUID | nullable, FOREIGN KEY -> Territory(id) | Assigned territory (required for rep role) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status; false triggers session invalidation (FR-030) |
| avatar_url | VARCHAR(500) | nullable | Profile image URL |
| last_login_at | TIMESTAMP | nullable | Timestamp of last successful login |
| refresh_token_hash | VARCHAR(255) | nullable | Hashed refresh token for JWT rotation |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |
| deleted_at | TIMESTAMP | nullable | Soft delete timestamp |

**Indexes**:
- `idx_user_tenant_email` UNIQUE on (tenant_id, email)
- `idx_user_tenant_role` on (tenant_id, role)
- `idx_user_territory` on (territory_id)
- `idx_user_is_active` on (tenant_id, is_active)

---

### Territory

Geographic sales zone. Each territory is assigned to one rep.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| name | VARCHAR(255) | NOT NULL | Territory name |
| region | VARCHAR(100) | NOT NULL | Parent region (e.g., "Pacific Northwest") |
| zip_codes | TEXT[] | NOT NULL, DEFAULT '{}' | Array of ZIP codes in territory |
| boundary | JSONB | nullable | GeoJSON polygon for territory boundary |
| assigned_rep_id | UUID | nullable, FOREIGN KEY -> User(id) | Primary rep assigned to this territory |
| commission_modifier | DECIMAL(4,2) | NOT NULL, DEFAULT 1.00, CHECK (0.80 <= value <= 1.20) | Territory commission modifier (FR-023) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_territory_tenant_name` UNIQUE on (tenant_id, name)
- `idx_territory_assigned_rep` on (assigned_rep_id)
- `idx_territory_region` on (tenant_id, region)

---

### Account

Customer business (store, restaurant, distributor). Audit trail required for all mutations per NFR-014. Core entity for FR-001 through FR-007.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| name | VARCHAR(255) | NOT NULL | Account/business name (FR-001, FR-002) |
| account_type | ENUM('store','restaurant','distributor','other') | NOT NULL | Type of business |
| address_line1 | VARCHAR(255) | NOT NULL | Street address (FR-001) |
| address_line2 | VARCHAR(255) | nullable | Suite, unit, etc. |
| city | VARCHAR(100) | NOT NULL | City |
| state | VARCHAR(50) | NOT NULL | State or province |
| zip_code | VARCHAR(20) | NOT NULL | ZIP or postal code |
| phone | VARCHAR(30) | nullable | Main phone number |
| email | VARCHAR(255) | nullable | Primary email address |
| website | VARCHAR(500) | nullable | Business website |
| territory_id | UUID | NOT NULL, FOREIGN KEY -> Territory(id) | Assigned territory (FR-001) |
| assigned_rep_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Assigned territory representative |
| parent_account_id | UUID | nullable, FOREIGN KEY -> Account(id) | Parent account for hierarchy (FR-005) |
| health_score | INTEGER | nullable, CHECK (0 <= value <= 100) | Calculated health score 0-100 (FR-006) |
| health_score_calculated_at | TIMESTAMP | nullable | When health score was last calculated |
| notes | TEXT | nullable | Free-form notes |
| tags | TEXT[] | NOT NULL, DEFAULT '{}' | Searchable tags array |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | Extensible metadata |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |
| deleted_at | TIMESTAMP | nullable | Soft delete timestamp |

**Indexes**:
- `idx_account_tenant_name` on (tenant_id, name) — supports duplicate detection (FR-003)
- `idx_account_territory` on (territory_id)
- `idx_account_assigned_rep` on (assigned_rep_id)
- `idx_account_parent` on (parent_account_id) — supports hierarchy queries (FR-005)
- `idx_account_health_score` on (tenant_id, health_score) — supports dashboard filtering (FR-026)
- `idx_account_type` on (tenant_id, account_type)
- `idx_account_fulltext` GIN index on (name, city, phone, email) — supports full-text search (FR-007)
- `idx_account_deleted_at` on (deleted_at) WHERE deleted_at IS NULL — partial index for active records

---

### Contact

Individual person at an Account.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| account_id | UUID | NOT NULL, FOREIGN KEY -> Account(id) ON DELETE CASCADE | Parent account |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| email | VARCHAR(255) | nullable | Email address (used for email matching, FR-010) |
| phone | VARCHAR(30) | nullable | Phone number |
| title | VARCHAR(100) | nullable | Job title |
| is_primary | BOOLEAN | NOT NULL, DEFAULT false | Primary contact flag (one per account) |
| opt_out_email | BOOLEAN | NOT NULL, DEFAULT false | CAN-SPAM opt-out status |
| notes | TEXT | nullable | Free-form notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |
| deleted_at | TIMESTAMP | nullable | Soft delete timestamp |

**Indexes**:
- `idx_contact_account` on (account_id)
- `idx_contact_tenant_email` on (tenant_id, email) — supports email matching (FR-010)
- `idx_contact_fulltext` GIN index on (first_name, last_name, email, phone) — supports search (FR-007)
- `idx_contact_primary` on (account_id, is_primary) WHERE is_primary = true — partial unique index

---

### Brand

Food supplier/principal. Brands are the vendor entities that products belong to.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| name | VARCHAR(255) | NOT NULL | Brand name |
| principal_contact_name | VARCHAR(200) | nullable | Primary contact at the brand |
| principal_contact_email | VARCHAR(255) | nullable | Contact email |
| principal_contact_phone | VARCHAR(30) | nullable | Contact phone |
| base_commission_rate | DECIMAL(5,2) | NOT NULL, CHECK (8.00 <= value <= 15.00) | Default commission rate 8-15% (FR-023) |
| default_revenue_model | ENUM('broker','wholesale') | NOT NULL, DEFAULT 'broker' | Default revenue model for products |
| logo_url | VARCHAR(500) | nullable | Brand logo URL |
| description | TEXT | nullable | Brand description |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_brand_tenant_name` UNIQUE on (tenant_id, name)
- `idx_brand_active` on (tenant_id, is_active)

---

### Product

Catalog item. Supports FSMA 204 traceability (NFR-010) and product search (FR-015).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| brand_id | UUID | NOT NULL, FOREIGN KEY -> Brand(id) | Owning brand |
| name | VARCHAR(255) | NOT NULL | Product name |
| sku | VARCHAR(100) | NOT NULL | Stock Keeping Unit |
| category | VARCHAR(100) | NOT NULL | Product category (e.g., "Condiments") |
| subcategory | VARCHAR(100) | nullable | Product subcategory |
| unit_price | DECIMAL(10,2) | NOT NULL, CHECK (value >= 0) | Standard unit price |
| wholesale_price | DECIMAL(10,2) | nullable, CHECK (value >= 0) | Wholesale price (for wholesale model) |
| case_size | VARCHAR(50) | nullable | Case size description (e.g., "12 x 8oz") |
| certifications | TEXT[] | NOT NULL, DEFAULT '{}' | Array of certifications (Organic, Non-GMO, etc.) (FR-019) |
| allergens | TEXT[] | NOT NULL, DEFAULT '{}' | Big 9 allergens (FR-019) |
| dietary_attributes | TEXT[] | NOT NULL, DEFAULT '{}' | Dietary attributes (Vegan, Gluten-Free, etc.) |
| availability_status | ENUM('in_stock','limited','out_of_stock','discontinued') | NOT NULL, DEFAULT 'in_stock' | Current availability (FR-015) |
| image_url | VARCHAR(500) | nullable | Product image URL |
| description | TEXT | nullable | Product description |
| revenue_model | ENUM('broker','wholesale') | NOT NULL | Revenue model for this product (FR-013) |
| promo_price | DECIMAL(10,2) | nullable, CHECK (value >= 0) | Promotional price (FR-016) |
| promo_start_date | TIMESTAMP | nullable | Promotion start date |
| promo_end_date | TIMESTAMP | nullable | Promotion end date |
| lot_number | VARCHAR(100) | nullable | FSMA 204 lot number (NFR-010) |
| batch_id | VARCHAR(100) | nullable | FSMA 204 batch ID (NFR-010) |
| origin | VARCHAR(255) | nullable | FSMA 204 origin/source |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_product_tenant_sku` UNIQUE on (tenant_id, sku)
- `idx_product_brand` on (brand_id)
- `idx_product_category` on (tenant_id, category)
- `idx_product_availability` on (tenant_id, availability_status)
- `idx_product_certifications` GIN on (certifications) — supports certification filtering (FR-019)
- `idx_product_allergens` GIN on (allergens)
- `idx_product_fulltext` GIN index on (name, sku, category) — supports product search (FR-015)
- `idx_product_promo_dates` on (promo_start_date, promo_end_date) WHERE promo_price IS NOT NULL — promotional pricing lookups (FR-016)
- `idx_product_active` on (tenant_id, is_active)

---

### Order

Sales transaction. Audit trail required for all mutations per NFR-014. Core entity for FR-013 through FR-017.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| order_number | VARCHAR(50) | NOT NULL | Human-readable order number (auto-generated) |
| account_id | UUID | NOT NULL, FOREIGN KEY -> Account(id) | Customer account |
| rep_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Sales rep who created the order |
| status | ENUM('draft','pending','pending_approval','approved','confirmed','rejected','cancelled') | NOT NULL, DEFAULT 'draft' | Order status (FR-017) |
| parent_order_id | UUID | nullable, FOREIGN KEY -> Order(id) | Parent order for vendor sub-orders (FR-014) |
| vendor_brand_id | UUID | nullable, FOREIGN KEY -> Brand(id) | Brand for vendor sub-orders (FR-014) |
| subtotal | DECIMAL(12,2) | NOT NULL, DEFAULT 0.00 | Sum of line items before tax |
| tax_amount | DECIMAL(12,2) | NOT NULL, DEFAULT 0.00 | Tax amount |
| total | DECIMAL(12,2) | NOT NULL, DEFAULT 0.00 | Grand total |
| approval_required | BOOLEAN | NOT NULL, DEFAULT false | True if total >= $5,000 (FR-017) |
| approved_by_id | UUID | nullable, FOREIGN KEY -> User(id) | Manager who approved (FR-017) |
| approved_at | TIMESTAMP | nullable | Approval timestamp |
| rejection_reason | TEXT | nullable | Reason for rejection (FR-017) |
| confirmed_at | TIMESTAMP | nullable | When order was confirmed |
| exported_at | TIMESTAMP | nullable | When exported to accounting (FR-025) |
| accounting_reference | VARCHAR(100) | nullable | External accounting system reference |
| notes | TEXT | nullable | Order notes |
| fsma_lot_numbers | JSONB | NOT NULL, DEFAULT '[]' | FSMA 204 lot tracking data (NFR-010) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_order_tenant_number` UNIQUE on (tenant_id, order_number)
- `idx_order_account` on (account_id)
- `idx_order_rep` on (rep_id)
- `idx_order_status` on (tenant_id, status)
- `idx_order_parent` on (parent_order_id) — vendor sub-order lookups (FR-014)
- `idx_order_vendor_brand` on (vendor_brand_id)
- `idx_order_confirmed_at` on (confirmed_at) — commission calculation lookups (FR-023)
- `idx_order_approval_required` on (tenant_id, approval_required, status) WHERE approval_required = true — pending approvals

---

### OrderItem

Line within an Order. Each item references a product with quantity, price, and revenue model.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| order_id | UUID | NOT NULL, FOREIGN KEY -> Order(id) ON DELETE CASCADE | Parent order |
| product_id | UUID | NOT NULL, FOREIGN KEY -> Product(id) | Product reference |
| quantity | INTEGER | NOT NULL, CHECK (value > 0) | Quantity ordered |
| unit_price | DECIMAL(10,2) | NOT NULL, CHECK (value >= 0) | Price per unit at time of order |
| line_total | DECIMAL(12,2) | NOT NULL | quantity * unit_price (computed) |
| revenue_model | ENUM('broker','wholesale') | NOT NULL | Revenue model for this line (FR-013) |
| commission_rate | DECIMAL(5,2) | nullable | Applicable commission rate at time of order (FR-023) |
| promo_applied | BOOLEAN | NOT NULL, DEFAULT false | Whether promotional pricing was applied (FR-016) |
| lot_number | VARCHAR(100) | nullable | FSMA 204 lot number for this line item |
| batch_id | VARCHAR(100) | nullable | FSMA 204 batch ID for this line item |
| notes | TEXT | nullable | Line item notes |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_orderitem_order` on (order_id)
- `idx_orderitem_product` on (product_id)
- `idx_orderitem_revenue_model` on (tenant_id, revenue_model) — commission filtering (FR-023)

---

### Activity

Logged interaction (visit, call, email, demo, sampling). Core entity for FR-008 through FR-009.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| account_id | UUID | NOT NULL, FOREIGN KEY -> Account(id) | Associated account |
| user_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Rep who performed the activity |
| contact_id | UUID | nullable, FOREIGN KEY -> Contact(id) | Contact involved (if applicable) |
| activity_type | ENUM('visit','call','email','demo','sampling','task','note','system') | NOT NULL | Type of activity (FR-008) |
| subject | VARCHAR(255) | nullable | Activity subject/title |
| notes | TEXT | nullable | Detailed notes |
| occurred_at | TIMESTAMP | NOT NULL, DEFAULT now() | When the activity occurred |
| duration_minutes | INTEGER | nullable, CHECK (value >= 0) | Duration of activity in minutes |
| metadata | JSONB | NOT NULL, DEFAULT '{}' | Type-specific data (demo details, call outcome, etc.) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_activity_account` on (account_id, occurred_at DESC) — timeline queries (FR-009)
- `idx_activity_user` on (user_id, occurred_at DESC)
- `idx_activity_type` on (tenant_id, activity_type)
- `idx_activity_occurred_at` on (tenant_id, occurred_at DESC) — dashboard queries (FR-026)
- `idx_activity_contact` on (contact_id)

---

### Demo

Product sampling detail linked to an Activity. Captures demo-specific data per FR-008.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| activity_id | UUID | NOT NULL, FOREIGN KEY -> Activity(id) ON DELETE CASCADE | Parent activity (must be type 'demo') |
| product_id | UUID | NOT NULL, FOREIGN KEY -> Product(id) | Product demoed |
| quantity_sampled | INTEGER | NOT NULL, CHECK (value > 0) | Quantity of samples provided |
| buyer_feedback | TEXT | nullable | Buyer feedback on demo |
| outcome | ENUM('interested','not_interested','order_placed','follow_up_needed') | NOT NULL, DEFAULT 'follow_up_needed' | Demo outcome |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_demo_activity` on (activity_id)
- `idx_demo_product` on (product_id)

---

### EmailRecord

Tracked email message. Supports FR-010 (email auto-linking) and FR-011 (unmatched queue).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| account_id | UUID | nullable, FOREIGN KEY -> Account(id) | Linked account (null if unmatched) |
| contact_id | UUID | nullable, FOREIGN KEY -> Contact(id) | Linked contact (null if unmatched) |
| user_id | UUID | nullable, FOREIGN KEY -> User(id) | Rep who sent/received |
| activity_id | UUID | nullable, FOREIGN KEY -> Activity(id) | Linked activity record |
| direction | ENUM('inbound','outbound') | NOT NULL | Email direction |
| subject | VARCHAR(500) | nullable | Email subject line |
| body_preview | TEXT | nullable | Truncated body preview |
| from_address | VARCHAR(255) | NOT NULL | Sender email address |
| to_addresses | TEXT[] | NOT NULL | Recipient email addresses |
| cc_addresses | TEXT[] | NOT NULL, DEFAULT '{}' | CC addresses |
| message_id | VARCHAR(500) | nullable | Email Message-ID header for dedup |
| thread_id | VARCHAR(500) | nullable | Conversation thread ID |
| engagement_status | ENUM('sent','delivered','opened','clicked','bounced','unsubscribed') | NOT NULL, DEFAULT 'sent' | Latest engagement event (FR-010) |
| opened_at | TIMESTAMP | nullable | First open timestamp |
| clicked_at | TIMESTAMP | nullable | First click timestamp |
| bounced_at | TIMESTAMP | nullable | Bounce timestamp |
| is_matched | BOOLEAN | NOT NULL, DEFAULT false | Whether matched to a Contact (FR-011) |
| can_spam_compliant | BOOLEAN | NOT NULL, DEFAULT true | CAN-SPAM compliance check |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_email_account` on (account_id)
- `idx_email_contact` on (contact_id)
- `idx_email_user` on (user_id)
- `idx_email_from` on (tenant_id, from_address) — email matching
- `idx_email_to` GIN on (to_addresses) — email matching (FR-010)
- `idx_email_unmatched` on (tenant_id, is_matched) WHERE is_matched = false — unmatched queue (FR-011)
- `idx_email_message_id` on (tenant_id, message_id) — deduplication
- `idx_email_engagement` on (tenant_id, engagement_status)

---

### EmailTemplate

Reusable email template with merge fields. Supports FR-020 (line card sharing) and FR-034 (rule-triggered emails).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| name | VARCHAR(255) | NOT NULL | Template name |
| subject_template | VARCHAR(500) | NOT NULL | Subject with merge fields (e.g., "{{account.name}} - Line Card") |
| body_template | TEXT | NOT NULL | HTML body with merge fields |
| category | ENUM('line_card','follow_up','notification','custom') | NOT NULL, DEFAULT 'custom' | Template category |
| merge_fields | TEXT[] | NOT NULL, DEFAULT '{}' | Available merge field names |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_by_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Template creator |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_emailtemplate_tenant_name` UNIQUE on (tenant_id, name)
- `idx_emailtemplate_category` on (tenant_id, category)
- `idx_emailtemplate_active` on (tenant_id, is_active)

---

### Opportunity

Prospective deal linked to an Account. Supports FR-021, FR-022.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| account_id | UUID | NOT NULL, FOREIGN KEY -> Account(id) | Associated account |
| name | VARCHAR(255) | NOT NULL | Opportunity name |
| stage | ENUM('prospecting','qualified','proposal','negotiation','closed_won','closed_lost') | NOT NULL, DEFAULT 'prospecting' | Pipeline stage (FR-022) |
| probability | DECIMAL(5,2) | NOT NULL, CHECK (0 <= value <= 100) | Win probability percentage, auto-populated by stage (FR-021) |
| estimated_value | DECIMAL(12,2) | NOT NULL, CHECK (value >= 0) | Estimated deal value |
| weighted_value | DECIMAL(12,2) | NOT NULL | estimated_value * (probability / 100) (computed) |
| close_date | DATE | NOT NULL | Expected close date |
| close_reason | TEXT | nullable | Reason for close (required on Closed Won/Lost) (FR-022) |
| assigned_rep_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Owning rep |
| notes | TEXT | nullable | Free-form notes |
| associated_brand_ids | UUID[] | NOT NULL, DEFAULT '{}' | Associated brand IDs (FR-021) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |
| deleted_at | TIMESTAMP | nullable | Soft delete timestamp |

**Indexes**:
- `idx_opportunity_account` on (account_id)
- `idx_opportunity_stage` on (tenant_id, stage) — kanban board queries (FR-022)
- `idx_opportunity_rep` on (assigned_rep_id)
- `idx_opportunity_close_date` on (tenant_id, close_date) — forecast queries
- `idx_opportunity_tenant_stage_value` on (tenant_id, stage, weighted_value) — weighted forecast (FR-022)

---

### Pipeline

Aggregation view of Opportunity records by stage with weighted forecast calculation. This is a materialized view / virtual entity computed from Opportunity data, not a standalone persisted table. Stored as a materialized view refreshed nightly and on-demand. Supports FR-022.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Derived identifier (hash of tenant_id + stage + period) |
| tenant_id | UUID | NOT NULL | Tenant isolation key |
| stage | ENUM('prospecting','qualified','proposal','negotiation','closed_won','closed_lost') | NOT NULL | Pipeline stage |
| opportunity_count | INTEGER | NOT NULL | Count of opportunities in stage |
| total_value | DECIMAL(14,2) | NOT NULL | Sum of estimated_value for stage |
| weighted_value | DECIMAL(14,2) | NOT NULL | Sum of weighted_value for stage |
| default_probability | DECIMAL(5,2) | NOT NULL | Default probability for stage |
| period | VARCHAR(7) | NOT NULL | Reporting period (YYYY-MM) |
| refreshed_at | TIMESTAMP | NOT NULL | When last refreshed |

**Indexes**:
- `idx_pipeline_tenant_stage` on (tenant_id, stage)
- `idx_pipeline_period` on (tenant_id, period)

**Stage Probability Defaults**:
- prospecting: 10%
- qualified: 40%
- proposal: 60%
- negotiation: 75%
- closed_won: 100%
- closed_lost: 0%

---

### Commission

Earnings record per broker line item per period. Audit trail required for all mutations per NFR-014. Supports FR-023, FR-024, FR-025.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| rep_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Earning representative |
| order_id | UUID | NOT NULL, FOREIGN KEY -> Order(id) | Source order |
| order_item_id | UUID | NOT NULL, FOREIGN KEY -> OrderItem(id) | Source line item |
| brand_id | UUID | NOT NULL, FOREIGN KEY -> Brand(id) | Brand for rate lookup |
| period | VARCHAR(7) | NOT NULL | Pay period (YYYY-MM format) |
| line_total | DECIMAL(12,2) | NOT NULL | Line item total from order |
| base_rate | DECIMAL(5,2) | NOT NULL | Brand base commission rate applied (FR-023) |
| territory_modifier | DECIMAL(4,2) | NOT NULL | Territory modifier applied (FR-023) |
| volume_tier | VARCHAR(50) | nullable | Volume tier label if applicable |
| volume_tier_adjustment | DECIMAL(5,2) | NOT NULL, DEFAULT 0.00 | Volume tier rate adjustment (e.g., +1%) |
| effective_rate | DECIMAL(5,2) | NOT NULL | Final computed rate: (base_rate + volume_tier_adjustment) * territory_modifier |
| amount | DECIMAL(12,2) | NOT NULL | Commission amount: line_total * effective_rate / 100 |
| status | ENUM('pending','pending_approval','approved','exported','disputed') | NOT NULL, DEFAULT 'pending' | Commission status (FR-024) |
| approved_by_id | UUID | nullable, FOREIGN KEY -> User(id) | Manager who approved |
| approved_at | TIMESTAMP | nullable | Approval timestamp |
| exported_at | TIMESTAMP | nullable | Export to accounting timestamp (FR-025) |
| accounting_reference | VARCHAR(100) | nullable | Accounting system reference |
| calculation_log | JSONB | NOT NULL | Deterministic calculation audit: rule applied, rate used, inputs, result |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_commission_rep_period` on (rep_id, period) — statement generation (FR-024)
- `idx_commission_order` on (order_id)
- `idx_commission_order_item` on (order_item_id)
- `idx_commission_status` on (tenant_id, status) — approval queue
- `idx_commission_brand` on (brand_id)
- `idx_commission_period` on (tenant_id, period) — monthly reporting
- `idx_commission_exported` on (tenant_id, exported_at) WHERE exported_at IS NOT NULL — export tracking

---

### CommissionRule

Configurable commission rate rules per brand, territory, and volume tier. Supports FR-023 rate-effective-date logic.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| brand_id | UUID | NOT NULL, FOREIGN KEY -> Brand(id) | Brand this rule applies to |
| territory_id | UUID | nullable, FOREIGN KEY -> Territory(id) | Territory override (null = all territories) |
| base_rate | DECIMAL(5,2) | NOT NULL, CHECK (0 <= value <= 100) | Base commission rate |
| volume_tier_label | VARCHAR(50) | nullable | Tier name (e.g., "Tier 2") |
| volume_threshold | DECIMAL(12,2) | nullable | Minimum order volume for tier |
| tier_adjustment | DECIMAL(5,2) | NOT NULL, DEFAULT 0.00 | Rate adjustment for this tier |
| effective_date | DATE | NOT NULL | Start date for this rule (FR-023) |
| end_date | DATE | nullable | End date (null = currently active) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_commrule_brand_effective` on (brand_id, effective_date DESC) — rate lookup by date
- `idx_commrule_territory` on (territory_id)
- `idx_commrule_active` on (tenant_id, is_active, effective_date)

---

### LineCard

Generated brand product catalog document. Supports FR-020.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| brand_id | UUID | NOT NULL, FOREIGN KEY -> Brand(id) | Brand for this line card |
| generated_by_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | User who generated |
| document_url | VARCHAR(500) | NOT NULL | URL to generated PDF document |
| document_size_bytes | INTEGER | nullable | File size |
| product_count | INTEGER | NOT NULL | Number of products included |
| generated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Generation timestamp |
| expires_at | TIMESTAMP | nullable | Document expiration (for cache invalidation) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_linecard_brand` on (brand_id, generated_at DESC)
- `idx_linecard_generated_by` on (generated_by_id)

---

### BusinessRule

IF/THEN automation rule. Supports FR-034.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| name | VARCHAR(255) | NOT NULL | Rule name |
| description | TEXT | nullable | Rule description |
| entity_type | ENUM('account','contact','order','opportunity','activity','product') | NOT NULL | Target entity type |
| conditions | JSONB | NOT NULL | IF conditions with AND/OR groups: [{field, operator, value, logical}] |
| actions | JSONB | NOT NULL | THEN actions: [{type: 'notify'|'update_field'|'create_task'|'send_email', config: {}}] |
| trigger_event | ENUM('create','update','delete','schedule','field_change') | NOT NULL | When rule evaluates |
| priority | INTEGER | NOT NULL, DEFAULT 100, CHECK (value >= 1) | Execution priority (lower = higher priority) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| last_triggered_at | TIMESTAMP | nullable | Last execution timestamp |
| trigger_count | INTEGER | NOT NULL, DEFAULT 0 | Total times triggered |
| created_by_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Admin who created the rule |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_businessrule_tenant_entity` on (tenant_id, entity_type, is_active) — rule evaluation queries
- `idx_businessrule_priority` on (tenant_id, priority) WHERE is_active = true — execution ordering
- `idx_businessrule_trigger` on (tenant_id, trigger_event, is_active)

---

### Task

Follow-up task with reminders. Supports FR-012.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| title | VARCHAR(255) | NOT NULL | Task title |
| description | TEXT | nullable | Task details |
| due_date | TIMESTAMP | NOT NULL | Due date and time |
| priority | ENUM('high','medium','low') | NOT NULL, DEFAULT 'medium' | Task priority (FR-012) |
| status | ENUM('pending','in_progress','completed','cancelled') | NOT NULL, DEFAULT 'pending' | Task status |
| assigned_to_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Assigned user |
| created_by_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Creator |
| account_id | UUID | nullable, FOREIGN KEY -> Account(id) | Optional account association (FR-012) |
| contact_id | UUID | nullable, FOREIGN KEY -> Contact(id) | Optional contact association |
| opportunity_id | UUID | nullable, FOREIGN KEY -> Opportunity(id) | Optional opportunity association |
| reminder_24h_sent | BOOLEAN | NOT NULL, DEFAULT false | 24-hour reminder sent flag |
| reminder_1h_sent | BOOLEAN | NOT NULL, DEFAULT false | 1-hour reminder sent flag |
| completed_at | TIMESTAMP | nullable | Completion timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_task_assigned_to` on (assigned_to_id, status, due_date) — task dashboard
- `idx_task_due_date` on (tenant_id, due_date) WHERE status IN ('pending','in_progress') — reminder queries
- `idx_task_account` on (account_id)
- `idx_task_opportunity` on (opportunity_id)
- `idx_task_overdue` on (tenant_id, status, due_date) WHERE status = 'pending' AND due_date < now() — overdue queries

---

### AuditTrail

Immutable audit log for all write operations on Account, Order, Commission, and User entities. Required by NFR-014. Retained for 3 years minimum.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL | Tenant isolation key |
| actor_id | UUID | NOT NULL | User who performed the action |
| actor_email | VARCHAR(255) | NOT NULL | Actor email at time of action (denormalized) |
| entity_type | VARCHAR(50) | NOT NULL | Entity type: 'account', 'order', 'commission', 'user' |
| entity_id | UUID | NOT NULL | ID of the affected entity |
| action | ENUM('create','update','delete') | NOT NULL | Type of mutation |
| field_name | VARCHAR(100) | nullable | Specific field changed (null for create/delete) |
| old_value | TEXT | nullable | Previous value (null for create) |
| new_value | TEXT | nullable | New value (null for delete) |
| change_summary | JSONB | nullable | Full diff for bulk updates |
| ip_address | VARCHAR(45) | nullable | Client IP address |
| user_agent | VARCHAR(500) | nullable | Client user agent |
| request_id | UUID | nullable | Correlation ID for tracing |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Immutable timestamp (write latency < 10ms per NFR-014) |

**Constraints**: This table is INSERT-ONLY. UPDATE and DELETE operations are prohibited at the database level.

**Indexes**:
- `idx_audit_entity` on (entity_type, entity_id, created_at DESC) — entity history lookups
- `idx_audit_actor` on (actor_id, created_at DESC) — user action history
- `idx_audit_tenant_created` on (tenant_id, created_at DESC) — tenant-scoped queries
- `idx_audit_request_id` on (request_id) — correlation lookups

**Partitioning**: Partition by RANGE on `created_at` (monthly partitions) for efficient retention management. Partitions older than 3 years are archived, not deleted.

---

### DataQualityScore

Nightly data quality scorecard. Supports FR-033.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| calculated_at | TIMESTAMP | NOT NULL, DEFAULT now() | When scorecard was generated |
| account_field_completeness_pct | DECIMAL(5,2) | NOT NULL | % of account fields filled |
| contact_email_validity_pct | DECIMAL(5,2) | NOT NULL | % of contacts with valid emails |
| product_image_coverage_pct | DECIMAL(5,2) | NOT NULL | % of products with images |
| duplicate_account_count | INTEGER | NOT NULL | Number of suspected duplicates |
| stale_account_count | INTEGER | NOT NULL | Accounts 90+ days inactive |
| overall_score | DECIMAL(5,2) | NOT NULL | Weighted overall quality score |
| details | JSONB | NOT NULL, DEFAULT '{}' | Detailed breakdown by field/entity |

**Indexes**:
- `idx_dqs_tenant_date` on (tenant_id, calculated_at DESC) — latest score lookup

---

### ImportJob

Tracks CSV/XLSX import operations. Supports FR-031, FR-032.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| uploaded_by_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Admin who uploaded |
| entity_type | ENUM('account','contact','product','order') | NOT NULL | Target entity type (FR-031) |
| file_name | VARCHAR(255) | NOT NULL | Original file name |
| file_size_bytes | INTEGER | NOT NULL, CHECK (value <= 52428800) | File size (max 50MB per FR-032) |
| status | ENUM('uploaded','validating','preview','importing','completed','failed') | NOT NULL, DEFAULT 'uploaded' | Job status |
| total_rows | INTEGER | nullable | Total rows parsed |
| valid_rows | INTEGER | nullable | Rows passing validation |
| error_rows | INTEGER | nullable | Rows with errors |
| imported_rows | INTEGER | nullable | Rows successfully imported |
| error_log_url | VARCHAR(500) | nullable | URL to downloadable error log |
| preview_data | JSONB | nullable | Pre-import preview payload |
| completed_at | TIMESTAMP | nullable | Completion timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes**:
- `idx_import_tenant_status` on (tenant_id, status)
- `idx_import_uploaded_by` on (uploaded_by_id)

---

### Notification

In-app and email notifications. Supports FR-012 (task reminders), FR-017 (approval notifications).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, FOREIGN KEY -> Organization(id) | Tenant isolation key |
| user_id | UUID | NOT NULL, FOREIGN KEY -> User(id) | Recipient user |
| type | ENUM('task_reminder','approval_request','approval_result','commission_approved','rule_triggered','system','import_complete') | NOT NULL | Notification type |
| title | VARCHAR(255) | NOT NULL | Notification title |
| body | TEXT | NOT NULL | Notification body |
| reference_type | VARCHAR(50) | nullable | Related entity type |
| reference_id | UUID | nullable | Related entity ID |
| channel | ENUM('in_app','email','both') | NOT NULL, DEFAULT 'both' | Delivery channel |
| is_read | BOOLEAN | NOT NULL, DEFAULT false | Read status |
| read_at | TIMESTAMP | nullable | When notification was read |
| email_sent_at | TIMESTAMP | nullable | When email notification was sent |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation timestamp |

**Indexes**:
- `idx_notification_user_unread` on (user_id, is_read, created_at DESC) WHERE is_read = false — unread notifications
- `idx_notification_user_created` on (user_id, created_at DESC) — notification list

---

## Relationships

This section documents all entity relationships with cardinality notation.

### One-to-Many (1:N) Relationships

| Parent Entity | Child Entity | Foreign Key | Cardinality | Description |
|---------------|-------------|-------------|-------------|-------------|
| Organization | User | user.tenant_id | 1:N | Organization has many Users |
| Organization | Territory | territory.tenant_id | 1:N | Organization has many Territories |
| Organization | Account | account.tenant_id | 1:N | Organization has many Accounts |
| Organization | Brand | brand.tenant_id | 1:N | Organization has many Brands |
| Organization | Product | product.tenant_id | 1:N | Organization has many Products |
| Territory | User | user.territory_id | 1:N | Territory has many Users (reps assigned) |
| Territory | Account | account.territory_id | 1:N | Territory has many Accounts |
| Account | Account | account.parent_account_id | 1:N | Account has many child Accounts (hierarchy) |
| Account | Contact | contact.account_id | 1:N | Account has many Contacts |
| Account | Activity | activity.account_id | 1:N | Account has many Activities |
| Account | Order | order.account_id | 1:N | Account has many Orders |
| Account | Opportunity | opportunity.account_id | 1:N | Account has many Opportunities |
| Account | EmailRecord | email_record.account_id | 1:N | Account has many EmailRecords |
| Account | Task | task.account_id | 1:N | Account has many Tasks |
| User | Activity | activity.user_id | 1:N | User has many Activities (logged by) |
| User | Order | order.rep_id | 1:N | User has many Orders (as rep) |
| User | Opportunity | opportunity.assigned_rep_id | 1:N | User has many Opportunities |
| User | Commission | commission.rep_id | 1:N | User has many Commissions |
| User | Task | task.assigned_to_id | 1:N | User has many Tasks (assigned) |
| User | Task | task.created_by_id | 1:N | User has many Tasks (created) |
| User | EmailRecord | email_record.user_id | 1:N | User has many EmailRecords |
| User | EmailTemplate | email_template.created_by_id | 1:N | User has many EmailTemplates |
| User | LineCard | line_card.generated_by_id | 1:N | User has many LineCards (generated) |
| User | BusinessRule | business_rule.created_by_id | 1:N | User has many BusinessRules |
| User | ImportJob | import_job.uploaded_by_id | 1:N | User has many ImportJobs |
| User | Notification | notification.user_id | 1:N | User has many Notifications |
| Brand | Product | product.brand_id | 1:N | Brand has many Products |
| Brand | Order | order.vendor_brand_id | 1:N | Brand has many Orders (vendor sub-orders) |
| Brand | Commission | commission.brand_id | 1:N | Brand has many Commissions |
| Brand | CommissionRule | commission_rule.brand_id | 1:N | Brand has many CommissionRules |
| Brand | LineCard | line_card.brand_id | 1:N | Brand has many LineCards |
| Order | OrderItem | order_item.order_id | 1:N | Order has many OrderItems |
| Order | Order | order.parent_order_id | 1:N | Order has many sub-Orders (vendor split) |
| Order | Commission | commission.order_id | 1:N | Order has many Commissions |
| Product | OrderItem | order_item.product_id | 1:N | Product has many OrderItems |
| Product | Demo | demo.product_id | 1:N | Product has many Demos |
| Activity | Demo | demo.activity_id | 1:N | Activity has many Demos |
| Activity | EmailRecord | email_record.activity_id | 1:N | Activity has many EmailRecords |
| Contact | EmailRecord | email_record.contact_id | 1:N | Contact has many EmailRecords |
| Contact | Task | task.contact_id | 1:N | Contact has many Tasks |
| Opportunity | Task | task.opportunity_id | 1:N | Opportunity has many Tasks |
| OrderItem | Commission | commission.order_item_id | 1:N | OrderItem has many Commissions (one per period) |

### One-to-One (1:1) Relationships

| Entity A | Entity B | Foreign Key | Description |
|----------|----------|-------------|-------------|
| Territory | User | territory.assigned_rep_id | Territory belongs to one primary rep (User) |

### Many-to-Many (N:M) Relationships

| Entity A | Entity B | Implementation | Description |
|----------|----------|----------------|-------------|
| Opportunity | Brand | opportunity.associated_brand_ids (UUID[]) | Opportunity is associated with many Brands; implemented via UUID array rather than join table for simplicity given low cardinality |

### Self-Referential Relationships

| Entity | Foreign Key | Cardinality | Description |
|--------|-------------|-------------|-------------|
| Account | parent_account_id -> Account(id) | 1:N | Parent-child account hierarchy (FR-005) |
| Order | parent_order_id -> Order(id) | 1:N | Parent order to vendor sub-orders (FR-014) |

---

## Validation Rules

### Account Validations
- **name**: required, NOT NULL, VARCHAR(255), minimum 1 character. Uniqueness checked via fuzzy matching (Levenshtein distance <= 3) during creation (FR-003).
- **account_type**: required, NOT NULL, must be one of allowed values: 'store', 'restaurant', 'distributor', 'other'.
- **address_line1**: required, NOT NULL.
- **city**: required, NOT NULL.
- **state**: required, NOT NULL.
- **zip_code**: required, NOT NULL, format validation for US ZIP (5 or 9 digit).
- **territory_id**: required, NOT NULL, must reference existing Territory.
- **assigned_rep_id**: required, NOT NULL, must reference existing active User with role 'rep'.
- **health_score**: constraint 0-100 inclusive when not null.
- **parent_account_id**: if set, must reference existing Account; circular references prohibited.

### Contact Validations
- **first_name**: required, NOT NULL.
- **last_name**: required, NOT NULL.
- **email**: if provided, must be valid email format (RFC 5322).
- **phone**: if provided, must be valid phone format.
- **is_primary**: only one Contact per Account may have is_primary = true (enforced by partial unique index).

### User Validations
- **email**: required, NOT NULL, unique per tenant, valid email format.
- **password_hash**: required, NOT NULL, bcrypt cost factor 12.
- **role**: required, NOT NULL, must be one of enum allowed values: 'admin', 'manager', 'rep', 'logistics', 'viewer'.
- **territory_id**: required when role = 'rep'; validated at application layer.

### Product Validations
- **name**: required, NOT NULL.
- **sku**: required, NOT NULL, unique per tenant.
- **brand_id**: required, NOT NULL, must reference existing Brand.
- **category**: required, NOT NULL.
- **unit_price**: required, NOT NULL, must be >= 0.
- **wholesale_price**: if provided, must be >= 0.
- **availability_status**: required, must be one of enum allowed values.
- **revenue_model**: required, must be 'broker' or 'wholesale'.
- **promo_price**: if set, promo_start_date and promo_end_date must also be set; promo_end_date must be > promo_start_date.
- **certifications**: each value must be from a controlled vocabulary (e.g., 'Organic', 'Non-GMO', 'Kosher', 'Fair Trade').
- **allergens**: each value must be one of Big 9: 'Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soybeans', 'Sesame'.

### Order Validations
- **account_id**: required, NOT NULL, must reference existing Account.
- **rep_id**: required, NOT NULL, must reference existing active User.
- **status**: must follow valid transitions: draft -> pending -> pending_approval | confirmed, pending_approval -> approved -> confirmed | rejected.
- **approval_required**: automatically set to true when total >= 5000.00 (FR-017).
- **total**: must equal sum of OrderItem.line_total values.

### OrderItem Validations
- **order_id**: required, NOT NULL.
- **product_id**: required, NOT NULL, must reference existing Product.
- **quantity**: required, NOT NULL, integer > 0.
- **unit_price**: required, NOT NULL, >= 0.
- **line_total**: must equal quantity * unit_price.
- **revenue_model**: required, must be 'broker' or 'wholesale'.

### Commission Validations
- **base_rate**: required, NOT NULL, range 0-100.
- **territory_modifier**: required, NOT NULL, range 0.80-1.20.
- **effective_rate**: must equal (base_rate + volume_tier_adjustment) * territory_modifier.
- **amount**: must equal line_total * effective_rate / 100. Deterministic: same inputs produce same result (constitution VII).
- **calculation_log**: required, NOT NULL, must contain rule_id, rate_used, inputs, and result fields.

### Opportunity Validations
- **name**: required, NOT NULL.
- **account_id**: required, NOT NULL.
- **stage**: required, must be valid enum value.
- **probability**: required, 0-100 inclusive, auto-populated from stage default but manually overridable.
- **estimated_value**: required, >= 0.
- **close_date**: required, must be a valid date.
- **close_reason**: required when stage is 'closed_won' or 'closed_lost'.

### BusinessRule Validations
- **name**: required, NOT NULL.
- **entity_type**: required, must be valid enum value.
- **conditions**: required, NOT NULL, JSONB must contain at least one condition; every field reference must be validated against the entity schema (FR-034: reject rules referencing non-existent fields).
- **actions**: required, NOT NULL, must contain at least one action with valid type.
- **priority**: required, integer >= 1.

### EmailRecord Validations
- **from_address**: required, valid email format.
- **to_addresses**: required, at least one address.
- **direction**: required, 'inbound' or 'outbound'.
- **can_spam_compliant**: outbound emails must be true (constitution VII).

### ImportJob Validations
- **file_size_bytes**: required, maximum 52,428,800 (50 MB per FR-032).
- **entity_type**: required, must be one of 'account', 'contact', 'product', 'order' (FR-031).

---

## Audit Trail

Per NFR-014 and Constitution Section VII, immutable audit trail records are required for all create, update, and delete operations on the following entities:

### Audited Entities

| Entity | Required By | Retention |
|--------|------------|-----------|
| Account | NFR-014 | 3 years minimum |
| Order | NFR-014 | 3 years minimum |
| Commission | NFR-014 | 3 years minimum |
| User | NFR-014 | 3 years minimum |

### Audit Record Fields

Every audit trail entry captures:
- **actor**: User ID and email of the person performing the action
- **timestamp**: Immutable creation timestamp (write latency < 10ms)
- **entity**: Type and ID of the affected entity
- **field**: Specific field changed (for updates)
- **old value**: Previous field value (for updates)
- **new value**: New field value (for creates and updates)

### Audit Implementation Rules

1. The AuditTrail table is **INSERT-ONLY**. No UPDATE or DELETE operations are permitted, enforced by a PostgreSQL trigger that raises an exception on UPDATE/DELETE attempts.
2. Audit writes occur within the same database transaction as the data mutation to ensure consistency.
3. Write latency for audit records must be under 10 milliseconds per NFR-014.
4. The AuditTrail table is partitioned by month on `created_at` for efficient storage and retention management.
5. Partitions older than 3 years are archived to cold storage, not deleted.
6. Commission audit records include the full `calculation_log` (rule applied, rate used, all inputs, resulting amount) to ensure deterministic reproducibility per Constitution Section VII.
7. Order audit records include status transitions and approval/rejection metadata.
8. User audit records include role changes and activation/deactivation events.

### FSMA 204 Traceability

Per NFR-010 and Constitution Section VII, the following FSMA 204 Key Data Elements are captured:

| Data Element | Stored In | Retention |
|-------------|-----------|-----------|
| Lot Number | Product.lot_number, OrderItem.lot_number | 2 years minimum |
| Batch ID | Product.batch_id, OrderItem.batch_id | 2 years minimum |
| Origin/Source | Product.origin | 2 years minimum |
| Order Date | Order.created_at | 2 years minimum |
| Confirmation Date | Order.confirmed_at | 2 years minimum |
| Line Item Details | OrderItem (full record) | 2 years minimum |
| FSMA Lot Numbers | Order.fsma_lot_numbers (JSONB) | 2 years minimum |

FSMA data is retained for a minimum of 2 years from the order confirmation date, enforced by data retention policies that prevent deletion of order records within the retention window.

---

## Entity-Relationship Summary Diagram (Text)

```
Organization (tenant)
 ├── User ──────────────── Territory
 │    ├── Activity ◄────── Account ──── Contact
 │    │    └── Demo            │         └── EmailRecord
 │    ├── Order ◄──────────────┘
 │    │    ├── OrderItem ──── Product ──── Brand
 │    │    └── Order (sub)        │
 │    ├── Opportunity              │
 │    ├── Commission ◄── OrderItem │
 │    ├── Task                     │
 │    ├── LineCard ◄─────────── Brand
 │    ├── BusinessRule
 │    ├── EmailTemplate
 │    ├── ImportJob
 │    └── Notification
 │
 ├── AuditTrail (immutable log)
 ├── DataQualityScore (nightly)
 └── Pipeline (materialized view)
```

---

## FR Traceability Matrix

| Entity | Functional Requirements Covered |
|--------|-------------------------------|
| Organization | All (tenant_id on every table for RLS) |
| User | FR-001, FR-008, FR-017, FR-023, FR-024, FR-029, FR-030 |
| Territory | FR-001, FR-007, FR-023 |
| Account | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-018 |
| Contact | FR-001, FR-004, FR-007, FR-010, FR-011 |
| Brand | FR-014, FR-015, FR-019, FR-020, FR-023 |
| Product | FR-013, FR-015, FR-016, FR-019, FR-020 |
| Order | FR-013, FR-014, FR-016, FR-017, FR-025 |
| OrderItem | FR-013, FR-014, FR-016, FR-023, FR-024 |
| Activity | FR-008, FR-009, FR-012 |
| Demo | FR-008 |
| EmailRecord | FR-010, FR-011 |
| EmailTemplate | FR-020, FR-034 |
| Opportunity | FR-021, FR-022 |
| Pipeline | FR-022 |
| Commission | FR-023, FR-024, FR-025 |
| CommissionRule | FR-023 |
| LineCard | FR-020 |
| BusinessRule | FR-034 |
| Task | FR-012 |
| AuditTrail | NFR-014 |
| DataQualityScore | FR-033 |
| ImportJob | FR-031, FR-032 |
| Notification | FR-012, FR-017, FR-034 |
