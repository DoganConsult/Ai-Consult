-- ============================================================
-- Migration 957: Platform & Operations Modules — Missing Tables
-- Modules: Admin (8), Packs (6), Issues (7), Records (6),
--          Team (4), Foundation (2), Proactive-Leadership (2),
--          Local-Knowledge (1), KSA-Regulatory (1),
--          Bootstrap (1), Provisioning (1)
-- Tables: 39 total
-- ============================================================

-- ═══ ADMIN MODULE (MP-36) ═══

CREATE TABLE IF NOT EXISTS admin_configurations (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(200) NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  config_category VARCHAR(100) DEFAULT 'general',
  description TEXT, is_sensitive BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL, entity_type VARCHAR(100), entity_id UUID,
  actor_id VARCHAR(64) NOT NULL, actor_role VARCHAR(100),
  before_state JSONB DEFAULT '{}', after_state JSONB DEFAULT '{}',
  ip_address VARCHAR(45), user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_feature_flags (
  flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(200) NOT NULL UNIQUE,
  flag_value BOOLEAN DEFAULT FALSE,
  description TEXT, rollout_percentage INT DEFAULT 0,
  target_roles JSONB DEFAULT '[]', target_modules JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS admin_system_health (
  health_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name VARCHAR(200) NOT NULL, check_type VARCHAR(50) DEFAULT 'service',
  status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy','degraded','unhealthy','unknown')),
  response_time_ms INT, last_check_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_maintenance_windows (
  window_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL, scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ, actual_end TIMESTAMPTZ,
  affected_modules JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS admin_announcements (
  announcement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, content TEXT NOT NULL,
  announcement_type VARCHAR(30) DEFAULT 'info' CHECK (announcement_type IN ('info','warning','critical','maintenance')),
  target_roles JSONB DEFAULT '[]', target_modules JSONB DEFAULT '[]',
  publish_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS admin_scheduled_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name VARCHAR(200) NOT NULL, task_type VARCHAR(50) DEFAULT 'cron',
  cron_expression VARCHAR(100), handler VARCHAR(200) NOT NULL,
  parameters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE, last_run_at TIMESTAMPTZ, next_run_at TIMESTAMPTZ,
  last_status VARCHAR(30) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS admin_data_retention_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(200) NOT NULL, target_table VARCHAR(200) NOT NULL,
  retention_days INT NOT NULL, archive_strategy VARCHAR(30) DEFAULT 'delete'
    CHECK (archive_strategy IN ('delete','archive','anonymize')),
  is_active BOOLEAN DEFAULT TRUE, last_executed_at TIMESTAMPTZ,
  rows_affected BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64)
);

-- ═══ PACKS MODULE (MP-35) ═══

CREATE TABLE IF NOT EXISTS pack_definitions (
  pack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_code VARCHAR(100) UNIQUE, pack_name VARCHAR(500) NOT NULL,
  pack_type VARCHAR(50) DEFAULT 'standard' CHECK (pack_type IN ('standard','regulatory','industry','custom','starter')),
  description TEXT, version VARCHAR(20) DEFAULT '1.0',
  modules_included JSONB DEFAULT '[]', features_included JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS pack_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES pack_definitions(pack_id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(), assigned_by VARCHAR(64),
  is_active BOOLEAN DEFAULT TRUE, expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_features (
  feature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES pack_definitions(pack_id) ON DELETE CASCADE,
  feature_code VARCHAR(100) NOT NULL, feature_name VARCHAR(500) NOT NULL,
  feature_type VARCHAR(50) DEFAULT 'module_access',
  config JSONB DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pack_entitlements (
  entitlement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES pack_definitions(pack_id),
  entitlement_type VARCHAR(50) NOT NULL, entitlement_key VARCHAR(200) NOT NULL,
  entitlement_value JSONB DEFAULT '{}', limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES pack_definitions(pack_id),
  version_number VARCHAR(20) NOT NULL, changelog TEXT,
  modules_snapshot JSONB DEFAULT '[]', features_snapshot JSONB DEFAULT '[]',
  published_at TIMESTAMPTZ, published_by VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_activation_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES pack_definitions(pack_id),
  action VARCHAR(30) NOT NULL CHECK (action IN ('activated','deactivated','upgraded','downgraded')),
  previous_version VARCHAR(20), new_version VARCHAR(20),
  actor_id VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ ISSUES MODULE (MP-37) ═══

CREATE TABLE IF NOT EXISTS issues (
  issue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT,
  issue_type VARCHAR(50) DEFAULT 'general' CHECK (issue_type IN ('general','compliance','risk','control','audit','operational','technical')),
  severity VARCHAR(20) DEFAULT 'medium', priority VARCHAR(20) DEFAULT 'medium',
  source_module VARCHAR(100), source_entity_type VARCHAR(100), source_entity_id UUID,
  assigned_to VARCHAR(64), owner_user_id VARCHAR(64),
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','triaged','in_progress','pending_review','resolved','closed','reopened')),
  due_date DATE, resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS issue_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(issue_id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL, author_id VARCHAR(64) NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS issue_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(issue_id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL, file_url VARCHAR(2000) NOT NULL,
  file_size_bytes BIGINT, mime_type VARCHAR(100),
  uploaded_by VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_issue_id UUID REFERENCES issues(issue_id),
  target_issue_id UUID REFERENCES issues(issue_id),
  link_type VARCHAR(30) DEFAULT 'related' CHECK (link_type IN ('related','blocks','blocked_by','duplicates','parent','child')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64),
  UNIQUE (source_issue_id, target_issue_id, link_type)
);

CREATE TABLE IF NOT EXISTS issue_escalations (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(issue_id),
  escalated_to VARCHAR(64) NOT NULL, escalation_level INT DEFAULT 1,
  reason TEXT, acknowledged_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_sla_tracking (
  sla_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(issue_id),
  sla_type VARCHAR(50) DEFAULT 'resolution',
  target_hours INT NOT NULL, actual_hours NUMERIC(10,2),
  breached BOOLEAN DEFAULT FALSE, breached_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issue_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(issue_id),
  field_changed VARCHAR(100) NOT NULL, old_value TEXT, new_value TEXT,
  changed_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ RECORDS MODULE (MP-38) ═══

CREATE TABLE IF NOT EXISTS records (
  record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  record_type VARCHAR(50) DEFAULT 'general' CHECK (record_type IN ('general','compliance','risk','audit','legal','financial','operational')),
  classification VARCHAR(30) DEFAULT 'internal' CHECK (classification IN ('public','internal','confidential','restricted')),
  content JSONB DEFAULT '{}', file_url VARCHAR(2000),
  owner_user_id VARCHAR(64),
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('draft','active','archived','destroyed','hold')),
  retention_period_days INT, retention_expires_at DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS record_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES records(record_id),
  version_number INT NOT NULL, content JSONB DEFAULT '{}',
  file_url VARCHAR(2000), change_summary TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS record_access_log (
  access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES records(record_id),
  actor_id VARCHAR(64) NOT NULL, access_type VARCHAR(30) DEFAULT 'view',
  ip_address VARCHAR(45),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS record_retention_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(200) NOT NULL, record_type VARCHAR(50),
  retention_days INT NOT NULL, action_on_expiry VARCHAR(30) DEFAULT 'archive'
    CHECK (action_on_expiry IN ('archive','destroy','review','extend')),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS record_holds (
  hold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES records(record_id),
  hold_type VARCHAR(30) DEFAULT 'legal' CHECK (hold_type IN ('legal','regulatory','investigation','audit')),
  reason TEXT NOT NULL, placed_by VARCHAR(64) NOT NULL,
  placed_at TIMESTAMPTZ DEFAULT NOW(), released_at TIMESTAMPTZ, released_by VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS record_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(100) UNIQUE, category_name VARCHAR(500) NOT NULL,
  parent_category_id UUID REFERENCES record_categories(category_id),
  description TEXT, sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

-- ═══ TEAM MODULE (MP-39) ═══

CREATE TABLE IF NOT EXISTS team_definitions (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code VARCHAR(100) UNIQUE, team_name VARCHAR(500) NOT NULL,
  team_type VARCHAR(50) DEFAULT 'functional' CHECK (team_type IN ('functional','project','committee','squad','cross_functional')),
  description TEXT, parent_team_id UUID REFERENCES team_definitions(team_id),
  lead_user_id VARCHAR(64), is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS team_members (
  membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES team_definitions(team_id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  role_in_team VARCHAR(50) DEFAULT 'member' CHECK (role_in_team IN ('lead','co_lead','member','observer','advisor')),
  joined_at TIMESTAMPTZ DEFAULT NOW(), left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_responsibilities (
  responsibility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES team_definitions(team_id) ON DELETE CASCADE,
  responsibility_type VARCHAR(50) DEFAULT 'module_ownership',
  target_module VARCHAR(100), target_entity_type VARCHAR(100),
  description TEXT, raci_role VARCHAR(20) DEFAULT 'responsible'
    CHECK (raci_role IN ('responsible','accountable','consulted','informed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_activity_log (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES team_definitions(team_id),
  activity_type VARCHAR(50) NOT NULL, description TEXT,
  actor_id VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ FOUNDATION MODULE (MP-40) ═══

CREATE TABLE IF NOT EXISTS foundation_principles (
  principle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principle_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, category VARCHAR(100),
  priority INT DEFAULT 0, is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS foundation_values (
  value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, behavioral_indicators JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

-- ═══ PROACTIVE LEADERSHIP MODULE (MP-42) ═══

CREATE TABLE IF NOT EXISTS proactive_leadership_initiatives (
  initiative_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, strategic_objective VARCHAR(200),
  owner_user_id VARCHAR(64), sponsor_user_id VARCHAR(64),
  status VARCHAR(30) DEFAULT 'proposed' CHECK (status IN ('proposed','approved','active','completed','on_hold','cancelled')),
  target_date DATE, completion_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS proactive_leadership_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES proactive_leadership_initiatives(initiative_id),
  title VARCHAR(500) NOT NULL, description TEXT,
  assigned_to VARCHAR(64), priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled','deferred')),
  due_date DATE, completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

-- ═══ LOCAL KNOWLEDGE MODULE (MP-43) ═══

CREATE TABLE IF NOT EXISTS local_knowledge_articles (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL, category VARCHAR(100),
  jurisdiction VARCHAR(100), language VARCHAR(10) DEFAULT 'en',
  tags JSONB DEFAULT '[]', is_published BOOLEAN DEFAULT FALSE,
  author_user_id VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

-- ═══ KSA REGULATORY MODULE (MP-44) ═══

CREATE TABLE IF NOT EXISTS ksa_regulatory_requirements (
  requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  description TEXT, authority VARCHAR(200),
  regulation_reference VARCHAR(200), effective_date DATE,
  sector VARCHAR(100), compliance_deadline DATE,
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('draft','active','superseded','retired')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

-- ═══ BOOTSTRAP MODULE ═══

CREATE TABLE IF NOT EXISTS bootstrap_execution_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_code VARCHAR(100) NOT NULL, step_sequence INT NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','skipped')),
  started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, duration_ms INT,
  error_message TEXT, retry_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ PROVISIONING MODULE ═══

CREATE TABLE IF NOT EXISTS provisioning_diagnostics (
  diagnostic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID, step_code VARCHAR(100),
  check_name VARCHAR(200) NOT NULL, check_type VARCHAR(50) DEFAULT 'table_count',
  expected_value VARCHAR(200), actual_value VARCHAR(200),
  passed BOOLEAN DEFAULT FALSE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════

-- Admin
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_flags_active ON admin_feature_flags (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_health_status ON admin_system_health (status);
CREATE INDEX IF NOT EXISTS idx_admin_maint_status ON admin_maintenance_windows (status);

-- Packs
CREATE INDEX IF NOT EXISTS idx_pack_defs_active ON pack_definitions (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pack_assignments_pack ON pack_assignments (pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_features_pack ON pack_features (pack_id);

-- Issues
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues (severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_issues_assigned ON issues (assigned_to) WHERE status NOT IN ('closed','resolved');
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON issue_comments (issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_sla_breach ON issue_sla_tracking (breached) WHERE breached = TRUE;

-- Records
CREATE INDEX IF NOT EXISTS idx_records_status ON records (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_records_type ON records (record_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_records_retention ON records (retention_expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_record_access_record ON record_access_log (record_id);
CREATE INDEX IF NOT EXISTS idx_record_holds_record ON record_holds (record_id) WHERE released_at IS NULL;

-- Team
CREATE INDEX IF NOT EXISTS idx_team_defs_active ON team_definitions (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id) WHERE is_active = TRUE;

-- Proactive Leadership
CREATE INDEX IF NOT EXISTS idx_pl_initiatives_status ON proactive_leadership_initiatives (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pl_actions_initiative ON proactive_leadership_actions (initiative_id);

-- Local Knowledge
CREATE INDEX IF NOT EXISTS idx_lk_articles_published ON local_knowledge_articles (is_published) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lk_articles_jurisdiction ON local_knowledge_articles (jurisdiction) WHERE deleted_at IS NULL;

-- KSA Regulatory
CREATE INDEX IF NOT EXISTS idx_ksa_reg_status ON ksa_regulatory_requirements (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ksa_reg_authority ON ksa_regulatory_requirements (authority);

-- Bootstrap
CREATE INDEX IF NOT EXISTS idx_bootstrap_exec_step ON bootstrap_execution_log (step_code);
CREATE INDEX IF NOT EXISTS idx_bootstrap_exec_status ON bootstrap_execution_log (status);

-- Provisioning Diagnostics
CREATE INDEX IF NOT EXISTS idx_prov_diag_job ON provisioning_diagnostics (job_id);
CREATE INDEX IF NOT EXISTS idx_prov_diag_passed ON provisioning_diagnostics (passed) WHERE passed = FALSE;
