-- ============================================
-- Migration 011: Engagement Intelligence Layer
-- External stakeholder portals, AI questionnaires,
-- engagement scoring, auto-task generation,
-- auto-evaluation, approval routing, and
-- Engagement OS orchestration tables.
-- ============================================

-- ── 1. Invitations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  entity_scope JSONB NOT NULL,          -- { entityType, entityId }
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | accepted | expired | revoked
  accepted_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations (status, expires_at);

-- ── 2. External User Scopes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS external_user_scopes (
  scope_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ext_scope_user ON external_user_scopes (user_id);
CREATE INDEX IF NOT EXISTS idx_ext_scope_entity ON external_user_scopes (entity_type, entity_id);

-- ── 3. Questionnaires ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questionnaires (
  questionnaire_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  title VARCHAR(500) NOT NULL,
  framework_refs JSONB DEFAULT '[]',
  questions JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | distributed | in_progress | completed | overdue
  responses JSONB,
  evaluation JSONB,
  created_by UUID NOT NULL,
  distributed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questionnaires_vendor ON questionnaires (vendor_id, status);

-- ── 4. Regulator Requests ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulator_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_user_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | responded | closed
  response TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON regulator_requests (status);

-- ── 5. Auto-Task Config ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auto_task_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  evidence_days_ahead INT DEFAULT 7,
  risk_days_ahead INT DEFAULT 7,
  vendor_days_ahead INT DEFAULT 14,
  auto_assign BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Approval Requests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_requests (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  requested_by TEXT NOT NULL,
  route_id TEXT NOT NULL,
  approver_chain JSONB NOT NULL DEFAULT '[]',
  current_step INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_approval_entity ON approval_requests (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests (status);

-- ── 7. Approval Decisions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES approval_requests(approval_id),
  approver_id TEXT NOT NULL,
  step INT NOT NULL,
  decision VARCHAR(20) NOT NULL,  -- approved | rejected | delegated
  reason TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_approval ON approval_decisions (approval_id);

-- ── 8. Vendor Engagement Scores ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_engagement_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,
  total_score INT NOT NULL,
  response_time_score INT NOT NULL,
  completion_rate_score INT NOT NULL,
  evidence_timeliness_score INT NOT NULL,
  remediation_rate_score INT NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendor_scores_vendor ON vendor_engagement_scores (vendor_id, computed_at DESC);

-- ── 9. Engagement OS Cycle Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engagement_os_cycle_log (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overdue_items_found INT DEFAULT 0,
  reminders_sent INT DEFAULT 0,
  sla_breaches_escalated INT DEFAULT 0,
  scores_computed INT DEFAULT 0,
  regulator_requests_flagged INT DEFAULT 0,
  consultant_alerts_published INT DEFAULT 0,
  events_published INT DEFAULT 0,
  cycle_ms INT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Master Schema Tables
-- NOTE: These tables run against the master schema
-- (cross-tenant), not the per-tenant schema.
-- The migration runner should execute these in
-- the master/public schema context.
-- ============================================

-- ── 10. Regulator Assignments (master schema — cross-tenant) ───────────────
CREATE TABLE IF NOT EXISTS regulator_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulator_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  scope JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_assign_regulator ON regulator_assignments (regulator_id);

-- ── 11. Consultant Assignments (master schema — cross-tenant) ──────────────
CREATE TABLE IF NOT EXISTS consultant_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  engagement_type VARCHAR(50),
  assigned_by UUID NOT NULL,
  scope JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultant_assign ON consultant_assignments (consultant_id);
