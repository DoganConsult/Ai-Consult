-- ============================================
-- Shahin GRC — Tenant Migration 025
-- Missing Indexes & Soft-Delete Columns
-- Performance optimization for high-query tables
-- ============================================

-- ── Audit Trail Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_trail_module ON audit_trail (module, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail (entity_type, entity_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail (user_id, timestamp DESC);

-- ── Evidence Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_evidence_control ON evidence (control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submitted ON evidence (submitted_by, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_verified ON evidence (verified, submitted_at DESC);

-- ── Incidents Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_incidents_status_severity ON incidents (status, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON incidents (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents (created_at DESC);

-- ── Findings Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings (status, severity);
CREATE INDEX IF NOT EXISTS idx_findings_source ON findings (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_findings_workspace ON findings (workspace_id, status);

-- ── Remediation Tasks Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_remediation_status_due ON remediation_tasks (status, due_date);
CREATE INDEX IF NOT EXISTS idx_remediation_assigned ON remediation_tasks (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_remediation_linked ON remediation_tasks (linked_entity_type, linked_entity_id);

-- ── Approvals Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals (approver_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_execution ON approvals (execution_id);
CREATE INDEX IF NOT EXISTS idx_approvals_sla ON approvals (sla_deadline) WHERE status = 'pending';

-- ── Notifications Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (type, created_at DESC);

-- ── Workflows Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows (status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions (workflow_id, started_at DESC);

-- ── Risks Indexes ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks (status);
CREATE INDEX IF NOT EXISTS idx_risks_score ON risks (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risks_workspace ON risks (workspace_id, status);

-- ── Controls Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_controls_status ON controls (status);
CREATE INDEX IF NOT EXISTS idx_controls_workspace ON controls (workspace_id, status);

-- ── Policies Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies (status);
CREATE INDEX IF NOT EXISTS idx_policies_approval ON policies (approval_status);
CREATE INDEX IF NOT EXISTS idx_policies_workspace ON policies (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_policies_review_date ON policies (next_review_date) WHERE next_review_date IS NOT NULL;

-- ── Frameworks Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_frameworks_status ON frameworks (status);
CREATE INDEX IF NOT EXISTS idx_frameworks_workspace ON frameworks (workspace_id);

-- ── Vendors Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendors_risk_tier ON vendors (risk_tier, status);
CREATE INDEX IF NOT EXISTS idx_vendors_contract_expiry ON vendors (contract_expiry) WHERE contract_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_workspace ON vendors (workspace_id, status);

-- ── Assessments Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assessments_framework ON assessments (framework_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments (status);
CREATE INDEX IF NOT EXISTS idx_assessments_workspace ON assessments (workspace_id, status);

-- ── Exceptions Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions (status);
CREATE INDEX IF NOT EXISTS idx_exceptions_expiry ON exceptions (expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exceptions_workspace ON exceptions (workspace_id, status);

-- ── Assets Indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets (type, criticality);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets (workspace_id);

-- ── BCP Plans Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bcp_plans_status ON bcp_plans (status);
CREATE INDEX IF NOT EXISTS idx_bcp_plans_type ON bcp_plans (type);

-- ── Vulnerabilities Indexes (additional) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vuln_assigned ON vulnerabilities (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_vuln_remediation_due ON vulnerabilities (remediation_due) WHERE remediation_due IS NOT NULL AND status != 'resolved';

-- ── Copilot Sessions Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_copilot_sessions_user ON copilot_sessions (user_id, updated_at DESC);

-- ── Cadence Tasks Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_status ON cadence_tasks (status, due_date);
CREATE INDEX IF NOT EXISTS idx_cadence_tasks_assigned ON cadence_tasks (assigned_to, status);

-- ── Comments Indexes (additional) ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id, created_at DESC);

-- ── Reports Indexes ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports (type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports (generated_by, generated_at DESC);

-- ── Soft-Delete Columns ──────────────────────────────────────────────────────
ALTER TABLE risks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE frameworks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE remediation_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE exceptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- automation_rules.deleted_at moved to migration 027 (table created there)
ALTER TABLE bcp_plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
