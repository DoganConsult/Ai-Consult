-- ============================================================
-- Migration 721: Controls Module Enterprise Tables
-- Adds certification campaigns, deficiency lifecycle, monitoring
-- rules/signals/alerts, control tags, scope links, retests,
-- health snapshots, and dashboard cache.
-- ============================================================

-- ── Control Tags ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_tags (
  tag_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  control_id     VARCHAR(100) NOT NULL,
  tag_key        VARCHAR(100) NOT NULL,
  tag_value      VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, control_id, tag_key, tag_value)
);
CREATE INDEX IF NOT EXISTS idx_control_tags_control ON control_tags(tenant_id, control_id);

-- ── Control Scope Links (generalized: entity, process, system, vendor) ──
CREATE TABLE IF NOT EXISTS control_scope_links (
  link_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  control_id     VARCHAR(100) NOT NULL,
  scope_type     VARCHAR(50) NOT NULL,  -- entity, process, system, vendor
  scope_ref_id   VARCHAR(100) NOT NULL,
  scope_label    VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_control_scope_links_control ON control_scope_links(tenant_id, control_id);

-- ── Certification Campaigns ──────────────────────────────────
CREATE TABLE IF NOT EXISTS control_certification_campaigns (
  campaign_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  status         VARCHAR(30) NOT NULL DEFAULT 'draft',  -- draft, active, completed, cancelled
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cert_campaigns_tenant ON control_certification_campaigns(tenant_id, status);

-- ── Certification Requests ───────────────────────────────────
CREATE TABLE IF NOT EXISTS control_certification_requests (
  request_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES control_certification_campaigns(campaign_id),
  tenant_id      UUID NOT NULL,
  control_id     VARCHAR(100) NOT NULL,
  owner_id       UUID NOT NULL,
  status         VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending, attested, exception, remediation_needed, overdue
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at   TIMESTAMPTZ,
  response_text  TEXT,
  evidence_ref   VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_cert_requests_campaign ON control_certification_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cert_requests_owner ON control_certification_requests(tenant_id, owner_id, status);

-- ── Certification Responses ──────────────────────────────────
CREATE TABLE IF NOT EXISTS control_certification_responses (
  response_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       UUID NOT NULL REFERENCES control_certification_requests(request_id),
  tenant_id        UUID NOT NULL,
  responder_id     UUID NOT NULL,
  attestation_type VARCHAR(50),  -- owner_attestation, manager_signoff, reviewer_confirmation
  response         VARCHAR(30) NOT NULL,  -- attested, exception, remediation_needed
  comments         TEXT,
  sign_off_by      UUID,
  sign_off_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cert_responses_request ON control_certification_responses(request_id);

-- ── Remediation Actions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_remediation_actions (
  action_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  deficiency_id  UUID,  -- FK to control_issues if exists
  control_id     VARCHAR(100) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  assigned_to    UUID,
  due_date       DATE,
  status         VARCHAR(30) NOT NULL DEFAULT 'open',  -- open, in_progress, completed, overdue
  evidence_ref   VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_remediation_actions_control ON control_remediation_actions(tenant_id, control_id);
CREATE INDEX IF NOT EXISTS idx_remediation_actions_deficiency ON control_remediation_actions(deficiency_id) WHERE deficiency_id IS NOT NULL;

-- ── Closure Reviews ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_closure_reviews (
  review_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id      UUID NOT NULL REFERENCES control_remediation_actions(action_id),
  tenant_id      UUID NOT NULL,
  reviewer_id    UUID NOT NULL,
  decision       VARCHAR(30) NOT NULL,  -- approved, rejected, requires_retest
  comments       TEXT,
  reviewed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_closure_reviews_action ON control_closure_reviews(action_id);

-- ── Control Retests ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_retests (
  retest_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  control_id     VARCHAR(100) NOT NULL,
  deficiency_id  UUID,
  test_type      VARCHAR(50),
  result         VARCHAR(30),  -- pass, fail, partial
  tester_id      UUID,
  tested_at      TIMESTAMPTZ,
  evidence_ref   VARCHAR(255),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_retests_control ON control_retests(tenant_id, control_id);

-- ── Monitoring Rules ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_monitoring_rules (
  rule_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  control_id        VARCHAR(100) NOT NULL,
  rule_name         VARCHAR(255) NOT NULL,
  signal_source     VARCHAR(100),
  metric            VARCHAR(100),
  operator          VARCHAR(10),  -- >, <, >=, <=, ==, !=
  threshold         NUMERIC,
  severity          VARCHAR(20) NOT NULL DEFAULT 'medium',
  auto_create_issue BOOLEAN NOT NULL DEFAULT false,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_monitoring_rules_control ON control_monitoring_rules(tenant_id, control_id) WHERE deleted_at IS NULL;

-- ── Monitoring Signals ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_monitoring_signals (
  signal_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        UUID NOT NULL REFERENCES control_monitoring_rules(rule_id),
  tenant_id      UUID NOT NULL,
  control_id     VARCHAR(100) NOT NULL,
  signal_value   NUMERIC,
  captured_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  breach         BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_monitoring_signals_rule ON control_monitoring_signals(rule_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_signals_breach ON control_monitoring_signals(tenant_id, control_id) WHERE breach = true;

-- ── Monitoring Alerts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_monitoring_alerts (
  alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id       UUID REFERENCES control_monitoring_signals(signal_id),
  tenant_id       UUID NOT NULL,
  control_id      VARCHAR(100) NOT NULL,
  severity        VARCHAR(20) NOT NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'new',  -- new, acknowledged, resolved, dismissed
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  linked_issue_id UUID
);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_tenant ON control_monitoring_alerts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_control ON control_monitoring_alerts(tenant_id, control_id);

-- ── Control Health Snapshots ─────────────────────────────────
CREATE TABLE IF NOT EXISTS control_health_snapshots (
  snapshot_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL,
  control_id           VARCHAR(100) NOT NULL,
  snapshot_date        DATE NOT NULL,
  effectiveness_score  NUMERIC(3,2),
  test_pass_rate       NUMERIC(5,2),
  evidence_freshness_pct NUMERIC(5,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, control_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_tenant ON control_health_snapshots(tenant_id, snapshot_date DESC);

-- ── Control Dashboard Cache ──────────────────────────────────
CREATE TABLE IF NOT EXISTS control_dashboard_cache (
  cache_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  cache_key      VARCHAR(100) NOT NULL,
  data           JSONB NOT NULL,
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds    INTEGER NOT NULL DEFAULT 300,
  UNIQUE(tenant_id, cache_key)
);

-- ── Add columns to controls table if missing ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'key_control') THEN
    ALTER TABLE controls ADD COLUMN key_control BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'shared_control') THEN
    ALTER TABLE controls ADD COLUMN shared_control BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'automation_level') THEN
    ALTER TABLE controls ADD COLUMN automation_level VARCHAR(30) DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'criticality') THEN
    ALTER TABLE controls ADD COLUMN criticality VARCHAR(20) DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'next_test_due_at') THEN
    ALTER TABLE controls ADD COLUMN next_test_due_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'operator_user_id') THEN
    ALTER TABLE controls ADD COLUMN operator_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'reviewer_user_id') THEN
    ALTER TABLE controls ADD COLUMN reviewer_user_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'family_id') THEN
    ALTER TABLE controls ADD COLUMN family_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'objective') THEN
    ALTER TABLE controls ADD COLUMN objective TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'statement') THEN
    ALTER TABLE controls ADD COLUMN statement TEXT;
  END IF;
END $$;
