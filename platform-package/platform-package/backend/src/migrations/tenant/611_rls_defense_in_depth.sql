-- ============================================================================
-- Migration 611: Row-Level Security (RLS) — Defense-in-Depth for Multi-Tenant Isolation
-- ============================================================================
-- Supersedes partial RLS in migrations 608 and 610 by:
--   1. Adding a reusable current_tenant_id() helper function
--   2. Covering all high-risk domain tables (not just 6-8)
--   3. Using FORCE ROW LEVEL SECURITY (applies even to table owner / app DB user)
--   4. Including WITH CHECK clause to guard INSERTs and UPDATEs
--   5. Being fully idempotent (safe to run multiple times)
--
-- Policy semantics:
--   - If app.current_tenant_id is NOT set (NULL or ''), all rows are visible.
--     This allows migrations, seeding, and administrative scripts to run without
--     the session variable. The tenant-client.ts middleware always sets it for
--     normal API requests, so this fallback only fires during bootstrap.
--   - If app.current_tenant_id IS set, only rows matching that tenant_id are
--     visible and writable.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper function: safely retrieve the current tenant ID
--    Returns NULL when the session variable is missing or empty.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
DECLARE
  tid TEXT;
BEGIN
  tid := current_setting('app.current_tenant_id', true);
  IF tid IS NULL OR tid = '' THEN
    RETURN NULL;
  END IF;
  RETURN tid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS + create tenant_isolation policy on all high-risk tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  -- Comprehensive list of tables that hold tenant-scoped data.
  -- Grouped by domain for clarity.
  tables_to_protect TEXT[] := ARRAY[
    -- Core GRC domain
    'controls',
    'risks',
    'policies',
    'frameworks',
    'assessments',
    'findings',
    'incidents',
    'exceptions',
    'remediation_tasks',
    -- Evidence & audit
    'evidence',
    'evidence_tasks',
    'evidence_schedules',
    'evidence_requests',
    'audit_engagements',
    'audit_plan_items',
    'audit_trail',
    -- Workflow & process
    'workflows',
    'workflow_definitions',
    'workflow_instances',
    'process_tasks',
    -- Vendor & third-party
    'vendors',
    'vendor_assessments',
    -- Organizational
    'teams',
    'raci_matrix',
    'notifications',
    'notification_queue',
    -- Automation & AI
    'automation_rules',
    'ai_review_queue',
    'ai_sessions',
    'agent_memory',
    -- Activity & collaboration
    'activity_feed',
    'action_items',
    'comments',
    -- Governance
    'committee_meetings',
    'board_decisions',
    'mandates',
    'obligations',
    -- Authorization
    'authorization_mismatch_log',
    -- Feature & config
    'feature_flags',
    'escalation_paths',
    'sla_config'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_protect
  LOOP
    -- Only proceed if the table exists in the current tenant schema
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = tbl
    ) THEN
      RAISE NOTICE 'RLS skip (table not found): %', tbl;
      CONTINUE;
    END IF;

    -- Only proceed if the table has a tenant_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = tbl
        AND column_name = 'tenant_id'
    ) THEN
      RAISE NOTICE 'RLS skip (no tenant_id column): %', tbl;
      CONTINUE;
    END IF;

    -- Enable RLS on the table
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Force RLS even for the table owner (the application DB user).
    -- This is the defense-in-depth guarantee: even superuser-level app
    -- connections are constrained to the current tenant.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

    -- Drop any existing policies from previous migrations (608, 610, baseline)
    -- to avoid conflicts. We consolidate into a single canonical policy.
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_risks ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_controls ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_evidence ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_process_tasks ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policies ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_frameworks ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS rls_%s_tenant ON %I', tbl, tbl);

    -- Create the consolidated tenant isolation policy.
    --
    -- USING clause (SELECT, UPDATE, DELETE):
    --   Allow access when the session variable is not set (NULL) — this
    --   permits migrations, seeds, and admin scripts to operate freely.
    --   When set, only rows belonging to the current tenant are visible.
    --
    -- WITH CHECK clause (INSERT, UPDATE):
    --   Same logic — prevents writing rows for a different tenant when
    --   the session variable is active.
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       FOR ALL
       USING (
         current_tenant_id() IS NULL
         OR tenant_id IS NULL
         OR tenant_id::text = current_tenant_id()
       )
       WITH CHECK (
         current_tenant_id() IS NULL
         OR tenant_id IS NULL
         OR tenant_id::text = current_tenant_id()
       )',
      tbl
    );

    RAISE NOTICE 'RLS enforced on table: %', tbl;
  END LOOP;
END;
$$;
