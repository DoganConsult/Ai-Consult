-- ============================================================
-- Migration 940: Governance Module — Missing Tables (MP-04)
-- Owner: Module:Governance
-- Spec: DOS-AIO-Specs/module-patch-04-governance-end-to-end.md §5
-- Tables: 25 new tables to complete governance module schema
-- Pattern: Matches existing governance_* column conventions
-- ============================================================

-- ═══ 1. Board Packs & Items ═══
CREATE TABLE IF NOT EXISTS governance_board_packs (
  pack_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  committee_id         UUID REFERENCES governance_committees(committee_id),
  meeting_id           UUID REFERENCES governance_meetings(meeting_id),
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','approved','published','archived')),
  cover_note           TEXT,
  published_at         TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS governance_board_pack_items (
  item_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id              UUID NOT NULL REFERENCES governance_board_packs(pack_id) ON DELETE CASCADE,
  sequence             INT NOT NULL DEFAULT 0,
  title                VARCHAR(500) NOT NULL,
  item_type            VARCHAR(50) NOT NULL DEFAULT 'report'
    CHECK (item_type IN ('report','decision','information','discussion','action_update')),
  content              TEXT,
  attachment_url       VARCHAR(2000),
  source_module        VARCHAR(100),
  source_entity_id     UUID,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 2. Body Members ═══
CREATE TABLE IF NOT EXISTS governance_body_members (
  member_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id              UUID NOT NULL REFERENCES governance_bodies(body_id) ON DELETE CASCADE,
  user_id              VARCHAR(64) NOT NULL,
  role_in_body         VARCHAR(50) NOT NULL DEFAULT 'member'
    CHECK (role_in_body IN ('chair','vice_chair','secretary','member','observer','advisor')),
  joined_at            TIMESTAMPTZ DEFAULT NOW(),
  left_at              TIMESTAMPTZ,
  voting_rights        BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64),
  UNIQUE (body_id, user_id)
);

-- ═══ 3. Calendar & Scheduling ═══
CREATE TABLE IF NOT EXISTS governance_calendar_entries (
  entry_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  entry_type           VARCHAR(50) NOT NULL DEFAULT 'meeting'
    CHECK (entry_type IN ('meeting','review_cycle','reporting_deadline','audit','milestone','custom')),
  committee_id         UUID REFERENCES governance_committees(committee_id),
  body_id              UUID REFERENCES governance_bodies(body_id),
  scheduled_at         TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ,
  recurrence_rule      VARCHAR(200),
  status               VARCHAR(30) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled','postponed')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 4. Committee Meetings ═══
CREATE TABLE IF NOT EXISTS governance_committee_meetings (
  meeting_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id         UUID NOT NULL REFERENCES governance_committees(committee_id) ON DELETE CASCADE,
  title                VARCHAR(500) NOT NULL,
  scheduled_at         TIMESTAMPTZ NOT NULL,
  location             VARCHAR(500),
  meeting_type         VARCHAR(50) NOT NULL DEFAULT 'regular'
    CHECK (meeting_type IN ('regular','extraordinary','annual','ad_hoc')),
  status               VARCHAR(30) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','in_progress','completed','cancelled','postponed')),
  quorum_required      INT DEFAULT 0,
  quorum_met           BOOLEAN,
  duration_minutes     INT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

-- ═══ 5. Decision Items ═══
CREATE TABLE IF NOT EXISTS governance_decision_items (
  decision_item_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id          UUID NOT NULL REFERENCES governance_decisions(decision_id) ON DELETE CASCADE,
  sequence             INT NOT NULL DEFAULT 0,
  title                VARCHAR(500) NOT NULL,
  description          TEXT,
  item_type            VARCHAR(50) NOT NULL DEFAULT 'resolution'
    CHECK (item_type IN ('resolution','directive','action','recommendation','deferral')),
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','deferred','withdrawn')),
  assigned_to          VARCHAR(64),
  due_date             DATE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 6. Delegation Rules ═══
CREATE TABLE IF NOT EXISTS governance_delegation_rules (
  rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id              UUID REFERENCES governance_bodies(body_id),
  committee_id         UUID REFERENCES governance_committees(committee_id),
  delegator_user_id    VARCHAR(64) NOT NULL,
  delegate_user_id     VARCHAR(64) NOT NULL,
  scope                VARCHAR(100) NOT NULL DEFAULT 'all',
  valid_from           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until          TIMESTAMPTZ,
  max_delegation_depth INT DEFAULT 1,
  requires_notification BOOLEAN NOT NULL DEFAULT TRUE,
  status               VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','revoked','suspended')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 7. Digests ═══
CREATE TABLE IF NOT EXISTS governance_digests (
  digest_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_type          VARCHAR(50) NOT NULL DEFAULT 'weekly'
    CHECK (digest_type IN ('daily','weekly','monthly','quarterly','annual','ad_hoc')),
  title                VARCHAR(500) NOT NULL,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  content              JSONB NOT NULL DEFAULT '{}',
  recipient_count      INT DEFAULT 0,
  sent_at              TIMESTAMPTZ,
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generated','sent','failed')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 8. Escalation Rules ═══
CREATE TABLE IF NOT EXISTS governance_escalation_rules (
  rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type         VARCHAR(50) NOT NULL
    CHECK (trigger_type IN ('overdue_action','missed_meeting','quorum_failure','decision_blocked','review_overdue','compliance_breach')),
  escalation_target    VARCHAR(50) NOT NULL DEFAULT 'committee_chair'
    CHECK (escalation_target IN ('committee_chair','body_chair','tenant_admin','executive_owner','custom')),
  escalation_user_id   VARCHAR(64),
  delay_hours          INT NOT NULL DEFAULT 24,
  notify_on_trigger    BOOLEAN NOT NULL DEFAULT TRUE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 9. Executive Summaries ═══
CREATE TABLE IF NOT EXISTS governance_exec_summaries (
  summary_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  summary_type         VARCHAR(50) NOT NULL DEFAULT 'quarterly'
    CHECK (summary_type IN ('monthly','quarterly','annual','ad_hoc')),
  content              JSONB NOT NULL DEFAULT '{}',
  highlights           JSONB DEFAULT '[]',
  risks_flagged        INT DEFAULT 0,
  decisions_made       INT DEFAULT 0,
  actions_outstanding  INT DEFAULT 0,
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','approved','published')),
  approved_by          VARCHAR(64),
  approved_at          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 10. Initiatives ═══
CREATE TABLE IF NOT EXISTS governance_initiatives (
  initiative_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  description          TEXT,
  initiative_type      VARCHAR(50) NOT NULL DEFAULT 'improvement'
    CHECK (initiative_type IN ('improvement','remediation','compliance','strategic','operational')),
  owner_user_id        VARCHAR(64) NOT NULL,
  sponsor_user_id      VARCHAR(64),
  priority             VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  status               VARCHAR(30) NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','approved','in_progress','completed','cancelled','on_hold')),
  start_date           DATE,
  target_date          DATE,
  completion_date      DATE,
  budget_allocated     NUMERIC(15,2),
  budget_spent         NUMERIC(15,2) DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

-- ═══ 11. Maturity Scores ═══
CREATE TABLE IF NOT EXISTS governance_maturity_scores (
  score_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id            UUID REFERENCES governance_domains(domain_id),
  dimension            VARCHAR(100) NOT NULL,
  score                NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 5),
  target_score         NUMERIC(5,2) CHECK (target_score >= 0 AND target_score <= 5),
  assessment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  assessor_user_id     VARCHAR(64),
  evidence_notes       TEXT,
  methodology          VARCHAR(50) DEFAULT 'cmmi'
    CHECK (methodology IN ('cmmi','cobit','iso','custom')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 12. Meeting Minutes ═══
CREATE TABLE IF NOT EXISTS governance_meeting_minutes (
  minutes_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id           UUID NOT NULL REFERENCES governance_meetings(meeting_id) ON DELETE CASCADE,
  content              TEXT NOT NULL,
  attendees_count      INT DEFAULT 0,
  decisions_count      INT DEFAULT 0,
  actions_count        INT DEFAULT 0,
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','approved','distributed')),
  approved_by          VARCHAR(64),
  approved_at          TIMESTAMPTZ,
  distributed_at       TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 13. Milestones ═══
CREATE TABLE IF NOT EXISTS governance_milestones (
  milestone_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id        UUID REFERENCES governance_initiatives(initiative_id) ON DELETE CASCADE,
  title                VARCHAR(500) NOT NULL,
  description          TEXT,
  target_date          DATE NOT NULL,
  completion_date      DATE,
  status               VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','overdue','cancelled')),
  owner_user_id        VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 14. Obligation Links ═══
CREATE TABLE IF NOT EXISTS governance_obligation_links (
  link_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_entity_type VARCHAR(50) NOT NULL
    CHECK (governance_entity_type IN ('body','committee','initiative','decision','policy','standard')),
  governance_entity_id UUID NOT NULL,
  obligation_id        UUID NOT NULL,
  link_type            VARCHAR(50) NOT NULL DEFAULT 'compliance'
    CHECK (link_type IN ('compliance','regulatory','contractual','internal','advisory')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  UNIQUE (governance_entity_type, governance_entity_id, obligation_id)
);

-- ═══ 15. Policies (governance-owned policy register) ═══
CREATE TABLE IF NOT EXISTS governance_policies (
  policy_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  policy_code          VARCHAR(100) UNIQUE,
  category             VARCHAR(100),
  status               VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','under_review','approved','published','retired','superseded')),
  version              VARCHAR(20) DEFAULT '1.0',
  effective_date       DATE,
  review_date          DATE,
  owner_user_id        VARCHAR(64) NOT NULL,
  approver_user_id     VARCHAR(64),
  approved_at          TIMESTAMPTZ,
  body_id              UUID REFERENCES governance_bodies(body_id),
  content_summary      TEXT,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

-- ═══ 16. Procedure Templates ═══
CREATE TABLE IF NOT EXISTS governance_procedure_templates (
  template_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  template_code        VARCHAR(100) UNIQUE,
  category             VARCHAR(100),
  content              JSONB NOT NULL DEFAULT '{}',
  version              VARCHAR(20) DEFAULT '1.0',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 17. Reporting Cycles ═══
CREATE TABLE IF NOT EXISTS governance_reporting_cycles (
  cycle_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  cycle_type           VARCHAR(50) NOT NULL DEFAULT 'quarterly'
    CHECK (cycle_type IN ('monthly','quarterly','semi_annual','annual','ad_hoc')),
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  due_date             DATE NOT NULL,
  committee_id         UUID REFERENCES governance_committees(committee_id),
  status               VARCHAR(30) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','open','in_progress','closed','overdue')),
  submissions_expected INT DEFAULT 0,
  submissions_received INT DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 18. Review Cycles ═══
CREATE TABLE IF NOT EXISTS governance_review_cycles (
  cycle_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  review_type          VARCHAR(50) NOT NULL DEFAULT 'periodic'
    CHECK (review_type IN ('periodic','triggered','ad_hoc','regulatory','annual')),
  scope                VARCHAR(100) NOT NULL DEFAULT 'full',
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  status               VARCHAR(30) NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','in_progress','completed','cancelled')),
  reviewer_user_id     VARCHAR(64),
  findings_count       INT DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 19. Reviews ═══
CREATE TABLE IF NOT EXISTS governance_reviews (
  review_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id             UUID REFERENCES governance_review_cycles(cycle_id),
  title                VARCHAR(500) NOT NULL,
  entity_type          VARCHAR(50) NOT NULL
    CHECK (entity_type IN ('body','committee','policy','initiative','process','control')),
  entity_id            UUID NOT NULL,
  reviewer_user_id     VARCHAR(64) NOT NULL,
  rating               VARCHAR(20)
    CHECK (rating IN ('effective','partially_effective','ineffective','not_assessed')),
  findings             TEXT,
  recommendations      TEXT,
  status               VARCHAR(30) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','completed','cancelled')),
  completed_at         TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 20. Risk Appetite Links ═══
CREATE TABLE IF NOT EXISTS governance_risk_appetite_links (
  link_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_entity_type VARCHAR(50) NOT NULL
    CHECK (governance_entity_type IN ('body','committee','initiative','domain')),
  governance_entity_id UUID NOT NULL,
  risk_category_id     UUID,
  appetite_level       VARCHAR(30) NOT NULL DEFAULT 'moderate'
    CHECK (appetite_level IN ('averse','minimal','cautious','moderate','open','hungry')),
  tolerance_threshold  NUMERIC(5,2),
  approved_by          VARCHAR(64),
  approved_at          TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 21. Score Dimensions ═══
CREATE TABLE IF NOT EXISTS governance_score_dimensions (
  dimension_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_code       VARCHAR(100) NOT NULL UNIQUE,
  dimension_name       VARCHAR(200) NOT NULL,
  description          TEXT,
  weight               NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  max_score            NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  category             VARCHAR(50) DEFAULT 'governance'
    CHECK (category IN ('governance','risk','compliance','operations','strategic')),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

-- ═══ 22. Standards ═══
CREATE TABLE IF NOT EXISTS governance_standards (
  standard_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                VARCHAR(500) NOT NULL,
  standard_code        VARCHAR(100) UNIQUE,
  category             VARCHAR(100),
  issuing_body         VARCHAR(200),
  version              VARCHAR(20) DEFAULT '1.0',
  effective_date       DATE,
  status               VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','under_review','superseded','retired')),
  content_summary      TEXT,
  compliance_required  BOOLEAN NOT NULL DEFAULT FALSE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64),
  updated_by           VARCHAR(64)
);

-- ═══ 23. Structure Nodes ═══
CREATE TABLE IF NOT EXISTS governance_structure_nodes (
  node_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_node_id       UUID REFERENCES governance_structure_nodes(node_id),
  node_type            VARCHAR(50) NOT NULL
    CHECK (node_type IN ('root','domain','body','committee','function','process')),
  entity_id            UUID,
  label                VARCHAR(500) NOT NULL,
  depth                INT NOT NULL DEFAULT 0,
  sort_order           INT NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  created_by           VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_gov_struct_parent ON governance_structure_nodes (parent_node_id);
CREATE INDEX IF NOT EXISTS idx_gov_struct_type ON governance_structure_nodes (node_type);

-- ═══ 24. Voting Records ═══
CREATE TABLE IF NOT EXISTS governance_voting_records (
  vote_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id          UUID NOT NULL REFERENCES governance_decisions(decision_id) ON DELETE CASCADE,
  meeting_id           UUID REFERENCES governance_meetings(meeting_id),
  voter_user_id        VARCHAR(64) NOT NULL,
  vote_value           VARCHAR(20) NOT NULL
    CHECK (vote_value IN ('for','against','abstain','not_present')),
  vote_weight          NUMERIC(5,2) DEFAULT 1.0,
  comment              TEXT,
  voted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_proxy             BOOLEAN NOT NULL DEFAULT FALSE,
  proxy_for_user_id    VARCHAR(64),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  UNIQUE (decision_id, voter_user_id)
);

-- ═══ Indexes ═══
CREATE INDEX IF NOT EXISTS idx_gov_board_packs_committee ON governance_board_packs (committee_id);
CREATE INDEX IF NOT EXISTS idx_gov_board_packs_status ON governance_board_packs (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_pack_items_pack ON governance_board_pack_items (pack_id);
CREATE INDEX IF NOT EXISTS idx_gov_body_members_body ON governance_body_members (body_id);
CREATE INDEX IF NOT EXISTS idx_gov_body_members_user ON governance_body_members (user_id);
CREATE INDEX IF NOT EXISTS idx_gov_calendar_scheduled ON governance_calendar_entries (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_gov_calendar_committee ON governance_calendar_entries (committee_id);
CREATE INDEX IF NOT EXISTS idx_gov_committee_mtg_committee ON governance_committee_meetings (committee_id);
CREATE INDEX IF NOT EXISTS idx_gov_committee_mtg_status ON governance_committee_meetings (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_decision_items_decision ON governance_decision_items (decision_id);
CREATE INDEX IF NOT EXISTS idx_gov_delegation_delegator ON governance_delegation_rules (delegator_user_id);
CREATE INDEX IF NOT EXISTS idx_gov_delegation_status ON governance_delegation_rules (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_initiatives_status ON governance_initiatives (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_initiatives_owner ON governance_initiatives (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_gov_maturity_domain ON governance_maturity_scores (domain_id);
CREATE INDEX IF NOT EXISTS idx_gov_maturity_date ON governance_maturity_scores (assessment_date);
CREATE INDEX IF NOT EXISTS idx_gov_minutes_meeting ON governance_meeting_minutes (meeting_id);
CREATE INDEX IF NOT EXISTS idx_gov_milestones_initiative ON governance_milestones (initiative_id);
CREATE INDEX IF NOT EXISTS idx_gov_milestones_status ON governance_milestones (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_obligation_links_entity ON governance_obligation_links (governance_entity_type, governance_entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_policies_status ON governance_policies (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_policies_owner ON governance_policies (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_gov_reporting_cycles_status ON governance_reporting_cycles (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_review_cycles_status ON governance_review_cycles (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_reviews_cycle ON governance_reviews (cycle_id);
CREATE INDEX IF NOT EXISTS idx_gov_reviews_entity ON governance_reviews (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_risk_appetite_entity ON governance_risk_appetite_links (governance_entity_type, governance_entity_id);
CREATE INDEX IF NOT EXISTS idx_gov_standards_status ON governance_standards (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gov_voting_decision ON governance_voting_records (decision_id);
