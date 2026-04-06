-- ============================================================================
-- Migration 036: Governance Command Center — 13 NEW tables
-- Domain D: governance_committee_members, governance_meetings,
--           governance_meeting_attendees, governance_agenda_items,
--           governance_decisions, governance_decision_votes,
--           governance_action_items, governance_action_updates,
--           governance_policy_reviews, governance_policy_approvals,
--           governance_policy_acknowledgements, governance_objectives,
--           governance_registers
--
-- References existing tables (created before, renamed in 032):
--   governance_committees  (committee_id UUID PK)
--   governance_policies    (policy_id VARCHAR(16) PK)
--   governance_policy_versions (version_id UUID PK)
-- ============================================================================

-- ============================================================
-- 1. governance_committee_members
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_committee_members (
  member_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id         UUID NOT NULL REFERENCES governance_committees(committee_id) ON DELETE CASCADE,
  user_id              VARCHAR(64) NOT NULL,
  role_in_committee    VARCHAR(50) DEFAULT 'member'
    CHECK (role_in_committee IN ('chair','vice_chair','secretary','member','observer','advisor')),
  joined_at            TIMESTAMPTZ DEFAULT NOW(),
  left_at              TIMESTAMPTZ,
  is_chair             BOOLEAN NOT NULL DEFAULT FALSE,
  voting_rights        BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64),
  UNIQUE (committee_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gov_comm_member_comm    ON governance_committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_gov_comm_member_user    ON governance_committee_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_comm_member_role    ON governance_committee_members(role_in_committee);
CREATE INDEX IF NOT EXISTS idx_gov_comm_member_chair   ON governance_committee_members(committee_id, is_chair) WHERE is_chair = TRUE;
CREATE INDEX IF NOT EXISTS idx_gov_comm_member_del     ON governance_committee_members(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. governance_meetings
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_meetings (
  meeting_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id         UUID NOT NULL REFERENCES governance_committees(committee_id) ON DELETE CASCADE,
  title                VARCHAR(500) NOT NULL,
  scheduled_at         TIMESTAMPTZ NOT NULL,
  location             VARCHAR(500),
  status               VARCHAR(30) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled','postponed')),
  minutes              TEXT,
  duration_minutes     INT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_meetings_comm       ON governance_meetings(committee_id);
CREATE INDEX IF NOT EXISTS idx_gov_meetings_sched      ON governance_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_gov_meetings_status     ON governance_meetings(status);
CREATE INDEX IF NOT EXISTS idx_gov_meetings_deleted    ON governance_meetings(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. governance_meeting_attendees
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_meeting_attendees (
  attendee_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id           UUID NOT NULL REFERENCES governance_meetings(meeting_id) ON DELETE CASCADE,
  user_id              VARCHAR(64) NOT NULL,
  attendance_status    VARCHAR(20) NOT NULL DEFAULT 'invited'
    CHECK (attendance_status IN ('invited','confirmed','attended','absent','excused','proxy')),
  proxy_for_user_id    VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64),
  UNIQUE (meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gov_attendee_meeting    ON governance_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_gov_attendee_user       ON governance_meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_attendee_status     ON governance_meeting_attendees(attendance_status);
CREATE INDEX IF NOT EXISTS idx_gov_attendee_proxy      ON governance_meeting_attendees(proxy_for_user_id) WHERE proxy_for_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gov_attendee_deleted    ON governance_meeting_attendees(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. governance_agenda_items
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_agenda_items (
  item_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id           UUID NOT NULL REFERENCES governance_meetings(meeting_id) ON DELETE CASCADE,
  sequence             INT NOT NULL DEFAULT 0,
  title                VARCHAR(500) NOT NULL,
  description          TEXT,
  presenter_user_id    VARCHAR(64),
  time_allocated_minutes INT,
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','discussed','deferred','tabled','resolved')),
  decision_required    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_agenda_meeting      ON governance_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_gov_agenda_seq          ON governance_agenda_items(meeting_id, sequence);
CREATE INDEX IF NOT EXISTS idx_gov_agenda_presenter    ON governance_agenda_items(presenter_user_id);
CREATE INDEX IF NOT EXISTS idx_gov_agenda_status       ON governance_agenda_items(status);
CREATE INDEX IF NOT EXISTS idx_gov_agenda_decision     ON governance_agenda_items(decision_required) WHERE decision_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_gov_agenda_deleted      ON governance_agenda_items(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. governance_decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_decisions (
  decision_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id           UUID NOT NULL REFERENCES governance_meetings(meeting_id) ON DELETE CASCADE,
  agenda_item_id       UUID REFERENCES governance_agenda_items(item_id) ON DELETE SET NULL,
  decision_text        TEXT NOT NULL,
  decision_type        VARCHAR(30) NOT NULL DEFAULT 'resolution'
    CHECK (decision_type IN ('resolution','directive','approval','rejection','deferral','recommendation')),
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_vote','approved','rejected','superseded','implemented')),
  effective_date       TIMESTAMPTZ,
  review_date          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_decisions_meeting   ON governance_decisions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_gov_decisions_agenda    ON governance_decisions(agenda_item_id);
CREATE INDEX IF NOT EXISTS idx_gov_decisions_type      ON governance_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_gov_decisions_status    ON governance_decisions(status);
CREATE INDEX IF NOT EXISTS idx_gov_decisions_eff       ON governance_decisions(effective_date);
CREATE INDEX IF NOT EXISTS idx_gov_decisions_deleted   ON governance_decisions(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 6. governance_decision_votes
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_decision_votes (
  vote_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id          UUID NOT NULL REFERENCES governance_decisions(decision_id) ON DELETE CASCADE,
  voter_user_id        VARCHAR(64) NOT NULL,
  vote                 VARCHAR(20) NOT NULL
    CHECK (vote IN ('for','against','abstain')),
  comments             TEXT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64),
  UNIQUE (decision_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_gov_votes_decision      ON governance_decision_votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_gov_votes_voter         ON governance_decision_votes(voter_user_id);
CREATE INDEX IF NOT EXISTS idx_gov_votes_vote          ON governance_decision_votes(vote);
CREATE INDEX IF NOT EXISTS idx_gov_votes_deleted       ON governance_decision_votes(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. governance_action_items
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_action_items (
  action_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id          UUID REFERENCES governance_decisions(decision_id) ON DELETE SET NULL,
  title                VARCHAR(500) NOT NULL,
  description          TEXT,
  assigned_to          VARCHAR(64) NOT NULL,
  due_date             TIMESTAMPTZ,
  priority             VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  status               VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','completed','overdue','cancelled','blocked')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_actions_decision    ON governance_action_items(decision_id);
CREATE INDEX IF NOT EXISTS idx_gov_actions_assigned    ON governance_action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_gov_actions_due         ON governance_action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_gov_actions_priority    ON governance_action_items(priority);
CREATE INDEX IF NOT EXISTS idx_gov_actions_status      ON governance_action_items(status);
CREATE INDEX IF NOT EXISTS idx_gov_actions_deleted     ON governance_action_items(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 8. governance_action_updates
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_action_updates (
  update_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id            UUID NOT NULL REFERENCES governance_action_items(action_id) ON DELETE CASCADE,
  update_text          TEXT NOT NULL,
  progress_percent     INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  updated_by           VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_action_upd_action   ON governance_action_updates(action_id);
CREATE INDEX IF NOT EXISTS idx_gov_action_upd_by       ON governance_action_updates(updated_by);
CREATE INDEX IF NOT EXISTS idx_gov_action_upd_deleted  ON governance_action_updates(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 9. governance_policy_reviews
--    FK to governance_policies (policy_id VARCHAR(16))
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_policy_reviews (
  review_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            VARCHAR(16) NOT NULL REFERENCES governance_policies(policy_id) ON DELETE CASCADE,
  reviewer_id          VARCHAR(64) NOT NULL,
  review_type          VARCHAR(30) NOT NULL DEFAULT 'periodic'
    CHECK (review_type IN ('periodic','triggered','ad_hoc','regulatory','incident')),
  outcome              VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending','approved','changes_required','rejected','deferred')),
  comments             TEXT,
  next_review_date     TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_pol_rev_policy      ON governance_policy_reviews(policy_id);
CREATE INDEX IF NOT EXISTS idx_gov_pol_rev_reviewer    ON governance_policy_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_gov_pol_rev_type        ON governance_policy_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_gov_pol_rev_outcome     ON governance_policy_reviews(outcome);
CREATE INDEX IF NOT EXISTS idx_gov_pol_rev_next        ON governance_policy_reviews(next_review_date);
CREATE INDEX IF NOT EXISTS idx_gov_pol_rev_deleted     ON governance_policy_reviews(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 10. governance_policy_approvals
--     FK to governance_policies (policy_id VARCHAR(16))
--     FK to governance_policy_versions (version_id UUID)
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_policy_approvals (
  approval_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            VARCHAR(16) NOT NULL REFERENCES governance_policies(policy_id) ON DELETE CASCADE,
  approver_id          VARCHAR(64) NOT NULL,
  decision             VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending','approved','rejected','deferred')),
  comments             TEXT,
  version_id           UUID REFERENCES governance_policy_versions(version_id) ON DELETE SET NULL,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_pol_appr_policy     ON governance_policy_approvals(policy_id);
CREATE INDEX IF NOT EXISTS idx_gov_pol_appr_approver   ON governance_policy_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_gov_pol_appr_decision   ON governance_policy_approvals(decision);
CREATE INDEX IF NOT EXISTS idx_gov_pol_appr_version    ON governance_policy_approvals(version_id);
CREATE INDEX IF NOT EXISTS idx_gov_pol_appr_deleted    ON governance_policy_approvals(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 11. governance_policy_acknowledgements
--     FK to governance_policies (policy_id VARCHAR(16))
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_policy_acknowledgements (
  ack_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id            VARCHAR(16) NOT NULL REFERENCES governance_policies(policy_id) ON DELETE CASCADE,
  user_id              VARCHAR(64) NOT NULL,
  acknowledged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version_acknowledged INT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64),
  UNIQUE (policy_id, user_id, version_acknowledged)
);

CREATE INDEX IF NOT EXISTS idx_gov_pol_ack_policy      ON governance_policy_acknowledgements(policy_id);
CREATE INDEX IF NOT EXISTS idx_gov_pol_ack_user        ON governance_policy_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_gov_pol_ack_version     ON governance_policy_acknowledgements(version_acknowledged);
CREATE INDEX IF NOT EXISTS idx_gov_pol_ack_deleted     ON governance_policy_acknowledgements(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 12. governance_objectives
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_objectives (
  objective_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en             VARCHAR(500) NOT NULL,
  title_ar             VARCHAR(500),
  description          TEXT,
  category             VARCHAR(100),
  target_date          TIMESTAMPTZ,
  owner_id             VARCHAR(64),
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','on_track','at_risk','delayed','completed','cancelled')),
  progress_percent     INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  parent_objective_id  UUID REFERENCES governance_objectives(objective_id) ON DELETE SET NULL,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_obj_category        ON governance_objectives(category);
CREATE INDEX IF NOT EXISTS idx_gov_obj_target          ON governance_objectives(target_date);
CREATE INDEX IF NOT EXISTS idx_gov_obj_owner           ON governance_objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_gov_obj_status          ON governance_objectives(status);
CREATE INDEX IF NOT EXISTS idx_gov_obj_parent          ON governance_objectives(parent_objective_id);
CREATE INDEX IF NOT EXISTS idx_gov_obj_deleted         ON governance_objectives(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 13. governance_registers
-- ============================================================
CREATE TABLE IF NOT EXISTS governance_registers (
  register_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_type        VARCHAR(50) NOT NULL
    CHECK (register_type IN ('risk','control','policy','compliance','incident','asset','vendor','obligation','issue')),
  name_en              VARCHAR(255) NOT NULL,
  name_ar              VARCHAR(255),
  description          TEXT,
  owner_id             VARCHAR(64),
  status               VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','archived')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_registers_type      ON governance_registers(register_type);
CREATE INDEX IF NOT EXISTS idx_gov_registers_owner     ON governance_registers(owner_id);
CREATE INDEX IF NOT EXISTS idx_gov_registers_status    ON governance_registers(status);
CREATE INDEX IF NOT EXISTS idx_gov_registers_deleted   ON governance_registers(deleted_at) WHERE deleted_at IS NULL;
