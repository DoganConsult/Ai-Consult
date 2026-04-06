-- ============================================================
-- Migration 942: Policy Module — Missing Tables (MP-07)
-- Owner: Module:Policy
-- Spec: DOS-AIO-Specs/module-patch-07-policy-end-to-end.md §5
-- Tables: 16 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  ack_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  version_id           UUID,
  user_id              VARCHAR(64) NOT NULL,
  acknowledged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method               VARCHAR(30) DEFAULT 'click'
    CHECK (method IN ('click','signature','email','sso','training')),
  ip_address           VARCHAR(45),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, version_id, user_id)
);

CREATE TABLE IF NOT EXISTS policy_attestation_records (
  attestation_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  campaign_id          UUID,
  user_id              VARCHAR(64) NOT NULL,
  attestation_status   VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (attestation_status IN ('pending','attested','declined','expired','waived')),
  attested_at          TIMESTAMPTZ,
  due_date             DATE,
  comments             TEXT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_audit_log (
  log_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  action               VARCHAR(50) NOT NULL,
  actor_id             VARCHAR(64) NOT NULL,
  details              JSONB DEFAULT '{}',
  ip_address           VARCHAR(45),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_change_requests (
  request_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  requester_id         VARCHAR(64) NOT NULL,
  change_type          VARCHAR(50) NOT NULL DEFAULT 'amendment'
    CHECK (change_type IN ('amendment','new_version','retirement','reinstatement','minor_edit')),
  justification        TEXT NOT NULL,
  proposed_changes     JSONB DEFAULT '{}',
  status               VARCHAR(30) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','approved','rejected','withdrawn')),
  reviewer_id          VARCHAR(64),
  reviewed_at          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_compliance_mappings (
  mapping_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  framework_id         UUID,
  obligation_id        UUID,
  control_id           UUID,
  mapping_type         VARCHAR(50) NOT NULL DEFAULT 'supports'
    CHECK (mapping_type IN ('supports','implements','addresses','mitigates')),
  coverage_level       VARCHAR(30) DEFAULT 'full'
    CHECK (coverage_level IN ('full','partial','indirect')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_distribution_lists (
  list_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  list_name            VARCHAR(200) NOT NULL,
  target_type          VARCHAR(50) NOT NULL DEFAULT 'department'
    CHECK (target_type IN ('department','team','role','individual','all_users','external')),
  target_id            VARCHAR(200),
  is_mandatory         BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_effectiveness_metrics (
  metric_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  metric_name          VARCHAR(200) NOT NULL,
  metric_type          VARCHAR(50) NOT NULL DEFAULT 'compliance_rate'
    CHECK (metric_type IN ('compliance_rate','acknowledgement_rate','violation_count','review_timeliness','exception_count','incident_correlation')),
  current_value        NUMERIC(10,2),
  target_value         NUMERIC(10,2),
  measurement_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  trend                VARCHAR(20) DEFAULT 'stable'
    CHECK (trend IN ('improving','stable','declining')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_gap_analysis (
  gap_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID,
  framework_id         UUID,
  gap_type             VARCHAR(50) NOT NULL DEFAULT 'missing_policy'
    CHECK (gap_type IN ('missing_policy','outdated','insufficient_coverage','no_enforcement','no_acknowledgement')),
  severity             VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('critical','high','medium','low')),
  description          TEXT NOT NULL,
  recommended_action   TEXT,
  assigned_to          VARCHAR(64),
  status               VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','accepted','deferred')),
  resolved_at          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_hierarchy (
  hierarchy_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_policy_id     UUID NOT NULL,
  child_policy_id      UUID NOT NULL,
  relationship_type    VARCHAR(50) NOT NULL DEFAULT 'parent_child'
    CHECK (relationship_type IN ('parent_child','supersedes','supplements','references')),
  sort_order           INT DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  UNIQUE (parent_policy_id, child_policy_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS policy_impact_assessments (
  assessment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  change_request_id    UUID REFERENCES policy_change_requests(request_id),
  impact_scope         VARCHAR(50) NOT NULL DEFAULT 'department'
    CHECK (impact_scope IN ('organization','department','team','individual','external')),
  affected_departments JSONB DEFAULT '[]',
  affected_user_count  INT DEFAULT 0,
  risk_level           VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('critical','high','medium','low','negligible')),
  assessment_notes     TEXT,
  assessed_by          VARCHAR(64),
  assessed_at          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_notifications (
  notification_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  notification_type    VARCHAR(50) NOT NULL
    CHECK (notification_type IN ('new_policy','policy_update','review_due','expiry_warning','acknowledgement_reminder','exception_approved')),
  recipient_user_id    VARCHAR(64),
  recipient_group      VARCHAR(200),
  sent_at              TIMESTAMPTZ,
  read_at              TIMESTAMPTZ,
  channel              VARCHAR(30) DEFAULT 'in_app'
    CHECK (channel IN ('in_app','email','both')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policy_remediation_plans (
  plan_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id               UUID REFERENCES policy_gap_analysis(gap_id),
  policy_id            UUID,
  title                VARCHAR(500) NOT NULL,
  description          TEXT,
  owner_user_id        VARCHAR(64) NOT NULL,
  priority             VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  status               VARCHAR(30) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','completed','cancelled','overdue')),
  target_date          DATE,
  completed_at         TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_review_cycles (
  cycle_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  review_type          VARCHAR(50) NOT NULL DEFAULT 'periodic'
    CHECK (review_type IN ('periodic','triggered','ad_hoc','regulatory','annual')),
  cycle_number         INT NOT NULL DEFAULT 1,
  due_date             DATE NOT NULL,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  reviewer_user_id     VARCHAR(64),
  outcome              VARCHAR(30)
    CHECK (outcome IN ('approved_no_changes','approved_with_changes','major_revision','retirement_recommended')),
  findings             TEXT,
  status               VARCHAR(30) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','overdue','cancelled')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_rule (
  rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  rule_code            VARCHAR(100) NOT NULL,
  rule_type            VARCHAR(50) NOT NULL DEFAULT 'enforcement'
    CHECK (rule_type IN ('enforcement','validation','notification','automation','escalation')),
  condition_expression JSONB NOT NULL DEFAULT '{}',
  action_on_match      VARCHAR(50) NOT NULL DEFAULT 'block'
    CHECK (action_on_match IN ('block','warn','notify','log','auto_remediate')),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  priority             INT DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_scope_rules (
  scope_rule_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  scope_type           VARCHAR(50) NOT NULL DEFAULT 'department'
    CHECK (scope_type IN ('organization','department','team','role','location','all')),
  scope_value          VARCHAR(200),
  inclusion_type       VARCHAR(20) NOT NULL DEFAULT 'include'
    CHECK (inclusion_type IN ('include','exclude')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS policy_versions (
  version_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            UUID NOT NULL,
  version_number       VARCHAR(20) NOT NULL,
  content              TEXT,
  change_summary       TEXT,
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','approved','published','archived')),
  effective_date       DATE,
  expiry_date          DATE,
  approved_by          VARCHAR(64),
  approved_at          TIMESTAMPTZ,
  published_at         TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  UNIQUE (policy_id, version_number)
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_policy_ack_policy ON policy_acknowledgements (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_user ON policy_acknowledgements (user_id);
CREATE INDEX IF NOT EXISTS idx_policy_attest_policy ON policy_attestation_records (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_attest_status ON policy_attestation_records (attestation_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policy_audit_policy ON policy_audit_log (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_audit_action ON policy_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_policy_change_policy ON policy_change_requests (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_change_status ON policy_change_requests (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policy_compliance_policy ON policy_compliance_mappings (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_dist_policy ON policy_distribution_lists (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_effectiveness_policy ON policy_effectiveness_metrics (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_gap_severity ON policy_gap_analysis (severity) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policy_hierarchy_parent ON policy_hierarchy (parent_policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_hierarchy_child ON policy_hierarchy (child_policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_impact_policy ON policy_impact_assessments (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_notifications_policy ON policy_notifications (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_remediation_status ON policy_remediation_plans (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policy_review_policy ON policy_review_cycles (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_review_status ON policy_review_cycles (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policy_rule_policy ON policy_rule (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_scope_policy ON policy_scope_rules (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON policy_versions (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_versions_status ON policy_versions (status) WHERE deleted_at IS NULL;
