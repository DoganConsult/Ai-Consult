-- ============================================================
-- Migration 012: Cooperative Workflow Tables
-- 10 AI-Agent ↔ Team Member engagement workflows
-- ============================================================

-- 1. Smart Task Triage Proposals
CREATE TABLE IF NOT EXISTS triage_proposals (
  proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR(64) NOT NULL,
  task_title TEXT NOT NULL,
  proposed_assignee_id VARCHAR(64) NOT NULL,
  proposed_assignee_name TEXT NOT NULL DEFAULT '',
  agent_id VARCHAR(64) NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  confidence_score INT NOT NULL DEFAULT 0,
  workload_score INT NOT NULL DEFAULT 0,
  skill_match_score INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_by VARCHAR(64),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_triage_proposals_status ON triage_proposals (status, created_at DESC);

-- 2. Co-Draft Sessions
CREATE TABLE IF NOT EXISTS co_draft_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(30) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  human_user_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'drafting',
  draft_content TEXT NOT NULL DEFAULT '',
  uncertain_sections JSONB NOT NULL DEFAULT '[]',
  human_resolutions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Evidence Relay Queue
CREATE TABLE IF NOT EXISTS evidence_relay_queue (
  relay_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id VARCHAR(64),
  control_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  source_system VARCHAR(100) NOT NULL DEFAULT 'manual',
  staged_content TEXT NOT NULL DEFAULT '',
  confidence_score INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'staged',
  reviewed_by VARCHAR(64),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_evidence_relay_status ON evidence_relay_queue (status, created_at DESC);

-- 4. Risk Pair Reviews
CREATE TABLE IF NOT EXISTS risk_pair_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  human_analyst_id VARCHAR(64) NOT NULL,
  agent_score INT NOT NULL DEFAULT 0,
  agent_reasoning TEXT NOT NULL DEFAULT '',
  human_score INT,
  human_reasoning TEXT,
  final_score INT,
  final_method VARCHAR(20) NOT NULL DEFAULT 'pending',
  disagreement_flag BOOLEAN NOT NULL DEFAULT FALSE,
  dialogue_entries JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'agent_assessed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ
);

-- 5. Approval Pre-Screens
CREATE TABLE IF NOT EXISTS approval_pre_screens (
  pre_screen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  recommendation VARCHAR(20) NOT NULL DEFAULT 'needs_review',
  supporting_evidence JSONB NOT NULL DEFAULT '[]',
  gaps_found JSONB NOT NULL DEFAULT '[]',
  confidence_score INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Incident War Rooms
CREATE TABLE IF NOT EXISTS war_rooms (
  war_room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL DEFAULT 'AGENT-A07',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  raci_assignments JSONB NOT NULL DEFAULT '[]',
  timeline JSONB NOT NULL DEFAULT '[]',
  containment_steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 7. Nudge Feedback (negotiation)
CREATE TABLE IF NOT EXISTS nudge_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nudge_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  action VARCHAR(20) NOT NULL,
  reason VARCHAR(30) NOT NULL,
  free_text TEXT,
  agent_follow_up TEXT,
  follow_up_task_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Vendor Score Calibrations
CREATE TABLE IF NOT EXISTS score_calibrations (
  calibration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL DEFAULT 'AGENT-A06',
  agent_rationale TEXT NOT NULL DEFAULT '',
  original_weights JSONB NOT NULL DEFAULT '{}',
  calibrated_weights JSONB,
  overrides JSONB NOT NULL DEFAULT '[]',
  calibrated_by VARCHAR(64),
  status VARCHAR(20) NOT NULL DEFAULT 'proposed',
  quarter_label VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit Prep Checklists
CREATE TABLE IF NOT EXISTS audit_prep_checklists (
  checklist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL DEFAULT 'AGENT-A05',
  audit_team_lead_id VARCHAR(64) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  gap_count INT NOT NULL DEFAULT 0,
  ready_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Agent Standup Digests
CREATE TABLE IF NOT EXISTS standup_digests (
  digest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  team_lead_priorities JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'generated',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_standup_digests_date ON standup_digests (generated_at DESC);
