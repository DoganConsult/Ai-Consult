-- Migration 220: Workflow execution bridge hardening
-- Production indexes for workflow-to-task cross-references
-- Required by: workflow.service.ts, process-orchestration.service.ts

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_wfe_status ON workflow_executions(status) WHERE status IN ('running','pending'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_wfe_definition ON workflow_executions(definition_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_wfe_created ON workflow_executions(created_at DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_wf_state_hist_exec ON workflow_state_history(execution_id) WHERE execution_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_wf_state_hist_task ON workflow_state_history(process_task_id) WHERE process_task_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE process_audit_trail ADD COLUMN IF NOT EXISTS workflow_execution_id UUID; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_pat_wfe ON process_audit_trail(workflow_execution_id) WHERE workflow_execution_id IS NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS error_message TEXT; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS task_count INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS completed_count INT DEFAULT 0; EXCEPTION WHEN OTHERS THEN NULL; END $$;
