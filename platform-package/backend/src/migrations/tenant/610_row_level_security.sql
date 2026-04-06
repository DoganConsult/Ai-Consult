-- ============================================================================
-- Row-Level Security (RLS) — Defense-in-depth tenant isolation
-- Ensures queries can only access rows belonging to the current tenant,
-- even if application-level schema isolation is bypassed.
-- ============================================================================

-- Enable RLS on high-risk tables
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;

-- Create policies: allow access only when tenant_id matches session variable
-- The tenant-client.ts middleware sets: SET app.current_tenant_id = 'xxx'
CREATE POLICY tenant_isolation_risks ON risks
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_controls ON controls
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_evidence ON evidence_tasks
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_process_tasks ON process_tasks
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_policies ON policies
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

CREATE POLICY tenant_isolation_frameworks ON frameworks
  USING (tenant_id = current_setting('app.current_tenant_id', true)::text);

-- Bypass policy for the application role (migrations/seeding need full access)
-- The main app user should have the BYPASSRLS attribute set in production
-- This is handled at the database role level, not in SQL migrations
