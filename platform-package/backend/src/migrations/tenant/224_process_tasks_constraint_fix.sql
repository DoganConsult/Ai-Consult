-- Migration 224: Harden process_tasks CHECK constraints
-- Ensures status and task_type constraints include all valid values

-- 1. Drop and re-create status constraint with comprehensive values
ALTER TABLE process_tasks DROP CONSTRAINT IF EXISTS process_tasks_status_check;
ALTER TABLE process_tasks ADD CONSTRAINT process_tasks_status_check CHECK (status IN (
  'pending', 'assigned', 'in_progress', 'blocked',
  'escalated', 'completed', 'cancelled', 'auto_closed',
  'overdue', 'failed'
));

-- 2. Ensure task_type constraint includes all valid values
ALTER TABLE process_tasks DROP CONSTRAINT IF EXISTS process_tasks_task_type_check;
ALTER TABLE process_tasks ADD CONSTRAINT process_tasks_task_type_check CHECK (task_type IN (
  'evidence_request', 'control_review', 'risk_assessment',
  'policy_creation', 'audit_response', 'incident_response',
  'remediation', 'approval', 'verification',
  'vendor_risk_propagation', 'vendor_gap_remediation', 'vendor_evidence_review',
  'vendor_audit_finding', 'vendor_framework_sync', 'training_assignment',
  'workflow_task', 'workflow_approval',
  'bcm_activation', 'document_review', 'consent_review'
));

-- 3. Ensure governance_raci_templates has required columns
DO $$ BEGIN ALTER TABLE governance_raci_templates ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft'; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE governance_raci_templates ADD COLUMN IF NOT EXISTS created_by VARCHAR(64); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Ensure governance constitution tables exist for authority-matrix and escalation-thresholds
CREATE TABLE IF NOT EXISTS governance_constitution (
  constitution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  risk_appetite JSONB DEFAULT '{}',
  authority_matrix JSONB DEFAULT '[]',
  escalation_thresholds JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
