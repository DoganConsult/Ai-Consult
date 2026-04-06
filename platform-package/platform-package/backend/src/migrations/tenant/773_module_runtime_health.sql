-- Migration 773: Module Runtime Health & Journey Certification
-- Adds runtime health snapshots, pack certifications, and journey certification tables.

-- ── Module Runtime Health ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_runtime_health (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  health_status   VARCHAR(32) NOT NULL DEFAULT 'healthy'
    CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  error_count_24h INT NOT NULL DEFAULT 0,
  avg_response_ms INT,
  last_error_at   TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  uptime_pct      NUMERIC(5,2) DEFAULT 100.00,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code)
);

CREATE INDEX IF NOT EXISTS idx_runtime_health_module ON module_runtime_health (module_code);

-- ── Pack Certification ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pack_certifications (
  id              SERIAL PRIMARY KEY,
  pack_code       VARCHAR(64) NOT NULL UNIQUE,
  certification_state VARCHAR(32) NOT NULL DEFAULT 'INTERNAL_BETA'
    CHECK (certification_state IN ('CERTIFIED_A_PLUS_PLUS', 'INTERNAL_BETA', 'HIDDEN', 'DISABLED')),
  modules_certified INT NOT NULL DEFAULT 0,
  modules_total   INT NOT NULL DEFAULT 0,
  cross_module_tests_passed BOOLEAN NOT NULL DEFAULT FALSE,
  certified_at    TIMESTAMPTZ,
  certified_by    VARCHAR(128),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Journey Certification ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journey_certifications (
  id              SERIAL PRIMARY KEY,
  journey_code    VARCHAR(64) NOT NULL UNIQUE DEFAULT 'onboarding',
  certification_state VARCHAR(32) NOT NULL DEFAULT 'INTERNAL_BETA'
    CHECK (certification_state IN ('CERTIFIED_A_PLUS_PLUS', 'INTERNAL_BETA', 'HIDDEN', 'DISABLED')),
  steps_verified  INT NOT NULL DEFAULT 0,
  steps_total     INT NOT NULL DEFAULT 15,
  gate_results    JSONB NOT NULL DEFAULT '{}',
  certified_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Module Maturity Stages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_maturity_stages (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL UNIQUE,
  maturity_level  VARCHAR(32) NOT NULL DEFAULT 'starter'
    CHECK (maturity_level IN ('starter', 'developing', 'established', 'optimized', 'leading')),
  active_users_30d INT NOT NULL DEFAULT 0,
  records_created_30d INT NOT NULL DEFAULT 0,
  workflows_completed_30d INT NOT NULL DEFAULT 0,
  ai_actions_30d  INT NOT NULL DEFAULT 0,
  last_assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Module Readiness Thresholds ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_readiness_thresholds (
  id              SERIAL PRIMARY KEY,
  module_code     VARCHAR(64) NOT NULL,
  check_code      VARCHAR(64) NOT NULL,
  min_required    INT NOT NULL DEFAULT 1,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_code, check_code)
);

-- Seed runtime health for all 20 modules
INSERT INTO module_runtime_health (module_code, health_status, checked_at) VALUES
  ('risk', 'healthy', NOW()), ('compliance', 'healthy', NOW()),
  ('policy', 'healthy', NOW()), ('evidence', 'healthy', NOW()),
  ('audit', 'healthy', NOW()), ('foundation', 'healthy', NOW()),
  ('governance', 'healthy', NOW()), ('reporting', 'healthy', NOW()),
  ('incident', 'healthy', NOW()), ('vendor', 'healthy', NOW()),
  ('bcp', 'healthy', NOW()), ('asset', 'healthy', NOW()),
  ('exception', 'healthy', NOW()), ('remediation', 'healthy', NOW()),
  ('action', 'healthy', NOW()), ('training', 'healthy', NOW()),
  ('ai-governance', 'healthy', NOW()), ('privacy', 'healthy', NOW()),
  ('qiyas', 'healthy', NOW()), ('integrations', 'healthy', NOW())
ON CONFLICT (module_code) DO NOTHING;

-- Seed maturity stages
INSERT INTO module_maturity_stages (module_code, maturity_level) VALUES
  ('risk', 'established'), ('compliance', 'established'),
  ('policy', 'established'), ('evidence', 'established'),
  ('audit', 'established'), ('foundation', 'established'),
  ('governance', 'established'), ('reporting', 'developing'),
  ('incident', 'developing'), ('vendor', 'developing'),
  ('bcp', 'developing'), ('asset', 'developing'),
  ('exception', 'developing'), ('remediation', 'developing'),
  ('action', 'developing'), ('training', 'starter'),
  ('ai-governance', 'developing'), ('privacy', 'starter'),
  ('qiyas', 'developing'), ('integrations', 'starter')
ON CONFLICT (module_code) DO NOTHING;

-- Seed pack certifications
INSERT INTO pack_certifications (pack_code, certification_state, modules_certified, modules_total) VALUES
  ('governance_starter', 'INTERNAL_BETA', 4, 6),
  ('core_grc', 'INTERNAL_BETA', 5, 6),
  ('internal_audit', 'INTERNAL_BETA', 4, 5),
  ('extended_risk', 'INTERNAL_BETA', 2, 5),
  ('aios', 'INTERNAL_BETA', 1, 3),
  ('full_enterprise', 'INTERNAL_BETA', 8, 20)
ON CONFLICT (pack_code) DO NOTHING;

-- Seed journey certification
INSERT INTO journey_certifications (journey_code, certification_state, steps_verified, steps_total) VALUES
  ('onboarding', 'INTERNAL_BETA', 10, 15)
ON CONFLICT (journey_code) DO NOTHING;
