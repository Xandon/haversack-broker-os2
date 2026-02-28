-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- RLS helper function
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT COALESCE(current_setting('app.current_tenant_id', TRUE)::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
$$ LANGUAGE SQL STABLE;
