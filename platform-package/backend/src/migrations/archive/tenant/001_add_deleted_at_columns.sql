-- Tenant migration: Add soft-delete columns to all entity tables
-- Adds deleted_at and deleted_by columns for soft-delete support

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'risks', 'policies', 'controls', 'incidents', 'vendors',
    'evidence', 'frameworks', 'assessments', 'findings', 'assets',
    'exceptions', 'bcp_plans', 'audit_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only add if table exists and column doesn't exist yet
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = current_schema()) THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'deleted_at' AND table_schema = current_schema()) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN deleted_by TEXT DEFAULT NULL', tbl);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_deleted_at ON %I (deleted_at)', tbl, tbl);
      END IF;
    END IF;
  END LOOP;
END $$;
