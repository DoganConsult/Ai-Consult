-- ============================================================
-- Migration 369: Initiative & Milestone Orchestrator
-- Phase A: Module Initiative Registry
-- Phase B: Milestone Engine (operational/capability/outcome)
-- Phase C: Expert Pack Registry
-- Phase D: Outcome Graph Linkage
-- Phase E: Initiative Orchestrator State
-- Phase F: Autonomy Levels
-- Phase G: Digest / Briefing Layer
-- ============================================================

-- ═══════════════════════════════════════════════
-- PHASE A: Initiative Registry
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS initiative_definitions (
  initiative_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code         TEXT NOT NULL,
  initiative_code     TEXT NOT NULL,
  initiative_name     TEXT NOT NULL,
  initiative_name_ar  TEXT,
  purpose             TEXT,
  trigger_conditions  JSONB NOT NULL DEFAULT '{}',
  context_dimensions  TEXT[] DEFAULT '{}',
  source_records      TEXT[] DEFAULT '{}',
  severity_logic      JSONB DEFAULT '{}',
  autonomy_level      INT NOT NULL DEFAULT 1 CHECK (autonomy_level BETWEEN 0 AND 4),
  approval_required   BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_path     JSONB DEFAULT '{}',
  artifacts_produced  TEXT[] DEFAULT '{}',
  linked_milestones   TEXT[] DEFAULT '{}',
  linked_expert_pack  TEXT,
  cooldown_minutes    INT NOT NULL DEFAULT 60,
  max_fire_per_day    INT NOT NULL DEFAULT 10,
  success_criteria    JSONB DEFAULT '{}',
  failure_behavior    TEXT DEFAULT 'retry_once',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_code, initiative_code)
);

CREATE INDEX IF NOT EXISTS idx_init_def_module ON initiative_definitions(module_code);
CREATE INDEX IF NOT EXISTS idx_init_def_active ON initiative_definitions(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS initiative_runs (
  run_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  initiative_id       UUID NOT NULL REFERENCES initiative_definitions(initiative_id),
  initiative_code     TEXT NOT NULL,
  module_code         TEXT NOT NULL,
  phase               TEXT NOT NULL DEFAULT 'sensing'
    CHECK (phase IN ('sensing','interpreting','deciding','acting','verifying','escalating','learning','completed','failed')),
  trigger_event       TEXT,
  trigger_entity_id   TEXT,
  context_snapshot     JSONB DEFAULT '{}',
  interpretation      JSONB DEFAULT '{}',
  decision            JSONB DEFAULT '{}',
  artifacts_created   JSONB DEFAULT '[]',
  verification_result JSONB DEFAULT '{}',
  escalation_result   JSONB DEFAULT '{}',
  learning_signal     JSONB DEFAULT '{}',
  autonomy_level_used INT DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  duration_ms         INT,
  created_by          TEXT DEFAULT 'system',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_init_run_tenant ON initiative_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_init_run_module ON initiative_runs(tenant_id, module_code);
CREATE INDEX IF NOT EXISTS idx_init_run_phase ON initiative_runs(tenant_id, phase) WHERE phase NOT IN ('completed','failed');

-- ═══════════════════════════════════════════════
-- PHASE B: Milestone Engine
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS milestone_definitions (
  milestone_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code         TEXT NOT NULL,
  milestone_code      TEXT NOT NULL,
  milestone_name      TEXT NOT NULL,
  milestone_name_ar   TEXT,
  layer               TEXT NOT NULL CHECK (layer IN ('operational','capability','outcome')),
  completion_conditions JSONB NOT NULL DEFAULT '{}',
  evidence_sources    TEXT[] DEFAULT '{}',
  dependencies        TEXT[] DEFAULT '{}',
  owner_role          TEXT,
  rollup_weight       NUMERIC(5,2) DEFAULT 1.0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_code, milestone_code)
);

CREATE INDEX IF NOT EXISTS idx_ms_def_module ON milestone_definitions(module_code);
CREATE INDEX IF NOT EXISTS idx_ms_def_layer ON milestone_definitions(layer);

CREATE TABLE IF NOT EXISTS milestone_instances (
  instance_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  milestone_id        UUID NOT NULL REFERENCES milestone_definitions(milestone_id),
  milestone_code      TEXT NOT NULL,
  module_code         TEXT NOT NULL,
  state               TEXT NOT NULL DEFAULT 'not_started'
    CHECK (state IN ('not_started','in_progress','blocked','completed','regressed')),
  progress_pct        INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  confidence          NUMERIC(5,2) DEFAULT 0.0,
  health              TEXT DEFAULT 'unknown' CHECK (health IN ('healthy','at_risk','blocked','unknown')),
  evidence_links      JSONB DEFAULT '[]',
  blockers            JSONB DEFAULT '[]',
  owner_user_id       TEXT,
  department_id       TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  last_evaluated_at   TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, milestone_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_ms_inst_tenant ON milestone_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ms_inst_module ON milestone_instances(tenant_id, module_code);
CREATE INDEX IF NOT EXISTS idx_ms_inst_state ON milestone_instances(tenant_id, state);

-- ═══════════════════════════════════════════════
-- PHASE C: Expert Pack Registry
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS expert_packs (
  pack_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code         TEXT NOT NULL UNIQUE,
  domain_objectives   JSONB NOT NULL DEFAULT '[]',
  regulator_logic     JSONB DEFAULT '{}',
  thresholds          JSONB DEFAULT '{}',
  failure_patterns    JSONB DEFAULT '[]',
  evidence_expectations JSONB DEFAULT '{}',
  severity_logic      JSONB DEFAULT '{}',
  escalation_rules    JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  executive_summary_style JSONB DEFAULT '{}',
  committee_wording_style JSONB DEFAULT '{}',
  next_best_action_templates JSONB DEFAULT '[]',
  milestone_hints     JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- PHASE D: Outcome Graph
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outcome_links (
  link_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  source_type         TEXT NOT NULL,
  source_id           TEXT NOT NULL,
  target_type         TEXT NOT NULL,
  target_id           TEXT NOT NULL,
  link_category       TEXT NOT NULL CHECK (link_category IN (
    'task_to_milestone','action_to_outcome','control_to_readiness',
    'evidence_to_milestone','finding_to_exposure','risk_to_posture',
    'initiative_to_artifact','activity_to_kpi','qiyas_to_maturity'
  )),
  impact_weight       NUMERIC(5,2) DEFAULT 1.0,
  verified            BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_tenant ON outcome_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_outcome_source ON outcome_links(tenant_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_outcome_target ON outcome_links(tenant_id, target_type, target_id);

-- ═══════════════════════════════════════════════
-- PHASE G: Digest / Briefing Layer
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leadership_digests (
  digest_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  digest_type         TEXT NOT NULL CHECK (digest_type IN (
    'operational','manager','department','compliance_lead','committee','executive'
  )),
  period_start        TIMESTAMPTZ NOT NULL,
  period_end          TIMESTAMPTZ NOT NULL,
  content             JSONB NOT NULL DEFAULT '{}',
  module_summaries    JSONB DEFAULT '{}',
  initiative_summaries JSONB DEFAULT '[]',
  milestone_summaries JSONB DEFAULT '[]',
  blocked_items       JSONB DEFAULT '[]',
  trending_items      JSONB DEFAULT '[]',
  approvals_pending   JSONB DEFAULT '[]',
  next_best_actions   JSONB DEFAULT '[]',
  generated_by        TEXT DEFAULT 'system',
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_tenant ON leadership_digests(tenant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_type ON leadership_digests(tenant_id, digest_type);

DO $$
BEGIN
  RAISE NOTICE '[Migration 369] Initiative & Milestone Orchestrator tables created';
END $$;
