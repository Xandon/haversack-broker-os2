-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'manager', 'rep', 'logistics', 'viewer');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('store', 'restaurant', 'distributor', 'other');

-- CreateEnum
CREATE TYPE "RevenueModel" AS ENUM ('broker', 'wholesale');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('in_stock', 'limited', 'out_of_stock', 'discontinued');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending', 'pending_approval', 'approved', 'confirmed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('visit', 'call', 'email', 'demo', 'sampling', 'task', 'note', 'system');

-- CreateEnum
CREATE TYPE "DemoOutcome" AS ENUM ('interested', 'not_interested', 'order_placed', 'follow_up_needed');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed');

-- CreateEnum
CREATE TYPE "EmailTemplateCategory" AS ENUM ('line_card', 'follow_up', 'notification', 'custom');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'pending_approval', 'approved', 'exported', 'disputed');

-- CreateEnum
CREATE TYPE "BusinessRuleEntityType" AS ENUM ('account', 'contact', 'order', 'opportunity', 'activity', 'product');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('task_reminder', 'order_approval', 'commission_approval', 'system', 'mention');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'export_action', 'login', 'logout');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "zip_code" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(30),
    "website" VARCHAR(500),
    "logo_url" VARCHAR(500),
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL,
    "territory_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" VARCHAR(500),
    "last_login_at" TIMESTAMP(3),
    "refresh_token_hash" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "zip_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "boundary" JSONB,
    "assigned_rep_id" UUID,
    "commission_modifier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "address_line1" VARCHAR(255) NOT NULL,
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "zip_code" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(255),
    "website" VARCHAR(500),
    "territory_id" UUID NOT NULL,
    "assigned_rep_id" UUID NOT NULL,
    "parent_account_id" UUID,
    "health_score" INTEGER,
    "health_score_calculated_at" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "title" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_email" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "principal_contact_name" VARCHAR(200),
    "principal_contact_email" VARCHAR(255),
    "principal_contact_phone" VARCHAR(30),
    "base_commission_rate" DECIMAL(5,2) NOT NULL,
    "default_revenue_model" "RevenueModel" NOT NULL DEFAULT 'broker',
    "logo_url" VARCHAR(500),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "subcategory" VARCHAR(100),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "wholesale_price" DECIMAL(10,2),
    "case_size" VARCHAR(50),
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary_attributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'in_stock',
    "image_url" VARCHAR(500),
    "description" TEXT,
    "revenue_model" "RevenueModel" NOT NULL,
    "promo_price" DECIMAL(10,2),
    "promo_start_date" TIMESTAMP(3),
    "promo_end_date" TIMESTAMP(3),
    "lot_number" VARCHAR(100),
    "batch_id" VARCHAR(100),
    "origin" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "account_id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "parent_order_id" UUID,
    "vendor_brand_id" UUID,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "exported_at" TIMESTAMP(3),
    "accounting_reference" VARCHAR(100),
    "notes" TEXT,
    "fsma_lot_numbers" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "revenue_model" "RevenueModel" NOT NULL,
    "commission_rate" DECIMAL(5,2),
    "promo_applied" BOOLEAN NOT NULL DEFAULT false,
    "lot_number" VARCHAR(100),
    "batch_id" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "contact_id" UUID,
    "activity_type" "ActivityType" NOT NULL,
    "subject" VARCHAR(255),
    "notes" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_minutes" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity_sampled" INTEGER NOT NULL,
    "buyer_feedback" TEXT,
    "outcome" "DemoOutcome" NOT NULL DEFAULT 'follow_up_needed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID,
    "contact_id" UUID,
    "user_id" UUID,
    "activity_id" UUID,
    "direction" "EmailDirection" NOT NULL,
    "subject" VARCHAR(500),
    "body_preview" TEXT,
    "from_address" VARCHAR(255) NOT NULL,
    "to_addresses" TEXT[],
    "cc_addresses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "message_id" VARCHAR(500),
    "thread_id" VARCHAR(500),
    "engagement_status" "EngagementStatus" NOT NULL DEFAULT 'sent',
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "is_matched" BOOLEAN NOT NULL DEFAULT false,
    "can_spam_compliant" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "subject_template" VARCHAR(500) NOT NULL,
    "body_template" TEXT NOT NULL,
    "category" "EmailTemplateCategory" NOT NULL DEFAULT 'custom',
    "merge_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'prospecting',
    "probability" DECIMAL(5,2) NOT NULL,
    "estimated_value" DECIMAL(12,2) NOT NULL,
    "weighted_value" DECIMAL(12,2) NOT NULL,
    "close_date" DATE NOT NULL,
    "close_reason" TEXT,
    "assigned_rep_id" UUID NOT NULL,
    "notes" TEXT,
    "associated_brand_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "base_rate" DECIMAL(5,2) NOT NULL,
    "territory_modifier" DECIMAL(4,2) NOT NULL,
    "volume_tier" VARCHAR(50),
    "volume_tier_adjustment" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "effective_rate" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'pending',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "exported_at" TIMESTAMP(3),
    "accounting_reference" VARCHAR(100),
    "calculation_log" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "territory_id" UUID,
    "base_rate" DECIMAL(5,2) NOT NULL,
    "volume_tier_label" VARCHAR(50),
    "volume_threshold" DECIMAL(12,2),
    "tier_adjustment" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "effective_date" DATE NOT NULL,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "generated_by_id" UUID NOT NULL,
    "document_url" VARCHAR(500) NOT NULL,
    "document_size_bytes" INTEGER,
    "product_count" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "line_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "entity_type" "BusinessRuleEntityType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered" TIMESTAMP(3),
    "trigger_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "assignee_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "link_url" VARCHAR(500),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "idx_user_tenant_role" ON "users"("tenant_id", "role");

-- CreateIndex
CREATE INDEX "idx_user_territory" ON "users"("territory_id");

-- CreateIndex
CREATE INDEX "idx_user_is_active" ON "users"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "idx_user_tenant_email" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "idx_territory_assigned_rep" ON "territories"("assigned_rep_id");

-- CreateIndex
CREATE INDEX "idx_territory_region" ON "territories"("tenant_id", "region");

-- CreateIndex
CREATE UNIQUE INDEX "idx_territory_tenant_name" ON "territories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_account_tenant_name" ON "accounts"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_account_territory" ON "accounts"("territory_id");

-- CreateIndex
CREATE INDEX "idx_account_assigned_rep" ON "accounts"("assigned_rep_id");

-- CreateIndex
CREATE INDEX "idx_account_parent" ON "accounts"("parent_account_id");

-- CreateIndex
CREATE INDEX "idx_account_health_score" ON "accounts"("tenant_id", "health_score");

-- CreateIndex
CREATE INDEX "idx_account_type" ON "accounts"("tenant_id", "account_type");

-- CreateIndex
CREATE INDEX "idx_contact_account" ON "contacts"("account_id");

-- CreateIndex
CREATE INDEX "idx_contact_tenant_email" ON "contacts"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "idx_brand_active" ON "brands"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "idx_brand_tenant_name" ON "brands"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_product_brand" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "idx_product_category" ON "products"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "idx_product_availability" ON "products"("tenant_id", "availability_status");

-- CreateIndex
CREATE INDEX "idx_product_active" ON "products"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "idx_product_tenant_sku" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "idx_order_account" ON "orders"("account_id");

-- CreateIndex
CREATE INDEX "idx_order_rep" ON "orders"("rep_id");

-- CreateIndex
CREATE INDEX "idx_order_status" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_order_parent" ON "orders"("parent_order_id");

-- CreateIndex
CREATE INDEX "idx_order_vendor_brand" ON "orders"("vendor_brand_id");

-- CreateIndex
CREATE INDEX "idx_order_confirmed_at" ON "orders"("confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "idx_order_tenant_number" ON "orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "idx_orderitem_order" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_orderitem_product" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_orderitem_revenue_model" ON "order_items"("tenant_id", "revenue_model");

-- CreateIndex
CREATE INDEX "idx_activity_account" ON "activities"("account_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_user" ON "activities"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_type" ON "activities"("tenant_id", "activity_type");

-- CreateIndex
CREATE INDEX "idx_activity_occurred_at" ON "activities"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_activity_contact" ON "activities"("contact_id");

-- CreateIndex
CREATE INDEX "idx_demo_activity" ON "demos"("activity_id");

-- CreateIndex
CREATE INDEX "idx_demo_product" ON "demos"("product_id");

-- CreateIndex
CREATE INDEX "idx_email_account" ON "email_records"("account_id");

-- CreateIndex
CREATE INDEX "idx_email_contact" ON "email_records"("contact_id");

-- CreateIndex
CREATE INDEX "idx_email_user" ON "email_records"("user_id");

-- CreateIndex
CREATE INDEX "idx_email_from" ON "email_records"("tenant_id", "from_address");

-- CreateIndex
CREATE INDEX "idx_email_unmatched" ON "email_records"("tenant_id", "is_matched");

-- CreateIndex
CREATE INDEX "idx_email_message_id" ON "email_records"("tenant_id", "message_id");

-- CreateIndex
CREATE INDEX "idx_email_engagement" ON "email_records"("tenant_id", "engagement_status");

-- CreateIndex
CREATE INDEX "idx_emailtemplate_category" ON "email_templates"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "idx_emailtemplate_active" ON "email_templates"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "idx_emailtemplate_tenant_name" ON "email_templates"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_opportunity_account" ON "opportunities"("account_id");

-- CreateIndex
CREATE INDEX "idx_opportunity_stage" ON "opportunities"("tenant_id", "stage");

-- CreateIndex
CREATE INDEX "idx_opportunity_rep" ON "opportunities"("assigned_rep_id");

-- CreateIndex
CREATE INDEX "idx_opportunity_close_date" ON "opportunities"("tenant_id", "close_date");

-- CreateIndex
CREATE INDEX "idx_commission_rep_period" ON "commissions"("rep_id", "period");

-- CreateIndex
CREATE INDEX "idx_commission_order" ON "commissions"("order_id");

-- CreateIndex
CREATE INDEX "idx_commission_order_item" ON "commissions"("order_item_id");

-- CreateIndex
CREATE INDEX "idx_commission_status" ON "commissions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_commission_brand" ON "commissions"("brand_id");

-- CreateIndex
CREATE INDEX "idx_commission_period" ON "commissions"("tenant_id", "period");

-- CreateIndex
CREATE INDEX "idx_commrule_brand_effective" ON "commission_rules"("brand_id", "effective_date" DESC);

-- CreateIndex
CREATE INDEX "idx_commrule_territory" ON "commission_rules"("territory_id");

-- CreateIndex
CREATE INDEX "idx_commrule_active" ON "commission_rules"("tenant_id", "is_active", "effective_date");

-- CreateIndex
CREATE INDEX "idx_linecard_brand" ON "line_cards"("brand_id", "generated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_linecard_generated_by" ON "line_cards"("generated_by_id");

-- CreateIndex
CREATE INDEX "idx_businessrule_entity_active" ON "business_rules"("tenant_id", "entity_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "idx_businessrule_tenant_name" ON "business_rules"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_task_assignee_status" ON "tasks"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "idx_task_due_date" ON "tasks"("tenant_id", "due_date");

-- CreateIndex
CREATE INDEX "idx_task_account" ON "tasks"("account_id");

-- CreateIndex
CREATE INDEX "idx_notification_user_read" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_notification_tenant_created" ON "notifications"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_tenant_created" ON "audit_logs"("tenant_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territories" ADD CONSTRAINT "territories_assigned_rep_id_fkey" FOREIGN KEY ("assigned_rep_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_assigned_rep_id_fkey" FOREIGN KEY ("assigned_rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_parent_order_id_fkey" FOREIGN KEY ("parent_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_brand_id_fkey" FOREIGN KEY ("vendor_brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demos" ADD CONSTRAINT "demos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demos" ADD CONSTRAINT "demos_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demos" ADD CONSTRAINT "demos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assigned_rep_id_fkey" FOREIGN KEY ("assigned_rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_cards" ADD CONSTRAINT "line_cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_cards" ADD CONSTRAINT "line_cards_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_cards" ADD CONSTRAINT "line_cards_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_rules" ADD CONSTRAINT "business_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
