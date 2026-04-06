-- ============================================
-- AGRC-OS Tenant Migration 107
-- Agent Orchestration & Shadow Agent Schema
-- Adds: agent_runs, agent_steps, agent_proposals,
--        agent_approvals_v2, agent_events,
--        agent_autonomy_policies, shadow_agent_config
-- ============================================

-- ── 1. Agent Runs — tracks each orchestration cycle ────────────
CREATE TABLE IF NOT EXISTS agent_runs (
  run_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64) NOT NULL,
  user_id          VARCHAR(64),
  workflow_id      VARCHAR(128),
  agent_id         VARCHAR(20),
  autonomy_level   VARCHAR(10) NOT NULL DEFAULT 'L0'
    CHECK (autonomy_level IN ('L0','L1','L2','L3')),
  platform_mode    VARCHAR(30) NOT NULL DEFAULT 'human'
    CHECK (platform_mode IN ('human','hybrid','shadow_agent','full_autonomous')),
  status           VARCHAR(30) NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','awaiting_approval','completed','failed','cancelled')),
  trace_id         VARCHAR(128),
  inputs           JSONB NOT NULL DEFAULT '{}',
  outputs          JSONB NOT NULL DEFAULT '{}',
  summary          TEXT,
  actions_proposed INT NOT NULL DEFAULT 0,
  actions_executed INT NOT NULL DEFAULT 0,
  actions_queued   INT NOT NULL DEFAULT 0,
  duration_ms      INT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_tenant    ON agent_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_status    ON agent_runs(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_ar_agent     ON agent_runs(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_trace     ON agent_runs(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_user      ON agent_runs(user_id) WHERE user_id IS NOT NULL;

-- ── 2. Agent Steps — nodes within a run ────────────────────────
CREATE TABLE IF NOT EXISTS agent_steps (
  step_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id           UUID        NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
  node_id          VARCHAR(128) NOT NULL,
  agent_id         VARCHAR(20) NOT NULL,
  step_type        VARCHAR(50) NOT NULL DEFAULT 'task'
    CHECK (step_type IN ('start','task','approval','gateway','notification','end')),
  lane             VARCHAR(100),
  label            TEXT,
  label_ar         TEXT,
  status           VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','done','failed','skipped','blocked','awaiting_approval')),
  owner_user_id    VARCHAR(64),
  inputs_ref       JSONB,
  outputs_ref      JSONB,
  sla_hours        INT,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_as_run    ON agent_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_as_status ON agent_steps(status) WHERE status NOT IN ('done','skipped');
CREATE UNIQUE INDEX IF NOT EXISTS uq_as_run_node ON agent_steps(run_id, node_id);

-- ── 3. Agent Proposals — all agent "changes" become proposals ──
CREATE TABLE IF NOT EXISTS agent_proposals (
  proposal_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID        REFERENCES agent_runs(run_id) ON DELETE SET NULL,
  node_id           VARCHAR(128),
  agent_id          VARCHAR(20) NOT NULL,
  tenant_id         VARCHAR(64) NOT NULL,
  type              VARCHAR(100) NOT NULL
    CHECK (type IN (
      'EVIDENCE_REQUEST','REASSIGN','CHANGE_PATH','CREATE_TASK',
      'CLOSE_RISK','MODIFY_CONTROL','CREATE_POLICY','ESCALATE',
      'NOTIFY_OWNER','GENERATE_DRAFT','CLASSIFY_EVIDENCE','SUMMARIZE',
      'UPDATE_STATUS','CREATE_REMEDIATION','FLAG_RISK','OTHER'
    )),
  payload_json      JSONB NOT NULL DEFAULT '{}',
  reason            TEXT,
  priority          VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  status            VARCHAR(30) NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval','approved','rejected','executed','expired','auto_executed')),
  required_approvers TEXT[] NOT NULL DEFAULT '{}',
  auto_executable   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        VARCHAR(64),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_tenant   ON agent_proposals(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ap_status   ON agent_proposals(status) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_ap_run      ON agent_proposals(run_id) WHERE run_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ap_agent    ON agent_proposals(agent_id);

-- ── 4. Agent Approvals — decisions on proposals ────────────────
CREATE TABLE IF NOT EXISTS agent_approvals_v2 (
  approval_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id       UUID        NOT NULL REFERENCES agent_proposals(proposal_id) ON DELETE CASCADE,
  approver_user_id  VARCHAR(64) NOT NULL,
  decision          VARCHAR(20) NOT NULL
    CHECK (decision IN ('approve','reject')),
  comment           TEXT,
  decided_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aav2_proposal ON agent_approvals_v2(proposal_id);
CREATE INDEX IF NOT EXISTS idx_aav2_approver ON agent_approvals_v2(approver_user_id, decided_at DESC);

-- ── 5. Agent Events — for Studio playback & audit ──────────────
CREATE TABLE IF NOT EXISTS agent_events (
  event_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID        REFERENCES agent_runs(run_id) ON DELETE CASCADE,
  tenant_id         VARCHAR(64) NOT NULL,
  agent_id          VARCHAR(20),
  event_type        VARCHAR(100) NOT NULL,
  node_id           VARCHAR(128),
  data_json         JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_run      ON agent_events(run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ae_tenant   ON agent_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ae_type     ON agent_events(event_type);

-- ── 6. Agent Autonomy Policies — per-tenant per-action-type rules ──
CREATE TABLE IF NOT EXISTS agent_autonomy_policies (
  policy_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  action_type       VARCHAR(100) NOT NULL,
  min_autonomy      VARCHAR(10) NOT NULL DEFAULT 'L1'
    CHECK (min_autonomy IN ('L0','L1','L2','L3')),
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  max_auto_per_day  INT DEFAULT 50,
  allowed_agents    TEXT[] DEFAULT '{}',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_aap_tenant_action
  ON agent_autonomy_policies(tenant_id, action_type);

-- Seed default autonomy policies
INSERT INTO agent_autonomy_policies (tenant_id, action_type, min_autonomy, requires_approval, notes)
VALUES
  ('_default', 'NOTIFY_OWNER',           'L2', FALSE, 'Low-risk: auto-execute at L2+'),
  ('_default', 'GENERATE_DRAFT',         'L2', FALSE, 'Low-risk: drafts are reversible'),
  ('_default', 'CLASSIFY_EVIDENCE',      'L2', FALSE, 'Low-risk: classification only'),
  ('_default', 'SUMMARIZE',              'L2', FALSE, 'Low-risk: read-only summarization'),
  ('_default', 'UPDATE_STATUS',          'L1', TRUE,  'Medium-risk: needs approval at L1'),
  ('_default', 'CREATE_TASK',            'L1', TRUE,  'Medium-risk: creates work items'),
  ('_default', 'EVIDENCE_REQUEST',       'L1', TRUE,  'Medium-risk: creates obligations'),
  ('_default', 'CREATE_REMEDIATION',     'L1', TRUE,  'Medium-risk: remediation plans'),
  ('_default', 'FLAG_RISK',              'L1', TRUE,  'Medium-risk: risk flagging'),
  ('_default', 'CHANGE_PATH',            'L0', TRUE,  'High-risk: always requires approval'),
  ('_default', 'CLOSE_RISK',             'L0', TRUE,  'High-risk: always requires approval'),
  ('_default', 'MODIFY_CONTROL',         'L0', TRUE,  'High-risk: always requires approval'),
  ('_default', 'REASSIGN',              'L0', TRUE,  'High-risk: always requires approval'),
  ('_default', 'ESCALATE',              'L0', TRUE,  'High-risk: always requires approval'),
  ('_default', 'CREATE_POLICY',          'L0', TRUE,  'High-risk: always requires approval')
ON CONFLICT DO NOTHING;

-- ── 7. Shadow Agent Config — per-employee agent profile ────────
CREATE TABLE IF NOT EXISTS shadow_agent_config (
  config_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64) NOT NULL,
  user_id               VARCHAR(64) NOT NULL,
  enabled               BOOLEAN NOT NULL DEFAULT FALSE,
  autonomy_level        VARCHAR(10) NOT NULL DEFAULT 'L0'
    CHECK (autonomy_level IN ('L0','L1','L2','L3')),
  allowed_agents        TEXT[] DEFAULT ARRAY['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10'],
  delegation_rules      JSONB NOT NULL DEFAULT '{}',
  memory_namespace      VARCHAR(255),
  preferences           JSONB NOT NULL DEFAULT '{}',
  max_actions_per_day   INT NOT NULL DEFAULT 25,
  actions_today         INT NOT NULL DEFAULT 0,
  actions_today_reset   DATE DEFAULT CURRENT_DATE,
  last_active_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sac_tenant_user ON shadow_agent_config(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sac_enabled ON shadow_agent_config(tenant_id) WHERE enabled = TRUE;
