-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'rep', 'logistics', 'viewer');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" VARCHAR(500),
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

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
    "commission_modifier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "territories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_territories" (
    "user_id" UUID NOT NULL,
    "territory_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_territories_pkey" PRIMARY KEY ("user_id","territory_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_email" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "field_name" VARCHAR(100),
    "old_value" TEXT,
    "new_value" TEXT,
    "change_summary" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "request_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_tenant_id_role_idx" ON "users"("tenant_id", "role");

-- CreateIndex
CREATE INDEX "users_tenant_id_is_active_idx" ON "users"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "territories_tenant_id_region_idx" ON "territories"("tenant_id", "region");

-- CreateIndex
CREATE UNIQUE INDEX "territories_tenant_id_name_key" ON "territories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "user_territories" ADD CONSTRAINT "user_territories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_territories" ADD CONSTRAINT "user_territories_territory_id_fkey" FOREIGN KEY ("territory_id") REFERENCES "territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Custom: Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on tenant-scoped tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "territories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_territories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role from session variable
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function: get current user id from session variable
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function: get current tenant id from session variable
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function: get territory IDs for the current user
CREATE OR REPLACE FUNCTION current_user_territory_ids() RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT territory_id FROM user_territories
    WHERE user_id = current_app_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ---- USERS table policies ----

-- Admin: full access, bypasses tenant isolation
CREATE POLICY users_admin_all ON "users"
  FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Manager: read all users in tenant, write users in tenant
CREATE POLICY users_manager_all ON "users"
  FOR ALL
  USING (current_user_role() = 'manager' AND tenant_id = current_app_tenant_id())
  WITH CHECK (current_user_role() = 'manager' AND tenant_id = current_app_tenant_id());

-- Rep: read own record + users in same territories
CREATE POLICY users_rep_select ON "users"
  FOR SELECT
  USING (
    current_user_role() = 'rep'
    AND tenant_id = current_app_tenant_id()
    AND (
      id = current_app_user_id()
      OR id IN (
        SELECT ut.user_id FROM user_territories ut
        WHERE ut.territory_id = ANY(current_user_territory_ids())
      )
    )
  );

-- Logistics: read users in tenant
CREATE POLICY users_logistics_select ON "users"
  FOR SELECT
  USING (current_user_role() = 'logistics' AND tenant_id = current_app_tenant_id());

-- Viewer: read-only access to users in tenant
CREATE POLICY users_viewer_select ON "users"
  FOR SELECT
  USING (current_user_role() = 'viewer' AND tenant_id = current_app_tenant_id());

-- ---- TERRITORIES table policies ----

-- Admin: full access
CREATE POLICY territories_admin_all ON "territories"
  FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Manager: read all territories in tenant
CREATE POLICY territories_manager_select ON "territories"
  FOR SELECT
  USING (current_user_role() = 'manager' AND tenant_id = current_app_tenant_id());

-- Rep: read own assigned territories
CREATE POLICY territories_rep_select ON "territories"
  FOR SELECT
  USING (
    current_user_role() = 'rep'
    AND tenant_id = current_app_tenant_id()
    AND id = ANY(current_user_territory_ids())
  );

-- Logistics: read all territories in tenant
CREATE POLICY territories_logistics_select ON "territories"
  FOR SELECT
  USING (current_user_role() = 'logistics' AND tenant_id = current_app_tenant_id());

-- Viewer: read all territories in tenant
CREATE POLICY territories_viewer_select ON "territories"
  FOR SELECT
  USING (current_user_role() = 'viewer' AND tenant_id = current_app_tenant_id());

-- ---- USER_TERRITORIES table policies ----

-- Admin: full access
CREATE POLICY user_territories_admin_all ON "user_territories"
  FOR ALL
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Manager: read all assignments in tenant
CREATE POLICY user_territories_manager_select ON "user_territories"
  FOR SELECT
  USING (
    current_user_role() = 'manager'
    AND user_id IN (SELECT id FROM users WHERE tenant_id = current_app_tenant_id())
  );

-- Rep: read own assignments
CREATE POLICY user_territories_rep_select ON "user_territories"
  FOR SELECT
  USING (current_user_role() = 'rep' AND user_id = current_app_user_id());

-- Viewer: read assignments in tenant
CREATE POLICY user_territories_viewer_select ON "user_territories"
  FOR SELECT
  USING (
    current_user_role() = 'viewer'
    AND user_id IN (SELECT id FROM users WHERE tenant_id = current_app_tenant_id())
  );

-- ---- AUDIT_LOGS table policies ----

-- Admin: read all
CREATE POLICY audit_logs_admin_select ON "audit_logs"
  FOR SELECT
  USING (current_user_role() = 'admin');

-- Admin: insert (for audit writes)
CREATE POLICY audit_logs_admin_insert ON "audit_logs"
  FOR INSERT
  WITH CHECK (current_user_role() = 'admin');

-- Manager: read tenant audit logs
CREATE POLICY audit_logs_manager_select ON "audit_logs"
  FOR SELECT
  USING (current_user_role() = 'manager' AND tenant_id = current_app_tenant_id());

-- All authenticated roles: insert audit logs (needed for audit trail writes)
CREATE POLICY audit_logs_insert ON "audit_logs"
  FOR INSERT
  WITH CHECK (
    current_user_role() IN ('admin', 'manager', 'rep', 'logistics')
    AND tenant_id = current_app_tenant_id()
  );

-- ============================================================================
-- Custom: Audit Log Immutability Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are not allowed.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- ============================================================================
-- Custom: Bypass RLS for the Prisma migration user
-- The application uses SET LOCAL to set session variables for RLS,
-- but Prisma itself needs to bypass RLS for migrations and seeding.
-- ============================================================================

-- Grant the current database user (typically 'postgres') bypass RLS
-- This is already the superuser default, but we document it explicitly.
-- For non-superuser app connections, RLS policies will be enforced.
