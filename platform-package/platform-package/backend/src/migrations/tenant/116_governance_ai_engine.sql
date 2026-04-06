-- Sprint 7: Signal Detection + Interpretation tables
-- Sprint 8: Orchestration + Escalation + Board/Executive Attention tables
-- Sprint 9: Score Explanations
-- Sprint 10: Feedback

CREATE TABLE IF NOT EXISTS governance_ai_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  run_type            VARCHAR(50) NOT NULL DEFAULT 'signal_scan',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  status              VARCHAR(20) NOT NULL DEFAULT 'started',
  stats_json          JSONB DEFAULT '{}',
  error_json          JSONB
);

CREATE TABLE IF NOT EXISTS governance_signals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  signal_type         VARCHAR(100) NOT NULL,
  source_module       VARCHAR(50) NOT NULL,
  source_entity_type  VARCHAR(50),
  source_entity_id    UUID,
  severity            VARCHAR(20) NOT NULL DEFAULT 'medium',
  confidence_score    NUMERIC(5,2) DEFAULT 0.80,
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              VARCHAR(30) NOT NULL DEFAULT 'new',
  board_attention_flag BOOLEAN DEFAULT FALSE,
  recommended_action_type VARCHAR(50),
  recommended_escalation_level INT DEFAULT 0,
  payload_json        JSONB DEFAULT '{}',
  created_by_ai_run_id UUID REFERENCES governance_ai_runs(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_signal_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  signal_type         VARCHAR(100) NOT NULL,
  enabled             BOOLEAN DEFAULT TRUE,
  threshold_json      JSONB DEFAULT '{}',
  severity_mapping_json JSONB DEFAULT '{}',
  route_config_json   JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_signal_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  signal_id           UUID REFERENCES governance_signals(id),
  event_type          VARCHAR(50) NOT NULL,
  event_payload_json  JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_interpreted_issues (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  signal_id           UUID REFERENCES governance_signals(id),
  governance_domain   VARCHAR(50) NOT NULL,
  issue_type          VARCHAR(100) NOT NULL,
  issue_summary       TEXT NOT NULL,
  urgency             VARCHAR(20) NOT NULL DEFAULT 'medium',
  risk_level          VARCHAR(20) NOT NULL DEFAULT 'medium',
  qiyas_impact_level  VARCHAR(20),
  affected_committee_id UUID,
  affected_policy_id  UUID,
  affected_control_id UUID,
  requires_authority_review BOOLEAN DEFAULT FALSE,
  requires_human_approval BOOLEAN DEFAULT FALSE,
  interpretation_json JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sprint 8 tables

CREATE TABLE IF NOT EXISTS governance_recommendations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  interpreted_issue_id UUID REFERENCES governance_interpreted_issues(id),
  recommendation_type VARCHAR(50) NOT NULL,
  recommendation_text TEXT NOT NULL,
  suggested_owner_user_id VARCHAR(255),
  suggested_due_date  TIMESTAMPTZ,
  suggested_committee_id UUID,
  suggested_action_type VARCHAR(50),
  accepted_status     VARCHAR(30) NOT NULL DEFAULT 'drafted',
  accepted_by         VARCHAR(255),
  accepted_at         TIMESTAMPTZ,
  rejected_reason     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_escalation_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  source_signal_id    UUID REFERENCES governance_signals(id),
  source_issue_id     UUID REFERENCES governance_interpreted_issues(id),
  escalation_level    INT NOT NULL DEFAULT 1,
  escalation_target_type VARCHAR(50),
  escalation_target_id UUID,
  board_attention_flag BOOLEAN DEFAULT FALSE,
  executive_attention_flag BOOLEAN DEFAULT FALSE,
  reason              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_attention_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  title               VARCHAR(500) NOT NULL,
  summary             TEXT,
  source_module       VARCHAR(50),
  source_entity_type  VARCHAR(50),
  source_entity_id    UUID,
  severity            VARCHAR(20) NOT NULL DEFAULT 'high',
  rationale           TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'open',
  traceability_json   JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executive_attention_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  title               VARCHAR(500) NOT NULL,
  summary             TEXT,
  source_module       VARCHAR(50),
  source_entity_type  VARCHAR(50),
  source_entity_id    UUID,
  severity            VARCHAR(20) NOT NULL DEFAULT 'high',
  rationale           TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'open',
  traceability_json   JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sprint 9 table

CREATE TABLE IF NOT EXISTS governance_score_explanations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  score_run_id        VARCHAR(255),
  overall_score       NUMERIC(5,2),
  previous_score      NUMERIC(5,2),
  delta_score         NUMERIC(5,2),
  top_negative_drivers_json JSONB DEFAULT '[]',
  top_positive_drivers_json JSONB DEFAULT '[]',
  recommendation_summary TEXT,
  explanation_text    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sprint 10 table

CREATE TABLE IF NOT EXISTS governance_ai_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(255),
  source_type         VARCHAR(50) NOT NULL,
  source_id           UUID,
  feedback_type       VARCHAR(30) NOT NULL DEFAULT 'rating',
  feedback_text       TEXT,
  user_id             VARCHAR(255),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_signals_tenant_type ON governance_signals(tenant_id, signal_type);
CREATE INDEX IF NOT EXISTS idx_gov_signals_tenant_status ON governance_signals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gov_signals_source ON governance_signals(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_signals_board ON governance_signals(board_attention_flag) WHERE board_attention_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_gov_signals_detected ON governance_signals(detected_at);
CREATE INDEX IF NOT EXISTS idx_gov_signals_severity ON governance_signals(severity);
CREATE INDEX IF NOT EXISTS idx_gov_issues_tenant ON governance_interpreted_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gov_issues_signal ON governance_interpreted_issues(signal_id);
CREATE INDEX IF NOT EXISTS idx_gov_recs_issue ON governance_recommendations(interpreted_issue_id);
CREATE INDEX IF NOT EXISTS idx_board_attn_tenant ON board_attention_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_exec_attn_tenant ON executive_attention_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gov_score_expl ON governance_score_explanations(tenant_id, created_at DESC);

COMMENT ON TABLE governance_signals IS 'AI-detected governance signals from cross-module scanning';
COMMENT ON TABLE governance_interpreted_issues IS 'AI-interpreted governance issues from raw signals';
COMMENT ON TABLE governance_recommendations IS 'AI-generated recommendations with human accept/reject workflow';
COMMENT ON TABLE board_attention_items IS 'Items requiring board-level attention, auto-surfaced by AI';
COMMENT ON TABLE executive_attention_items IS 'Items requiring executive attention, auto-surfaced by AI';
COMMENT ON TABLE governance_score_explanations IS 'AI explanations of governance health score changes';
