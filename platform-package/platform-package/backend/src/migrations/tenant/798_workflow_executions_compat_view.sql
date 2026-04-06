-- ============================================
-- AGRC-OS Tenant Migration 265
-- Workflow Executions Compatibility View
--
-- Migration 032 renamed workflow_executions → workflow_instances.
-- The baseline schema creates workflow_instances directly.
-- Services still reference workflow_executions by the old name.
-- This view provides backward compatibility for all DML operations.
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'workflow_executions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'workflow_instances'
  ) THEN
    EXECUTE format(
      'CREATE OR REPLACE VIEW %I.workflow_executions AS SELECT * FROM %I.workflow_instances',
      current_schema(), current_schema()
    );
  END IF;
END $$;
