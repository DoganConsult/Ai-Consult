-- ============================================================
-- Migration 953: Governance-AI Module — Missing Tables (MP-26)
-- Owner: Module:Governance-AI
-- Tables: 9 new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS governance_ai_signals (
  signal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type VARCHAR(50) CHECK (signal_type IN ('risk_escalation','compliance_drift','maturity_change','anomaly','oversight_gap','policy_conflict')),
  source_module VARCHAR(100), source_entity_type VARCHAR(100), source_entity_id UUID,
  severity VARCHAR(20) DEFAULT 'medium', confidence NUMERIC(5,2),
  title VARCHAR(500) NOT NULL, description TEXT,
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new','acknowledged','investigating','resolved','dismissed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS governance_ai_interpretations (
  interpretation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES governance_ai_signals(signal_id),
  interpretation TEXT NOT NULL, confidence NUMERIC(5,2),
  model_used VARCHAR(200), reasoning_chain JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_ai_narratives (
  narrative_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_type VARCHAR(50) DEFAULT 'summary' CHECK (narrative_type IN ('summary','board_brief','risk_narrative','compliance_story','executive_insight')),
  title VARCHAR(500) NOT NULL, content TEXT NOT NULL,
  period_start DATE, period_end DATE,
  audience VARCHAR(50) DEFAULT 'executive', model_used VARCHAR(200),
  accepted BOOLEAN, accepted_by VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS governance_ai_recommendations (
  rec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES governance_ai_signals(signal_id),
  recommendation_type VARCHAR(50) DEFAULT 'action',
  title VARCHAR(500) NOT NULL, description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', confidence NUMERIC(5,2),
  assigned_to VARCHAR(64),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','implemented','deferred')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS governance_ai_score_explanations (
  explanation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_type VARCHAR(50), entity_type VARCHAR(100), entity_id UUID,
  score_value NUMERIC(5,2), explanation TEXT NOT NULL,
  contributing_factors JSONB DEFAULT '[]', model_used VARCHAR(200),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_ai_pipeline_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_name VARCHAR(200) NOT NULL,
  pipeline_type VARCHAR(50) DEFAULT 'analysis' CHECK (pipeline_type IN ('analysis','monitoring','scoring','narrative_gen','signal_detection')),
  input_config JSONB DEFAULT '{}', output JSONB DEFAULT '{}',
  status VARCHAR(30) DEFAULT 'running' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ,
  duration_ms INT, error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_ai_health_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score NUMERIC(5,2), dimension_scores JSONB DEFAULT '{}',
  signals_active INT DEFAULT 0, recommendations_pending INT DEFAULT 0,
  narratives_generated INT DEFAULT 0, pipeline_failures INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_ai_escalations (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES governance_ai_signals(signal_id),
  rec_id UUID REFERENCES governance_ai_recommendations(rec_id),
  escalated_to VARCHAR(64) NOT NULL, escalation_level INT DEFAULT 1,
  reason TEXT, acknowledged_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governance_ai_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50), entity_id UUID,
  action VARCHAR(100) NOT NULL, actor_id VARCHAR(64),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gov_ai_signals_status ON governance_ai_signals (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_ai_signals_severity ON governance_ai_signals (severity) WHERE status != 'dismissed';
CREATE INDEX IF NOT EXISTS idx_gov_ai_interp_signal ON governance_ai_interpretations (signal_id);
CREATE INDEX IF NOT EXISTS idx_gov_ai_narratives_type ON governance_ai_narratives (narrative_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_ai_recs_status ON governance_ai_recommendations (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_ai_pipeline_status ON governance_ai_pipeline_runs (status);
CREATE INDEX IF NOT EXISTS idx_gov_ai_health_date ON governance_ai_health_snapshots (snapshot_date);
CREATE INDEX IF NOT EXISTS idx_gov_ai_escalation_signal ON governance_ai_escalations (signal_id);
