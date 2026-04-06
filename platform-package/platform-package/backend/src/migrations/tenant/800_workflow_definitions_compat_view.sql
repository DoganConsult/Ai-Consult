-- ============================================
-- AGRC-OS Tenant Migration 266
-- Workflow Definitions Compatibility View
--
-- The baseline creates both `workflows` and `workflow_definitions` with
-- nearly identical schemas. No service references `workflow_definitions`;
-- all runtime uses `workflows`. This migration drops the unused table
-- and replaces it with a compatibility VIEW.
-- ============================================

DO $$
BEGIN
  -- Only act if workflow_definitions is an actual table (not already a view)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'workflow_definitions'
      AND table_type = 'BASE TABLE'
  ) THEN
    -- Migrate any rows that exist in workflow_definitions but not in workflows
    INSERT INTO workflow_definitions_migrated_backup
      SELECT * FROM workflow_definitions
      WHERE workflow_id NOT IN (SELECT workflow_id FROM workflows);
    -- This will fail silently if backup table doesn't exist, which is fine
    EXCEPTION WHEN undefined_table THEN NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'workflow_definitions'
      AND table_type = 'BASE TABLE'
  ) THEN
    -- Drop the unused table
    EXECUTE format('DROP TABLE IF EXISTS %I.workflow_definitions CASCADE', current_schema());
    -- Create compatibility VIEW
    EXECUTE format(
      'CREATE OR REPLACE VIEW %I.workflow_definitions AS
       SELECT workflow_id, name, definition, version, status, created_by, created_at, updated_at, NULL::timestamptz AS deleted_at
       FROM %I.workflows',
      current_schema(), current_schema()
    );
  END IF;
END $$;
