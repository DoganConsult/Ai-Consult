-- 353: Compliance performance indexes (overview, controls, findings, evidence, remediation, assessments)
-- Run per tenant schema. Use IF NOT EXISTS for idempotency.

-- controls
CREATE INDEX IF NOT EXISTS idx_controls_deleted_at ON controls (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_controls_status_deleted ON controls (status, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_controls_frameworks_gin ON controls USING GIN (frameworks) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_controls_created_at ON controls (created_at DESC) WHERE deleted_at IS NULL;

-- evidence
CREATE INDEX IF NOT EXISTS idx_evidence_deleted_at ON evidence (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_control_id ON evidence (control_id) WHERE deleted_at IS NULL;

-- findings
CREATE INDEX IF NOT EXISTS idx_findings_deleted_at ON findings (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_findings_source_id ON findings (source_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings (severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_findings_created_at ON findings (created_at DESC) WHERE deleted_at IS NULL;

-- remediation_tasks
CREATE INDEX IF NOT EXISTS idx_remediation_tasks_deleted_at ON remediation_tasks (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_remediation_tasks_linked_entity ON remediation_tasks (linked_entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_remediation_tasks_status_due ON remediation_tasks (status, due_date) WHERE deleted_at IS NULL;

-- assessments
CREATE INDEX IF NOT EXISTS idx_assessments_deleted_at ON assessments (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessments_framework_id ON assessments (framework_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments (created_at DESC) WHERE deleted_at IS NULL;
