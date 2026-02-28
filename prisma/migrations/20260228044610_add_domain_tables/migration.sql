-- CreateEnum
CREATE TYPE "DataImportStatus" AS ENUM ('pending', 'validating', 'previewed', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "DataImportEntityType" AS ENUM ('account', 'contact', 'product', 'order');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('retail', 'restaurant', 'distributor');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('visit', 'call', 'email', 'demo', 'sampling');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('task_reminder', 'task_assigned', 'task_overdue', 'order_approval_required', 'order_approved', 'order_rejected', 'order_export_failed');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'pending_approval', 'confirmed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "RevenueModel" AS ENUM ('broker', 'wholesale');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('active', 'seasonal', 'discontinued');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('approved', 'rejected');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('queued', 'exported', 'failed');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');

-- CreateEnum
CREATE TYPE "CommissionStatementStatus" AS ENUM ('pending', 'approved', 'exported', 'paid');

-- CreateEnum
CREATE TYPE "CommissionDisputeStatus" AS ENUM ('open', 'resolved');

-- CreateEnum
CREATE TYPE "CommissionEntryType" AS ENUM ('calculation', 'reversal', 'credit');

-- CreateEnum
CREATE TYPE "ReportEntityType" AS ENUM ('ACCOUNT', 'ORDER', 'PRODUCT', 'COMMISSION', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "BusinessRuleStatus" AS ENUM ('active', 'inactive', 'error');

-- CreateEnum
CREATE TYPE "BusinessRuleActionType" AS ENUM ('send_notification', 'update_field', 'create_task', 'send_email');

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "street_address" VARCHAR(500) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "zip_code" VARCHAR(20) NOT NULL,
    "territory_id" UUID NOT NULL,
    "parent_account_id" UUID,
    "health_score" INTEGER,
    "health_score_calculated_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

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
    "phone" VARCHAR(50),
    "title" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_health_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "factor_breakdown" JSONB NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "notes" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity_sampled" INTEGER,
    "buyer_feedback" TEXT,
    "outcome" VARCHAR(20),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMPTZ NOT NULL,
    "priority" "TaskPriority" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "assignee_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "account_id" UUID,
    "contact_id" UUID,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "remind_at" TIMESTAMPTZ NOT NULL,
    "reminder_type" VARCHAR(10) NOT NULL,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMPTZ,
    "bullmq_job_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID,
    "account_id" UUID,
    "user_id" UUID NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "body_preview" VARCHAR(500),
    "direction" "EmailDirection" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'sent',
    "recipient_email" VARCHAR(255) NOT NULL,
    "opened_at" TIMESTAMPTZ,
    "clicked_at" TIMESTAMPTZ,
    "bounced_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "description" VARCHAR(2000),
    "logo_url" VARCHAR(500),
    "contact_name" VARCHAR(255),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "website" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50),
    "subcategory" VARCHAR(100),
    "description" VARCHAR(2000),
    "unit_price" DECIMAL(10,2) NOT NULL,
    "wholesale_price" DECIMAL(10,2),
    "promotional_price" DECIMAL(10,2),
    "promotional_price_start" TIMESTAMPTZ,
    "promotional_price_end" TIMESTAMPTZ,
    "case_size" INTEGER,
    "revenue_model_default" "RevenueModel" NOT NULL,
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'active',
    "image_url" VARCHAR(500),
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary_attributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_number" VARCHAR(20) NOT NULL,
    "account_id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submitted_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "export_status" "ExportStatus",
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "vendor_sub_order_id" UUID,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "revenue_model" "RevenueModel" NOT NULL,
    "commission_rate" DECIMAL(5,2),
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,
    "promotional_price_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "order_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_sub_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "fulfillment_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vendor_sub_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "reason" TEXT,
    "decided_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quickbooks_exports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "ExportStatus" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ,
    "error_details" TEXT,
    "csv_data" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "quickbooks_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "estimated_value" DECIMAL(12,2) NOT NULL,
    "probability" DECIMAL(5,2) NOT NULL,
    "expected_close_date" DATE NOT NULL,
    "stage" "PipelineStage" NOT NULL,
    "close_reason" TEXT,
    "closed_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "opportunity_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,

    CONSTRAINT "opportunity_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "territory_id" UUID,
    "base_rate" DECIMAL(5,4) NOT NULL,
    "territory_modifier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "volume_tiers" JSONB NOT NULL,
    "effective_date" DATE NOT NULL,
    "expires_at" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_line_item_id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "commission_rule_id" UUID NOT NULL,
    "statement_id" UUID,
    "entry_type" "CommissionEntryType" NOT NULL DEFAULT 'calculation',
    "base_rate" DECIMAL(5,4) NOT NULL,
    "territory_modifier" DECIMAL(4,2) NOT NULL,
    "volume_tier_applied" VARCHAR(100) NOT NULL,
    "effective_rate" DECIMAL(5,4) NOT NULL,
    "line_item_total" DECIMAL(12,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_statements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rep_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "CommissionStatementStatus" NOT NULL DEFAULT 'pending',
    "total_earned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ytd_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "exported_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "commission_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "statement_id" UUID NOT NULL,
    "commission_entry_id" UUID NOT NULL,
    "filed_by" UUID NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "CommissionDisputeStatus" NOT NULL DEFAULT 'open',
    "original_amount" DECIMAL(12,2) NOT NULL,
    "adjusted_amount" DECIMAL(12,2),
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ,
    "resolution_notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "commission_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_exports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "format" VARCHAR(50) NOT NULL DEFAULT 'quickbooks_csv',
    "file_content" TEXT NOT NULL,
    "reference_id" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_imports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "entity_type" "DataImportEntityType" NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "created_rows" INTEGER NOT NULL DEFAULT 0,
    "updated_rows" INTEGER NOT NULL DEFAULT 0,
    "skipped_rows" INTEGER NOT NULL DEFAULT 0,
    "status" "DataImportStatus" NOT NULL DEFAULT 'pending',
    "error_log" JSONB,
    "parsed_data" JSONB,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "data_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000),
    "entity_type" "ReportEntityType" NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "columns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "last_run_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_quality_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_completeness" DOUBLE PRECISION NOT NULL,
    "contact_email_validity" DOUBLE PRECISION NOT NULL,
    "product_images" DOUBLE PRECISION NOT NULL,
    "duplicate_account_count" INTEGER NOT NULL,
    "stale_account_count" INTEGER NOT NULL,
    "composite_score" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_quality_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "entity_type" VARCHAR(50) NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "status" "BusinessRuleStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "last_fired_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CommissionExportStatements" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE INDEX "accounts_tenant_id_territory_id_idx" ON "accounts"("tenant_id", "territory_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_account_type_idx" ON "accounts"("tenant_id", "account_type");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_health_score_idx" ON "accounts"("tenant_id", "health_score");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_parent_account_id_idx" ON "accounts"("tenant_id", "parent_account_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_deleted_at_idx" ON "accounts"("tenant_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenant_id_name_key" ON "accounts"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_account_id_idx" ON "contacts"("tenant_id", "account_id");

-- CreateIndex
CREATE INDEX "contacts_tenant_id_email_idx" ON "contacts"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "account_health_scores_account_id_calculated_at_idx" ON "account_health_scores"("account_id", "calculated_at" DESC);

-- CreateIndex
CREATE INDEX "account_health_scores_tenant_id_calculated_at_idx" ON "account_health_scores"("tenant_id", "calculated_at" DESC);

-- CreateIndex
CREATE INDEX "activities_tenant_id_account_id_occurred_at_idx" ON "activities"("tenant_id", "account_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "activities_tenant_id_user_id_occurred_at_idx" ON "activities"("tenant_id", "user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "activities_tenant_id_type_occurred_at_idx" ON "activities"("tenant_id", "type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "activities_tenant_id_deleted_at_idx" ON "activities"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "demos_activity_id_idx" ON "demos"("activity_id");

-- CreateIndex
CREATE INDEX "demos_tenant_id_product_id_idx" ON "demos"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_assignee_id_status_due_date_idx" ON "tasks"("tenant_id", "assignee_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_account_id_created_at_idx" ON "tasks"("tenant_id", "account_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_tenant_id_status_due_date_idx" ON "tasks"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_deleted_at_idx" ON "tasks"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "task_reminders_task_id_idx" ON "task_reminders"("task_id");

-- CreateIndex
CREATE INDEX "task_reminders_tenant_id_is_sent_remind_at_idx" ON "task_reminders"("tenant_id", "is_sent", "remind_at");

-- CreateIndex
CREATE INDEX "email_records_tenant_id_account_id_sent_at_idx" ON "email_records"("tenant_id", "account_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "email_records_tenant_id_contact_id_sent_at_idx" ON "email_records"("tenant_id", "contact_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "email_records_tenant_id_status_idx" ON "email_records"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "email_records_tenant_id_recipient_email_idx" ON "email_records"("tenant_id", "recipient_email");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_is_read_created_at_idx" ON "notifications"("tenant_id", "user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_created_at_idx" ON "notifications"("tenant_id", "user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "brands_tenant_id_is_active_idx" ON "brands"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_name_key" ON "brands"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "products_tenant_id_brand_id_idx" ON "products"("tenant_id", "brand_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_availability_status_idx" ON "products"("tenant_id", "availability_status");

-- CreateIndex
CREATE INDEX "products_tenant_id_is_active_idx" ON "products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "products_tenant_id_category_idx" ON "products"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_sku_key" ON "products"("tenant_id", "sku");

-- CreateIndex
CREATE INDEX "orders_tenant_id_account_id_created_at_idx" ON "orders"("tenant_id", "account_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_tenant_id_rep_id_status_idx" ON "orders"("tenant_id", "rep_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_created_at_idx" ON "orders"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_tenant_id_export_status_idx" ON "orders"("tenant_id", "export_status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_order_number_key" ON "orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "order_line_items_order_id_idx" ON "order_line_items"("order_id");

-- CreateIndex
CREATE INDEX "order_line_items_tenant_id_product_id_idx" ON "order_line_items"("tenant_id", "product_id");

-- CreateIndex
CREATE INDEX "vendor_sub_orders_order_id_idx" ON "vendor_sub_orders"("order_id");

-- CreateIndex
CREATE INDEX "vendor_sub_orders_tenant_id_brand_id_idx" ON "vendor_sub_orders"("tenant_id", "brand_id");

-- CreateIndex
CREATE INDEX "order_approvals_order_id_idx" ON "order_approvals"("order_id");

-- CreateIndex
CREATE INDEX "order_approvals_tenant_id_approver_id_decided_at_idx" ON "order_approvals"("tenant_id", "approver_id", "decided_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quickbooks_exports_order_id_key" ON "quickbooks_exports"("order_id");

-- CreateIndex
CREATE INDEX "quickbooks_exports_tenant_id_status_idx" ON "quickbooks_exports"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "opportunities_tenant_id_stage_idx" ON "opportunities"("tenant_id", "stage");

-- CreateIndex
CREATE INDEX "opportunities_tenant_id_rep_id_idx" ON "opportunities"("tenant_id", "rep_id");

-- CreateIndex
CREATE INDEX "opportunities_tenant_id_account_id_idx" ON "opportunities"("tenant_id", "account_id");

-- CreateIndex
CREATE INDEX "opportunities_tenant_id_expected_close_date_idx" ON "opportunities"("tenant_id", "expected_close_date");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_brands_opportunity_id_brand_id_key" ON "opportunity_brands"("opportunity_id", "brand_id");

-- CreateIndex
CREATE INDEX "commission_rules_tenant_id_brand_id_effective_date_idx" ON "commission_rules"("tenant_id", "brand_id", "effective_date");

-- CreateIndex
CREATE INDEX "commission_rules_tenant_id_brand_id_territory_id_effective__idx" ON "commission_rules"("tenant_id", "brand_id", "territory_id", "effective_date");

-- CreateIndex
CREATE INDEX "commission_rules_tenant_id_is_active_idx" ON "commission_rules"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "commission_entries_tenant_id_rep_id_calculated_at_idx" ON "commission_entries"("tenant_id", "rep_id", "calculated_at" DESC);

-- CreateIndex
CREATE INDEX "commission_entries_tenant_id_order_id_idx" ON "commission_entries"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "commission_entries_tenant_id_statement_id_idx" ON "commission_entries"("tenant_id", "statement_id");

-- CreateIndex
CREATE INDEX "commission_statements_tenant_id_status_idx" ON "commission_statements"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "commission_statements_tenant_id_rep_id_year_month_key" ON "commission_statements"("tenant_id", "rep_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "commission_disputes_commission_entry_id_key" ON "commission_disputes"("commission_entry_id");

-- CreateIndex
CREATE INDEX "commission_disputes_tenant_id_statement_id_status_idx" ON "commission_disputes"("tenant_id", "statement_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "commission_exports_reference_id_key" ON "commission_exports"("reference_id");

-- CreateIndex
CREATE INDEX "commission_exports_tenant_id_year_month_idx" ON "commission_exports"("tenant_id", "year", "month");

-- CreateIndex
CREATE INDEX "data_imports_tenant_id_status_created_at_idx" ON "data_imports"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "data_imports_tenant_id_entity_type_idx" ON "data_imports"("tenant_id", "entity_type");

-- CreateIndex
CREATE INDEX "saved_reports_tenant_id_created_by_id_deleted_at_idx" ON "saved_reports"("tenant_id", "created_by_id", "deleted_at");

-- CreateIndex
CREATE INDEX "saved_reports_tenant_id_is_shared_deleted_at_idx" ON "saved_reports"("tenant_id", "is_shared", "deleted_at");

-- CreateIndex
CREATE INDEX "data_quality_scores_tenant_id_calculated_at_idx" ON "data_quality_scores"("tenant_id", "calculated_at" DESC);

-- CreateIndex
CREATE INDEX "business_rules_tenant_id_status_idx" ON "business_rules"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "business_rules_tenant_id_entity_type_status_idx" ON "business_rules"("tenant_id", "entity_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "_CommissionExportStatements_AB_unique" ON "_CommissionExportStatements"("A", "B");

-- CreateIndex
CREATE INDEX "_CommissionExportStatements_B_index" ON "_CommissionExportStatements"("B");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_health_scores" ADD CONSTRAINT "account_health_scores_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demos" ADD CONSTRAINT "demos_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reminders" ADD CONSTRAINT "task_reminders_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_records" ADD CONSTRAINT "email_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_vendor_sub_order_id_fkey" FOREIGN KEY ("vendor_sub_order_id") REFERENCES "vendor_sub_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_sub_orders" ADD CONSTRAINT "vendor_sub_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_sub_orders" ADD CONSTRAINT "vendor_sub_orders_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_approvals" ADD CONSTRAINT "order_approvals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_approvals" ADD CONSTRAINT "order_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quickbooks_exports" ADD CONSTRAINT "quickbooks_exports_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_brands" ADD CONSTRAINT "opportunity_brands_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_brands" ADD CONSTRAINT "opportunity_brands_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_order_line_item_id_fkey" FOREIGN KEY ("order_line_item_id") REFERENCES "order_line_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "commission_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_statements" ADD CONSTRAINT "commission_statements_rep_id_fkey" FOREIGN KEY ("rep_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_statements" ADD CONSTRAINT "commission_statements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_disputes" ADD CONSTRAINT "commission_disputes_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "commission_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_disputes" ADD CONSTRAINT "commission_disputes_commission_entry_id_fkey" FOREIGN KEY ("commission_entry_id") REFERENCES "commission_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_disputes" ADD CONSTRAINT "commission_disputes_filed_by_fkey" FOREIGN KEY ("filed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_disputes" ADD CONSTRAINT "commission_disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_exports" ADD CONSTRAINT "commission_exports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_imports" ADD CONSTRAINT "data_imports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_rules" ADD CONSTRAINT "business_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommissionExportStatements" ADD CONSTRAINT "_CommissionExportStatements_A_fkey" FOREIGN KEY ("A") REFERENCES "commission_exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommissionExportStatements" ADD CONSTRAINT "_CommissionExportStatements_B_fkey" FOREIGN KEY ("B") REFERENCES "commission_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
