-- Migration 215: Workflow ↔ Process Task Bridge
-- Links workflow executions to RACI-routed process_tasks for audit-grade traceability.
-- Auditors can trace: workflow_execution → process_task → team → member → evidence

-- 1. Add workflow linkage columns to process_tasks
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS workflow_execution_id UUID;
ALTER TABLE process_tasks ADD COLUMN IF NOT EXISTS workflow_step_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_pt_workflow_exec ON process_tasks(workflow_execution_id) WHERE workflow_execution_id IS NOT NULL;

-- 2. Widen task_type CHECK to include workflow-generated types
-- Normalize non-conforming task_type values before adding constraint
UPDATE process_tasks SET task_type = 'workflow_task'
  WHERE task_type IS NOT NULL
    AND task_type NOT IN (
      'evidence_request', 'control_review', 'risk_assessment',
      'policy_creation', 'audit_response', 'incident_response',
      'remediation', 'approval', 'verification',
      'vendor_risk_propagation', 'vendor_gap_remediation', 'vendor_evidence_review',
      'vendor_audit_finding', 'vendor_framework_sync', 'training_assignment',
      'workflow_task', 'workflow_approval'
    );
ALTER TABLE process_tasks DROP CONSTRAINT IF EXISTS process_tasks_task_type_check;
ALTER TABLE process_tasks ADD CONSTRAINT process_tasks_task_type_check CHECK (task_type IN (
  'evidence_request', 'control_review', 'risk_assessment',
  'policy_creation', 'audit_response', 'incident_response',
  'remediation', 'approval', 'verification',
  'vendor_risk_propagation', 'vendor_gap_remediation', 'vendor_evidence_review',
  'vendor_audit_finding', 'vendor_framework_sync', 'training_assignment',
  'workflow_task', 'workflow_approval'
));

-- 3. Add execution_id and task_id to workflow_state_history for cross-referencing
ALTER TABLE workflow_state_history ADD COLUMN IF NOT EXISTS execution_id UUID;
ALTER TABLE workflow_state_history ADD COLUMN IF NOT EXISTS process_task_id UUID;
CREATE INDEX IF NOT EXISTS idx_wf_state_hist_exec ON workflow_state_history(execution_id) WHERE execution_id IS NOT NULL;
