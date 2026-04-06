-- ============================================================================
-- Migration 711: Backfill + orphan guard + guarded defaults
-- R1.0 gate: ensure legacy rows have valid module_code, no orphans exist.
-- ============================================================================

-- 1. Backfill module_code on process_tasks from entity_type (idempotent)
UPDATE process_tasks SET module_code = entity_type
WHERE module_code IS NULL AND entity_type IS NOT NULL;

-- 2. Backfill module_code on workflows from MWR primary_template_code lookup
-- (best-effort: maps template name patterns to module codes)
UPDATE workflows w SET module_code = mwr.module_code
FROM module_workflow_registry mwr
WHERE w.module_code IS NULL
  AND w.name ILIKE '%' || REPLACE(mwr.module_code, '-', ' ') || '%'
  AND mwr.has_lifecycle = TRUE;

-- 3. Clean orphan workflow_events pointing to non-existent executions
-- (Soft-delete: set instance_id = NULL rather than deleting event records)
UPDATE workflow_events we SET instance_id = NULL
WHERE we.instance_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workflow_executions wex WHERE wex.execution_id = we.instance_id
  );

-- 4. Clean orphan process_tasks.workflow_execution_id pointing to non-existent executions
UPDATE process_tasks pt SET workflow_execution_id = NULL
WHERE pt.workflow_execution_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workflow_executions wex WHERE wex.execution_id = pt.workflow_execution_id
  );

-- 5. Guarded default: ensure workflow_executions.status is always valid
-- (Fix any rows with unexpected status values before CHECK constraint is enforced)
UPDATE workflow_executions SET status = 'failed'
WHERE status NOT IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused');

-- 6. Guarded default: ensure workflow_templates.status is valid
-- (Fix rows before CHECK constraint)
UPDATE workflow_templates SET status = 'active'
WHERE status IS NULL OR status NOT IN ('draft', 'active', 'deprecated', 'archived');

-- 7. Default module_code for process_tasks that still have NULL after backfill
-- (trigger_source often contains the module hint)
UPDATE process_tasks SET module_code =
  CASE
    WHEN trigger_source LIKE 'chain:%' THEN SPLIT_PART(trigger_source, ':', 2)
    WHEN task_type IN ('risk_assessment') THEN 'risk'
    WHEN task_type IN ('control_review') THEN 'compliance'
    WHEN task_type IN ('evidence_request') THEN 'evidence'
    WHEN task_type IN ('audit_response') THEN 'audit'
    WHEN task_type IN ('incident_response') THEN 'incident'
    WHEN task_type IN ('policy_creation') THEN 'policy'
    WHEN task_type IN ('remediation') THEN 'remediation'
    WHEN task_type IN ('approval', 'verification') THEN 'workflow'
    ELSE 'workflow'
  END
WHERE module_code IS NULL;
