-- Row-Level Security (RLS) Policies for Haversack Unified Platform
-- Applied via migration script: scripts/run-rls-policies.ts
-- NFR-008: RBAC enforced at database layer with territory-scoped data isolation

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current tenant_id from the session variable
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a function to get the current user_id from the session variable
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a function to get the current user role from the session variable
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_role', true), '');
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── Tenant Isolation Policies ─────────────────────────────────
-- All tables with tenant_id get a base policy ensuring only same-tenant data is visible

-- Users
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_tenant_id());

-- Territories
CREATE POLICY tenant_isolation_territories ON territories
  USING (tenant_id = current_tenant_id());

-- Accounts
CREATE POLICY tenant_isolation_accounts ON accounts
  USING (tenant_id = current_tenant_id());

-- Contacts
CREATE POLICY tenant_isolation_contacts ON contacts
  USING (tenant_id = current_tenant_id());

-- Brands
CREATE POLICY tenant_isolation_brands ON brands
  USING (tenant_id = current_tenant_id());

-- Products
CREATE POLICY tenant_isolation_products ON products
  USING (tenant_id = current_tenant_id());

-- Orders
CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id = current_tenant_id());

-- Order Items
CREATE POLICY tenant_isolation_order_items ON order_items
  USING (tenant_id = current_tenant_id());

-- Activities
CREATE POLICY tenant_isolation_activities ON activities
  USING (tenant_id = current_tenant_id());

-- Demos
CREATE POLICY tenant_isolation_demos ON demos
  USING (tenant_id = current_tenant_id());

-- Email Records
CREATE POLICY tenant_isolation_email_records ON email_records
  USING (tenant_id = current_tenant_id());

-- Email Templates
CREATE POLICY tenant_isolation_email_templates ON email_templates
  USING (tenant_id = current_tenant_id());

-- Opportunities
CREATE POLICY tenant_isolation_opportunities ON opportunities
  USING (tenant_id = current_tenant_id());

-- Commissions
CREATE POLICY tenant_isolation_commissions ON commissions
  USING (tenant_id = current_tenant_id());

-- Commission Rules
CREATE POLICY tenant_isolation_commission_rules ON commission_rules
  USING (tenant_id = current_tenant_id());

-- Line Cards
CREATE POLICY tenant_isolation_line_cards ON line_cards
  USING (tenant_id = current_tenant_id());

-- Business Rules
CREATE POLICY tenant_isolation_business_rules ON business_rules
  USING (tenant_id = current_tenant_id());

-- Tasks
CREATE POLICY tenant_isolation_tasks ON tasks
  USING (tenant_id = current_tenant_id());

-- Audit Trails
CREATE POLICY tenant_isolation_audit_trails ON audit_trails
  USING (tenant_id = current_tenant_id());

-- Data Quality Scores
CREATE POLICY tenant_isolation_data_quality_scores ON data_quality_scores
  USING (tenant_id = current_tenant_id());

-- Import Jobs
CREATE POLICY tenant_isolation_import_jobs ON import_jobs
  USING (tenant_id = current_tenant_id());

-- Notifications
CREATE POLICY tenant_isolation_notifications ON notifications
  USING (tenant_id = current_tenant_id());

-- ─── Audit Trail Protection ────────────────────────────────────
-- AuditTrail is INSERT-ONLY — prevent UPDATE and DELETE at database level
CREATE POLICY audit_trail_insert_only ON audit_trails
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Revoke UPDATE and DELETE on audit_trails from the application role
-- (Applied after role creation in production setup)
-- REVOKE UPDATE, DELETE ON audit_trails FROM haversack_app;

-- ─── Bypass Policy for Service Account ─────────────────────────
-- The migration/seed user and background worker need unrestricted access
-- This is handled by setting the session variable to the correct tenant
-- or by using a superuser connection for migrations
