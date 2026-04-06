-- Phase 2B: Row-Level Security on GRC core tables
-- Defense-in-depth: tenant_id column + RLS policy per table.
-- Policy is permissive when session variable is not set (migrations, admin).

-- 1. risks
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'risks') THEN
    ALTER TABLE risks ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE risks FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_risks_tenant ON risks;
    CREATE POLICY rls_risks_tenant ON risks
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 2. policies
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'policies') THEN
    ALTER TABLE policies ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
    ALTER TABLE policies FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_policies_tenant ON policies;
    CREATE POLICY rls_policies_tenant ON policies
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 3. controls
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'controls') THEN
    ALTER TABLE controls ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
    ALTER TABLE controls FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_controls_tenant ON controls;
    CREATE POLICY rls_controls_tenant ON controls
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 4. assessments
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'assessments') THEN
    ALTER TABLE assessments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE assessments FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_assessments_tenant ON assessments;
    CREATE POLICY rls_assessments_tenant ON assessments
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 5. evidence (canonical table)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'evidence') THEN
    ALTER TABLE evidence ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
    ALTER TABLE evidence FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_evidence_tenant ON evidence;
    CREATE POLICY rls_evidence_tenant ON evidence
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;

-- 5b. evidence_metadata (legacy — may not exist in all tenant schemas)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'evidence_metadata') THEN
    ALTER TABLE evidence_metadata ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);
    ALTER TABLE evidence_metadata ENABLE ROW LEVEL SECURITY;
    ALTER TABLE evidence_metadata FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_evidence_tenant ON evidence_metadata;
    CREATE POLICY rls_evidence_tenant ON evidence_metadata
      USING (
        current_setting('app.current_tenant_id', true) IS NULL
        OR current_setting('app.current_tenant_id', true) = ''
        OR tenant_id IS NULL
        OR tenant_id = current_setting('app.current_tenant_id', true)
      )
      WITH CHECK (true);
  END IF;
END $$;
