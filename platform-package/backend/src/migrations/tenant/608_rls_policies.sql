-- Migration 608: Row-Level Security policies for tenant isolation
-- Defense-in-depth: prevents cross-tenant data leakage even if search_path is misconfigured.
-- Uses session variable app.current_tenant_id (set by tenant-client.ts).
-- See docs/COMPILER-100-SPEC.md §5 (Tenant Isolation).

-- Helper: enable RLS + create policy on a table (only if tenant_id column exists)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'controls', 'risks', 'policies', 'evidence_tasks', 'evidence_schedules',
    'frameworks', 'workflow_definitions', 'assessments', 'incidents', 'exceptions',
    'vendors', 'audit_plan_items', 'process_tasks', 'teams', 'raci_matrix',
    'escalation_paths', 'automation_rules', 'feature_flags'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Only apply if table exists in this schema
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = tbl
    ) THEN
      -- Only apply if table has tenant_id column
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = tbl AND column_name = 'tenant_id'
      ) THEN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
        EXECUTE format(
          'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.current_tenant_id'', true))',
          tbl
        );
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;
