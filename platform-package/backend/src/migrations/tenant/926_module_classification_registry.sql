-- Migration: 926_module_classification_registry
-- DOS — Database-driven module classification replacing hardcoded ALWAYS_ON_MODULES / GRC_CORE_MODULES
-- Referenced by: backend/src/platform/dos/modules/registry/module-classification.ts
-- Referenced by: backend/src/platform/dauth/access/decision-engine.ts (Steps 5, 6)
-- Spec: Patch 0 §4 Law 3 (data-driven security)

CREATE TABLE IF NOT EXISTS "${schema}".module_classification (
  module_code       VARCHAR(100) PRIMARY KEY,
  is_always_on      BOOLEAN NOT NULL DEFAULT FALSE,
  is_grc_core       BOOLEAN NOT NULL DEFAULT FALSE,
  is_ui_only        BOOLEAN NOT NULL DEFAULT FALSE,
  tier              VARCHAR(50) DEFAULT 'standard',
  owner_layer       VARCHAR(50) NOT NULL DEFAULT 'product'
                    CHECK (owner_layer IN ('platform', 'product', 'module', 'ai')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mc_always_on ON "${schema}".module_classification(module_code) WHERE is_always_on = TRUE;
CREATE INDEX IF NOT EXISTS idx_mc_grc_core ON "${schema}".module_classification(module_code) WHERE is_grc_core = TRUE;

-- Seed always-on modules (platform infrastructure modules that bypass entitlement checks)
INSERT INTO "${schema}".module_classification (module_code, is_always_on, is_grc_core, owner_layer) VALUES
  ('admin', TRUE, FALSE, 'platform'),
  ('workflow', TRUE, FALSE, 'platform'),
  ('notification', TRUE, FALSE, 'platform'),
  ('platform', TRUE, FALSE, 'platform'),
  ('workspace', TRUE, FALSE, 'platform'),
  ('foundation', TRUE, TRUE, 'platform'),
  ('onboarding', TRUE, FALSE, 'platform'),
  ('profile', TRUE, FALSE, 'platform'),
  ('users', TRUE, FALSE, 'platform'),
  ('dauth', TRUE, FALSE, 'platform'),
  ('report', TRUE, FALSE, 'platform'),
  ('analytics', TRUE, FALSE, 'platform'),
  ('inbox', TRUE, FALSE, 'platform'),
  ('navigation', TRUE, FALSE, 'platform'),
  ('dashboard', TRUE, FALSE, 'platform'),
  ('widgets', TRUE, FALSE, 'platform'),
  ('records', TRUE, FALSE, 'platform'),
  ('portals', TRUE, FALSE, 'platform'),
  ('bootstrap', TRUE, FALSE, 'platform'),
  ('provisioning', TRUE, FALSE, 'platform'),
  ('tenant', TRUE, FALSE, 'platform'),
  ('shell', TRUE, FALSE, 'platform'),
  ('telemetry', TRUE, FALSE, 'platform'),
  ('event', TRUE, FALSE, 'platform'),
  ('delegation', TRUE, FALSE, 'platform'),
  ('access', TRUE, FALSE, 'platform'),
  ('security', TRUE, FALSE, 'platform'),
  ('gate', TRUE, FALSE, 'platform')
ON CONFLICT (module_code) DO NOTHING;

-- Seed GRC core modules (allowed as fallback when no entitlements seeded)
INSERT INTO "${schema}".module_classification (module_code, is_always_on, is_grc_core, owner_layer) VALUES
  ('governance', FALSE, TRUE, 'product'),
  ('risk', FALSE, TRUE, 'product'),
  ('compliance', FALSE, TRUE, 'product'),
  ('audit', FALSE, TRUE, 'product'),
  ('controls', FALSE, TRUE, 'product'),
  ('control', FALSE, TRUE, 'product'),
  ('evidence', FALSE, TRUE, 'product'),
  ('policy', FALSE, TRUE, 'product'),
  ('incident', FALSE, TRUE, 'product'),
  ('vendor', FALSE, TRUE, 'product'),
  ('assessment', FALSE, TRUE, 'product'),
  ('reporting', FALSE, TRUE, 'product'),
  ('framework', FALSE, TRUE, 'product'),
  ('asset', FALSE, TRUE, 'product'),
  ('training', FALSE, TRUE, 'product'),
  ('integrations', FALSE, TRUE, 'product'),
  ('bcp', FALSE, TRUE, 'product'),
  ('privacy', FALSE, TRUE, 'product')
ON CONFLICT (module_code) DO NOTHING;

-- Seed product-specific modules (not always-on, not GRC core)
INSERT INTO "${schema}".module_classification (module_code, is_always_on, is_grc_core, owner_layer) VALUES
  ('copilot', TRUE, FALSE, 'ai'),
  ('ai', TRUE, FALSE, 'ai'),
  ('action', TRUE, FALSE, 'product'),
  ('task', TRUE, FALSE, 'product'),
  ('timeline', TRUE, FALSE, 'product'),
  ('messaging', TRUE, FALSE, 'product'),
  ('knowledge', TRUE, FALSE, 'product'),
  ('exception', TRUE, FALSE, 'product'),
  ('remediation', TRUE, FALSE, 'product'),
  ('document', TRUE, FALSE, 'product'),
  ('packs', TRUE, FALSE, 'product'),
  ('journey', TRUE, FALSE, 'product'),
  ('agent', TRUE, FALSE, 'ai'),
  ('runbook', TRUE, FALSE, 'product'),
  ('sop', TRUE, FALSE, 'product'),
  ('ai_squad', TRUE, FALSE, 'ai'),
  ('obligation', TRUE, FALSE, 'product')
ON CONFLICT (module_code) DO NOTHING;

COMMENT ON TABLE "${schema}".module_classification IS 'DOS: DB-driven module classification — replaces hardcoded ALWAYS_ON_MODULES and GRC_CORE_MODULES (Law 3: data-driven security)';
