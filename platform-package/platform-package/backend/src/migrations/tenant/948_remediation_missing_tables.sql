-- ============================================================
-- Migration 948: Remediation Module — Missing Tables (MP-16)
-- Owner: Module:Remediation
-- Tables: 10 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS remediation_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(100), title VARCHAR(500) NOT NULL, description TEXT,
  source_module VARCHAR(100), source_entity_type VARCHAR(100), source_entity_id UUID,
  owner_user_id VARCHAR(64) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','approved','in_progress','completed','cancelled','overdue')),
  target_date DATE, completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, created_by VARCHAR(64), updated_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS remediation_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES remediation_plans(plan_id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL, description TEXT,
  sequence_no INT DEFAULT 0, assigned_to VARCHAR(64),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','blocked','cancelled')),
  due_date DATE, completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS remediation_milestones (
  milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES remediation_plans(plan_id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL, target_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','achieved','missed','deferred')),
  achieved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS remediation_progress (
  progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES remediation_plans(plan_id),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actions_total INT DEFAULT 0, actions_completed INT DEFAULT 0,
  percent_complete NUMERIC(5,2) DEFAULT 0,
  on_track BOOLEAN DEFAULT TRUE, notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_evidence_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES remediation_plans(plan_id),
  action_id UUID REFERENCES remediation_actions(action_id),
  evidence_id UUID NOT NULL, link_type VARCHAR(50) DEFAULT 'supports',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS remediation_source_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES remediation_plans(plan_id),
  source_module VARCHAR(100) NOT NULL, source_entity_type VARCHAR(100) NOT NULL,
  source_entity_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS remediation_status_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES remediation_plans(plan_id),
  from_status VARCHAR(30), to_status VARCHAR(30) NOT NULL,
  changed_by VARCHAR(64) NOT NULL, reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_teams (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES remediation_plans(plan_id),
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(50) DEFAULT 'contributor' CHECK (role IN ('owner','lead','contributor','reviewer','observer')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, user_id)
);

CREATE TABLE IF NOT EXISTS remediation_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, default_actions JSONB DEFAULT '[]',
  default_milestones JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS remediation_verification_results (
  verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES remediation_plans(plan_id),
  action_id UUID REFERENCES remediation_actions(action_id),
  verifier_user_id VARCHAR(64) NOT NULL,
  outcome VARCHAR(30) NOT NULL CHECK (outcome IN ('verified','failed','partial','deferred')),
  evidence_notes TEXT, verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID, action_id UUID,
  event VARCHAR(100) NOT NULL, actor_id VARCHAR(64) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_remediation_plans_status ON remediation_plans (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_remediation_plans_owner ON remediation_plans (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_remediation_actions_plan ON remediation_actions (plan_id);
CREATE INDEX IF NOT EXISTS idx_remediation_actions_status ON remediation_actions (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_remediation_milestones_plan ON remediation_milestones (plan_id);
CREATE INDEX IF NOT EXISTS idx_remediation_progress_plan ON remediation_progress (plan_id);
CREATE INDEX IF NOT EXISTS idx_remediation_evidence_plan ON remediation_evidence_links (plan_id);
CREATE INDEX IF NOT EXISTS idx_remediation_teams_plan ON remediation_teams (plan_id);
CREATE INDEX IF NOT EXISTS idx_remediation_audit_plan ON remediation_audit_log (plan_id);
