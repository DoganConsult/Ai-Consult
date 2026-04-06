-- ============================================
-- AGRC-OS Tenant Migration 431
-- Workflow Trigger Metadata: Adds trigger event context to workflow executions
-- (Law 7: Inspectable Workflows)
-- ============================================

-- Add trigger metadata columns to the actual table (workflow_instances)
ALTER TABLE workflow_instances
  ADD COLUMN IF NOT EXISTS trigger_event_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS trigger_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trigger_conditions JSONB;

-- Recreate the compatibility view to include new columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = current_schema()
      AND table_name = 'workflow_executions'
  ) THEN
    EXECUTE format(
      'CREATE OR REPLACE VIEW %I.workflow_executions AS SELECT * FROM %I.workflow_instances',
      current_schema(), current_schema()
    );
  END IF;
END $$;
