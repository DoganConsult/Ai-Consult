-- Migration 790: Cross-Hub Supplementary Tables
-- Tables referenced by enhanced cross-hub modules (exception-hub, action-hub, privacy-gate, training-gate)
-- that were not covered by migration 789.

-- ═══════════════════════════════════════════════════════════════════
-- 1. exceptions — Generic gating exceptions (used by exception-hub)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exceptions (
  exception_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id          VARCHAR(120) NOT NULL,
  entity_type        VARCHAR(60) NOT NULL,
  status             VARCHAR(30) NOT NULL DEFAULT 'pending_approval'
                       CHECK (status IN ('pending_approval','approved','rejected','revoked','expired')),
  reason             TEXT NOT NULL,
  requested_by       VARCHAR(64) NOT NULL,
  approved_by        VARCHAR(64),
  approved_at        TIMESTAMPTZ,
  rejection_reason   TEXT,
  revoked_by         VARCHAR(64),
  revocation_reason  TEXT,
  compensating_controls TEXT,
  conditions         JSONB DEFAULT '{}',
  priority           VARCHAR(20) DEFAULT 'medium'
                       CHECK (priority IN ('low','medium','high','critical')),
  expires_at         TIMESTAMPTZ,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exc_entity ON exceptions (entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exc_status ON exceptions (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exc_expires ON exceptions (expires_at) WHERE status = 'approved' AND deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. dpias — Privacy Impact Assessments (used by privacy-gate)
--    Alias view over dpia_assessments for cross-hub compatibility
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'dpias' AND relkind IN ('r','v')) THEN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'dpia_assessments' AND relkind = 'r') THEN
      CREATE VIEW dpias AS
        SELECT dpia_id, title, status,
          COALESCE(risk_level, 'medium') AS risk_level,
          approved_by AS related_entity_id,
          approved_at AS valid_until
        FROM dpia_assessments;
    ELSE
      CREATE TABLE IF NOT EXISTS dpias (
        dpia_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title              VARCHAR(300) NOT NULL,
        status             VARCHAR(20) DEFAULT 'draft'
                             CHECK (status IN ('draft','in_progress','review','approved','rejected')),
        risk_level         VARCHAR(20) DEFAULT 'medium',
        related_entity_id  VARCHAR(120),
        valid_until        TIMESTAMPTZ,
        approved_by        VARCHAR(64),
        created_by         VARCHAR(64) DEFAULT 'system',
        deleted_at         TIMESTAMPTZ,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_dpias_entity ON dpias (related_entity_id) WHERE status = 'approved';
    END IF;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. cross_border_transfer_rules — Privacy cross-border compliance
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cross_border_transfer_rules (
  rule_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_country         VARCHAR(10) NOT NULL DEFAULT '*',
  destination_country    VARCHAR(10) NOT NULL DEFAULT '*',
  min_classification_level INT NOT NULL DEFAULT 0,
  restriction_type       VARCHAR(30) NOT NULL DEFAULT 'allowed'
                           CHECK (restriction_type IN ('allowed','conditional','blocked')),
  requires_scc           BOOLEAN DEFAULT false,
  requires_dpia          BOOLEAN DEFAULT false,
  notes                  TEXT,
  priority               INT NOT NULL DEFAULT 50,
  enabled                BOOLEAN NOT NULL DEFAULT true,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cbtr_countries ON cross_border_transfer_rules (source_country, destination_country) WHERE enabled = true;

INSERT INTO cross_border_transfer_rules (source_country, destination_country, min_classification_level, restriction_type, requires_scc, requires_dpia, notes, priority) VALUES
  ('SA', '*', 70, 'conditional', true, true, 'KSA cross-border PII/PHI transfer requires SCC and DPIA', 100),
  ('*', 'US', 50, 'conditional', true, false, 'Transfer to US requires Standard Contractual Clauses', 80),
  ('*', '*', 90, 'blocked', true, true, 'PHI data cross-border blocked by default', 200)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 4. action_escalation_chains — DB-driven escalation chain config
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS action_escalation_chains (
  chain_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority              VARCHAR(20) NOT NULL,
  escalation_level      INT NOT NULL,
  notify_roles          JSONB NOT NULL DEFAULT '[]',
  escalate_after_hours  INT DEFAULT 0,
  enabled               BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(priority, escalation_level)
);

INSERT INTO action_escalation_chains (priority, escalation_level, notify_roles, escalate_after_hours) VALUES
  ('critical', 1, '["module_owner","team_lead"]', 0),
  ('critical', 2, '["department_head","ciso"]', 4),
  ('critical', 3, '["cro","executive_team"]', 12),
  ('high', 1, '["module_owner","team_lead"]', 0),
  ('high', 2, '["department_head"]', 24),
  ('medium', 1, '["module_owner"]', 0),
  ('low', 1, '["module_owner"]', 0)
ON CONFLICT (priority, escalation_level) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 5. user_certifications — User certification records
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_certifications (
  certification_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               VARCHAR(64) NOT NULL,
  certification_code    VARCHAR(120) NOT NULL,
  catalog_id            UUID,
  status                VARCHAR(30) NOT NULL DEFAULT 'completed'
                          CHECK (status IN ('in_progress','completed','expired','revoked')),
  completed_at          TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,
  score                 INT,
  evidence_url          VARCHAR(500),
  issued_by             VARCHAR(64) DEFAULT 'system',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uc_user ON user_certifications (user_id, certification_code);
CREATE INDEX IF NOT EXISTS idx_uc_status ON user_certifications (status) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_uc_expiry ON user_certifications (expires_at) WHERE status = 'completed' AND expires_at IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 6. training_certification_audit — Cert grant/revoke audit trail
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_certification_audit (
  audit_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               VARCHAR(64) NOT NULL,
  certification_code    VARCHAR(120) NOT NULL,
  action                VARCHAR(30) NOT NULL CHECK (action IN ('granted','revoked','expired','synced')),
  synced_to_fga         BOOLEAN DEFAULT false,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tca_user ON training_certification_audit (user_id, certification_code);
CREATE INDEX IF NOT EXISTS idx_tca_action ON training_certification_audit (action, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- 7. training_enrollments — Training enrollment records
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_enrollments (
  enrollment_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               VARCHAR(64) NOT NULL,
  campaign_id           UUID,
  catalog_id            UUID,
  status                VARCHAR(30) NOT NULL DEFAULT 'enrolled'
                          CHECK (status IN ('enrolled','in_progress','completed','dropped','failed')),
  enrollment_source     VARCHAR(50) DEFAULT 'manual',
  enrolled_at           TIMESTAMPTZ DEFAULT NOW(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  score                 INT,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_te_user ON training_enrollments (user_id, status);
CREATE INDEX IF NOT EXISTS idx_te_campaign ON training_enrollments (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_te_user_campaign ON training_enrollments (user_id, campaign_id) WHERE campaign_id IS NOT NULL;
