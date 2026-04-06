-- ============================================
-- Tenant Migration 255
-- Approval Policies, SoD Policies, AI Action Policies,
-- Workflow Profiles, Policy Decision Log
-- ============================================

-- 1. Module workflow profiles — depth of workflow per archetype × module
CREATE TABLE IF NOT EXISTS module_workflow_profiles (
  id              BIGSERIAL PRIMARY KEY,
  archetype_code  TEXT NOT NULL REFERENCES tenant_archetypes(code) ON DELETE CASCADE,
  module_code     TEXT NOT NULL,
  profile_code    TEXT NOT NULL
    CHECK (profile_code IN ('lean', 'standard', 'regulated', 'government')),
  approval_style  TEXT NOT NULL DEFAULT 'single'
    CHECK (approval_style IN ('none', 'single', 'dual', 'committee', 'multi_level')),
  sod_strictness  TEXT NOT NULL DEFAULT 'warn'
    CHECK (sod_strictness IN ('none', 'warn', 'block')),
  sla_multiplier  NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  auto_escalate   BOOLEAN NOT NULL DEFAULT FALSE,
  description_en  TEXT,
  UNIQUE (archetype_code, module_code)
);

CREATE INDEX IF NOT EXISTS idx_mwp_archetype ON module_workflow_profiles(archetype_code);

-- 2. Module approval policies — per archetype × module approval config
CREATE TABLE IF NOT EXISTS module_approval_policies (
  id                     BIGSERIAL PRIMARY KEY,
  archetype_code         TEXT NOT NULL REFERENCES tenant_archetypes(code) ON DELETE CASCADE,
  module_code            TEXT NOT NULL,
  transition_key         TEXT NOT NULL,
  min_approvers          INT NOT NULL DEFAULT 1,
  required_authority     TEXT DEFAULT 'approve_low',
  require_different_user BOOLEAN NOT NULL DEFAULT TRUE,
  escalation_hours       INT,
  escalation_target_role TEXT,
  description_en         TEXT,
  UNIQUE (archetype_code, module_code, transition_key)
);

-- 3. Module SoD policies — per archetype × module SoD overrides
CREATE TABLE IF NOT EXISTS module_sod_policies (
  id               BIGSERIAL PRIMARY KEY,
  archetype_code   TEXT NOT NULL REFERENCES tenant_archetypes(code) ON DELETE CASCADE,
  module_code      TEXT NOT NULL,
  role_code_a      TEXT NOT NULL,
  role_code_b      TEXT NOT NULL,
  conflict_level   TEXT NOT NULL CHECK (conflict_level IN ('warn', 'block')),
  scope_rule       TEXT NOT NULL DEFAULT 'same_scope'
    CHECK (scope_rule IN ('same_scope', 'tenant_wide')),
  description_en   TEXT,
  UNIQUE (archetype_code, module_code, role_code_a, role_code_b)
);

-- 4. AI action policies — autonomy per archetype × module × action class
CREATE TABLE IF NOT EXISTS ai_action_policies (
  id              BIGSERIAL PRIMARY KEY,
  archetype_code  TEXT NOT NULL REFERENCES tenant_archetypes(code) ON DELETE CASCADE,
  module_code     TEXT NOT NULL,
  action_class    TEXT NOT NULL
    CHECK (action_class IN (
      'observe', 'recommend', 'draft', 'auto_assign',
      'auto_execute', 'escalate', 'block'
    )),
  autonomy_level  TEXT NOT NULL DEFAULT 'recommend'
    CHECK (autonomy_level IN (
      'observe', 'recommend', 'draft',
      'auto_assign', 'auto_execute', 'block'
    )),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approval_role     TEXT,
  max_risk_level    TEXT DEFAULT 'high'
    CHECK (max_risk_level IN ('low', 'medium', 'high', 'critical')),
  cooldown_minutes  INT DEFAULT 0,
  description_en    TEXT,
  UNIQUE (archetype_code, module_code, action_class)
);

CREATE INDEX IF NOT EXISTS idx_aap_archetype ON ai_action_policies(archetype_code);
CREATE INDEX IF NOT EXISTS idx_aap_module ON ai_action_policies(module_code);

-- 5. Policy decision log — unified explainability/audit for all policy decisions
CREATE TABLE IF NOT EXISTS policy_decision_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type  TEXT NOT NULL
    CHECK (decision_type IN (
      'archetype_resolution', 'module_activation', 'permission_derivation',
      'workflow_profile', 'approval_policy', 'sod_check', 'ai_action',
      'navigation_visibility', 'escalation_routing'
    )),
  user_id        VARCHAR(64),
  module_code    TEXT,
  input_context  JSONB NOT NULL DEFAULT '{}',
  decision       TEXT NOT NULL,
  reason         TEXT,
  policy_ref     TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdl_type ON policy_decision_log(decision_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdl_user ON policy_decision_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdl_module ON policy_decision_log(module_code, created_at DESC);
