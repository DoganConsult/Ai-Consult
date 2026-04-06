-- Migration 716: Strategy Direction Layer
-- Fills gaps for Qiyas/Maturity enterprise spec: strategic objectives, themes,
-- priorities, risk appetite, metric snapshots, improvement roadmap items.
-- Existing tables: qiyas_models, qiyas_assessments, qiyas_score_results, qiyas_recommendations,
-- qiyas_benchmark_results, risk_kris, kri_data_points (migrations 046-050, 096, 212)

-- 1. Strategic Objectives
CREATE TABLE IF NOT EXISTS strategic_objectives (
  objective_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(30) NOT NULL,
  title_en        VARCHAR(500) NOT NULL,
  title_ar        VARCHAR(500),
  description     TEXT,
  category        VARCHAR(50) DEFAULT 'governance',  -- governance, risk, compliance, performance, innovation
  owner_id        VARCHAR(128),
  sponsor_id      VARCHAR(128),
  status          VARCHAR(30) NOT NULL DEFAULT 'draft',  -- draft, active, on_track, at_risk, delayed, completed, retired
  priority        VARCHAR(20) DEFAULT 'medium',
  target_date     DATE,
  progress_pct    INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  linked_theme_id UUID,
  linked_risks    UUID[] DEFAULT '{}',
  linked_kpis     UUID[] DEFAULT '{}',
  linked_controls UUID[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  created_by      VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_so_status  ON strategic_objectives (status);
CREATE INDEX IF NOT EXISTS idx_so_owner   ON strategic_objectives (owner_id);
CREATE INDEX IF NOT EXISTS idx_so_theme   ON strategic_objectives (linked_theme_id);

-- 2. Strategic Themes
CREATE TABLE IF NOT EXISTS strategic_themes (
  theme_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(30) NOT NULL,
  title_en        VARCHAR(300) NOT NULL,
  title_ar        VARCHAR(300),
  description     TEXT,
  color           VARCHAR(20) DEFAULT 'var(--primary)',
  icon            VARCHAR(50) DEFAULT 'pi-flag',
  fiscal_year     VARCHAR(10),  -- e.g. FY2026
  status          VARCHAR(20) DEFAULT 'active',
  display_order   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enterprise Priorities
CREATE TABLE IF NOT EXISTS enterprise_priorities (
  priority_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en        VARCHAR(500) NOT NULL,
  title_ar        VARCHAR(500),
  description     TEXT,
  priority_level  INTEGER NOT NULL DEFAULT 1,  -- 1=highest
  category        VARCHAR(50) DEFAULT 'strategic',  -- strategic, operational, regulatory, risk
  linked_theme_id UUID,
  linked_objective_ids UUID[] DEFAULT '{}',
  owner_id        VARCHAR(128),
  status          VARCHAR(20) DEFAULT 'active',
  review_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ep_status ON enterprise_priorities (status, priority_level);

-- 4. Risk Appetite Statements
CREATE TABLE IF NOT EXISTS risk_appetite_statements (
  statement_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_category   VARCHAR(100) NOT NULL,  -- operational, financial, compliance, strategic, cyber, reputational
  statement_en    TEXT NOT NULL,
  statement_ar    TEXT,
  appetite_level  VARCHAR(30) NOT NULL DEFAULT 'moderate',  -- averse, cautious, moderate, open, hungry
  tolerance_lower NUMERIC(10,2),
  tolerance_upper NUMERIC(10,2),
  unit            VARCHAR(30) DEFAULT 'percentage',
  linked_kri_ids  UUID[] DEFAULT '{}',
  approved_by     VARCHAR(128),
  approved_at     TIMESTAMPTZ,
  effective_from  DATE,
  effective_to    DATE,
  status          VARCHAR(20) DEFAULT 'draft',  -- draft, approved, superseded, expired
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ras_category ON risk_appetite_statements (risk_category, status);

-- 5. Metric Snapshots (point-in-time captures for KPI/KRI trend analysis)
CREATE TABLE IF NOT EXISTS metric_snapshots (
  snapshot_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type     VARCHAR(20) NOT NULL,  -- kpi, kri, maturity, compliance, risk
  metric_key      VARCHAR(100) NOT NULL,
  metric_label    VARCHAR(300),
  value           NUMERIC(12,4) NOT NULL,
  previous_value  NUMERIC(12,4),
  target_value    NUMERIC(12,4),
  unit            VARCHAR(30) DEFAULT 'score',
  scope_type      VARCHAR(50) DEFAULT 'tenant',  -- tenant, framework, business_unit, team
  scope_ref_id    VARCHAR(200),
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by     VARCHAR(128) DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_ms_metric   ON metric_snapshots (metric_type, metric_key, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_ms_scope    ON metric_snapshots (scope_type, scope_ref_id, captured_at DESC);

-- 6. Improvement Roadmap Items
CREATE TABLE IF NOT EXISTS roadmap_items (
  item_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en        VARCHAR(500) NOT NULL,
  title_ar        VARCHAR(500),
  description     TEXT,
  item_type       VARCHAR(50) DEFAULT 'improvement',  -- improvement, remediation, initiative, milestone, dependency
  phase           VARCHAR(50) DEFAULT 'plan',  -- plan, build, test, deploy, operate
  priority        VARCHAR(20) DEFAULT 'medium',
  status          VARCHAR(30) DEFAULT 'planned',  -- planned, in_progress, blocked, completed, cancelled
  owner_id        VARCHAR(128),
  team_id         UUID,
  linked_objective_id UUID,
  linked_maturity_domain VARCHAR(100),
  linked_assessment_id UUID,
  target_maturity_level VARCHAR(30),
  current_maturity_level VARCHAR(30),
  start_date      DATE,
  target_date     DATE,
  completed_date  DATE,
  effort_days     INTEGER,
  progress_pct    INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  dependencies    UUID[] DEFAULT '{}',
  created_by      VARCHAR(128),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ri_status ON roadmap_items (status, phase);
CREATE INDEX IF NOT EXISTS idx_ri_owner  ON roadmap_items (owner_id);
CREATE INDEX IF NOT EXISTS idx_ri_obj    ON roadmap_items (linked_objective_id);
