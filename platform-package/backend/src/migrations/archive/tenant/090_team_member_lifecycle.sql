-- Migration 090: Team Member Lifecycle, Multi-Profile, Agent Shadow Profiles
-- Adds lifecycle tracking, profile switching, AI agent shadow companions,
-- and condition-based activation rules per team member.

-- 1. Extend team_members with lifecycle columns
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(30) DEFAULT 'active'
    CHECK (lifecycle_status IN ('invited','onboarded','active','under_review','suspended','offboarded')),
  ADD COLUMN IF NOT EXISTS activation_mode VARCHAR(20) DEFAULT 'human_only'
    CHECK (activation_mode IN ('human_only','hybrid','agrc_os')),
  ADD COLUMN IF NOT EXISTS active_profile_id UUID,
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC(5,2) DEFAULT 0;

-- 2. Member profiles (multiple profiles/roles per user across teams)
CREATE TABLE IF NOT EXISTS member_profiles (
  profile_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64) NOT NULL,
  team_id       UUID REFERENCES teams(team_id) ON DELETE CASCADE,
  profile_name  VARCHAR(255) NOT NULL,
  profile_name_ar VARCHAR(255),
  role_code     VARCHAR(50) NOT NULL,
  permissions   JSONB DEFAULT '[]',
  raci_summary  JSONB DEFAULT '{}',
  is_default    BOOLEAN DEFAULT false,
  assigned_by   VARCHAR(64),
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  active        BOOLEAN DEFAULT true,
  UNIQUE(user_id, team_id, role_code)
);
CREATE INDEX IF NOT EXISTS idx_member_profiles_user ON member_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_member_profiles_team ON member_profiles(team_id);

-- 3. Lifecycle event log (full audit trail of member status transitions)
CREATE TABLE IF NOT EXISTS member_lifecycle_events (
  event_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       VARCHAR(64) NOT NULL,
  team_id       UUID REFERENCES teams(team_id) ON DELETE CASCADE,
  event_type    VARCHAR(30) NOT NULL
    CHECK (event_type IN ('invited','onboarded','activated','reviewed','suspended','offboarded','profile_switched','role_changed','reactivated')),
  from_status   VARCHAR(30),
  to_status     VARCHAR(30),
  metadata      JSONB DEFAULT '{}',
  performed_by  VARCHAR(64),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_user ON member_lifecycle_events(user_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_team ON member_lifecycle_events(team_id, created_at DESC);

-- 4. Agent shadow profiles (AI companion mirroring each member's RACI)
CREATE TABLE IF NOT EXISTS member_agent_shadows (
  shadow_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         VARCHAR(64) NOT NULL,
  team_id         UUID REFERENCES teams(team_id) ON DELETE CASCADE,
  agent_name      VARCHAR(255) NOT NULL,
  agent_name_ar   VARCHAR(255),
  activation_mode VARCHAR(20) NOT NULL DEFAULT 'human_only'
    CHECK (activation_mode IN ('human_only','hybrid','agrc_os')),
  raci_mirror     JSONB DEFAULT '{}',
  capabilities    JSONB DEFAULT '[]',
  auto_actions    JSONB DEFAULT '[]',
  last_action_at  TIMESTAMPTZ,
  total_actions   INT DEFAULT 0,
  enabled         BOOLEAN DEFAULT false,
  configured_by   VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);
CREATE INDEX IF NOT EXISTS idx_agent_shadows_user ON member_agent_shadows(user_id);

-- 5. Agent activation rules (condition-based triggers configured by tenant admin)
CREATE TABLE IF NOT EXISTS agent_activation_rules (
  rule_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shadow_id       UUID NOT NULL REFERENCES member_agent_shadows(shadow_id) ON DELETE CASCADE,
  rule_name       VARCHAR(255) NOT NULL,
  rule_name_ar    VARCHAR(255),
  trigger_type    VARCHAR(50) NOT NULL
    CHECK (trigger_type IN ('overdue_task','evidence_gap','risk_threshold','compliance_deadline','workload_limit','schedule','manual')),
  trigger_config  JSONB NOT NULL DEFAULT '{}',
  action_type     VARCHAR(50) NOT NULL
    CHECK (action_type IN ('notify','auto_assign','escalate','generate_report','send_reminder','create_task','flag_review')),
  action_config   JSONB NOT NULL DEFAULT '{}',
  priority        INT DEFAULT 50,
  enabled         BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count   INT DEFAULT 0,
  created_by      VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activation_rules_shadow ON agent_activation_rules(shadow_id);
