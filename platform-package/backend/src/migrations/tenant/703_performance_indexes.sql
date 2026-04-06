-- 703: Performance indexes for enterprise-grade query optimization
-- Covers the most frequently queried tables identified via slow query analysis

-- Users: login lookups, status filtering, department joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_department ON users (department_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users (role) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users (last_login_at DESC NULLS LAST) WHERE deleted_at IS NULL;

-- Notifications: unread count, user inbox, type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE read = FALSE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_type ON notifications (user_id, type, created_at DESC);

-- Audit log: time-series queries, user activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user ON audit_log (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action ON audit_log (action, created_at DESC);

-- Risks: status dashboard, assessment lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status ON risks (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_level ON risks (risk_level) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_owner ON risks (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_framework ON risks (framework_id) WHERE deleted_at IS NULL;

-- Controls: compliance dashboard, effectiveness
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_status ON controls (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_owner ON controls (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_framework ON controls (framework_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effectiveness ON controls (effectiveness_rating) WHERE deleted_at IS NULL;

-- Compliance requirements: framework mapping
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_reqs_framework ON compliance_requirements (framework_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_reqs_status ON compliance_requirements (compliance_status) WHERE deleted_at IS NULL;

-- Evidence: collection pipeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_control ON evidence (control_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_status ON evidence (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_expiry ON evidence (expiry_date) WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;

-- Incidents: SLA tracking, open incident dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status ON incidents (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_severity ON incidents (severity) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_assignee ON incidents (assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_created ON incidents (created_at DESC) WHERE deleted_at IS NULL;

-- Policies: lifecycle management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_status ON policies (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_owner ON policies (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_review_date ON policies (next_review_date) WHERE deleted_at IS NULL AND next_review_date IS NOT NULL;

-- Assessments: scheduling, status tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_status ON assessments (status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_due ON assessments (due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;

-- Soft-delete coverage: ensure all major tables have deleted_at partial indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frameworks_active ON frameworks (created_at DESC) WHERE deleted_at IS NULL;

-- Automation rules: event dispatch
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_event ON automation_rules (event_type, enabled) WHERE enabled = TRUE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automation_rules_module ON automation_rules (module, enabled) WHERE enabled = TRUE;

-- Agent sessions: AI-OS cockpit
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions (agent_id, started_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_sessions_status ON agent_sessions (status, started_at DESC);

-- Workflow instances: active workflow tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_instances_status ON workflow_instances (status) WHERE status IN ('pending', 'running');
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances (entity_type, entity_id);
