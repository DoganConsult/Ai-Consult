-- ============================================================
-- Migration 371: Governance OS Learning Engine
-- Phase A: Memory Hub (5 layers)
-- Phase B: Case Memory and Outcome Evaluation
-- Phase C: Reflection Engine
-- Phase D: Learning Scores
-- Phase E: Playbook Learning and Approval Flow
-- Phase F: Knowledge Publishing
-- ============================================================

-- ═══════════════════════════════════════════════
-- PHASE A: Memory Hub — Core Memory Tables
-- ═══════════════════════════════════════════════

-- 1. os_case_memory — Canonical learning unit
CREATE TABLE IF NOT EXISTS os_case_memory (
  case_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  workspace_id           VARCHAR(64),
  case_type              TEXT NOT NULL CHECK (case_type IN (
    'initiative_run', 'recommendation', 'escalation', 'task', 
    'milestone_evaluation', 'digest_interaction'
  )),
  trigger_event          TEXT,
  trigger_entity_type    TEXT,
  trigger_entity_id      TEXT,
  context_snapshot       JSONB DEFAULT '{}',
  os_belief              JSONB DEFAULT '{}',
  action_taken           JSONB DEFAULT '{}',
  owner_id               TEXT,
  department_id          TEXT,
  team_id                TEXT,
  observation_window_days INT NOT NULL DEFAULT 7,
  observed_at            TIMESTAMPTZ,
  effectiveness_score    NUMERIC(5,2) CHECK (effectiveness_score BETWEEN 0 AND 1),
  effectiveness_reason   TEXT,
  lesson_candidate_id    UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_tenant ON os_case_memory(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_type ON os_case_memory(tenant_id, case_type);
CREATE INDEX IF NOT EXISTS idx_case_effectiveness ON os_case_memory(tenant_id, effectiveness_score) WHERE effectiveness_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_case_observed ON os_case_memory(tenant_id, observed_at) WHERE observed_at IS NULL;

-- 2. os_case_timelines — Append-only timeline for each case
CREATE TABLE IF NOT EXISTS os_case_timelines (
  timeline_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                UUID NOT NULL REFERENCES os_case_memory(case_id) ON DELETE CASCADE,
  tenant_id              VARCHAR(64) NOT NULL,
  event_type             TEXT NOT NULL CHECK (event_type IN (
    'triggered', 'action_taken', 'outcome_observed', 'lesson_generated'
  )),
  event_data             JSONB DEFAULT '{}',
  occurred_at            TIMESTAMPTZ NOT NULL,
  recorded_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_case ON os_case_timelines(case_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_timeline_tenant ON os_case_timelines(tenant_id, occurred_at DESC);

-- 3. os_outcome_memory — Explicit outcome tracking
CREATE TABLE IF NOT EXISTS os_outcome_memory (
  outcome_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                UUID NOT NULL REFERENCES os_case_memory(case_id) ON DELETE CASCADE,
  tenant_id              VARCHAR(64) NOT NULL,
  outcome_type           TEXT NOT NULL CHECK (outcome_type IN (
    'issue_resolved', 'milestone_moved', 'exposure_improved', 
    'response_time_changed', 'user_accepted', 'user_rejected', 'user_ignored'
  )),
  before_state           JSONB DEFAULT '{}',
  after_state            JSONB DEFAULT '{}',
  delta                  JSONB DEFAULT '{}',
  effectiveness          TEXT NOT NULL CHECK (effectiveness IN (
    'effective', 'partially_effective', 'ineffective', 'unknown'
  )),
  evidence_links         JSONB DEFAULT '[]',
  observed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_case ON os_outcome_memory(case_id);
CREATE INDEX IF NOT EXISTS idx_outcome_tenant ON os_outcome_memory(tenant_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcome_effectiveness ON os_outcome_memory(tenant_id, effectiveness);

-- 4. os_reflection_notes — Reflection engine outputs
CREATE TABLE IF NOT EXISTS os_reflection_notes (
  reflection_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  reflection_type        TEXT NOT NULL CHECK (reflection_type IN (
    'pattern_detected', 'low_effectiveness', 'stalled_milestone', 
    'repeat_ownership_gap', 'module_learning', 'team_learning', 'department_learning'
  )),
  scope                  JSONB DEFAULT '{}',
  pattern_summary        TEXT,
  evidence_cases         JSONB DEFAULT '[]',
  confidence             NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  sample_size            INT NOT NULL DEFAULT 0,
  generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reflection_tenant ON os_reflection_notes(tenant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflection_type ON os_reflection_notes(tenant_id, reflection_type);
CREATE INDEX IF NOT EXISTS idx_reflection_confidence ON os_reflection_notes(tenant_id, confidence) WHERE confidence >= 0.6;

-- 5. os_lesson_candidates — Generated lesson proposals
CREATE TABLE IF NOT EXISTS os_lesson_candidates (
  candidate_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  reflection_id          UUID REFERENCES os_reflection_notes(reflection_id),
  situation              TEXT NOT NULL,
  what_happened          TEXT NOT NULL,
  root_cause_pattern     TEXT NOT NULL,
  best_action_next_time  TEXT NOT NULL,
  confidence             NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  sample_size            INT NOT NULL DEFAULT 0,
  scope                  JSONB DEFAULT '{}',
  supporting_cases       JSONB DEFAULT '[]',
  proposed_adaptive_changes JSONB DEFAULT '{}',
  needs_approval         BOOLEAN NOT NULL DEFAULT TRUE,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'approved', 'rejected', 'published'
  )),
  reviewed_by            TEXT,
  reviewed_at            TIMESTAMPTZ,
  review_notes           TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_tenant ON os_lesson_candidates(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_status ON os_lesson_candidates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_confidence ON os_lesson_candidates(tenant_id, confidence) WHERE confidence >= 0.6 AND status = 'draft';

-- 6. os_approved_lessons — Published lessons
CREATE TABLE IF NOT EXISTS os_approved_lessons (
  lesson_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  candidate_id           UUID REFERENCES os_lesson_candidates(candidate_id),
  lesson_code            TEXT NOT NULL,
  title_en               TEXT NOT NULL,
  title_ar               TEXT,
  situation_en           TEXT NOT NULL,
  situation_ar           TEXT,
  what_happened_en       TEXT NOT NULL,
  what_happened_ar       TEXT,
  root_cause_en          TEXT NOT NULL,
  root_cause_ar          TEXT,
  best_action_en         TEXT NOT NULL,
  best_action_ar         TEXT,
  scope                  JSONB DEFAULT '{}',
  version                INT NOT NULL DEFAULT 1,
  published_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by            TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, lesson_code, version)
);

CREATE INDEX IF NOT EXISTS idx_approved_lesson_tenant ON os_approved_lessons(tenant_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_approved_lesson_code ON os_approved_lessons(tenant_id, lesson_code);

-- 7. os_playbook_versions — Versioned adaptive playbooks
CREATE TABLE IF NOT EXISTS os_playbook_versions (
  version_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  playbook_type          TEXT NOT NULL CHECK (playbook_type IN (
    'reminder_timing', 'escalation_timing', 'next_best_action_ranking', 
    'initiative_scoring', 'digest_emphasis'
  )),
  version                INT NOT NULL DEFAULT 1,
  previous_version_id    UUID REFERENCES os_playbook_versions(version_id),
  changes                JSONB DEFAULT '{}',
  source_lessons          JSONB DEFAULT '[]',
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'superseded'
  )),
  approved_by             TEXT,
  approved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbook_tenant ON os_playbook_versions(tenant_id, playbook_type, version DESC);
CREATE INDEX IF NOT EXISTS idx_playbook_status ON os_playbook_versions(tenant_id, status) WHERE status = 'active';

-- 8. os_pattern_signals — Detected patterns
CREATE TABLE IF NOT EXISTS os_pattern_signals (
  signal_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  pattern_type           TEXT NOT NULL CHECK (pattern_type IN (
    'repeat_issue', 'repeat_ownership_gap', 'repeat_blocker', 
    'repeat_escalation', 'repeat_rejection'
  )),
  pattern_key            TEXT NOT NULL,
  occurrence_count       INT NOT NULL DEFAULT 1,
  first_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  supporting_cases       JSONB DEFAULT '[]',
  confidence             NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, pattern_type, pattern_key)
);

CREATE INDEX IF NOT EXISTS idx_pattern_tenant ON os_pattern_signals(tenant_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_type ON os_pattern_signals(tenant_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_confidence ON os_pattern_signals(tenant_id, confidence) WHERE confidence >= 0.6;

-- 9. os_learning_scores — Learning metrics by scope
CREATE TABLE IF NOT EXISTS os_learning_scores (
  score_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  scope_type             TEXT NOT NULL CHECK (scope_type IN (
    'module', 'team', 'department', 'workspace', 'initiative_type'
  )),
  scope_key              TEXT NOT NULL,
  period_start           TIMESTAMPTZ NOT NULL,
  period_end             TIMESTAMPTZ NOT NULL,
  metrics                JSONB NOT NULL DEFAULT '{}',
  overall_learning_score NUMERIC(5,2) CHECK (overall_learning_score BETWEEN 0 AND 1),
  trend                  TEXT CHECK (trend IN ('improving', 'stable', 'degrading')),
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, scope_type, scope_key, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_learning_score_tenant ON os_learning_scores(tenant_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_learning_score_scope ON os_learning_scores(tenant_id, scope_type, scope_key);

-- 10. os_knowledge_articles — Published knowledge base
CREATE TABLE IF NOT EXISTS os_knowledge_articles (
  article_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  article_code           TEXT NOT NULL,
  knowledge_store        TEXT NOT NULL CHECK (knowledge_store IN (
    'case_base', 'playbook_base', 'domain_base', 'executive_base'
  )),
  title_en               TEXT NOT NULL,
  title_ar               TEXT,
  content_en             TEXT NOT NULL,
  content_ar             TEXT,
  source_lessons         JSONB DEFAULT '[]',
  source_cases           JSONB DEFAULT '[]',
  scope                  JSONB DEFAULT '{}',
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'archived'
  )),
  version                INT NOT NULL DEFAULT 1,
  published_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, article_code, version)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON os_knowledge_articles(tenant_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_store ON os_knowledge_articles(tenant_id, knowledge_store);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON os_knowledge_articles(tenant_id, status) WHERE status = 'published';

-- 11. os_knowledge_links — Links knowledge to operational elements
CREATE TABLE IF NOT EXISTS os_knowledge_links (
  link_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  article_id             UUID NOT NULL REFERENCES os_knowledge_articles(article_id) ON DELETE CASCADE,
  target_type            TEXT NOT NULL CHECK (target_type IN (
    'expert_pack', 'next_best_action', 'digest_guidance', 
    'module_guidance', 'executive_guidance'
  )),
  target_id              TEXT NOT NULL,
  link_strength          NUMERIC(5,2) DEFAULT 1.0 CHECK (link_strength BETWEEN 0 AND 1),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_link_article ON os_knowledge_links(article_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_link_target ON os_knowledge_links(tenant_id, target_type, target_id);

-- 12. os_recommendation_feedback — User feedback on recommendations
CREATE TABLE IF NOT EXISTS os_recommendation_feedback (
  feedback_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  recommendation_id     TEXT NOT NULL,
  feedback_type          TEXT NOT NULL CHECK (feedback_type IN (
    'accepted', 'rejected', 'ignored', 'modified'
  )),
  feedback_reason        TEXT,
  case_id                UUID REFERENCES os_case_memory(case_id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_tenant ON os_recommendation_feedback(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_type ON os_recommendation_feedback(tenant_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_rec ON os_recommendation_feedback(recommendation_id);

-- 13. os_initiative_effectiveness — Initiative-level effectiveness tracking
CREATE TABLE IF NOT EXISTS os_initiative_effectiveness (
  effectiveness_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  initiative_code        TEXT NOT NULL,
  module_code            TEXT NOT NULL,
  period_start           TIMESTAMPTZ NOT NULL,
  period_end             TIMESTAMPTZ NOT NULL,
  runs_count             INT NOT NULL DEFAULT 0,
  artifacts_created_count INT NOT NULL DEFAULT 0,
  artifacts_effective_count INT NOT NULL DEFAULT 0,
  effectiveness_rate     NUMERIC(5,2) CHECK (effectiveness_rate BETWEEN 0 AND 1),
  avg_time_to_outcome_days NUMERIC(10,2),
  milestone_impacts       JSONB DEFAULT '[]',
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, initiative_code, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_initiative_effectiveness_tenant ON os_initiative_effectiveness(tenant_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_initiative_effectiveness_code ON os_initiative_effectiveness(tenant_id, initiative_code);

-- 14. os_digest_feedback — Digest interaction tracking
CREATE TABLE IF NOT EXISTS os_digest_feedback (
  feedback_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  digest_id              UUID NOT NULL,
  interaction_type       TEXT NOT NULL CHECK (interaction_type IN (
    'viewed', 'action_taken', 'ignored', 'dismissed'
  )),
  actions_taken          JSONB DEFAULT '[]',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_feedback_tenant ON os_digest_feedback(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_feedback_digest ON os_digest_feedback(digest_id);
CREATE INDEX IF NOT EXISTS idx_digest_feedback_type ON os_digest_feedback(tenant_id, interaction_type);

DO $$
BEGIN
  RAISE NOTICE '[Migration 371] Governance OS Learning Engine tables created';
END $$;
