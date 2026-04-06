-- Migration 112: Policy Templates, Workflow Tracker, MOM Records, Guidance
-- KSA-aligned policy templates with auto-fill variables,
-- full change/approval/process tracking, MOM format support

-- 1) Policy Templates (20 KSA-aligned, reusable, auto-fill)
CREATE TABLE IF NOT EXISTS policy_templates (
  template_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key      TEXT NOT NULL UNIQUE,
  title_en          TEXT NOT NULL,
  title_ar          TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'general',
  description_en    TEXT NOT NULL DEFAULT '',
  description_ar    TEXT NOT NULL DEFAULT '',
  frameworks        TEXT[] NOT NULL DEFAULT '{}',
  sectors           TEXT[] NOT NULL DEFAULT '{}',
  content_en        TEXT NOT NULL,
  content_ar        TEXT NOT NULL DEFAULT '',
  guidance_en       TEXT NOT NULL DEFAULT '',
  guidance_ar       TEXT NOT NULL DEFAULT '',
  variables         JSONB NOT NULL DEFAULT '[]',
  review_frequency  TEXT NOT NULL DEFAULT 'annual',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  sort_order        INT NOT NULL DEFAULT 100,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policy_templates_category ON policy_templates(category);
CREATE INDEX IF NOT EXISTS idx_policy_templates_active ON policy_templates(is_active);

-- 2) Policy Workflow Tracker — every change, approval, rejection, comment
CREATE TABLE IF NOT EXISTS policy_workflow_tracker (
  tracker_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id         UUID NOT NULL,
  action            TEXT NOT NULL CHECK (action IN (
    'created','updated','submitted_for_review','reviewed','approved',
    'rejected','published','archived','expired','recalled',
    'comment_added','escalated','delegated','acknowledged',
    'mom_attached','guidance_updated','bulk_generated'
  )),
  actor_user_id     TEXT NOT NULL,
  actor_role        TEXT,
  from_status       TEXT,
  to_status         TEXT,
  comment           TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policy_wf_tracker_policy ON policy_workflow_tracker(policy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_wf_tracker_actor ON policy_workflow_tracker(actor_user_id);

-- 3) Policy MOM Records (Minutes of Meeting)
CREATE TABLE IF NOT EXISTS policy_mom_records (
  mom_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id         UUID,
  mom_type          TEXT NOT NULL DEFAULT 'policy_review' CHECK (mom_type IN (
    'policy_review','policy_approval','policy_update',
    'risk_review','compliance_review','board_meeting',
    'steering_committee','audit_committee','management_review',
    'incident_review','vendor_review','custom'
  )),
  title             TEXT NOT NULL,
  meeting_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  location          TEXT,
  chairperson       TEXT NOT NULL,
  attendees         JSONB NOT NULL DEFAULT '[]',
  absentees         JSONB NOT NULL DEFAULT '[]',
  agenda_items      JSONB NOT NULL DEFAULT '[]',
  discussion_notes  TEXT NOT NULL DEFAULT '',
  decisions         JSONB NOT NULL DEFAULT '[]',
  action_items      JSONB NOT NULL DEFAULT '[]',
  next_meeting_date DATE,
  attachments       JSONB NOT NULL DEFAULT '[]',
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized','approved','distributed')),
  approved_by       TEXT,
  approved_at       TIMESTAMPTZ,
  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policy_mom_policy ON policy_mom_records(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_mom_type ON policy_mom_records(mom_type);
CREATE INDEX IF NOT EXISTS idx_policy_mom_date ON policy_mom_records(meeting_date DESC);

-- 4) Policy Process Actions (built-in workflow steps)
CREATE TABLE IF NOT EXISTS policy_process_actions (
  action_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id         UUID NOT NULL,
  step_key          TEXT NOT NULL CHECK (step_key IN (
    'draft','internal_review','legal_review','compliance_review',
    'management_approval','board_approval','publish','distribute',
    'acknowledge','monitor','review','update','archive'
  )),
  step_order        INT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','blocked')),
  assigned_to       TEXT,
  assigned_role     TEXT,
  due_date          DATE,
  completed_at      TIMESTAMPTZ,
  completed_by      TEXT,
  notes             TEXT,
  sla_hours         INT DEFAULT 72,
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policy_process_policy ON policy_process_actions(policy_id, step_order);
CREATE INDEX IF NOT EXISTS idx_policy_process_status ON policy_process_actions(status);

-- 5) Policy Guidance Library
CREATE TABLE IF NOT EXISTS policy_guidance (
  guidance_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id         UUID,
  template_key      TEXT,
  guidance_type     TEXT NOT NULL DEFAULT 'implementation' CHECK (guidance_type IN (
    'implementation','interpretation','example','faq',
    'regulatory_reference','best_practice','exception_handling'
  )),
  title_en          TEXT NOT NULL,
  title_ar          TEXT NOT NULL DEFAULT '',
  content_en        TEXT NOT NULL,
  content_ar        TEXT NOT NULL DEFAULT '',
  frameworks        TEXT[] NOT NULL DEFAULT '{}',
  sort_order        INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        TEXT NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policy_guidance_policy ON policy_guidance(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_guidance_template ON policy_guidance(template_key);
