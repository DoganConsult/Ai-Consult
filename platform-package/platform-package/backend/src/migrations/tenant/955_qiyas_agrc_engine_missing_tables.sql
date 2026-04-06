-- ============================================================
-- Migration 955: Qiyas + AGRC Engine — Missing Tables (MP-41, MP-19)
-- Owner: Module:Qiyas, Module:AGRC-Engine
-- Tables: 12 new tables (6 qiyas + 6 agrc-engine)
-- ============================================================

-- ═══ QIYAS (MP-41) ═══

CREATE TABLE IF NOT EXISTS qiyas_benchmarks (
  benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_code VARCHAR(100) UNIQUE, title VARCHAR(500) NOT NULL,
  benchmark_type VARCHAR(50) DEFAULT 'industry' CHECK (benchmark_type IN ('industry','peer','regulatory','best_practice','custom')),
  sector VARCHAR(100), region VARCHAR(100),
  data_points JSONB NOT NULL DEFAULT '{}',
  period_start DATE, period_end DATE,
  source VARCHAR(200), is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS qiyas_frameworks (
  framework_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_code VARCHAR(100) UNIQUE, framework_name VARCHAR(500) NOT NULL,
  version VARCHAR(20) DEFAULT '1.0', dimensions JSONB NOT NULL DEFAULT '[]',
  scoring_model JSONB DEFAULT '{}', is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS qiyas_gap_analysis (
  gap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID, dimension VARCHAR(100),
  current_score NUMERIC(5,2), target_score NUMERIC(5,2),
  gap_size NUMERIC(5,2), priority VARCHAR(20) DEFAULT 'medium',
  root_cause TEXT, recommended_actions JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','accepted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS qiyas_roadmap_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id UUID REFERENCES qiyas_gap_analysis(gap_id),
  title VARCHAR(500) NOT NULL, description TEXT,
  target_quarter VARCHAR(10), effort VARCHAR(20) DEFAULT 'medium',
  expected_impact NUMERIC(5,2), owner_user_id VARCHAR(64),
  status VARCHAR(30) DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','deferred','cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS qiyas_strategy_directions (
  direction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL, description TEXT,
  strategic_theme VARCHAR(100), priority VARCHAR(20) DEFAULT 'medium',
  target_maturity_level INT CHECK (target_maturity_level >= 1 AND target_maturity_level <= 5),
  timeline_months INT, investment_estimate NUMERIC(15,2),
  status VARCHAR(30) DEFAULT 'proposed' CHECK (status IN ('proposed','approved','active','completed','archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS qiyas_trend_analysis (
  trend_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension VARCHAR(100), metric_code VARCHAR(100),
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  data_points JSONB NOT NULL DEFAULT '[]',
  trend_direction VARCHAR(20) CHECK (trend_direction IN ('improving','stable','declining','volatile')),
  forecast JSONB DEFAULT '{}', confidence NUMERIC(5,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ AGRC ENGINE (MP-19) ═══

CREATE TABLE IF NOT EXISTS agrc_engine_config (
  config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(200) NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  description TEXT, is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agrc_engine_rules (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(100) UNIQUE, rule_name VARCHAR(500) NOT NULL,
  rule_type VARCHAR(50) CHECK (rule_type IN ('compliance','risk','control','evidence','governance','cross_cutting')),
  condition_expression JSONB NOT NULL DEFAULT '{}',
  action_on_match VARCHAR(50) DEFAULT 'flag' CHECK (action_on_match IN ('flag','alert','block','auto_remediate','notify','escalate')),
  severity VARCHAR(20) DEFAULT 'medium', priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, created_by VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS agrc_engine_cycles (
  cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_type VARCHAR(50) DEFAULT 'scheduled' CHECK (cycle_type IN ('scheduled','triggered','manual','continuous')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  rules_evaluated INT DEFAULT 0, findings_generated INT DEFAULT 0,
  duration_ms INT, error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agrc_engine_rule_evaluations (
  evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES agrc_engine_cycles(cycle_id),
  rule_id UUID REFERENCES agrc_engine_rules(rule_id),
  result VARCHAR(30) CHECK (result IN ('pass','fail','error','skipped','not_applicable')),
  entity_type VARCHAR(100), entity_id UUID,
  details JSONB DEFAULT '{}', evaluation_ms INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agrc_engine_findings (
  finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES agrc_engine_cycles(cycle_id),
  rule_id UUID REFERENCES agrc_engine_rules(rule_id),
  entity_type VARCHAR(100), entity_id UUID,
  finding_type VARCHAR(50) DEFAULT 'violation',
  severity VARCHAR(20) DEFAULT 'medium', title VARCHAR(500) NOT NULL,
  description TEXT, recommended_action TEXT,
  status VARCHAR(30) DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','false_positive','deferred')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agrc_engine_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES agrc_engine_cycles(cycle_id),
  summary JSONB NOT NULL DEFAULT '{}',
  compliance_score NUMERIC(5,2), risk_score NUMERIC(5,2),
  control_effectiveness NUMERIC(5,2), evidence_coverage NUMERIC(5,2),
  total_rules INT DEFAULT 0, pass_count INT DEFAULT 0, fail_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qiyas_benchmarks_active ON qiyas_benchmarks (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qiyas_gap_status ON qiyas_gap_analysis (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qiyas_roadmap_status ON qiyas_roadmap_items (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_qiyas_trend_period ON qiyas_trend_analysis (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_agrc_rules_active ON agrc_engine_rules (is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agrc_cycles_status ON agrc_engine_cycles (status);
CREATE INDEX IF NOT EXISTS idx_agrc_evals_cycle ON agrc_engine_rule_evaluations (cycle_id);
CREATE INDEX IF NOT EXISTS idx_agrc_evals_rule ON agrc_engine_rule_evaluations (rule_id);
CREATE INDEX IF NOT EXISTS idx_agrc_findings_cycle ON agrc_engine_findings (cycle_id);
CREATE INDEX IF NOT EXISTS idx_agrc_findings_status ON agrc_engine_findings (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agrc_results_cycle ON agrc_engine_results (cycle_id);
