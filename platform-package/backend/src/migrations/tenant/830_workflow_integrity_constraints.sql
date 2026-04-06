-- ============================================================================
-- Migration 710: Workflow FK constraints, CHECK constraints, entity columns
-- Enterprise data integrity for production workloads.
-- ============================================================================

-- 1. Add entity columns to workflow_executions (if missing from DDL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'workflow_executions' AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE workflow_executions ADD COLUMN entity_type VARCHAR(100);
    ALTER TABLE workflow_executions ADD COLUMN entity_id VARCHAR(255);
  END IF;
END $$;

-- Index for entity lookup on workflow_executions
CREATE INDEX IF NOT EXISTS idx_wf_exec_entity
  ON workflow_executions (entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- 2. Add status column to workflow_templates (if missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'workflow_templates' AND column_name = 'status'
  ) THEN
    ALTER TABLE workflow_templates ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- 3. CHECK constraints (idempotent — drop + re-create)

-- workflow_executions.status
ALTER TABLE workflow_executions DROP CONSTRAINT IF EXISTS chk_wf_exec_status;
ALTER TABLE workflow_executions ADD CONSTRAINT chk_wf_exec_status
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused'));

-- workflow_templates.status
ALTER TABLE workflow_templates DROP CONSTRAINT IF EXISTS chk_wf_tpl_status;
ALTER TABLE workflow_templates ADD CONSTRAINT chk_wf_tpl_status
  CHECK (status IN ('draft', 'active', 'deprecated', 'archived'));

-- 4. FK constraints (idempotent — only add if not exists)

-- process_tasks.workflow_execution_id → workflow_executions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = current_schema() AND constraint_name = 'fk_pt_workflow_exec'
  ) THEN
    -- Only add FK if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'process_tasks' AND column_name = 'workflow_execution_id'
    ) THEN
      ALTER TABLE process_tasks
        ADD CONSTRAINT fk_pt_workflow_exec
        FOREIGN KEY (workflow_execution_id) REFERENCES workflow_executions(execution_id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- workflow_events.instance_id → workflow_executions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = current_schema() AND constraint_name = 'fk_wf_events_instance'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'workflow_events' AND column_name = 'instance_id'
    ) THEN
      ALTER TABLE workflow_events
        ADD CONSTRAINT fk_wf_events_instance
        FOREIGN KEY (instance_id) REFERENCES workflow_executions(execution_id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 5. Index for workflow_executions status + created_at (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_wf_exec_status_created
  ON workflow_executions (status, started_at DESC)
  WHERE status IN ('pending', 'running');

-- 6. Index for workflow_templates status
CREATE INDEX IF NOT EXISTS idx_wf_tpl_status
  ON workflow_templates (status)
  WHERE status != 'archived';
