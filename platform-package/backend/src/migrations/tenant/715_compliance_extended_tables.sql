-- Migration 715: Extended compliance tables for enterprise spec endpoints
-- Creates tables referenced by compliance-extended.routes.ts

-- 1. Module settings (key-value store per module)
CREATE TABLE IF NOT EXISTS module_settings (
  module_code   VARCHAR(50) PRIMARY KEY,
  settings_json JSONB NOT NULL DEFAULT '{}',
  updated_by    VARCHAR(128),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Obligation applicability rules
CREATE TABLE IF NOT EXISTS obligation_applicability_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id   UUID NOT NULL,
  rule_type       VARCHAR(50) NOT NULL,     -- jurisdiction, sector, product, entity, location, data_class
  operator        VARCHAR(30) NOT NULL DEFAULT 'equals',  -- equals, contains, in, not_in, regex
  rule_json       JSONB NOT NULL DEFAULT '{}',
  priority        INTEGER NOT NULL DEFAULT 1,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oar_obligation ON obligation_applicability_rules (obligation_id);
CREATE INDEX IF NOT EXISTS idx_oar_active     ON obligation_applicability_rules (active, rule_type);

-- 3. Obligation scopes (manual applicability decisions)
CREATE TABLE IF NOT EXISTS obligation_scopes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id   UUID NOT NULL,
  scope_type      VARCHAR(50) NOT NULL DEFAULT 'manual',  -- manual, legal_entity, business_unit, product, location
  scope_ref_id    VARCHAR(200),
  status          VARCHAR(30) NOT NULL DEFAULT 'applicable',  -- applicable, not_applicable, conditional, under_review
  rationale       TEXT,
  decided_by      VARCHAR(128),
  decided_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_os_obligation ON obligation_scopes (obligation_id);

-- 4. Compliance activity log (dedicated audit trail for compliance events)
CREATE TABLE IF NOT EXISTS compliance_activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       VARCHAR(200) NOT NULL,
  action          VARCHAR(50) NOT NULL,
  actor_user_id   VARCHAR(128),
  before_json     JSONB,
  after_json      JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cal_entity     ON compliance_activity_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cal_created    ON compliance_activity_log (created_at DESC);

-- 5. Ensure regulatory_changes table has triage_status column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regulatory_changes' AND table_schema = current_schema()) THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regulatory_changes' AND column_name = 'triage_status') THEN
      ALTER TABLE regulatory_changes ADD COLUMN triage_status VARCHAR(30) DEFAULT 'new';
    END IF;
  END IF;
END $$;
