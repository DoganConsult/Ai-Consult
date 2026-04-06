-- ============================================================================
-- Migration 709: Workflow module_code columns + performance indexes
-- Enterprise-grade inbox, cross-module filtering, and SLA query performance.
-- ============================================================================

-- 1. Add module_code to process_tasks (for inbox filtering by module)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'process_tasks' AND column_name = 'module_code'
  ) THEN
    ALTER TABLE process_tasks ADD COLUMN module_code VARCHAR(100);
  END IF;
END $$;

-- Backfill module_code from entity_type where possible
UPDATE process_tasks SET module_code = entity_type
WHERE module_code IS NULL AND entity_type IS NOT NULL;

-- 2. Add module_code to workflow_definitions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'workflows' AND column_name = 'module_code'
  ) THEN
    ALTER TABLE workflows ADD COLUMN module_code VARCHAR(100);
  END IF;
END $$;

-- 3. Add module_code to workflow_templates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'workflow_templates' AND column_name = 'module_code'
  ) THEN
    ALTER TABLE workflow_templates ADD COLUMN module_code VARCHAR(100);
  END IF;
END $$;

-- 4. Performance indexes for inbox queries
-- Composite index: assigned_user_id + status + created_at (most common inbox query)
CREATE INDEX IF NOT EXISTS idx_pt_inbox_assigned
  ON process_tasks (assigned_user_id, status, created_at DESC)
  WHERE status NOT IN ('completed', 'cancelled', 'auto_closed');

-- Module + status for cross-module filtering
CREATE INDEX IF NOT EXISTS idx_pt_module_status
  ON process_tasks (module_code, status, assigned_user_id)
  WHERE module_code IS NOT NULL;

-- SLA check composite (for task monitor cron)
CREATE INDEX IF NOT EXISTS idx_pt_sla_active
  ON process_tasks (due_date, breached_at)
  WHERE status NOT IN ('completed', 'cancelled', 'auto_closed') AND due_date IS NOT NULL;

-- Workflow definition by module
CREATE INDEX IF NOT EXISTS idx_wf_def_module
  ON workflows (module_code, status)
  WHERE module_code IS NOT NULL AND deleted_at IS NULL;

-- Workflow template by module
CREATE INDEX IF NOT EXISTS idx_wf_tpl_module
  ON workflow_templates (module_code)
  WHERE module_code IS NOT NULL;
